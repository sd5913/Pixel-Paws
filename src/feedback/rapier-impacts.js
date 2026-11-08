import { createImpactFilter } from './impact-filter.js';

export function createRapierImpactReporter(bus) {
  const filter = createImpactFilter();
  let time = 0;
  return {
    step(world, bodiesByHandle, delta) {
      time += delta;
      const pairs = new Map();
      const visited = new Set();
      for (const [handle, body] of bodiesByHandle) {
        if (body.removed) continue;
        const collider = world.getCollider(handle);
        if (!collider) continue;
        world.contactPairsWith(collider, otherCollider => {
          const other = bodiesByHandle.get(otherCollider.handle);
          if (!other || other === body || other.removed) return;
          const colliderKey = JSON.stringify([handle, otherCollider.handle].sort((a, b) => a - b));
          if (visited.has(colliderKey)) return;
          visited.add(colliderKey);
          // A single event represents the pair, preferring the opted-in dynamic object.
          const candidates = [body, other].filter(item => item.rigidBody.isDynamic());
          const object = candidates.find(item => item.audioMaterial) ?? candidates[0];
          if (!object) return;
          const surface = object === body ? other : body;
          let strength = 0;
          let position;
          world.contactPair(collider, otherCollider, manifold => {
            let impulse = 0;
            for (let i = 0; i < manifold.numContacts(); i++) impulse += Math.max(0, manifold.contactImpulse(i));
            if (impulse > strength && manifold.numSolverContacts()) {
              strength = impulse;
              position = { ...manifold.solverContactPoint(0) };
            }
          });
          if (!position) return;
          const pairId = JSON.stringify([body.id, other.id].sort());
          if ((pairs.get(pairId)?.impactStrength ?? -1) >= strength) return;
          pairs.set(pairId, {
            pairId, objectId: object.id, otherObjectId: surface.id,
            audioMaterial: object.audioMaterial,
            surfaceMaterial: surface.surfaceMaterial ?? surface.audioMaterial,
            position, impactStrength: strength,
            isObstacle: Boolean(body.isObstacle || other.isObstacle),
            obstacleId: body.isObstacle ? body.id : other.isObstacle ? other.id : undefined,
          });
        });
      }
      for (const { pairId, ...event } of filter.update([...pairs.values()], time)) {
        bus.emit('physics:impact', event);
      }
    },
    reset() { time = 0; filter.reset(); },
  };
}

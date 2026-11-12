import { createPhysicsWorld } from './physics-world.js';
import { createPhysicsBody, syncPhysicsBody } from './physics-body.js';
import { physicsEvents } from './physics-events.js';
import { SWAT } from '../swat.js';
import { createPencilSpill } from './pencil-holder.js';

export async function createDeskPhysics(study, player, { events = physicsEvents } = {}) {
  const physics = await createPhysicsWorld();
  const bodies = study.instances.map(instance => ({ instance, body: createPhysicsBody(physics, {
    ...instance, events: instance.physics.bodyType === 'dynamic'
      ? { collision: true, tippedOver: true, fallen: true, settled: true } : { collision: true },
  }) }));
  const cat = createPhysicsBody(physics, {
    object3D: player,
    id: 'player-cat', events: { collision: true },
    initialTransform: { position: player.position.toArray(), rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    physics: { bodyType: 'kinematic', friction: 0.5, restitution: 0,
      colliders: [{ type: 'box', center: [0, 0.28, 0], halfExtents: [0.25, 0.28, 0.25] }] },
  });
  const dynamic = bodies.filter(entry => entry.instance.physics.bodyType === 'dynamic');
  const spills = dynamic.filter(({ instance }) => instance.assetId === 'pencil-holder')
    .map(({ body }) => createPencilSpill(physics, body));
  dynamic.forEach(({ body }) => {
    body.rigidBody.enableCcd(true);
  });
  const tracked = [...bodies.map(entry => entry.body), cat];
  tracked.forEach(body => events.registerBody(body));
  return {
    swat(position, yaw) {
      const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
      const center = { x: position.x + forward.x * SWAT.forwardOffset,
        y: position.y + SWAT.centerHeight, z: position.z + forward.z * SWAT.forwardOffset };
      const rotation = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
      const shape = new physics.rapier.Cuboid(SWAT.width / 2, SWAT.height / 2, SWAT.depth / 2);
      const hits = [];
      for (const { instance, body } of dynamic) {
        if (!body.colliders.some(collider => collider.intersectsShape(shape, center, rotation))) continue;
        const mass = body.rigidBody.mass();
        const point = body.rigidBody.worldCom();
        const contactHeight = instance.assetId === 'pencil-holder' ? 0.16 : 0.1;
        // A slightly left-of-centre contact adds a rightward yaw to the paw strike.
        body.rigidBody.applyImpulseAtPoint({ x: forward.x * SWAT.forwardSpeed * mass,
          y: SWAT.upwardSpeed * mass, z: forward.z * SWAT.forwardSpeed * mass },
        { x: point.x - Math.cos(yaw) * SWAT.leftContactOffset,
          y: point.y + contactHeight, z: point.z + Math.sin(yaw) * SWAT.leftContactOffset }, true);
        hits.push(instance.id);
      }
      return hits;
    },
    step(delta) {
      cat.rigidBody.setNextKinematicTranslation({ x: player.position.x, y: player.position.y, z: player.position.z });
      const steps = physics.step(delta, (world, timestep) => events.processImpacts?.(world, timestep)) || 0;
      for (const { body } of dynamic) syncPhysicsBody(body);
      for (const spill of spills) spill.update();
      events.processCollisionEvents(physics.drainCollisionEvents());
      if (steps) events.updateBodyStates(steps * physics.timestep);
    },
    reset() {
      events.resetImpacts?.();
      for (const spill of spills) spill.reset();
      for (const { instance, body } of bodies) {
        const [x, y, z] = instance.initialTransform.position;
        const [qx, qy, qz, qw] = instance.initialTransform.rotation;
        body.rigidBody.setTranslation({ x, y, z }, true);
        body.rigidBody.setRotation({ x: qx, y: qy, z: qz, w: qw }, true);
        body.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.rigidBody.resetForces(true);
        body.rigidBody.resetTorques(true);
        syncPhysicsBody(body);
      }
      const position = { x: player.position.x, y: player.position.y, z: player.position.z };
      cat.rigidBody.setTranslation(position, true);
      cat.rigidBody.setNextKinematicTranslation(position);
      physics.drainCollisionEvents();
      for (const body of tracked) {
        events.unregisterBody(body);
        events.registerBody(body);
      }
      physics.world.propagateModifiedBodyPositionsToColliders();
    },
    dispose() { events.resetImpacts?.(); tracked.forEach(body => events.unregisterBody(body)); physics.dispose(); },
    // Integration tests can inspect real body poses without synthesizing score events.
    bodies, physics,
  };
}

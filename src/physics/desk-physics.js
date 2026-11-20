import { createVaseBreakage } from './vase-breakage.js';
import { createPhysicsWorld } from './physics-world.js';
import { createPhysicsBody, syncPhysicsBody } from './physics-body.js';
import { physicsEvents } from './physics-events.js';
import { createPencilSpill } from './pencil-holder.js';
import { SWAT } from '../swat.js';

// Gameplay weight tuning leaves the shared asset definitions unchanged.
const OBJECT_MASS_MULTIPLIER = 1.6;
const GAMEPLAY_MASS = Object.freeze({ eraser: 0.18, 'desk-lamp': 0.32 });

export async function createDeskPhysics(study, player, { events = physicsEvents, windowWall = true, edgeMargin = 0 } = {}) {
  const physics = await createPhysicsWorld();
  // Match the visible floor at Y=-0.01 so fallen props remain in the room.
  const floor = physics.world.createRigidBody(physics.rapier.RigidBodyDesc.fixed());
  const floorCollider = physics.world.createCollider(physics.rapier.ColliderDesc.cuboid(100, .1, 100)
    .setTranslation(0, -.11, 0).setFriction(.8).setRestitution(.02), floor);
  const bodies = study.instances.map(instance => ({ instance, body: createPhysicsBody(physics, {
    ...instance,
    physics: instance.physics.bodyType === 'dynamic'
      ? { ...instance.physics, suggestedMass: GAMEPLAY_MASS[instance.assetId]
          ?? instance.physics.suggestedMass * OBJECT_MASS_MULTIPLIER }
      : instance.physics,
    events: instance.physics.bodyType === 'dynamic'
      ? { collision: true, tippedOver: !['headphones', 'potato-chips'].includes(instance.assetId), fallen: true, settled: true } : { collision: true },
  }) }));
  const cat = createPhysicsBody(physics, {
    object3D: player,
    id: 'player-cat', events: { collision: true },
    initialTransform: { position: player.position.toArray(), rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    physics: { bodyType: 'dynamic', suggestedMass: 0.4, friction: 0, restitution: 0,
      colliders: [{ type: 'box', center: [0, 0.28, 0], halfExtents: [0.25, 0.28, 0.25] }] },
  });
  // A finite-mass movement motor lets heavy props resist a dash. Keep the cat
  // upright on the tabletop, while horizontal collisions remain physical.
  cat.rigidBody.setEnabledTranslations(true, false, true, true);
  cat.rigidBody.lockRotations(true, true);
  cat.rigidBody.setGravityScale(0, true);
  cat.rigidBody.enableCcd(true);
  const dynamic = bodies.filter(entry => entry.instance.physics.bodyType === 'dynamic');
  const spills = dynamic.filter(({ instance }) => instance.assetId === 'pencil-holder')
    .map(({ body }) => createPencilSpill(physics, body));
  const fixedObstacles = bodies.filter(({ instance }) => instance.isObstacle && instance.physics.bodyType === 'static')
    .flatMap(({ body }) => body.colliders);
  if (windowWall) {
    const { height, centerXZ: [x, z], halfExtentsXZ: [halfWidth, halfDepth] } = study.surface;
    const halfThickness = 0.32;
    const halfHeight = (height + 2.4) / 2;
    // The inner face meets the tabletop edge, leaving no gap below the window.
    const wall = physics.rapier.ColliderDesc.cuboid(halfWidth + 0.35, halfHeight, halfThickness)
      .setTranslation(x, halfHeight, z - halfDepth - halfThickness)
      .setFriction(0.75)
      .setRestitution(0);
    const wallBody = physics.world.createRigidBody(physics.rapier.RigidBodyDesc.fixed());
    fixedObstacles.push(physics.world.createCollider(wall, wallBody));
    // A ricochet can hit the wall again within the same physics tick.
    physics.world.maxCcdSubsteps = 4;
  }
  const breakages = dynamic.filter(({instance})=>instance.assetId === 'glass-vase')
    .map(({instance,body})=>createVaseBreakage(physics,instance,body,floorCollider));
  const catShape = cat.colliders[0].shape;
  const upright = { x: 0, y: 0, z: 0, w: 1 };
  const { centerXZ: [centerX, centerZ], halfExtentsXZ: [halfX, halfZ] } = study.surface;
  const extentX = Math.max(0, halfX - edgeMargin);
  const extentZ = Math.max(0, halfZ - edgeMargin);
  const clampX = x => Math.max(centerX - extentX, Math.min(centerX + extentX, x));
  const clampZ = z => Math.max(centerZ - extentZ, Math.min(centerZ + extentZ, z));
  dynamic.forEach(({ body }) => {
    body.rigidBody.enableCcd(true);
    if (windowWall) body.rigidBody.setSoftCcdPrediction(0.32);
  });
  const tracked = [...bodies.map(entry => entry.body), cat];
  tracked.forEach(body => events.registerBody(body));
  return {
    blocksCat(x, y, z) {
      const center = { x, y: y + 0.28, z };
      return fixedObstacles.some(collider => collider.intersectsShape(catShape, center, upright));
    },
    swat(position, yaw) {
      const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
      const center = { x: position.x + forward.x * SWAT.forwardOffset,
        y: position.y + SWAT.centerHeight, z: position.z + forward.z * SWAT.forwardOffset };
      const rotation = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
      const shape = new physics.rapier.Cuboid(SWAT.width / 2, SWAT.height / 2, SWAT.depth / 2);
      const hits = [];
      for (const { instance, body } of dynamic) {
        if (!body.colliders.some(collider => collider.intersectsShape(shape, center, rotation))) continue;
        const point = body.rigidBody.worldCom();
        // Strike the tall lamp near its shade so the paw tips it rather than
        // only sliding its broad base along the desk.
        const contactHeight = instance.assetId === 'desk-lamp' ? 0.55 : 0.1;
        // A slightly left-of-centre contact adds a rightward yaw to the paw strike.
        body.rigidBody.applyImpulseAtPoint({ x: forward.x * SWAT.forwardImpulse,
          y: SWAT.upwardImpulse, z: forward.z * SWAT.forwardImpulse },
        { x: point.x - Math.cos(yaw) * SWAT.leftContactOffset,
          y: point.y + contactHeight, z: point.z + Math.sin(yaw) * SWAT.leftContactOffset }, true);
        hits.push(instance.id);
      }
      return hits;
    },
    step(delta, movement = null) {
      if (!Number.isFinite(delta) || delta <= 0) return;
      const current = cat.rigidBody.translation();
      const velocity = movement ?? { x: (player.position.x - current.x) / delta,
        z: (player.position.z - current.z) / delta };
      const steps = physics.step(delta,
        (world, timestep) => {
          events.processImpacts?.(world, timestep);
          for (const breakage of breakages) breakage.update();
        },
        (_world, timestep) => {
          const { x, z } = cat.rigidBody.translation();
          cat.rigidBody.setLinvel({
            x: edgeMargin ? (clampX(x + velocity.x * timestep) - x) / timestep : velocity.x,
            y: 0,
            z: edgeMargin ? (clampZ(z + velocity.z * timestep) - z) / timestep : velocity.z,
          }, true);
        }) || 0;
      player.position.copy(cat.rigidBody.translation());
      for (const { body } of dynamic) syncPhysicsBody(body);
      for (const spill of spills) spill.update();
      for (const breakage of breakages) breakage.update();
      events.processCollisionEvents(physics.drainCollisionEvents());
      if (steps) events.updateBodyStates(steps * physics.timestep);
      return steps;
    },
    reset() {
      events.resetImpacts?.();
      for (const spill of spills) spill.reset();
      for (const breakage of breakages) breakage.reset();
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
      cat.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      cat.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      physics.drainCollisionEvents();
      for (const body of tracked) {
        events.unregisterBody(body);
        events.registerBody(body);
      }
      physics.world.propagateModifiedBodyPositionsToColliders();
    },
    dispose() { breakages.forEach(breakage=>breakage.dispose()); events.resetImpacts?.(); tracked.forEach(body => events.unregisterBody(body)); physics.dispose(); },
    // Integration tests can inspect real body poses without synthesizing score events.
    bodies, physics,
  };
}

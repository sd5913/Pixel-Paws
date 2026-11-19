import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPhysicsWorld } from '../src/physics/physics-world.js';
import { addBakingChairColliders } from '../src/physics/baking-chair-colliders.js';

test('both baking chairs support dropped objects on their seats', async () => {
  const physics = await createPhysicsWorld();
  try {
    addBakingChairColliders(physics, 1.95);
    const { world, rapier: R } = physics;
    const objects = [-1, 1].map(side => {
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic()
        .setTranslation(side * 2.27, 1.1, .40));
      body.enableCcd(true);
      world.createCollider(R.ColliderDesc.cuboid(.04, .04, .04)
        .setMass(.05).setFriction(.7).setRestitution(0), body);
      return body;
    });
    for (let frame = 0; frame < 240; frame++) physics.step(1 / 60);
    for (const body of objects) {
      assert.ok(Math.abs(body.translation().y - .4825) < .01,
        'object rests on the chair seat instead of passing through');
    }
    assert.equal(world.colliders.len(), 14, 'six colliders per chair plus two test objects');
  } finally {
    physics.dispose();
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPhysicsWorld } from '../src/physics/physics-world.js';
import { addBakingWindowColliders } from '../src/physics/baking-window-colliders.js';

test('baking window and rear wall stop fast props and the sill supports falling props', async () => {
  const physics = await createPhysicsWorld({ gravity: {x:0,y:0,z:0} });
  try {
    addBakingWindowColliders(physics, 1.95);
    const {world,rapier:R} = physics;
    const objects = [0, .9, 2.5].map(x => {
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,.95,-1.9));
      world.createCollider(R.ColliderDesc.ball(.025).setMass(.04),body);
      body.enableCcd(true);
      body.setLinvel({x:0,y:0,z:-12},true);
      return body;
    });
    for(let frame=0;frame<30;frame++)physics.step(1/60);
    for(const body of objects)assert.ok(body.translation().z> -2.44,'rear barrier blocks fast-moving object');
    world.gravity.y=-9.81;
    const falling = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.8,1.2,-2.08));
    world.createCollider(R.ColliderDesc.ball(.03).setMass(.04).setRestitution(0),falling);
    falling.enableCcd(true);
    for(let frame=0;frame<180;frame++)physics.step(1/60);
    assert.ok(falling.translation().y>.60,'sill catches falling object');
  } finally {physics.dispose();}
});

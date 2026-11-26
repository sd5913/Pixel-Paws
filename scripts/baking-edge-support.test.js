import test from 'node:test';
import assert from 'node:assert/strict';
import {createBakingPhysics} from '../src/physics/baking-physics.js';

test('round table has no invisible shelf outside the wood or under the hanging cloth',async()=>{
  const env=await createBakingPhysics(.78,1.95);
  try{
    const {world,rapier:R}=env.physics;
    env.physics.step(1/60);
    const inside=world.castRay(new R.Ray({x:0,y:2,z:1.90},{x:0,y:-1,z:0}),4,true);
    assert.ok(inside&&2-inside.timeOfImpact>.77);
    for(const z of [1.98,2.00,2.02]){
      const hit=world.castRay(new R.Ray({x:0,y:2,z},{x:0,y:-1,z:0}),4,true);
      assert.ok(hit&&2-hit.timeOfImpact<.1,'outside rays must reach floor, not a cloth shelf');
    }
    const prop=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.9,2.02));
    world.createCollider(R.ColliderDesc.cuboid(.015,.015,.015).setMass(.1),prop);
    prop.enableCcd(true);
    for(let frame=0;frame<180;frame++)env.physics.step(1/60);
    assert.ok(prop.translation().y<.05,'an unsupported item falls to the floor');
  }finally{env.physics.dispose();}
});

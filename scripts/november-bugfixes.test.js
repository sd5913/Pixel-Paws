import assert from 'node:assert/strict';
import {test} from 'node:test';
import {inSwatRange} from '../src/swat.js';
import {createPhysicsWorld} from '../src/physics/physics-world.js';
import {addBakingWindowColliders} from '../src/physics/baking-window-colliders.js';

test('kitchen swat only reaches a narrow forward area',()=>{
  const origin={x:0,z:0};
  assert.ok(inSwatRange(origin,0,{x:0,z:.35}));
  assert.ok(!inSwatRange(origin,0,{x:0,z:.7}));
  assert.ok(!inSwatRange(origin,0,{x:.4,z:.35}));
  assert.ok(!inSwatRange(origin,0,{x:0,z:-.2}));
});

test('planter row blocks props before they enter pot gaps',async()=>{
  const physics=await createPhysicsWorld({gravity:{x:0,y:0,z:0}});
  try{
    addBakingWindowColliders(physics,1.95);
    const {world,rapier:R}=physics;
    const bodies=[[-.89,.94],[0,.75],[.86,.88]].map(([x,y])=>{
      const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,y,-1.65));
      body.enableCcd(true);
      world.createCollider(R.ColliderDesc.ball(.025).setMass(.03),body);
      body.setLinvel({x:0,y:0,z:-5},true);
      return body;
    });
    for(let frame=0;frame<60;frame++)physics.step(1/60);
    for(const body of bodies)assert.ok(body.translation().z>-2.1);
  }finally{physics.dispose();}
});

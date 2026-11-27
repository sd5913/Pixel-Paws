import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhysicsWorld} from '../src/physics/physics-world.js';
import {swatIntersectsBody,inSwatRange} from '../src/swat.js';

test('paw hits a large carrier edge even when its centre is out of reach',async()=>{
  const physics=await createPhysicsWorld({gravity:{x:0,y:0,z:0}});
  try {
    const {world,rapier:R}=physics;
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1.05,.85));
    world.createCollider(R.ColliderDesc.cuboid(.45,.22,.48).setMass(.08),body);
    world.step();
    const cat={x:0,y:.807,z:0};
    assert.equal(inSwatRange(cat,0,body.worldCom()),false);
    assert.equal(swatIntersectsBody(physics,body,cat,0),true);
    assert.equal(swatIntersectsBody(physics,body,cat,Math.PI),false);
    body.setTranslation({x:1,y:1.05,z:.85},true);world.step();
    assert.equal(swatIntersectsBody(physics,body,cat,0),false);
  } finally {physics.dispose();}
});

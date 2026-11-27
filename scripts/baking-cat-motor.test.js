import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Vector2} from 'three';
import {createBakingPhysics} from '../src/physics/baking-physics.js';

test('kitchen cat accelerates gradually and reset clears velocity',async()=>{
  const env=await createBakingPhysics(.78,1.95);
  try{
    env.step(1/60,new Vector2(.8,0));
    let velocity=env.catBody.linvel();
    assert.ok(Math.hypot(velocity.x,velocity.z)<.31,'stronger first frame push remains below walking speed');
    for(let frame=0;frame<30;frame++)env.step(1/60,new Vector2(1.2,0));
    velocity=env.catBody.linvel();
    assert.ok(Math.hypot(velocity.x,velocity.z)<=1.41);
    env.resetCat();
    assert.equal(env.catBody.translation().x,0);
    assert.deepEqual({...env.catBody.linvel()},{x:0,y:0,z:0});
  }finally{env.physics.dispose();}
});

test('kitchen cat pushes both low and tall objects without walking through them',async()=>{
  for(const height of [.035,.30]){
    const env=await createBakingPhysics(.78,1.95);
    try{
      const {world,rapier:R}=env.physics;
      const object=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.6,.79+height/2,0));
      world.createCollider(R.ColliderDesc.cuboid(.12,height/2,.12).setMass(.5)
        .setFriction(.6).setSolverGroups((2<<16)|3),object);
      object.enableCcd(true);
      for(let i=0;i<60;i++)env.step(1/60,new Vector2(1.2,0));
      assert.ok(object.translation().x>.65,'cat must move the prop');
      assert.ok(env.catBody.translation().x<object.translation().x-.20,'cat remains behind the prop');
    }finally{env.physics.dispose();}
  }
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {floorSoundKind} from '../src/feedback/floor-contact-audio.js';
import {createBakingPhysics} from '../src/physics/baking-physics.js';

test('floor audio classifies materials and plays once on floor contact, then resets',async()=>{
  assert.equal(floorSoundKind('glass-vase'),'glass');
  assert.equal(floorSoundKind('Cake_1_assembly'),'soft');
  assert.equal(floorSoundKind('whisk'),'metal');
  const calls=[];
  const audio={listener:{context:{currentTime:1}},playUISound(id,volume){calls.push({id,volume});return true;}};
  const env=await createBakingPhysics(.78,1.95,audio);
  try{
    const {world,rapier:R}=env.physics;
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(2.9,.8,0));
    body.userData={floorAsset:'glass-jug'};
    world.createCollider(R.ColliderDesc.ball(.04).setMass(.1),body);
    body.enableCcd(true);
    assert.equal(calls.length,0);
    for(let i=0;i<240;i++)env.step(1/60,{x:0,y:0});
    assert.deepEqual(calls,[{id:'floor-glass',volume:1}]);
    env.resetCat();audio.listener.context.currentTime=2;
    body.setTranslation({x:2.9,y:.8,z:0},true);body.setLinvel({x:0,y:0,z:0},true);
    for(let i=0;i<240;i++)env.step(1/60,{x:0,y:0});
    assert.equal(calls.length,2);
  }finally{env.physics.dispose();}
});

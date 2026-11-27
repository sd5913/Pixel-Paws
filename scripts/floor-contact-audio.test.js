import { AudioManager } from '../src/feedback/audio-manager.js';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createBakingPhysics} from '../src/physics/baking-physics.js';

test('pop audio plays once on floor contact, then resets',async()=>{
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
    assert.deepEqual(calls,[{id:'glass-break',volume:1}]);
    env.resetCat();audio.listener.context.currentTime=2;
    body.setTranslation({x:2.9,y:.8,z:0},true);body.setLinvel({x:0,y:0,z:0},true);
    for(let i=0;i<240;i++)env.step(1/60,{x:0,y:0});
    assert.equal(calls.length,2);
  }finally{env.physics.dispose();}
});

test('pop variants do not repeat on consecutive contacts',()=>{
  const audio=new AudioManager({random:Math.random});
  audio.buffers.set('ui:floor-pop',[{}, {}, {}, {}]);
  let previous;
  for(let i=0;i<100;i++){const next=audio.sample('ui','floor-pop');assert.notEqual(next,previous);previous=next;}
});

test('one prop makes one initial contact pop and one separate floor pop',async()=>{
  const calls=[];
  const audio={listener:{context:{currentTime:1}},playUISound(id,volume){calls.push(volume);return true;}};
  const env=await createBakingPhysics(.78,1.95,audio);
  try{
    const {world,rapier:R}=env.physics;
    const prop=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.6,.85,0));
    prop.userData={floorAsset:'notebook'};
    world.createCollider(R.ColliderDesc.cuboid(.10,.05,.10).setMass(.4).setSolverGroups((2<<16)|3),prop);
    prop.enableCcd(true);
    for(let i=0;i<45;i++)env.step(1/60,{x:1.1,y:0});
    assert.deepEqual(calls,[.85],'continuous pushing only plays the first contact');
    prop.setTranslation({x:2.9,y:.8,z:0},true);prop.setLinvel({x:0,y:0,z:0},true);
    for(let i=0;i<180;i++)env.step(1/60,{x:0,y:0});
    assert.deepEqual(calls,[.85,1],'landing plays the second sound exactly once');
  }finally{env.physics.dispose();}
});

test('simultaneous objects have independent voices and keep stable pop variants',()=>{
  class Voice {
    setBuffer(buffer){this.buffer=buffer;}
    setVolume(volume){this.volume=volume;}
    play(delay){this.delay=delay;this.isPlaying=true;}
    stop(){this.isPlaying=false;}
  }
  const audio=new AudioManager({three:{Audio:Voice}});
  audio.listener={context:{state:'running',currentTime:1}};
  const variants=[{}, {}, {}];audio.buffers.set('ui:floor-pop',variants);
  for(let i=0;i<8;i++)assert.equal(audio.playObjectContact('object-'+i,true),true);
  assert.equal(audio.objectVoices.size,8,'voices must not replace each other');
  const voices=[...audio.objectVoices.values()];
  assert.ok(voices.every(voice=>voice.isPlaying));
  assert.ok(Math.abs(voices[7].delay-.245)<.00001,'each sound gets a separate onset');
  const original=audio.objectVoices.get('object-0:land').buffer;
  audio.resetObjectContactSounds();
  assert.ok(voices.every(voice=>!voice.isPlaying));
  audio.playObjectContact('object-0',true);
  assert.equal(audio.objectVoices.get('object-0:land').buffer,original);
});

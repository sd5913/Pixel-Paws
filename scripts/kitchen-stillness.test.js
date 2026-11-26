import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';import {Scene,Vector2,Vector3} from 'three';import {parseGlb} from '../src/assets/load-assets.js';import {createBakingPhysics} from '../src/physics/baking-physics.js';import {createKitchenProps} from '../src/kitchen-props.js';import {createMixingBowl} from '../src/mixing-bowl.js';import {createMilkJug} from '../src/milk-jug.js';
async function load(path){const b=fs.readFileSync('src/'+path.slice(2)),length=b.readUInt32LE(12),j=JSON.parse(b.toString('utf8',20,20+length));function strip(o){for(const k of Object.keys(o??{})){if(k.endsWith('Texture'))delete o[k];else if(o[k]&&typeof o[k]==='object')strip(o[k]);}}strip(j.materials);const text=Buffer.from(JSON.stringify(j)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);const bin=b.subarray(20+length),out=Buffer.alloc(20+padded.length+bin.length);b.copy(out,0,0,12);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);bin.copy(out,20+padded.length);return parseGlb(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength));}
test('all kitchen bodies sleep without jitter before and after restart',async()=>{
const scene=new Scene(),env=await createBakingPhysics(.78,1.95),props=await createKitchenProps(scene,env,.78,load),bowl=await createMixingBowl(scene,null,.78,1.95,load,env),jug=await createMilkJug(scene,null,.78,1.95,load,env),cat=new Vector3(0,.787,0);
function step(){env.step(1/60,new Vector2(cat.x,cat.z));const p=env.catBody.translation();cat.x=p.x;cat.z=p.z;props.update();bowl.update(1/60,cat);jug.update(1/60,cat);}
for(let i=0;i<900;i++)step();let sleeping=0,active=0,maxSpeed=0;const before=new Map();env.physics.world.forEachRigidBody(body=>{if(body.isDynamic()&&body.isEnabled()){active++;if(body.isSleeping())sleeping++;maxSpeed=Math.max(maxSpeed,Math.hypot(...Object.values(body.linvel())));before.set(body.handle,new Vector3().copy(body.translation()));}});for(let i=0;i<120;i++)step();let drift=0;env.physics.world.forEachRigidBody(body=>{if(before.has(body.handle))drift=Math.max(drift,before.get(body.handle).distanceTo(body.translation()));});assert.equal(sleeping,active);assert.equal(maxSpeed,0);assert.equal(drift,0);props.reset();bowl.reset();jug.reset();env.resetCat();cat.set(0,.787,0);
for(let i=0;i<900;i++)step();let movingAfterReset=0;
env.physics.world.forEachRigidBody(body=>{if(body.isDynamic()&&body.isEnabled()&&!body.isSleeping())movingAfterReset++;});
assert.equal(movingAfterReset,0);env.physics.dispose();
});

test('new kitchen props remain solid on the floor and return on restart', async () => {
  const scene = new Scene();
  const env = await createBakingPhysics(.78, 1.95);
  const props = await createKitchenProps(scene, env, .78, load);
  const imported = [];
  env.physics.world.forEachRigidBody(body => {
    if (/^(?:1[6-9]-|2[0-2]-|blueberry001|strawberry00[12]|butter_cube_[123])/.test(body.userData?.floorAsset ?? '')
        && body.isEnabled()) imported.push(body);
  });
  assert.equal(imported.length, 11, 'five carriers and six separate berries/butter cubes');
  const starts = imported.map(body => ({...body.translation()}));
  imported.forEach((body, index) => body.setTranslation({x: 3 + index * .5, y: 1, z: 2}, true));
  for (let i = 0; i < 360; i++) { env.step(1/60, new Vector2()); props.update(); }
  for (const body of imported) {
    assert.ok(body.isEnabled(), 'fallen props remain in the game');
    const center = body.worldCom();
    assert.ok(center.y >= 0 && center.y < .4, 'solid floor supports each prop');
    assert.ok(body.isSleeping(), 'fallen props settle');
  }
  props.reset();
  imported.forEach((body, index) => {
    assert.ok(new Vector3().copy(body.translation()).distanceTo(starts[index]) < 1e-5);
  });
  env.physics.dispose();
});

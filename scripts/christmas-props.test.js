import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {Scene,Vector2,Box3,Vector3} from 'three';
import validator from 'gltf-validator';
import {parseGlb} from '../src/assets/load-assets.js';
import {createChristmasPhysics} from '../src/physics/christmas-physics.js';
import {createChristmasProps} from '../src/christmas-props.js';
import {CHRISTMAS_PROPS} from '../src/christmas-prop-layout.js';

// Bounds/physics need geometry only; actual texture decoding is checked in Chrome.
async function loadGeometry(path){
  const b=fs.readFileSync('src/'+decodeURIComponent(path.slice(2)));
  const length=b.readUInt32LE(12),json=JSON.parse(b.toString('utf8',20,20+length));
  function strip(o){for(const k of Object.keys(o??{})){if(k.endsWith('Texture'))delete o[k];else if(o[k]&&typeof o[k]==='object')strip(o[k]);}}
  strip(json.materials);
  const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const bin=b.subarray(20+length),out=Buffer.alloc(20+padded.length+bin.length);
  b.copy(out,0,0,12);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);bin.copy(out,20+padded.length);
  return parseGlb(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength));
}

test('all 27 supplied Christmas models validate and use distinct placements',async()=>{
  assert.equal(new Set(CHRISTMAS_PROPS.map(p=>p.id)).size,27);
  for(const spec of CHRISTMAS_PROPS){
    const b=fs.readFileSync('src/assets/models/level3/'+spec.file);
    const {issues}=await validator.validateBytes(new Uint8Array(b));
    assert.equal(issues.numErrors,0,spec.file+': '+JSON.stringify(issues.messages));
  }
});

test('Christmas props settle, remain supported after falling, and reset',async()=>{
  const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
  assert.equal(props.entries.length,27);
  for(const entry of props.entries){
    const measured=new Box3().setFromObject(entry.object,true).getSize(new Vector3());
    assert.ok(measured.distanceTo(entry.half.clone().multiplyScalar(2))<1e-5,'batching preserves transformed bounds: '+entry.spec.file);
  }
  const globe=props.entries.find(e=>e.spec.id===11);
  assert.ok(globe.half.x<.3 && globe.half.z<.3,'studio floor must not set globe scale');
  function step(count){for(let i=0;i<count;i++){env.step(1/60,new Vector2());props.update();}}
  step(900);
  const dynamic=props.entries.filter(e=>!e.spec.scenery);
  assert.equal(dynamic.length,21);
  for(const e of dynamic){assert.ok(e.body.isSleeping(),'must settle: '+e.spec.file);assert.ok(new Box3().setFromObject(e.object,true).min.y>=.795,'above tabletop: '+e.spec.file);}
  const fallen=dynamic.slice(0,4);
  fallen.forEach((e,i)=>{e.body.setTranslation({x:3+i*.5,y:1,z:1},true);e.body.setLinvel({x:0,y:0,z:0},true);});
  step(600);
  for(const e of fallen){assert.ok(e.body.isEnabled());assert.ok(new Box3().setFromObject(e.object,true).min.y>=-.016,'solid floor');assert.ok(e.body.isSleeping(),'fallen prop settles');}
  props.reset();env.resetCat();
  for(const e of dynamic)assert.ok(e.object.position.distanceTo(e.start)<1e-5);
  step(900);for(const e of dynamic)assert.ok(e.body.isSleeping(),'stable after restart: '+e.spec.file);
  env.physics.dispose();
});

test('walking cat physically pushes a Christmas prop and resets both audio phases',async()=>{
  const scene=new Scene(),sounds=[];
  const audio={playObjectContact:(id,landing)=>sounds.push({id,landing}),resetObjectContactSounds:()=>{sounds.length=0;}};
  const env=await createChristmasPhysics(.807,audio),props=await createChristmasProps(scene,env,.807,loadGeometry);
  const target=props.entries.find(e=>e.spec.id===25);
  for(const e of props.entries)if(!e.spec.scenery&&e!==target)e.body.setEnabled(false);
  target.body.setTranslation({x:0,y:target.start.y,z:.55},true);
  for(let i=0;i<60;i++){const p=env.catBody.translation();env.step(1/60,new Vector2(p.x,p.z+.02));props.update();}
  assert.ok(target.body.translation().z>.65,'cat pushes the actual rigid body');
  assert.equal(sounds.filter(s=>!s.landing).length,1,'one contact pop');
  target.body.setTranslation({x:3,y:1,z:0},true);target.body.setLinvel({x:0,y:0,z:0},true);
  for(let i=0;i<300;i++){const p=env.catBody.translation();env.step(1/60,new Vector2(p.x,p.z));props.update();}
  assert.equal(sounds.filter(s=>s.landing).length,1,'one independent landing pop');
  env.resetCat();assert.equal(sounds.length,0);assert.deepEqual({...env.catBody.linvel()},{x:0,y:0,z:0});
  env.physics.dispose();
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {Scene,Vector2,Box3,Vector3} from 'three';
import validator from 'gltf-validator';
import {parseGlb} from '../src/assets/load-assets.js';
import {createChristmasPhysics,CHRISTMAS_TABLE} from '../src/physics/christmas-physics.js';
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

test('all supplied Christmas models and reused mantel parts use distinct tabletop placements',async()=>{
  assert.equal(new Set(CHRISTMAS_PROPS.map(p=>p.id)).size,33);
  const sources=[...new Map(CHRISTMAS_PROPS.map(p=>[p.file,p])).values()];
  assert.equal(sources.length,28);
  for(const spec of sources){
    const b=fs.readFileSync('src/assets/models/'+(spec.roomPart?'':'level3/')+spec.file);
    const {issues}=await validator.validateBytes(new Uint8Array(b));
    assert.equal(issues.numErrors,0,spec.file+': '+JSON.stringify(issues.messages));
  }
});

test('Christmas props settle, remain supported after falling, and reset',async()=>{
  const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
  assert.equal(props.entries.length,33);
  for(const entry of props.entries){
    const measured=new Box3().setFromObject(entry.object,true).getSize(new Vector3());
    assert.ok(measured.distanceTo(entry.half.clone().multiplyScalar(2))<1e-5,'batching preserves transformed bounds: '+entry.spec.file);
  }
  const globe=props.entries.find(e=>e.spec.id===11);
  assert.ok(globe.half.x<.3 && globe.half.z<.3,'studio floor must not set globe scale');
  function step(count){for(let i=0;i<count;i++){env.step(1/60,new Vector2());props.update();}}
  step(900);
  const dynamic=props.entries.filter(e=>!e.spec.scenery);
  assert.equal(dynamic.length,33);
  for(const e of dynamic){assert.ok(e.body.isSleeping(),'must settle: '+e.spec.file);assert.ok(new Box3().setFromObject(e.object,true).min.y>=.795,'above tabletop: '+e.spec.file);}
  const fallen=dynamic.filter(e=>![2,11,17].includes(e.spec.id)).slice(0,4);
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

test('a paw strike launches a Christmas prop and reaches the edge of a large cushion',async()=>{
  const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
  try {
    const small=props.entries.find(e=>e.spec.id===25);
    const large=props.entries.find(e=>e.spec.id===20);
    for(const e of props.entries)if(e!==small&&e!==large)e.body.setEnabled(false);
    small.body.setTranslation({x:0,y:small.start.y,z:.4},true);
    large.body.setTranslation({x:1,y:large.start.y,z:.75},true);
    env.physics.world.propagateModifiedBodyPositionsToColliders();
    props.swat({x:0,y:.814,z:0},0);
    assert.ok(small.body.linvel().z>3,'a hit produces a noticeable forward launch');
    props.swat({x:1,y:.814,z:0},0);
    assert.ok(large.body.linvel().z>3,'the cushion edge can be hit although its centre is farther away');
  } finally {env.physics.dispose();}
});

test('cat reaches all four wooden edges and pushes props fully off the table',async()=>{
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const env=await createChristmasPhysics(),{world,rapier:R}=env.physics;
    const edge=dx?CHRISTMAS_TABLE.halfWidth:CHRISTMAS_TABLE.halfDepth;
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(dx*(edge-.2),.927,dz*(edge-.2)));
    body.enableCcd(true);world.createCollider(R.ColliderDesc.cuboid(.12,.12,.12).setMass(.08).setFriction(.65),body);
    for(let i=0;i<420;i++)env.step(1/60,new Vector2(dx*100,dz*100));
    const cat=env.catBody.translation(),p=body.translation();
    assert.ok(Math.abs(cat.x)<=CHRISTMAS_TABLE.halfWidth-CHRISTMAS_TABLE.edgeInset+.001);
    assert.ok(Math.abs(cat.z)<=CHRISTMAS_TABLE.halfDepth-CHRISTMAS_TABLE.edgeInset+.001);
    assert.ok(p.y<.3,'walking cat can knock a prop off edge '+dx+','+dz);
    assert.ok(dx*p.x+dz*p.z>edge,'prop clears the actual wooden edge');
    env.physics.dispose();
  }
});

test('snow stays inside a moving globe and lantern light follows its prop',async()=>{
  const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
  const globe=props.entries.find(e=>e.spec.id===11),lantern=props.entries.find(e=>e.spec.id===17);
  const snow=globe.effects,attribute=snow.snow.geometry.attributes.position;
  const initial=attribute.array.slice();snow.update(1/60);
  assert.ok(attribute.getY(0)<initial[1],'snow falls');
  for(let i=0;i<180;i++){
    globe.object.rotation.x=i*.02;globe.object.rotation.z=i*.01;snow.update(1/60);
    for(let j=0;j<attribute.count;j++)assert.ok(new Vector3().fromBufferAttribute(attribute,j).distanceTo(snow.center)<=snow.radius);
  }
  snow.reset();assert.deepEqual(attribute.array,initial,'restart restores snow particles');
  assert.equal(lantern.effects.light.parent,lantern.object);
  assert.ok(lantern.effects.light.intensity>0);
  lantern.effects.update(.05);assert.notEqual(lantern.effects.light.intensity,1.25);
  lantern.effects.reset();assert.equal(lantern.effects.light.intensity,1.25);
  env.physics.dispose();
});

test('lantern, light string and globe fracture at first floor contact and reset',async()=>{
 const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
 const glass=props.entries.filter(e=>[2,11,17].includes(e.spec.id));
 glass.forEach((e,i)=>e.body.setTranslation({x:3+i,y:1,z:1},true));
 for(let i=0;i<300;i++){env.step(1/60,new Vector2());props.update(1/60);}
 for(const entry of glass){assert.equal(entry.body.isEnabled(),false);assert.equal(entry.object.visible,false);}
 props.reset();for(const entry of glass){assert.ok(entry.body.isEnabled());assert.ok(entry.object.visible);}
 env.physics.dispose();
});

test('fire spreads to a nearby combustible prop and reset restores materials',async()=>{
 const {createChristmasFire}=await import('../src/christmas-room-effects.js');
 const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
 const room=await loadGeometry('./assets/models/christmas-room.glb');
 const gift=props.entries.find(e=>e.spec.id===10),bear=props.entries.find(e=>e.spec.id===19);
 gift.object.position.set(0,1,0);bear.object.position.set(.1,1,0);
 const fire=createChristmasFire(scene,[gift,bear],room);assert.ok(fire.ignite(gift));
 for(let i=0;i<50;i++)fire.update(.05);
 assert.ok(fire.burning.has(19));fire.reset();assert.equal(fire.burning.size,0);
 assert.ok(!scene.getObjectByName('Spreading_prop_fire'));env.physics.dispose();
});

test('random Christmas layouts stay stable before and after repeated restarts',async()=>{
 const {randomizeTableItems,parkTableProps}=await import('../src/random-prop-layout.js');
 const scene=new Scene(),env=await createChristmasPhysics(),props=await createChristmasProps(scene,env,.807,loadGeometry);
 for(let round=0;round<3;round++){
  randomizeTableItems(props.spawnItems,{halfWidth:1.95,halfDepth:2.65});props.reset();env.resetCat();parkTableProps(env.physics.world,env.catBody);
  for(let i=0;i<900;i++){env.step(1/60,new Vector2());props.update(1/60);}
  for(const e of props.entries){assert.ok(e.body.isEnabled(),'no initial drop or fracture');assert.ok(e.body.isSleeping(),'random Christmas prop settles');}
 }
 env.physics.dispose();
});

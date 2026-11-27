import assert from 'node:assert/strict';import {test} from 'node:test';
import {randomizeTableItems} from '../src/random-prop-layout.js';
import fs from 'node:fs';
test('random layouts fit every Christmas footprint without overlaps or spawn obstruction',()=>{
 const report=JSON.parse(fs.readFileSync('docs/assets/christmas-level-3-handoff.json'));
 let seed=721;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let previous;
 for(let round=0;round<40;round++){
  const items=report.assets.map(e=>({key:e.id,halfX:e.collider.halfExtents[0],halfZ:e.collider.halfExtents[2],apply(){}}));
  const placed=randomizeTableItems(items,{halfWidth:1.95,halfDepth:2.65},{random});
  assert.equal(placed.length,items.length);
  for(const p of placed){assert.ok(Math.abs(p.x)+p.item.halfX<=1.88);assert.ok(Math.abs(p.z)+p.item.halfZ<=2.58);assert.ok(Math.abs(p.x)>=p.item.halfX+.4||Math.abs(p.z)>=p.item.halfZ+.43);}
  for(let i=0;i<placed.length;i++)for(let j=0;j<i;j++){const a=placed[i],b=placed[j];assert.ok(Math.abs(a.x-b.x)>=a.item.halfX+b.item.halfX+.055||Math.abs(a.z-b.z)>=a.item.halfZ+b.item.halfZ+.055);}
  const positions=placed.map(p=>[p.x,p.z]);if(previous)assert.notDeepEqual(positions,previous);previous=positions;
 }
});
test('round table layout checks corners and plans atomically',()=>{
 const items=Array.from({length:22},(_,key)=>({key,halfX:.17,halfZ:.16,apply(){}}));
 const result=randomizeTableItems(items,{radius:1.95});for(const p of result)assert.ok(Math.hypot(Math.abs(p.x)+.17,Math.abs(p.z)+.16)<=1.88);
 let applied=false;assert.throws(()=>randomizeTableItems([{halfX:5,halfZ:5,apply(){applied=true;}}],{radius:1.95},{random:()=>.5}));assert.equal(applied,false);
});

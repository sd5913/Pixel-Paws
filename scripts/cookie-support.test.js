import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Scene,Box3} from 'three';
import {createBakingPhysics} from '../src/physics/baking-physics.js';
import {createLooseKitchenPart} from '../src/physics/loose-kitchen-part.js';
import {parseGlb} from '../src/assets/load-assets.js';

test('cookie cutters settle flat without levitating after repeated resets',async()=>{
  const scene=new Scene(),env=await createBakingPhysics(.78,1.95);
  try{
    env.catBody.setTranslation({x:0,y:10,z:0},true);
    const b=fs.readFileSync('src/assets/models/level-2/10-cookie-cutters.glb');
    const model=await parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
    model.scale.setScalar(.1);model.position.y=.9;scene.add(model);
    const nodes=[...model.children];
    const parts=nodes.map(node=>createLooseKitchenPart(scene,env.physics,[node],{tableSupport:true}));
    for(let round=0;round<3;round++){
      for(let frame=0;frame<600;frame++){
        env.physics.step(1/60);
        for(const part of parts)part.update(.78,1.95);
      }
      scene.updateMatrixWorld(true);
      for(const node of nodes){
        const box=new Box3().setFromObject(node,true);
        assert.ok(box.min.y>.785&&box.min.y<.795,'cutter rests at cloth height');
      }
      for(const part of parts)part.reset();
    }
  }finally{env.physics.dispose();}
});

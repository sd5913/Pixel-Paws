import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Scene,Group,Mesh,SphereGeometry,MeshStandardMaterial,Vector3} from 'three';
import {createBakingPhysics} from '../src/physics/baking-physics.js';
import {createLooseKitchenPart} from '../src/physics/loose-kitchen-part.js';

test('eggs survive table impact and break on their first floor contact',async()=>{
  const environment=await createBakingPhysics(.78,1.95);
  const scene=new Scene();
  const {world}=environment.physics;
  const eggs=[];
  try {
    for(const x of [0,2.9]){
      const carrier=new Group();scene.add(carrier);
      const egg=new Mesh(new SphereGeometry(.04,12,8),new MeshStandardMaterial());
      egg.position.set(x,1.4,0);carrier.add(egg);
      const part=createLooseKitchenPart(scene,environment.physics,[egg],{
        held:true,egg:true,mass:.035,floorCollider:environment.floorCollider,
      });
      part.release({x:0,y:-2,z:0});eggs.push({egg,part,carrier});
    }
    for(let frame=0;frame<180;frame++){
      environment.physics.step(1/60);
      for(const {part} of eggs)part.update(.78,1.95);
    }
    assert.equal(eggs[0].egg.parent.visible,true,'table impact keeps egg whole');
    assert.ok(eggs[0].egg.getWorldPosition(new Vector3()).y>.78);
    assert.equal(eggs[1].egg.parent.visible,false,'floor contact breaks egg');
    for(const {part,egg,carrier} of eggs){part.reset();assert.equal(egg.parent,carrier);}
  } finally {environment.physics.dispose();}
});

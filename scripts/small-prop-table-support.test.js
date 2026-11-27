import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, SphereGeometry, MeshStandardMaterial, Box3, Vector3 } from 'three';
import { createBakingPhysics } from '../src/physics/baking-physics.js';
import { createLooseKitchenPart } from '../src/physics/loose-kitchen-part.js';
import { createTabletopSupport } from '../src/physics/tabletop-support.js';

test('small flat and convex parts stay visible during repeated swats and still fall from the edge', async () => {
  for (const flat of [true,false]) {
    const env=await createBakingPhysics(.78,1.95),scene=new Scene();env.catBody.setEnabled(false);
    const mesh=new Mesh(flat?new BoxGeometry(.09,.012,.06):new SphereGeometry(.025,8,6),new MeshStandardMaterial());
    mesh.name='regression-small-piece';mesh.position.set(0,.82,0);scene.add(mesh);
    const part=createLooseKitchenPart(scene,env.physics,[mesh],{tableSupport:flat});
    let body;env.physics.world.forEachRigidBody(b=>{if(b.userData?.floorAsset===mesh.name)body=b;});
    let insideFrames=0;
    try {
      for(let frame=0;frame<300;frame++){
        const p=part.position;
        if(frame%12===0 && frame<120)part.swat({x:p.x,y:.787,z:p.z-.3},0);
        if(frame%30===0 && Math.hypot(p.x,p.z)<1.5)body.setAngvel({x:15,y:6,z:9},true);
        env.physics.step(1/60);part.update(.78,1.95);
        const bounds=new Box3().setFromObject(mesh,true);
        if(Math.max(...[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.z,bounds.max.z].map(z=>Math.hypot(x,z))))<1.9 && body.translation().y>.7){
          insideFrames++;assert.ok(bounds.min.y>=.785,'visible geometry penetrated the cloth: '+bounds.min.y);
        }
      }
      assert.ok(insideFrames>10);
      body.setTranslation({x:2.5,y:.8,z:0},true);body.setLinvel({x:0,y:0,z:0},true);
      for(let frame=0;frame<180;frame++){env.physics.step(1/60);part.update(.78,1.95);}
      assert.ok(part.position.y<.3,'table support pulled a fallen piece back up');
      assert.equal(part.hasLeftTable(.78,1.95),true);
    } finally {env.physics.dispose();mesh.geometry.dispose();mesh.material.dispose();}
  }
});

test('support does not lift a deeply fallen piece or one straddling the table edge', async () => {
  const env=await createBakingPhysics(.78,1.95),body=env.physics.world.createRigidBody(env.physics.rapier.RigidBodyDesc.dynamic());
  const support=createTabletopSupport(body,new Box3(new Vector3(-.05,-.01,-.05),new Vector3(.05,.01,.05)),.78,1.95);
  try {
    for(const p of [{x:0,y:.1,z:0},{x:1.94,y:.77,z:0}]){body.setTranslation(p,true);support();assert.equal(body.translation().y,Math.fround(p.y));}
  } finally {env.physics.dispose();}
});

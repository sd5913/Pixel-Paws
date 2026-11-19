import { createVaseBreakage } from './physics/vase-breakage.js';
import { createLooseKitchenPart } from './physics/loose-kitchen-part.js';
import * as THREE from 'three';
import { loadGlb } from './assets/load-assets.js';

const ITEMS = [
  ['01-kitchen-scale', -.95,-1.10,.39,.60,.45],
  ['02-recipe-book', 0,-1.30,.43,.50,.16],
  ['03-utensil-holder', .98,-1.05,.30,.52,.20],
  ['04-glass-spice-jar', -1.35,-.35,.25,.36,.18],
  ['06-strawberry-jam', -1.30,.35,.27,.34,.18],
  ['07-piping-bag', -.90,1.0,.34,.35,.10],
  ['08-wooden-cutting-board', .65,.95,.54,.12,.35],
  ['09-ceramic-bowl', 1.30,.35,.35,.28,.20],
  ['10-cookie-cutters', -.40,1.40,.32,.16,.10],
  ['11-oven-mitt', .15,1.45,.32,.13,.08],
  ['12-cake-stand', 1.15,-.30,.43,.47,.30],
  ['13-egg-tray', -.65,.40,.42,.20,.20],
  ['14-wooden-rolling-pin', .05,.65,.48,.15,.12],
];

export async function createKitchenProps(scene, environment, tableHeight, loadModel = loadGlb) {
  const {world, rapier:R} = environment.physics;
  const looseParts = [];
  const breakages=[];
  const jamSpills=[];
  const entries = await Promise.all(ITEMS.map(async ([id,x,z,width,maxHeight,mass]) => {
    const model = (await loadModel('./assets/models/level-2/'+id+'.glb')).clone(true);
    const object = new THREE.Group();
    object.add(model);
    if(['02-recipe-book','07-piping-bag'].includes(id))model.rotation.x=-Math.PI/2;
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object,true);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = Math.min(width / Math.max(size.x,size.z),maxHeight/size.y);
    object.scale.setScalar(scale);
    const center = bounds.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    const half = size.multiplyScalar(scale/2);
    const start = new THREE.Vector3(x-center.x,tableHeight+.012-(center.y-half.y),z-center.z);
    object.position.copy(start);
    object.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    scene.add(object);
    object.updateMatrixWorld(true);
    const parts=[];
    const children=[...model.children];
    if(id==='03-utensil-holder')for(const node of children.filter(node=>!node.name.startsWith('01_')))parts.push(createLooseKitchenPart(scene,environment.physics,[node],{held:true}));
    if(id==='12-cake-stand')for(const node of children.filter(node=>/^Cake_[12]_assembly/.test(node.name)))parts.push(createLooseKitchenPart(scene,environment.physics,[node],{mass:.06}));
    if(id==='13-egg-tray')for(const node of children.filter(node=>node.name.startsWith('Egg_')))parts.push(createLooseKitchenPart(scene,environment.physics,[node],{held:true,egg:true,mass:.035,floorCollider:environment.floorCollider}));
    if(id==='10-cookie-cutters')for(const node of children)parts.push(createLooseKitchenPart(scene,environment.physics,[node],{mass:.025,tableSupport:true}));
    looseParts.push(...parts);
    const held=parts.filter(part=>!part.released);
    // Exclude detachable contents when measuring the carrier collider.
    const excluded=children.filter(node=>id==='03-utensil-holder'?!node.name.startsWith('01_'):id==='13-egg-tray'?node.name.startsWith('Egg_'):false);
    const visibility=excluded.map(node=>node.visible);for(const node of excluded)node.removeFromParent();
    object.updateMatrixWorld(true);
    const carrierBounds=new THREE.Box3().setFromObject(object,true);
    for(let i=0;i<excluded.length;i++){model.add(excluded[i]);excluded[i].visible=visibility[i];}
    let body=null;
    if(!carrierBounds.isEmpty()){
      const localCenter=carrierBounds.getCenter(new THREE.Vector3()).sub(start);
      const carrierHalf=carrierBounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
      body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...start.toArray()));
      body.enableCcd(true);body.setSoftCcdPrediction(.05);
      const collider=world.createCollider(R.ColliderDesc.cuboid(carrierHalf.x,carrierHalf.y,carrierHalf.z)
        .setTranslation(...localCenter.toArray()).setMass(mass).setFriction(.65).setRestitution(.04)
        .setSolverGroups((2<<16)|3),body);
      if(id==='06-strawberry-jam'){
        breakages.push(createVaseBreakage(environment.physics,{object3D:object},{rigidBody:body,colliders:[collider]},environment.floorCollider,{
          fragmentColor:'#e4e5d8',
          onBreak(position){
            const material=new THREE.MeshStandardMaterial({color:'#9b152f',roughness:.28});
            const spill=new THREE.Mesh(new THREE.SphereGeometry(1,32,10),material);
            spill.position.set(position.x,.009,position.z);spill.scale.set(.035,.009,.03);scene.add(spill);jamSpills.push(spill);
          },
        }));
      }
    }
    return {id,object,body,start,held,rotation:object.quaternion.clone()};
  }));
  return {
    update() {
      for(const {object,body,held} of entries){
        if(!body)continue;
        object.position.copy(body.translation());
        object.quaternion.copy(body.rotation());
        object.updateMatrixWorld(true);
        const up=new THREE.Vector3(0,1,0).applyQuaternion(object.quaternion);
        if(up.y<Math.cos(Math.PI/7)||Math.hypot(body.linvel().x,body.linvel().z)>.8)for(const part of held)part.release(body.linvel());
      }
      for(const part of looseParts)part.update(tableHeight,1.95);
      for(const breakage of breakages)breakage.update();
      for(const spill of jamSpills)spill.scale.lerp(new THREE.Vector3(.24,.009,.19),.06);
    },
    swat(position,yaw) {
      const forward = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
      for(const part of looseParts)part.swat(position,yaw);
      for(const {body} of entries){
        if(!body)continue;
        const center=body.worldCom();
        const dx=center.x-position.x,dz=center.z-position.z;
        if(Math.hypot(dx,dz)>.75 || dx*forward.x+dz*forward.z<-.1)continue;
        body.applyImpulseAtPoint({x:forward.x*.25,y:.025,z:forward.z*.25},
          {x:center.x,y:center.y+.10,z:center.z},true);
      }
    },
    reset() {
      for(const {object,body,start,rotation} of entries){
        if(!body)continue;
        body.setTranslation(start,true);body.setRotation(rotation,true);
        body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
        body.resetForces(true);body.resetTorques(true);
        object.position.copy(start);object.quaternion.copy(rotation);
      }
      scene.updateMatrixWorld(true);
      for(const part of looseParts)part.reset();
      for(const breakage of breakages)breakage.reset();
      for(const spill of jamSpills){spill.removeFromParent();spill.geometry.dispose();spill.material.dispose();}jamSpills.length=0;
    },
  };
}

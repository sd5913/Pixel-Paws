import * as THREE from 'three';
import {loadGlb} from './assets/load-assets.js';
import {CHRISTMAS_PROPS} from './christmas-prop-layout.js';
import {SWAT,swatIntersectsBody} from './swat.js';
import {batchStaticMeshes} from './assets/batch-static-meshes.js';
import {createChristmasEffects} from './christmas-effects.js';

export async function loadChristmasPropSource(spec,loadModel=loadGlb){
  if(!spec.roomPart)return loadModel('./assets/models/level3/'+encodeURIComponent(spec.file));
  const room=await loadModel('./assets/models/christmas-room.glb');
  room.updateMatrixWorld(true);
  const group=new THREE.Group(),nodes=[];
  room.traverse(node=>{
    if(!node.isMesh)return;
    const matches=spec.roomPart==='candle'?/^Candle/.test(node.name):/^(Little_tree_trunk|Mantel_fir)/.test(node.name);
    if(matches){const bounds=new THREE.Box3().setFromObject(node,true);if(Math.sign(bounds.getCenter(new THREE.Vector3()).x)===spec.side)nodes.push(node);}
  });
  if(!nodes.length)throw new Error('Missing mantel decoration: '+spec.roomPart);
  const trunk=nodes.find(n=>n.name.startsWith('Little_tree_trunk'));
  const trunkZ=trunk?new THREE.Box3().setFromObject(trunk,true).getCenter(new THREE.Vector3()).z:0;
  for(const node of nodes){
    const copy=node.clone(true);copy.matrix.copy(node.matrixWorld);copy.matrix.decompose(copy.position,copy.quaternion,copy.scale);
    copy.traverse(child=>child.visible=true);
    // Align the existing fir's foliage and trunk after the room's old rear offset.
    if(trunk&&node!==trunk)copy.position.z+=trunkZ-new THREE.Box3().setFromObject(node,true).getCenter(new THREE.Vector3()).z;
    group.add(copy);
  }
  return group;
}

export function prepareChristmasModel(source, spec) {
  const object = new THREE.Group();
  object.name = 'christmas-prop-' + String(spec.id).padStart(2,'0');
  const model = source.clone(true);
  // The snow globe export also contains its enormous studio presentation floor.
  const backgrounds=[];
  model.traverse(node=>{if(/^Studio[_ ](?:floor|ground)/i.test(node.name))backgrounds.push(node);});
  for(const node of backgrounds)node.removeFromParent();
  // Some exported glass slots were left opaque despite their authored names.
  // Keep the glass readable on mobile without a second transmission render pass.
  model.traverse(node=>{
    if(!node.isMesh)return;
    const glass=material=>{
      if(!/Crystal - transparent|Clear globe|Light amber glazing/.test(material.name))return material;
      const copy=material.clone();copy.transparent=true;copy.opacity=.14;
      copy.depthWrite=false;copy.metalness=0;copy.roughness=.12;
      copy.side=THREE.FrontSide;if('transmission' in copy)copy.transmission=0;
      node.castShadow=false;
      return copy;
    };
    node.material=Array.isArray(node.material)?node.material.map(glass):glass(node.material);
  });
  if(spec.id===13)model.traverse(node=>{
    if(!node.isMesh)return;
    const restore=material=>{
      const copy=material.clone();
      if(/spiral/i.test(material.name)){
        const size=64,data=new Uint8Array(size*size*4);
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){
          const red=Math.floor((x+y)/8)%2===0,i=(y*size+x)*4;
          data[i]=red?194:255;data[i+1]=red?30:240;data[i+2]=red?44:215;data[i+3]=255;
        }
        const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;
        copy.map=texture;copy.color.set('#ffffff');copy.needsUpdate=true;
      }
      return copy;
    };
    node.material=Array.isArray(node.material)?node.material.map(restore):restore(node.material);
  });
  object.add(model);
  if(spec.flat)model.rotation.x=-Math.PI/2;
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object,true);
  if(bounds.isEmpty())throw new Error('Empty Christmas model: '+spec.file);
  const nativeSize=bounds.getSize(new THREE.Vector3());
  const scale=Math.min(spec.width/Math.max(nativeSize.x,nativeSize.z),spec.height/nativeSize.y);
  // Center the instance at its physical center. Source node transforms stay intact.
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  object.scale.setScalar(scale);
  const half=nativeSize.multiplyScalar(scale/2);
  batchStaticMeshes(model);
  return {object,half,scale};
}

export async function createChristmasProps(scene, environment, tableHeight, loadModel=loadGlb) {
  const {world,rapier:R}=environment.physics;
  const sources=new Map();
  const cachedLoad=path=>{if(!sources.has(path))sources.set(path,loadModel(path));return sources.get(path);};
  const entries=await Promise.all(CHRISTMAS_PROPS.map(async spec=>{
    const source=await loadChristmasPropSource(spec,cachedLoad);
    const {object,half}=prepareChristmasModel(source,spec);
    const start=new THREE.Vector3(spec.x,(spec.y??tableHeight+.012)+half.y,spec.z);
    object.position.copy(start);
    object.traverse(node=>{
      if(!node.isMesh)return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      node.castShadow=!materials.some(material=>material.transparent);
      node.receiveShadow=true;
    });
    scene.add(object);
    const body=world.createRigidBody((spec.scenery?R.RigidBodyDesc.fixed():R.RigidBodyDesc.dynamic()).setTranslation(...start.toArray()));
    body.userData={floorAsset:object.name};
    if(!spec.scenery){body.enableCcd(true);body.setSoftCcdPrediction(.04);body.setLinearDamping(.8);body.setAngularDamping(1.2);body.setAdditionalSolverIterations(8);}
    world.createCollider(R.ColliderDesc.cuboid(half.x,Math.max(.006,half.y),half.z)
      .setMass(spec.scenery?0:.08).setFriction(.65).setRestitution(0).setContactSkin(.002),body);
    const entry={spec,object,body,start,half};
    entry.effects=createChristmasEffects(entry);
    return entry;
  }));
  return {
    entries,
    update(delta=0){for(const {object,body,spec,effects} of entries){if(!spec.scenery){object.position.copy(body.translation());object.quaternion.copy(body.rotation());}effects?.update(delta);}},
    swat(position,yaw){
      const hits = [];
      for(const {body,spec} of entries){
        if(spec.scenery||!swatIntersectsBody(environment.physics,body,position,yaw))continue;
        environment.contactAudio.notifyHit(body);
        hits.push('christmas-' + spec.id);
        const center=body.worldCom();
        body.applyImpulseAtPoint({x:Math.sin(yaw)*SWAT.forwardImpulse,y:SWAT.upwardImpulse,z:Math.cos(yaw)*SWAT.forwardImpulse},{x:center.x,y:center.y+.04,z:center.z},true);
      }
      return hits;
    },
    reset(){
      for(const {object,body,start,spec,effects} of entries){
        if(spec.scenery)continue;
        body.setTranslation(start,true);body.setRotation({x:0,y:0,z:0,w:1},true);
        body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.resetForces(true);body.resetTorques(true);
        object.position.copy(start);object.quaternion.identity();
        effects?.reset();
      }
    },
  };
}

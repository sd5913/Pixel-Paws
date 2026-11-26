import * as THREE from 'three';
import {loadGlb} from './assets/load-assets.js';
import {CHRISTMAS_PROPS} from './christmas-prop-layout.js';
import {inSwatRange} from './swat.js';
import {batchStaticMeshes} from './assets/batch-static-meshes.js';

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
  const entries=await Promise.all(CHRISTMAS_PROPS.map(async spec=>{
    const source=await loadModel('./assets/models/level3/'+encodeURIComponent(spec.file));
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
    return {spec,object,body,start,half};
  }));
  return {
    entries,
    update(){for(const {object,body,spec} of entries)if(!spec.scenery){object.position.copy(body.translation());object.quaternion.copy(body.rotation());}},
    swat(position,yaw){
      for(const {body,spec} of entries){
        if(spec.scenery||!inSwatRange(position,yaw,body.worldCom()))continue;
        environment.contactAudio.notifyHit(body);
        const center=body.worldCom();
        body.applyImpulseAtPoint({x:Math.sin(yaw)*.12,y:.012,z:Math.cos(yaw)*.12},{x:center.x,y:center.y+.04,z:center.z},true);
      }
    },
    reset(){
      for(const {object,body,start,spec} of entries){
        if(spec.scenery)continue;
        body.setTranslation(start,true);body.setRotation({x:0,y:0,z:0,w:1},true);
        body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.resetForces(true);body.resetTorques(true);
        object.position.copy(start);object.quaternion.identity();
      }
    },
  };
}

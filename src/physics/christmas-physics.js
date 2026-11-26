import { JOYSTICK_SPEED } from '../joystick.js';
import {Box3,Vector3} from 'three';
import {createPhysicsWorld} from './physics-world.js';
import {createFloorContactAudio} from '../feedback/floor-contact-audio.js';

export const CHRISTMAS_TABLE=Object.freeze({halfWidth:1.95,halfDepth:2.65,edgeInset:.18});
export function clampChristmasTarget(x,z){
  const limitX=CHRISTMAS_TABLE.halfWidth-CHRISTMAS_TABLE.edgeInset;
  const limitZ=CHRISTMAS_TABLE.halfDepth-CHRISTMAS_TABLE.edgeInset;
  return {x:Math.max(-limitX,Math.min(limitX,x)),z:Math.max(-limitZ,Math.min(limitZ,z))};
}

export async function createChristmasPhysics(tableHeight=.807,audio=null){
  const physics=await createPhysicsWorld();
  const {world,rapier:R}=physics;
  const fixed=world.createRigidBody(R.RigidBodyDesc.fixed());
  const tableGroup=(16<<16)|0xffff;
  world.createCollider(R.ColliderDesc.cuboid(CHRISTMAS_TABLE.halfWidth,.075,CHRISTMAS_TABLE.halfDepth).setTranslation(0,tableHeight-.075,0).setFriction(.65).setCollisionGroups(tableGroup),fixed);
  const floorCollider=world.createCollider(R.ColliderDesc.cuboid(6,.05,6).setTranslation(0,-.06,0).setFriction(.7),fixed);
  world.createCollider(R.ColliderDesc.cuboid(6,2,.12).setTranslation(0,2,-3.7),fixed);
  // Closed supporting furniture, below the flat tabletop.
  for(const x of [-1.65,1.65])for(const z of [-2.25,2.25])world.createCollider(R.ColliderDesc.cuboid(.08,.34,.08).setTranslation(x,.34,z),fixed);
  const catBody=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,tableHeight+.2,0));
  catBody.userData={floorAsset:'player-cat'};
  world.createCollider(R.ColliderDesc.cuboid(.21,.22,.25).setMass(.45).setFriction(0).setRestitution(0)
    .setCollisionGroups((1<<16)|0xffef),catBody);
  catBody.setEnabledTranslations(true,false,true,true);catBody.lockRotations(true,true);catBody.setGravityScale(0,true);catBody.enableCcd(true);
  const contactAudio=createFloorContactAudio(physics,floorCollider,audio);contactAudio.setCatBody(catBody);
  return {
    physics,catBody,floorCollider,contactAudio,
    step(delta,target,maxSpeed=JOYSTICK_SPEED.walk){
      if(delta<=0)return;
      const bounded=clampChristmasTarget(target.x,target.y);
      const p=catBody.translation(),desired={x:(bounded.x-p.x)/delta,z:(bounded.z-p.z)/delta};
      const limitSpeed=Math.min(JOYSTICK_SPEED.dash,Math.max(0,maxSpeed));
      const speed=Math.hypot(desired.x,desired.z);if(speed>limitSpeed){desired.x*=limitSpeed/speed;desired.z*=limitSpeed/speed;}
      physics.step(delta,(_world,timestep)=>{
        const p=catBody.translation(),bounded=clampChristmasTarget(p.x,p.z);
        if(p.x!==bounded.x||p.z!==bounded.z){
          const v=catBody.linvel();
          catBody.setTranslation({x:bounded.x,y:p.y,z:bounded.z},true);
          catBody.setLinvel({x:p.x===bounded.x?v.x:0,y:0,z:p.z===bounded.z?v.z:0},true);
        }
        contactAudio.update();
      },(_world,timestep)=>{
        const v=catBody.linvel();let dx=desired.x-v.x,dz=desired.z-v.z;
        const change=Math.hypot(dx,dz),limit=(limitSpeed>JOYSTICK_SPEED.walk?30:18)*timestep;
        if(change>limit){dx*=limit/change;dz*=limit/change;}
        if(Math.hypot(dx,dz)>.0001)catBody.applyImpulse({x:dx*.45,y:0,z:dz*.45},true);
      });
    },
    resetCat(){contactAudio.reset();catBody.setTranslation({x:0,y:tableHeight+.2,z:0},true);catBody.setLinvel({x:0,y:0,z:0},true);catBody.setAngvel({x:0,y:0,z:0},true);catBody.resetForces(true);catBody.resetTorques(true);},
  };
}

export function addChristmasEnvironmentColliders(physics,room){
 const {world,rapier:R}=physics;room.updateMatrixWorld(true);
 const fixed=world.createRigidBody(R.RigidBodyDesc.fixed());
 // Seal the fireplace frontage so falling props cannot enter the firebox.
 world.createCollider(R.ColliderDesc.cuboid(1.7,1.6,.12).setTranslation(0,1.6,-2.84),fixed);
 room.traverse(node=>{
  if(!node.isMesh||!node.visible||/Floor|Walnut_tabletop|Wood_grain|blanket|fringe|flame|heart|ember|Cottage|cottage|Window_cross/.test(node.name))return;
  if(!/Table_leg|Fireplace|Hearth|Mantel|Back_wall|Christmas_tree|Wrapped_gift|Gift_lid|Candle|Little_tree/.test(node.name))return;
  const box=new Box3().setFromObject(node,true),half=box.getSize(new Vector3()).multiplyScalar(.5),center=box.getCenter(new Vector3());
  if(Math.min(half.x,half.y,half.z)<.005)return;
  world.createCollider(R.ColliderDesc.cuboid(half.x,half.y,half.z).setTranslation(center.x,center.y,center.z).setFriction(.7),fixed);
 });
}

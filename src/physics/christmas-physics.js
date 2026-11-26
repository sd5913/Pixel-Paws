import {createPhysicsWorld} from './physics-world.js';
import {createFloorContactAudio} from '../feedback/floor-contact-audio.js';

export async function createChristmasPhysics(tableHeight=.807,audio=null){
  const physics=await createPhysicsWorld();
  const {world,rapier:R}=physics;
  const fixed=world.createRigidBody(R.RigidBodyDesc.fixed());
  const tableGroup=(16<<16)|0xffff;
  world.createCollider(R.ColliderDesc.cuboid(1.95,.075,2.65).setTranslation(0,tableHeight-.075,0).setFriction(.65).setCollisionGroups(tableGroup),fixed);
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
    step(delta,target){
      if(delta<=0)return;
      const p=catBody.translation(),desired={x:(target.x-p.x)/delta,z:(target.y-p.z)/delta};
      const speed=Math.hypot(desired.x,desired.z);if(speed>1.4){desired.x*=1.4/speed;desired.z*=1.4/speed;}
      physics.step(delta,()=>contactAudio.update(),(_world,timestep)=>{
        const v=catBody.linvel();let dx=desired.x-v.x,dz=desired.z-v.z;
        const change=Math.hypot(dx,dz),limit=7*timestep;
        if(change>limit){dx*=limit/change;dz*=limit/change;}
        if(Math.hypot(dx,dz)>.0001)catBody.applyImpulse({x:dx*.45,y:0,z:dz*.45},true);
      });
    },
    resetCat(){contactAudio.reset();catBody.setTranslation({x:0,y:tableHeight+.2,z:0},true);catBody.setLinvel({x:0,y:0,z:0},true);catBody.setAngvel({x:0,y:0,z:0},true);catBody.resetForces(true);catBody.resetTorques(true);},
  };
}

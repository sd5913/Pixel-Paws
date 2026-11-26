import { JOYSTICK_SPEED } from '../joystick.js';
import { createPhysicsWorld } from './physics-world.js';
import { addBakingChairColliders } from './baking-chair-colliders.js';
import { addBakingWindowColliders } from './baking-window-colliders.js';

export async function createBakingPhysics(tableHeight, tableRadius) {
  const physics = await createPhysicsWorld();
  const { world, rapier: R } = physics;
  const table = world.createRigidBody(R.RigidBodyDesc.fixed());
  const tableGroup=(16<<16)|0xffff;
  world.createCollider(R.ColliderDesc.cylinder(.075,tableRadius+.025)
    .setTranslation(0,tableHeight+.007-.075,0).setFriction(.6).setCollisionGroups(tableGroup),table);
  // Keep the skirt support below the tabletop so flat props have a single contact face.
  const rim=[];
  for(const [radius,y] of [[tableRadius+.025,tableHeight-.015],[tableRadius+.075,tableHeight-.305]]){
    for(let i=0;i<48;i++){const angle=i/48*Math.PI*2;rim.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius);}
  }
  world.createCollider(R.ColliderDesc.convexHull(new Float32Array(rim))
    .setFriction(.35).setCollisionGroups(tableGroup),table);
  const floor = world.createRigidBody(R.RigidBodyDesc.fixed());
  const floorCollider = world.createCollider(R.ColliderDesc.cuboid(10,.05,10).setTranslation(0,-.05,0),floor);
  addBakingChairColliders(physics,tableRadius);
  addBakingWindowColliders(physics,tableRadius);
  const catBody=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,tableHeight+.2,0));
  world.createCollider(R.ColliderDesc.cuboid(.21,.22,.25).setMass(.45).setFriction(0).setRestitution(0)
    .setCollisionGroups((1<<16)|0xffef).setSolverGroups((1<<16)|0xffff),catBody);
  catBody.setEnabledTranslations(true,false,true,true);catBody.lockRotations(true,true);catBody.setGravityScale(0,true);catBody.enableCcd(true);
  function resetCat(position={x:0,z:0}){
    catBody.setTranslation({x:position.x,y:tableHeight+.2,z:position.z},true);
    catBody.setLinvel({x:0,y:0,z:0},true);catBody.setAngvel({x:0,y:0,z:0},true);
    catBody.resetForces(true);catBody.resetTorques(true);
  }
  function step(delta,target,maxSpeed=JOYSTICK_SPEED.walk){
    if(delta<=0)return;
    const origin=catBody.translation();
    const desired={x:(target.x-origin.x)/delta,z:(target.y-origin.z)/delta};
    const speed=Math.hypot(desired.x,desired.z);
    const speedLimit = Math.min(JOYSTICK_SPEED.dash, Math.max(0, maxSpeed));
    if(speed>speedLimit){desired.x*=speedLimit/speed;desired.z*=speedLimit/speed;}
    physics.step(delta,()=>{},(_world,timestep)=>{
      const velocity=catBody.linvel();let dx=desired.x-velocity.x,dz=desired.z-velocity.z;
      // Supply enough horizontal force to overcome tabletop friction without teleporting props.
      const acceleration = speedLimit > JOYSTICK_SPEED.walk ? 30 : 18;
      const change=Math.hypot(dx,dz),limit=acceleration*timestep;
      if(change>limit){dx*=limit/change;dz*=limit/change;}
      if(Math.hypot(dx,dz)>.0001)catBody.applyImpulse({x:dx*.45,y:0,z:dz*.45},true);
    });
  }
  return {physics,catBody,floorCollider,step,resetCat};
}

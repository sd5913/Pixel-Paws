import { inSwatRange } from './swat.js';
import { addBakingWindowColliders } from './physics/baking-window-colliders.js';
import { addBakingChairColliders } from './physics/baking-chair-colliders.js';
import * as THREE from 'three';
import { loadGlb } from './assets/load-assets.js';
import { createPhysicsWorld } from './physics/physics-world.js';

export async function createMixingBowl(scene, renderer, tableHeight, tableRadius, loadModel = loadGlb, environment = null) {
  const model = (await loadModel('./assets/models/level-2/05-mixing-bowl-and-whisk.glb')).clone(true);
  const scale = .25;
  model.scale.setScalar(scale);
  const start = new THREE.Vector3(.55, tableHeight - .04 * scale + .012, -.55);
  model.position.copy(start);
  model.traverse(node => { if (node.isMesh) node.castShadow = node.receiveShadow = true; });
  model.children.find(node => node.name.startsWith('02_')).visible = false;
  scene.add(model);
  const physics = environment?.physics ?? await createPhysicsWorld();
  const { world, rapier: R } = physics;
  if (!environment) {
  const table = world.createRigidBody(R.RigidBodyDesc.fixed());
  world.createCollider(R.ColliderDesc.cylinder(.045, tableRadius).setTranslation(0, tableHeight - .045, 0), table);
  const floor = world.createRigidBody(R.RigidBodyDesc.fixed());
  world.createCollider(R.ColliderDesc.cuboid(10, .05, 10).setTranslation(0, -.05, 0), floor);
  addBakingChairColliders(physics, tableRadius);
  addBakingWindowColliders(physics, tableRadius);
  }
  const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...start.toArray()));
  body.enableCcd(true);
  const shape = model.children.find(node => node.name.startsWith('01_'));
  const points = [];
  shape.updateMatrixWorld(true);
  const modelInverse = model.matrixWorld.clone().invert();
  shape.traverse(node => {
    if (!node.isMesh) return;
    const matrix = modelInverse.clone().multiply(node.matrixWorld);
    const attribute = node.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < attribute.count; i++) {
      vertex.fromBufferAttribute(attribute, i).applyMatrix4(matrix).multiplyScalar(scale);
      points.push(vertex.x, vertex.y, vertex.z);
    }
  });
  const vertices = new Float32Array(points);
  const bowlCollider = world.createCollider(R.ColliderDesc.convexHull(vertices).setMass(.28).setFriction(.6).setRestitution(.03), body);
  // Contents must escape the bowl's conservative solid collision hull.
  bowlCollider.setSolverGroups((2 << 16) | 3);
  const whisk = model.children.find(node => node.name.startsWith('03_'));
  const whiskTransform = { position: whisk.position.clone(), rotation: whisk.quaternion.clone(), scale: whisk.scale.clone() };
  const whiskRoot = new THREE.Group();
  scene.add(whiskRoot);
  model.updateMatrixWorld(true);
  const whiskBody = world.createRigidBody(R.RigidBodyDesc.dynamic());
  whiskBody.enableCcd(true);
  whiskBody.setSoftCcdPrediction(.06);
  whiskBody.setLinearDamping(.2);
  whiskBody.setAngularDamping(.4);
  let whiskCollider = null;
  const whiskHull = [];
  const whiskLongAxis = new THREE.Vector3();
  let whiskRestTime = 0;
  whiskBody.setEnabled(false);
  let whiskReleased = false;
  const bowlUp = new THREE.Vector3();
  function releaseWhisk() {
    model.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(whisk, true).getCenter(new THREE.Vector3());
    whiskRoot.position.copy(center);
    whiskRoot.quaternion.identity();
    whiskRoot.updateMatrixWorld(true);
    whiskRoot.attach(whisk);
    whiskRoot.updateMatrixWorld(true);
    const rootInverse = whiskRoot.matrixWorld.clone().invert();
    const hull = [];
    const vertex = new THREE.Vector3();
    whisk.traverse(node => {
      if (!node.isMesh) return;
      const matrix = rootInverse.clone().multiply(node.matrixWorld);
      const attribute = node.geometry.attributes.position;
      for (let i = 0; i < attribute.count; i++) {
        vertex.fromBufferAttribute(attribute, i).applyMatrix4(matrix);
        hull.push(vertex.x, vertex.y, vertex.z);
      }
    });
    whiskHull.length = 0;
    for(let i=0;i<hull.length;i+=3) whiskHull.push(new THREE.Vector3(hull[i],hull[i+1],hull[i+2]));
    whiskLongAxis.set(0,1,0).applyQuaternion(whisk.quaternion).normalize();
    whiskRestTime = 0;
    if (whiskCollider) world.removeCollider(whiskCollider, true);
    whiskCollider = world.createCollider(R.ColliderDesc.convexHull(new Float32Array(hull))
      .setMass(.036).setFriction(.7).setRestitution(0)
      .setSolverGroups((4 << 16) | 5), whiskBody);
    whiskBody.setTranslation(center, true);
    whiskBody.setRotation({x:0,y:0,z:0,w:1},true);
    whiskBody.setLinvel(body.linvel(),true);
    whiskBody.setAngvel(body.angvel(),true);
    whiskBody.setEnabled(true);
    whiskReleased = true;
  }
  function supportWhisk(delta) {
    if (!whiskReleased) return;
    const position = new THREE.Vector3().copy(whiskBody.translation());
    const rotation = new THREE.Quaternion().copy(whiskBody.rotation());
    const velocity = whiskBody.linvel();
    const top = tableHeight + .012;
    let bottom = Infinity;
    let overTable = true;
    for(const local of whiskHull) {
      const vertex = local.clone().applyQuaternion(rotation).add(position);
      bottom = Math.min(bottom, vertex.y);
      if(Math.hypot(vertex.x,vertex.z)>tableRadius-.01)overTable=false;
    }
    if(!overTable || position.y<tableHeight-.2){whiskRestTime=0;return;}
    if(bottom<top){
      position.y+=top-bottom;
      whiskBody.setTranslation(position,true);
      if(velocity.y<0)whiskBody.setLinvel({x:velocity.x,y:0,z:velocity.z},true);
    }
    if(bottom<top+.025 && Math.hypot(velocity.x,velocity.z)<.25 && Math.abs(velocity.y)<.3)whiskRestTime+=delta;
    else whiskRestTime=0;
    if(whiskRestTime>.25) {
      const longAxis=whiskLongAxis.clone().applyQuaternion(rotation);
      const flat=new THREE.Vector3(longAxis.x,0,longAxis.z);
      if(flat.lengthSq()<.001)flat.set(1,0,0);
      flat.normalize();
      rotation.premultiply(new THREE.Quaternion().setFromUnitVectors(longAxis,flat));
      let minY=Infinity;
      for(const local of whiskHull)minY=Math.min(minY,local.clone().applyQuaternion(rotation).y);
      position.y=top-minY;
      whiskBody.setRotation(rotation,true);whiskBody.setTranslation(position,true);
      whiskBody.setAngvel({x:0,y:0,z:0},true);
      whiskRestTime=0;
    }
  }
  const catBody = environment?.catBody ?? world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, tableHeight + .2, 0));
  if (!environment) world.createCollider(R.ColliderDesc.ball(.22), catBody);
  const batter = new THREE.MeshStandardMaterial({color:'#e4bb65', roughness:.5, side:THREE.DoubleSide});
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(49 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const indices=[]; for(let i=1;i<=48;i++) indices.push(0,i,i===48?1:i+1);
  geometry.setIndex(indices);
  const surface = new THREE.Mesh(geometry, batter); surface.frustumCulled=false; scene.add(surface);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,10),batter); stream.visible=false; scene.add(stream);
  const puddles=[];
  let remaining=1, activePuddle=null;
  const inverse=new THREE.Matrix4(), point=new THREE.Vector3(), rim=new THREE.Vector3();
  const origin=new THREE.Vector3(), end=new THREE.Vector3(), direction=new THREE.Vector3();
  const axis=new THREE.Vector3(0,1,0);
  function reset() {
    whiskBody.setEnabled(false);
    whiskBody.setLinvel({x:0,y:0,z:0},true);
    whiskBody.setAngvel({x:0,y:0,z:0},true);
    whiskBody.resetForces(true); whiskBody.resetTorques(true);
    model.add(whisk);
    whisk.position.copy(whiskTransform.position);
    whisk.quaternion.copy(whiskTransform.rotation);
    whisk.scale.copy(whiskTransform.scale);
    whiskReleased = false;
    whiskRestTime = 0;
    remaining=1; activePuddle=null;
    for(const p of puddles){scene.remove(p);p.geometry.dispose();}puddles.length=0;
    stream.visible=false; surface.visible=true;
    body.setTranslation(start,true);body.setRotation({x:0,y:0,z:0,w:1},true);
    body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    body.resetForces(true);body.resetTorques(true);
    model.position.copy(start);model.quaternion.identity();
  }
  function swat(position,yaw) {
    if (whiskReleased) {
      const center = whiskBody.worldCom();
      if (inSwatRange(position,yaw,center)) {
        whiskBody.applyImpulse({x:Math.sin(yaw)*.08,y:.015,z:Math.cos(yaw)*.08},true);
      }
    }
    const center=body.worldCom();
    if(!inSwatRange(position,yaw,center))return;
    body.applyImpulseAtPoint({x:Math.sin(yaw)*.24,y:.035,z:Math.cos(yaw)*.24},
      {x:center.x,y:center.y+.22,z:center.z},true);
  }
  function update(delta, catPosition) {
    if (!environment) catBody.setNextKinematicTranslation({x:catPosition.x,y:tableHeight+.20,z:catPosition.z});
    if (!environment) physics.step(delta, (_world, timestep) => supportWhisk(timestep));
    else supportWhisk(delta);
    model.position.copy(body.translation());model.quaternion.copy(body.rotation());model.updateMatrixWorld(true);
    bowlUp.set(0,1,0).applyQuaternion(model.quaternion);
    if (!whiskReleased && bowlUp.y < Math.cos(Math.PI / 9)) releaseWhisk();
    if (whiskReleased) {
      whiskRoot.position.copy(whiskBody.translation());
      whiskRoot.quaternion.copy(whiskBody.rotation());
    }
    inverse.copy(model.matrixWorld).invert();
    let lowest=Infinity;
    for(let i=0;i<48;i++){
      point.set(Math.cos(i/48*Math.PI*2)*1.10,1.16,Math.sin(i/48*Math.PI*2)*1.10).applyMatrix4(model.matrixWorld);
      if(point.y<lowest){lowest=point.y;rim.copy(point);}
    }
    origin.set(0,.20+.65*Math.pow(remaining,.45),0).applyMatrix4(model.matrixWorld);
    const level=origin.y;
    // A world-horizontal surface is cut against an approximate inner bowl profile.
    const inside = (x,z) => {
      point.set(x,level,z).applyMatrix4(inverse);
      const radius=.42+.68*Math.sqrt(THREE.MathUtils.clamp((point.y-.20)/.96,0,1));
      return point.y>=.20 && point.y<=1.16 && Math.hypot(point.x,point.z)<=radius;
    };
    positions.set([origin.x,level,origin.z],0);
    for(let i=0;i<48;i++){
      const angle=i/48*Math.PI*2;let low=0,high=.6;
      for(let j=0;j<12;j++){const r=(low+high)/2;if(inside(origin.x+Math.cos(angle)*r,origin.z+Math.sin(angle)*r))low=r;else high=r;}
      positions.set([origin.x+Math.cos(angle)*low,level,origin.z+Math.sin(angle)*low],(i+1)*3);
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
    surface.visible=remaining>.005 && inside(origin.x,origin.z);
    const rate=remaining>.005 ? THREE.MathUtils.clamp((level-lowest)*4,0,.4):0;
    const amount=Math.min(remaining,rate*delta);
    remaining-=amount;
    stream.visible=amount>0;
    if(amount>0){
      const onTable=Math.hypot(rim.x,rim.z)<tableRadius-.05;
      end.set(rim.x,onTable?tableHeight+.018:.012,rim.z);
      if(rim.y<=end.y){stream.visible=false;return;}
      if(!activePuddle || activePuddle.position.distanceTo(end)>.24){
        activePuddle=new THREE.Mesh(new THREE.SphereGeometry(1,24,8),batter);
        activePuddle.position.copy(end);activePuddle.userData.amount=0;scene.add(activePuddle);puddles.push(activePuddle);
      }
      activePuddle.userData.amount+=amount;
      const radius=.06+Math.sqrt(activePuddle.userData.amount)*.45;
      activePuddle.scale.set(radius,.012,radius*.85);
      direction.subVectors(rim,end);stream.position.copy(end).addScaledVector(direction,.5);
      stream.quaternion.setFromUnitVectors(axis,direction.clone().normalize());
      stream.scale.set(.012+rate*.045,direction.length(),.012+rate*.045);
    }
  }
  return {update,swat,reset};
}

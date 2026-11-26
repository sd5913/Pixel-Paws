import { inSwatRange, SWAT, swatIntersectsBody } from './swat.js';
import { addBakingWindowColliders } from './physics/baking-window-colliders.js';
import { addBakingChairColliders } from './physics/baking-chair-colliders.js';
import * as THREE from 'three';
import { loadGlb } from './assets/load-assets.js';
import { createPhysicsWorld } from './physics/physics-world.js';

export async function createMilkJug(scene, renderer, tableHeight, tableRadius, loadModel = loadGlb, environment = null) {
  const model = (await loadModel('./assets/models/level-2/15-glass-measuring-jug.glb')).clone(true);
  const scale = .25;
  model.scale.setScalar(scale);
  const start = new THREE.Vector3(-.55, tableHeight - .025 * scale + .012, -.55);
  model.position.copy(start);
  model.traverse(node => { if (node.isMesh) node.castShadow = node.receiveShadow = true; });
  model.children.find(node => node.name.startsWith('03_')).visible = false;
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
  body.userData={floorAsset:'glass-jug'};
  body.enableCcd(true);
  const shape = model.children.find(node => node.name.startsWith('02_'));
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
  const shards = [];
  let broken = false;
  const previousVelocity = new THREE.Vector3();
  const shardMaterial = new THREE.MeshStandardMaterial({color:'#d9f0ee',transparent:true,opacity:.64,roughness:.22,metalness:0,side:THREE.DoubleSide});
  function fracture() {
    broken = true; model.visible = false; body.setEnabled(false);
    model.updateMatrixWorld(true);
    shape.traverse(node => {
      if (!node.isMesh || !node.material.name.includes('glass')) return;
      const attribute = node.geometry.attributes.position;
      const index = node.geometry.index;
      const count = index ? index.count : attribute.count;
      const stride = Math.max(3, Math.ceil(count / 72 / 3) * 3);
      for (let i=0;i+2<count;i+=stride) {
        const points = [0,1,2].map(offset => new THREE.Vector3().fromBufferAttribute(attribute,index?index.getX(i+offset):i+offset).applyMatrix4(node.matrixWorld));
        const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        if(normal.lengthSq()<1e-10)continue;
        normal.normalize().multiplyScalar(.004);
        const center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
        const vertices=[];
        for(const sign of [-1,1])for(const point of points){const p=point.clone().sub(center).addScaledVector(normal,sign);vertices.push(p.x,p.y,p.z);}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex([0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5]);geometry.computeVertexNormals();
        const mesh=new THREE.Mesh(geometry,shardMaterial);mesh.position.copy(center);scene.add(mesh);
        const rigid=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...center.toArray()));
        rigid.enableCcd(true);rigid.setLinearDamping(.7);rigid.setAngularDamping(.8);
        world.createCollider(R.ColliderDesc.convexHull(new Float32Array(vertices)).setMass(.003).setFriction(.9).setRestitution(.05),rigid);
        rigid.setLinvel({x:(center.x-model.position.x)*1.8,y:.18,z:(center.z-model.position.z)*1.8},true);
        shards.push({mesh,rigid});
      }
    });
    const puddle=new THREE.Mesh(new THREE.SphereGeometry(1,24,8),batter);
    const onTable=Math.hypot(model.position.x,model.position.z)<tableRadius-.15;
    puddle.position.set(model.position.x,onTable?tableHeight+.018:.012,model.position.z);
    puddle.scale.set(.12+Math.sqrt(remaining)*.35,.012,.12+Math.sqrt(remaining)*.30);
    scene.add(puddle);puddles.push(puddle);remaining=0;surface.visible=false;stream.visible=false;
  }
  const catBody = environment?.catBody ?? world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, tableHeight + .2, 0));
  if (!environment) world.createCollider(R.ColliderDesc.ball(.22), catBody);
  const batter = new THREE.MeshStandardMaterial({color:'#fff5dc', roughness:.5, side:THREE.DoubleSide});
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
    for(const shard of shards){world.removeRigidBody(shard.rigid);scene.remove(shard.mesh);shard.mesh.geometry.dispose();}shards.length=0;
    broken=false;model.visible=true;body.setEnabled(true);
    previousVelocity.set(0,0,0);
    remaining=1; activePuddle=null;
    for(const p of puddles){scene.remove(p);p.geometry.dispose();}puddles.length=0;
    stream.visible=false; surface.visible=true;
    body.setTranslation(start,true);body.setRotation({x:0,y:0,z:0,w:1},true);
    body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    body.resetForces(true);body.resetTorques(true);
    model.position.copy(start);model.quaternion.identity();
  }
  function swat(position,yaw) {
    if(broken)return;
    const center=body.worldCom();
    if(!inSwatRange(position,yaw,center) && !swatIntersectsBody(environment?.physics ?? physics,body,position,yaw))return;
    environment?.contactAudio?.notifyHit(body);
    body.applyImpulseAtPoint({x:Math.sin(yaw)*SWAT.forwardImpulse,y:SWAT.upwardImpulse,z:Math.cos(yaw)*SWAT.forwardImpulse},
      {x:center.x,y:center.y+.22,z:center.z},true);
  }
  function update(delta, catPosition) {
    if (!environment) catBody.setNextKinematicTranslation({x:catPosition.x,y:tableHeight+.20,z:catPosition.z});
    const previous = environment ? previousVelocity.clone() : body.linvel();
    if (!environment) physics.step(delta);
    for(const shard of shards){shard.mesh.position.copy(shard.rigid.translation());shard.mesh.quaternion.copy(shard.rigid.rotation());}
    if(broken)return;
    const current = body.linvel();
    previousVelocity.copy(current);
    const impact = Math.hypot(previous.x-current.x,previous.y-current.y,previous.z-current.z);
    model.position.copy(body.translation());model.quaternion.copy(body.rotation());model.updateMatrixWorld(true);
    if (Math.hypot(previous.x,previous.y,previous.z)>1.0 && impact>1.5) { fracture(); return; }
    inverse.copy(model.matrixWorld).invert();
    let lowest=Infinity;
    for(let i=0;i<48;i++){
      point.set(Math.cos(i/48*Math.PI*2)*.85,1.95,Math.sin(i/48*Math.PI*2)*.85).applyMatrix4(model.matrixWorld);
      if(point.y<lowest){lowest=point.y;rim.copy(point);}
    }
    origin.set(0,.16+.88*Math.pow(remaining,.45),0).applyMatrix4(model.matrixWorld);
    const level=origin.y;
    // A world-horizontal surface is cut against an approximate inner bowl profile.
    const inside = (x,z) => {
      point.set(x,level,z).applyMatrix4(inverse);
      const radius=.80;
      return point.y>=.16 && point.y<=1.95 && Math.hypot(point.x,point.z)<=radius;
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
  return {update,swat,reset, scoreTargets: [{id: '15-glass-measuring-jug', object: model, body, start, get cleared() { return broken; }}]};
}

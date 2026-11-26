import { inSwatRange } from '../swat.js';
import * as THREE from 'three';

// Detachable authored assemblies retain their original transforms for round reset.
export function createLooseKitchenPart(scene, physics, nodes, {mass=.025, egg=false, held=false, floorCollider=null, tableSupport=false}={}) {
  const {world,rapier:R}=physics;
  const originals=nodes.map(node=>({node,parent:node.parent,position:node.position.clone(),rotation:node.quaternion.clone(),scale:node.scale.clone()}));
  const root=new THREE.Group();scene.add(root);
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic());body.enableCcd(true);body.setSoftCcdPrediction(.04);
  body.setLinearDamping(.3);body.setAngularDamping(.4);body.setEnabled(false);
  let collider=null,released=false,broken=false;
  const hullPoints=[];

  const debris=[];
  function release(velocity={x:0,y:0,z:0}) {
    if(released)return;
    scene.updateMatrixWorld(true);
    const bounds=new THREE.Box3();for(const node of nodes)bounds.union(new THREE.Box3().setFromObject(node,true));
    root.position.copy(bounds.getCenter(new THREE.Vector3()));root.quaternion.identity();root.updateMatrixWorld(true);
    for(const node of nodes)root.attach(node);
    root.updateMatrixWorld(true);
    const inverse=root.matrixWorld.clone().invert(),vertices=[],point=new THREE.Vector3();
    root.traverse(node=>{if(!node.isMesh)return;const matrix=inverse.clone().multiply(node.matrixWorld),attribute=node.geometry.attributes.position;for(let i=0;i<attribute.count;i++){point.fromBufferAttribute(attribute,i).applyMatrix4(matrix);vertices.push(point.x,point.y,point.z);}});
    hullPoints.length=0;
    for(let i=0;i<vertices.length;i+=3)hullPoints.push(new THREE.Vector3(vertices[i],vertices[i+1],vertices[i+2]));
    if(collider)world.removeCollider(collider,true);
    let descriptor;
    if(tableSupport){
      // A solid envelope avoids unstable contacts on the cutters' thin metal rims.
      const bounds=new THREE.Box3().setFromPoints(hullPoints);
      const half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
      const center=bounds.getCenter(new THREE.Vector3());
      descriptor=R.ColliderDesc.cuboid(half.x,Math.max(.006,half.y),half.z)
        .setTranslation(center.x,center.y,center.z);
      body.setGravityScale(1,true);body.setLinearDamping(.8);body.setAngularDamping(1.2);
    }else descriptor=R.ColliderDesc.convexHull(new Float32Array(vertices));
    collider=world.createCollider(descriptor.setMass(mass*.8).setFriction(.7).setRestitution(0)
      .setContactSkin(.002).setSolverGroups(held ? ((4<<16)|5) : 0xffffffff),body);
    body.setEnabledTranslations(true,true,true,true);body.setEnabledRotations(true,true,true,true);
    body.setTranslation(root.position,true);body.setRotation({x:0,y:0,z:0,w:1},true);body.setLinvel(velocity,true);body.setAngvel(tableSupport?{x:0,y:0,z:0}:{x:.2,y:.1,z:.2},true);body.setEnabled(true);
    released=true;
  }
  function crack(tableHeight,tableRadius) {
    broken=true;root.visible=false;body.setEnabled(false);
    const position=body.translation();
    const surface = 0;
    const whiteMat=new THREE.MeshStandardMaterial({color:'#fff4cd',transparent:true,opacity:.7,roughness:.2});
    const yolkMat=new THREE.MeshStandardMaterial({color:'#f2a51b',roughness:.28});
    const white=new THREE.Mesh(new THREE.SphereGeometry(1,24,8),whiteMat);white.position.set(position.x,surface+.007,position.z);white.scale.set(.10,.006,.075);scene.add(white);debris.push({mesh:white,target:white.scale.clone()});white.scale.multiplyScalar(.15);
    const yolk=new THREE.Mesh(new THREE.SphereGeometry(1,20,10),yolkMat);yolk.position.set(position.x,surface+.016,position.z);yolk.scale.set(.042,.017,.04);scene.add(yolk);debris.push({mesh:yolk,target:yolk.scale.clone()});yolk.scale.multiplyScalar(.25);
    const shellMat=new THREE.MeshStandardMaterial({color:'#e9d4b3',side:THREE.DoubleSide,roughness:.8});
    for(const side of [-1,1]){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8,0,Math.PI*2,0,Math.PI/2),shellMat);
      mesh.position.set(position.x+side*.045,Math.max(surface+.035,position.y),position.z);mesh.rotation.z=side*.7;scene.add(mesh);
      const rigid=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...mesh.position.toArray()));rigid.enableCcd(true);
      world.createCollider(R.ColliderDesc.ball(.025).setMass(.003).setFriction(.8),rigid);rigid.setLinvel({x:side*.22,y:.1,z:side*.12},true);debris.push({mesh,body:rigid});
    }
  }
  function reset() {
    body.setEnabled(false);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.resetForces(true);body.resetTorques(true);
    for(const item of originals){item.parent.add(item.node);item.node.position.copy(item.position);item.node.quaternion.copy(item.rotation);item.node.scale.copy(item.scale);}
    const materials=new Set();for(const entry of debris){if(entry.body)world.removeRigidBody(entry.body);entry.mesh.removeFromParent();entry.mesh.geometry.dispose();materials.add(entry.mesh.material);}for(const material of materials)material.dispose();debris.length=0;
    released=false;broken=false;root.visible=true;
    if(!held)release();
  }
  if(!held)release();
  return {
    release,
    reset,
    get released(){return released;},
    get position(){return body.translation();},
    swat(position,yaw){
      scene.updateMatrixWorld(true);
      const center=released?new THREE.Vector3().copy(body.worldCom()):new THREE.Box3().setFromObject(nodes[0],true).getCenter(new THREE.Vector3());
      const dx=center.x-position.x,dz=center.z-position.z;
      if(broken||!inSwatRange(position,yaw,center))return;
      release();body.applyImpulse({x:Math.sin(yaw)*.044,y:.012,z:Math.cos(yaw)*.044},true);
    },
    update(tableHeight,tableRadius){
      if(released&&!broken){
        root.position.copy(body.translation());root.quaternion.copy(body.rotation());
        let touchedFloor = false;
        if (egg && floorCollider) {
          world.contactPair(collider, floorCollider, manifold => {
            for (let i = 0; i < manifold.numContacts(); i++) {
              if (manifold.contactDist(i) <= .005) touchedFloor = true;
            }
          });
        }
        if (touchedFloor) crack(tableHeight,tableRadius);
      }
      for(const entry of debris){
        if(entry.target)entry.mesh.scale.lerp(entry.target,.12);
        if(entry.body){entry.mesh.position.copy(entry.body.translation());entry.mesh.quaternion.copy(entry.body.rotation());}
      }
    },
  };
}

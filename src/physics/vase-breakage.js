import * as THREE from 'three';

export function createVaseBreakage(physics, instance, body, floorCollider, {fragmentColor = '#c6e0ce', onBreak = () => {}} = {}) {
  const { world, rapier: R } = physics;
  const fragments = [];

  let broken = false;
  function breakVase() {
    const object = instance.object3D;
    object.updateMatrixWorld(true);
    const parent = object.parent;
    if (!parent) return;
    const material = new THREE.MeshStandardMaterial({color:fragmentColor,transparent:true,opacity:.72,roughness:.25,side:THREE.DoubleSide});
    object.traverse(node => {
      if (!node.isMesh || fragments.length >= 36) return;
      const attribute = node.geometry.attributes.position;
      const index = node.geometry.index;
      const count = index ? index.count : attribute.count;
      const stride = Math.max(3, Math.ceil(count / 36 / 3) * 3);
      for (let i=0;i+2<count && fragments.length<36;i+=stride) {
        const points = [0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(attribute,index?index.getX(i+offset):i+offset).applyMatrix4(node.matrixWorld));
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        if(normal.lengthSq()<1e-12)continue;
        normal.normalize().multiplyScalar(.003);
        const center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
        center.y=Math.max(.008,center.y);
        const vertices=[];
        for(const side of [-1,1])for(const point of points){const p=point.clone().sub(center).addScaledVector(normal,side);vertices.push(p.x,p.y,p.z);}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex([0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5]);geometry.computeVertexNormals();
        const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;
        const rigid=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...center.toArray()));
        rigid.enableCcd(true);rigid.setLinearDamping(.8);rigid.setAngularDamping(.8);
        world.createCollider(R.ColliderDesc.convexHull(new Float32Array(vertices)).setMass(.004).setFriction(.9).setRestitution(.06),rigid);
        rigid.setLinvel({x:(center.x-object.position.x)*2,y:.25,z:(center.z-object.position.z)*2},true);
        parent.add(mesh);parent.updateMatrixWorld(true);mesh.position.copy(parent.worldToLocal(center.clone()));
        fragments.push({mesh,rigid,material});
      }
    });
    object.visible=false;body.rigidBody.setEnabled(false);broken=true;
    onBreak(object.position.clone());
  }
  function reset() {
    const materials=new Set();
    for(const fragment of fragments){world.removeRigidBody(fragment.rigid);fragment.mesh.removeFromParent();fragment.mesh.geometry.dispose();materials.add(fragment.material);}
    for(const material of materials)material.dispose();
    fragments.length=0;broken=false;instance.object3D.visible=true;body.rigidBody.setEnabled(true);
  }
  return {
    update() {
      if(!broken && instance.object3D.parent){
        let touchedFloor = false;
        for (const collider of body.colliders) {
          world.contactPair(collider, floorCollider, manifold => {
            for (let i = 0; i < manifold.numContacts(); i++) {
              if (manifold.contactDist(i) <= .005) touchedFloor = true;
            }
          });
        }
        if (touchedFloor) {
          instance.object3D.position.copy(body.rigidBody.translation());
          instance.object3D.quaternion.copy(body.rigidBody.rotation());
          breakVase();
        }
      }
      for(const {mesh,rigid} of fragments){
        mesh.position.copy(rigid.translation());mesh.parent.worldToLocal(mesh.position);
        mesh.quaternion.copy(rigid.rotation());
      }
    },
    reset,
    dispose:reset,
  };
}

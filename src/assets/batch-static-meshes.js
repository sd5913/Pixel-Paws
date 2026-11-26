import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Props move as whole assemblies: batch compatible opaque pieces in memory,
// without rewriting source GLBs or changing transparent/animated pieces.
export function batchStaticMeshes(root,{exclude=()=>false}={}){
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),groups=new Map();
  root.traverseVisible(node=>{
    if(!node.isMesh||node.isSkinnedMesh||node.children.length||Array.isArray(node.material)
      ||node.material.transparent||node.material.transmission>0||exclude(node)
      ||node.matrixWorld.determinant()<=0||Object.keys(node.geometry.morphAttributes).length)return;
    const attributes=Object.entries(node.geometry.attributes).map(([k,v])=>k+':'+v.itemSize+':'+v.normalized).sort().join(',');
    const key=node.material.uuid+'|'+attributes+'|'+node.castShadow+'|'+node.receiveShadow;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(node);
  });
  for(const nodes of groups.values()){
    if(nodes.length<2)continue;
    const geometries=nodes.map(node=>{
      const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
      geometry.clearGroups();geometry.applyMatrix4(inverse.clone().multiply(node.matrixWorld));
      return geometry;
    });
    const geometry=mergeGeometries(geometries,false);
    for(const item of geometries)item.dispose();
    if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,nodes[0].material);
    mesh.name='Batched_'+nodes[0].material.name;
    mesh.castShadow=nodes[0].castShadow;mesh.receiveShadow=nodes[0].receiveShadow;
    for(const node of nodes)node.removeFromParent();
    root.add(mesh);
  }
}

import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// Render a copy of the actual game model; never edit the source GLB or live scene.
export function modelThumbnails(targets) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(256,256);renderer.setClearColor(0x000000,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const images=[];
  try {
    for(const target of targets) {
      const scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff,0xc8b29c,1.4));
      const light=new THREE.DirectionalLight(0xfff3dd,2);light.position.set(3,5,4);scene.add(light);
      const copy=clone(target.object);copy.position.set(0,0,0);copy.quaternion.identity();
      // Snow, glow and light effects do not belong in the identifying picture.
      const remove=[];copy.traverse(node=>{if(node.isPoints||node.isLight)remove.push(node);});remove.forEach(node=>node.removeFromParent());
      scene.add(copy);copy.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(copy,true),center=box.getCenter(new THREE.Vector3());
      const radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,.01);
      const camera=new THREE.OrthographicCamera(-radius,radius,radius,-radius,.001,radius*20);
      camera.position.copy(center).add(new THREE.Vector3(1,.65,1.5).normalize().multiplyScalar(radius*5));camera.lookAt(center);
      renderer.render(scene,camera);images.push(renderer.domElement.toDataURL('image/png'));
    }
  } finally {renderer.dispose();renderer.forceContextLoss();}
  return images;
}

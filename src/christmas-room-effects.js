import * as T from 'three';
import {prepareChristmasModel} from './christmas-props.js';
import {loadGlb} from './assets/load-assets.js';

export async function decorateChristmasRoom(scene,room){
 const specs=[
  {file:'04 Christmas Garland.glb',x:0,y:2.11,z:-2.94,width:2.8,height:.36},
  {file:'05 Red Ribbon Bow.glb',x:0,y:2.05,z:-2.83,width:.36,height:.36},
  ...[-1,1].map(side=>({file:'07 Holly Sprig.glb',x:side*1.15,y:2.26,z:-3.03,width:.27,height:.29})),
  ...[-1,1].map(side=>({file:'08 Christmas Stocking.glb',x:side*.7,y:1.57,z:-2.94,width:.28,height:.43})),
 ];
 for(const spec of specs){const source=await loadGlb('./assets/models/level3/'+encodeURIComponent(spec.file));const {object,half}=prepareChristmasModel(source,{...spec,id:'mantel'});object.position.set(spec.x,spec.y+half.y,spec.z);object.name='Additional_mantel_decoration';scene.add(object);}
 const bulbs=[];
 room.traverse(node=>{
  if(!node.isMesh)return;
  if(node.name.startsWith('Tree_ornament_fairy_light')){node.material=node.material.clone();node.material.emissive.set('#ffd28a');node.material.emissiveIntensity=1.8;bulbs.push(node.material);}
  else if(/^Christmas_tree\d*$/.test(node.name)){node.material=node.material.clone();node.material.emissive.set('#354b23');node.material.emissiveIntensity=.18;}
 });
 const light=new T.PointLight('#ffd391',.55,2.6);light.position.set(-2.05,1.25,-3.35);scene.add(light);
 return {update(time){bulbs.forEach((material,i)=>{const phase=(time+i*.13)%6;material.emissiveIntensity=phase<.18?.2:1.7+Math.sin(time*2+i)*.25;});light.intensity=.55+Math.sin(time*1.7)*.08;}};
}

let fireParticleTexture;
function createFireParticles(group){
 if(!fireParticleTexture){const size=32,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x-15.5)/16,(y-15.5)/16),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,1-r)**2*255);}fireParticleTexture=new T.DataTexture(data,size,size);fireParticleTexture.needsUpdate=true;}
 const create=(count,material)=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));const points=new T.Points(geometry,material);points.frustumCulled=false;group.add(points);return points;};
 const smoke=create(12,new T.PointsMaterial({color:'#827568',map:fireParticleTexture,size:28,sizeAttenuation:false,transparent:true,opacity:.13,depthWrite:false}));smoke.name='Drifting_fire_smoke';
 const embers=create(18,new T.PointsMaterial({color:'#ffb947',map:fireParticleTexture,size:4,sizeAttenuation:false,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));embers.name='Rising_fire_embers';
 return {update(time){
  for(const [points,speed,height] of [[smoke,.19,1.15],[embers,.65,.85]]){const a=points.geometry.attributes.position;for(let i=0;i<a.count;i++){const phase=(time*speed+i*.61803398875)%1;const angle=i*2.39996;const spread=points===smoke?.09+phase*.18:.08+phase*.07;a.setXYZ(i,Math.cos(angle+time*.7)*spread+Math.sin(time+i)*phase*.08,.08+phase*height,Math.sin(angle+time*.5)*spread);}a.needsUpdate=true;}
 }};
}
export function createChristmasFire(scene,entries,room){
 let template;room.traverse(node=>{if(!template&&node.isMesh&&node.name.startsWith('Amber_flame'))template=node;});
 const burning=new Map(),heat=new Map();
 function ignite(entry){
  if(burning.has(entry.spec.id)||[1,11,16,17,23,24,26,28,29].includes(entry.spec.id)||!entry.body.isEnabled())return false;
  if(!template)return false;
  template.updateWorldMatrix(true,false);
  const geometry=template.geometry.clone().applyMatrix4(template.matrixWorld),box=new T.Box3().setFromBufferAttribute(geometry.attributes.position),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(.15/size.x,.52/size.y,.10/size.z);
  const group=new T.Group();group.name='Spreading_prop_fire';
  for(let i=0;i<5;i++){
   for(const inner of [false,true]){const flame=new T.Mesh(geometry,new T.MeshBasicMaterial({color:inner?'#ffe7a2':'#f76a18',transparent:true,opacity:inner?.95:.72,depthWrite:false,blending:inner?T.AdditiveBlending:T.NormalBlending,toneMapped:false,side:T.DoubleSide}));flame.position.set((i-2)*.07,0,Math.sin(i*2.4)*.05+(inner?.015:0));flame.userData={phase:i*1.73,inner};group.add(flame);}
  }
  const particles=createFireParticles(group);particles.update(0);scene.add(group);
  const originals=[];entry.object.traverse(node=>{if(node.isMesh){originals.push([node,node.material]);node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();}});
  burning.set(entry.spec.id,{entry,group,age:0,originals,geometry,particles});return true;
 }
 return {burning,ignite,update(delta){
  const dt=Math.min(Math.max(delta,0),.05);
  for(const entry of entries){const box=new T.Box3(entry.half.clone().negate(),entry.half.clone()).applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(entry.object.quaternion).setPosition(entry.object.position));if(box.min.z< -2.6&&box.max.z> -3.2&&box.min.x<1&&box.max.x> -1&&box.min.y<1.15)ignite(entry);}
  const boxes=new Map(entries.filter(e=>e.body.isEnabled()).map(e=>[e.spec.id,new T.Box3(e.half.clone().negate(),e.half.clone()).applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(e.object.quaternion).setPosition(e.object.position))]));
  for(const fire of burning.values()){
   fire.age+=dt;fire.group.visible=fire.entry.body.isEnabled();fire.group.position.copy(fire.entry.object.position);fire.group.position.y+=fire.entry.half.y*.6;
   fire.group.children.filter(node=>node.isMesh).forEach(mesh=>{const phase=mesh.userData.phase,inner=mesh.userData.inner;const factor=inner?.52:1;mesh.scale.set(factor*(.75+Math.sin(fire.age*6+phase)*.12),factor*(.85+Math.sin(fire.age*8+phase)*.22),factor);mesh.rotation.z=Math.sin(fire.age*4+phase)*.16;});fire.particles.update(fire.age);
   for(const [node,original] of fire.originals){const before=Array.isArray(original)?original:[original],after=Array.isArray(node.material)?node.material:[node.material];after.forEach((m,i)=>m.color?.copy(before[i].color).lerp(new T.Color('#3d2115'),Math.min(.8,fire.age*.07)));}
  }
  for(const entry of entries){if(burning.has(entry.spec.id)||!entry.body.isEnabled())continue;const box=boxes.get(entry.spec.id);let near=false;
   for(const fire of burning.values()){if(fire.age<.7||!fire.entry.body.isEnabled())continue;const other=boxes.get(fire.entry.spec.id);if(other&&box&&other.clone().expandByScalar(.12).intersectsBox(box)){near=true;break;}}
   const value=near?(heat.get(entry.spec.id)??0)+dt:0;heat.set(entry.spec.id,value);if(value>.8)ignite(entry);
  }
 },reset(){for(const fire of burning.values()){for(const [node,material] of fire.originals){for(const m of Array.isArray(node.material)?node.material:[node.material])m.dispose();node.material=material;}fire.group.children.forEach(n=>{n.material.dispose();if(n.isPoints)n.geometry.dispose();});fire.geometry.dispose();fire.group.removeFromParent();}burning.clear();heat.clear();}};
}

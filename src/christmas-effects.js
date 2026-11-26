import * as THREE from 'three';

let snowTexture,glowTexture;
function radialTexture(soft){
  const size=32,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    const alpha=soft?Math.max(0,1-radius)**2:Math.min(1,Math.max(0,(1-radius)*4));
    const index=(y*size+x)*4;data[index]=data[index+1]=data[index+2]=255;data[index+3]=Math.round(alpha*255);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;return texture;
}
function materialBounds(object,predicate){
  object.updateMatrixWorld(true);const box=new THREE.Box3(),point=new THREE.Vector3();
  object.traverse(node=>{
    if(!node.isMesh)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    if(!materials.some(predicate))return;
    // GLB material primitives may share a full position accessor. Measure only
    // vertices referenced by this primitive, so the glass bounds exclude its house/base.
    const geometry=node.geometry,position=geometry.attributes.position,index=geometry.index;
    const count=index?.count??position.count;
    const ranges=Array.isArray(node.material)&&geometry.groups.length
      ?geometry.groups.filter(group=>predicate(materials[group.materialIndex])):[{start:0,count}];
    for(const range of ranges){
      const start=Math.max(range.start,geometry.drawRange.start);
      const end=Math.min(count,range.start+range.count,geometry.drawRange.start+geometry.drawRange.count);
      for(let i=start;i<end;i++){
        point.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(node.matrixWorld);box.expandByPoint(point);
      }
    }
  });
  if(box.isEmpty())throw new Error('Missing Christmas effect anchor');
  return box.applyMatrix4(object.matrixWorld.clone().invert());
}

export function createChristmasEffects(entry){
  const {object,spec}=entry;
  if(spec.id===11){
    const box=materialBounds(object,m=>/Crystal - transparent|Clear globe/.test(m.name));
    const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const radius=Math.min(size.x,size.y,size.z)*.43;
    const positions=new Float32Array(84*3),speeds=new Float32Array(84);
    const geometry=new THREE.BufferGeometry();
    const attribute=new THREE.BufferAttribute(positions,3);attribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',attribute);
    snowTexture??=radialTexture(false);
    const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#fffaf0',map:snowTexture,size:2.2,sizeAttenuation:false,transparent:true,opacity:.9,alphaTest:.05,depthWrite:false,toneMapped:false}));
    points.name='Globe_falling_snow';points.frustumCulled=false;object.add(points);
    const down=new THREE.Vector3(),up=new THREE.Vector3(),side=new THREE.Vector3(),across=new THREE.Vector3(),point=new THREE.Vector3(),quaternion=new THREE.Quaternion();
    let seed=11,time=0;
    const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    function axes(){object.getWorldQuaternion(quaternion);down.set(0,-1,0).applyQuaternion(quaternion.invert());up.copy(down).negate();side.crossVectors(up,Math.abs(up.x)<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1)).normalize();across.crossVectors(up,side).normalize();}
    function spawn(i,initial){
      if(initial){do{point.set((random()*2-1)*radius,(random()*2-1)*radius,(random()*2-1)*radius);}while(point.length()>radius*.95);point.add(center);}
      else{const angle=random()*Math.PI*2,r=Math.sqrt(random())*radius*.65;point.copy(center).addScaledVector(side,Math.cos(angle)*r).addScaledVector(across,Math.sin(angle)*r).addScaledVector(up,Math.sqrt(radius*radius-r*r)*.92);}
      point.toArray(positions,i*3);speeds[i]=(.7+random()*.6)*.035/object.scale.x;
    }
    function reset(){seed=11;time=0;axes();for(let i=0;i<84;i++)spawn(i,true);attribute.needsUpdate=true;}
    reset();
    return {snow:points,center,radius,reset,update(delta){
      const dt=Math.max(0,Math.min(delta,.05));time+=dt;axes();
      for(let i=0;i<84;i++){
        point.fromArray(positions,i*3).addScaledVector(down,speeds[i]*dt).addScaledVector(side,Math.sin(time+i*1.7)*.012/object.scale.x*dt);
        if(point.distanceTo(center)>radius*.98)spawn(i,false);else point.toArray(positions,i*3);
      }
      attribute.needsUpdate=true;
    }};
  }
  if(spec.id===17){
    const box=materialBounds(object,m=>/Lantern.*flame/i.test(m.name));
    const position=box.getCenter(new THREE.Vector3());
    const light=new THREE.PointLight('#ffb65c',1.25,1.5,2);light.name='Lantern_warm_light';light.position.copy(position);object.add(light);
    glowTexture??=radialTexture(true);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({color:'#ffb34f',map:glowTexture,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    glow.name='Lantern_candle_glow';glow.position.copy(position);glow.scale.setScalar(.20/object.scale.x);object.add(glow);
    let time=0;
    return {light,glow,reset(){time=0;light.intensity=1.25;glow.material.opacity=.65;},update(delta){time+=Math.max(0,Math.min(delta,.05));light.intensity=1.25+Math.sin(time*6)*.12+Math.sin(time*11)*.06;glow.material.opacity=.65+Math.sin(time*7)*.05;}};
  }
  return null;
}

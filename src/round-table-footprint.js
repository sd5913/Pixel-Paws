import { Vector3, Quaternion } from 'three';

// An axis-aligned box can overlap a round table even when the rotated prop does not.
export function footprintHasLeftRoundTable(points, tableHeight, radius) {
  if (!points.length) return false;
  if (Math.max(...points.map(p => p.y)) < tableHeight - .1) return true;
  const sorted = points.map(({x,z}) => ({x,z})).sort((a,b) => a.x-b.x || a.z-b.z);
  const cross = (a,b,c) => (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const lower=[], upper=[];
  for (const p of sorted) { while(lower.length>1 && cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p); }
  for (const p of sorted.toReversed()) { while(upper.length>1 && cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p); }
  const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
  if (hull.length<2) return Math.hypot(sorted[0].x,sorted[0].z)>radius+.02;
  if (hull.length>=3 && hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],{x:0,z:0})>=0)) return false;
  let distance=Infinity;
  for(let i=0;i<hull.length;i++){
    const a=hull[i],b=hull[(i+1)%hull.length],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,-(a.x*dx+a.z*dz)/(dx*dx+dz*dz || 1)));
    distance=Math.min(distance,Math.hypot(a.x+t*dx,a.z+t*dz));
  }
  return distance>radius+.02;
}

export function bodyHasLeftRoundTable(body, tableHeight, radius) {
  const points=[];
  for(let i=0;i<body.numColliders();i++){
    const collider=body.collider(i),half=collider.halfExtents();
    if(!half) return null; // Let non-box shapes use their existing geometry bounds.
    const bodyRotation=new Quaternion().copy(body.rotation());
    const rotation=bodyRotation.clone().multiply(new Quaternion().copy(collider.rotationWrtParent()));
    const center=new Vector3().copy(collider.translationWrtParent()).applyQuaternion(bodyRotation).add(body.translation());
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])
      points.push(new Vector3(x*half.x,y*half.y,z*half.z).applyQuaternion(rotation).add(center));
  }
  return points.length ? footprintHasLeftRoundTable(points,tableHeight,radius) : null;
}

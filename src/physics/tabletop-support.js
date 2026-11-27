import { Vector3, Quaternion } from 'three';

// Recover shallow solver penetration only while the entire prop is over the table.
// Once the prop falls below the tabletop, never pull it up from the floor.
export function createTabletopSupport(body, bounds, tableHeight, tableRadius, vertices = null) {
  const corners=vertices ?? [];
  if(!vertices)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new Vector3(x,y,z));
  const point=new Vector3(),rotation=new Quaternion();
  return () => {
    const position=body.translation();
    if(body.isSleeping())return;
    rotation.copy(body.rotation());
    let lowest=Infinity,highest=-Infinity;
    for(const corner of corners){
      point.copy(corner).applyQuaternion(rotation).add(position);
      if(Math.hypot(point.x,point.z)>tableRadius-.005)return;
      lowest=Math.min(lowest,point.y);
      highest=Math.max(highest,point.y);
    }
    if(highest<tableHeight-.12)return;
    const penetration=tableHeight+.009-lowest;
    if(penetration<=.002)return;
    body.setTranslation({x:position.x,y:position.y+penetration,z:position.z},true);
    const velocity=body.linvel();
    if(velocity.y<0)body.setLinvel({x:velocity.x,y:0,z:velocity.z},true);
  };
}

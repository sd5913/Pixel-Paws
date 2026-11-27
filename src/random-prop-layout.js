// Plan a complete layout before changing any bodies. Largest footprints go first.
export function randomizeTableItems(items,shape,{random=Math.random,gap=.055}={}){
 const sorted=[...items].sort((a,b)=>b.halfX*b.halfZ-a.halfX*a.halfZ);
 for(let retry=0;retry<60;retry++){
  const placed=[];let failed=false;
  for(const item of sorted){
   const limitX=(shape.radius??shape.halfWidth)-.07-item.halfX;
   const limitZ=(shape.radius??shape.halfDepth)-.07-item.halfZ;
   let candidate;
   for(let attempt=0;attempt<1600;attempt++){
    const x=(random()*2-1)*limitX,z=(random()*2-1)*limitZ;
    if(Math.abs(x)<item.halfX+.40&&Math.abs(z)<item.halfZ+.43)continue;
    if(shape.radius&&Math.hypot(Math.abs(x)+item.halfX,Math.abs(z)+item.halfZ)>shape.radius-.07)continue;
    if(placed.some(p=>Math.abs(x-p.x)<item.halfX+p.item.halfX+gap&&Math.abs(z-p.z)<item.halfZ+p.item.halfZ+gap))continue;
    candidate={item,x,z};break;
   }
   if(!candidate){failed=true;break;}placed.push(candidate);
  }
  if(!failed){for(const p of placed)p.item.apply(p.x,p.z);return placed;}
 }
 throw new Error('Unable to fit a non-overlapping prop layout on the table');
}
export function parkTableProps(world,catBody){
 // Authored assemblies are already placed at their tabletop rest poses. Start
 // them asleep to avoid a gravity/CCD settling burst; real contacts wake them.
 world.forEachRigidBody(body=>{if(body.isDynamic()&&body.isEnabled()&&body.handle!==catBody?.handle){body.setLinvel({x:0,y:0,z:0},false);body.setAngvel({x:0,y:0,z:0},false);body.sleep();}});
}

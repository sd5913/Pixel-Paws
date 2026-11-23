// Rear architecture uses the same offset and dimensions as level-2.js.
export function addBakingWindowColliders(physics, tableRadius) {
  const { world, rapier: R } = physics;
  const rearOffset = 1.4 - tableRadius;
  const wall = world.createRigidBody(R.RigidBodyDesc.fixed());
  const box = (width, height, depth, x, y, z) => {
    world.createCollider(R.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
      .setTranslation(x, y, z + rearOffset).setFriction(.7).setRestitution(.02), wall);
  };
  box(7.6, 3.3, .13, 0, 1.65, -1.95);
  box(3.48, 1.05, .04, 0, 1.14, -1.86);
  for (const x of [-1.74, 0, 1.74]) box(.09, 1.14, .12, x, 1.14, -1.79);
  for (const y of [.58, 1.70]) box(3.57, .09, .12, 0, y, -1.79);
  box(3.72, .09, .49, 0, .55, -1.63);
  box(7.6, .08, .16, 0, .48, -1.82);
  // A continuous floor-to-ceiling barrier sits in front of the entire planter row.
  // Its front face is Z=-1.85 for the current 1.95 m table radius.
  box(7.6,3.3,.8,0,1.65,-1.70);
  // Solid planter envelopes and a continuous strip close gaps behind the pots.
  box(2.72,.24,.38,0,.72,-1.60);
  for(const [x,z,scale,cactus] of [[-.89,-1.58,1.1,true],[-1.18,-1.49,.64,true],[-.65,-1.49,.58,false],[.86,-1.55,1.08,false],[1.19,-1.49,.65,false],[.59,-1.58,.58,true]]){
    const height=(cactus?.51:.34)*scale;
    box(.28*scale,height,.28*scale,x,.60+height/2,z);
  }
  physics.world.maxCcdSubsteps = Math.max(physics.world.maxCcdSubsteps, 4);
}

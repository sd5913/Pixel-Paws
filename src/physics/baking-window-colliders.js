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
  physics.world.maxCcdSubsteps = Math.max(physics.world.maxCcdSubsteps, 4);
}

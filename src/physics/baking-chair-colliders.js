// Dimensions match the two chairs built in level-2.js.
export function addBakingChairColliders(physics, tableRadius) {
  const { world, rapier: R } = physics;
  for (const side of [-1, 1]) {
    const centerX = side * (tableRadius + .32);
    const body = world.createRigidBody(R.RigidBodyDesc.fixed());
    const box = (width, height, depth, x, y, z) => {
      world.createCollider(R.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setTranslation(x, y, z).setFriction(.7).setRestitution(.02), body);
    };
    box(.53, .045, .48, centerX, .42, .47);
    box(.49, .43, .035, centerX, .66, .68);
    for (const x of [-.21, .21]) {
      for (const z of [-.17, .17]) {
        box(.042, .4, .042, centerX + x, .2, .47 + z);
      }
    }
  }
}

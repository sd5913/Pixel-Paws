import { createPhysicsWorld } from './physics-world.js';
import { addBakingChairColliders } from './baking-chair-colliders.js';
import { addBakingWindowColliders } from './baking-window-colliders.js';

export async function createBakingPhysics(tableHeight, tableRadius) {
  const physics = await createPhysicsWorld();
  const { world, rapier: R } = physics;
  const table = world.createRigidBody(R.RigidBodyDesc.fixed());
  world.createCollider(R.ColliderDesc.cylinder(.045, tableRadius)
    .setTranslation(0, tableHeight - .045, 0).setFriction(.65), table);
  const floor = world.createRigidBody(R.RigidBodyDesc.fixed());
  const floorCollider = world.createCollider(R.ColliderDesc.cuboid(10,.05,10).setTranslation(0,-.05,0),floor);
  addBakingChairColliders(physics,tableRadius);
  addBakingWindowColliders(physics,tableRadius);
  const catBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, tableHeight+.2, 0));
  world.createCollider(R.ColliderDesc.ball(.22), catBody);
  return { physics, catBody, floorCollider };
}

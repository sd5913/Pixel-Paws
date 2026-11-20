import { Box3, Group, Quaternion, Vector3 } from 'three';
import { createPhysicsBody, syncPhysicsBody } from './physics-body.js';

const SPILL_TILT = Math.cos(Math.PI / 6);
// Loose pieces collide with the desk and one another, but can exit the
// holder through its simplified solid collider.
const HOLDER_SOLVER_GROUPS = (2 << 16) | 3;
const CONTENTS_SOLVER_GROUPS = (4 << 16) | 5;

export function createPencilSpill(physics, holder) {
  const cup = holder.object3D;
  const model = cup.children[0];
  for (const collider of holder.colliders) collider.setSolverGroups(HOLDER_SOLVER_GROUPS);
  const pieces = [
    { prefix: '02_', id: 'long-pencil', mass: 0.012, spread: -0.65 },
    { prefix: '03_', id: 'short-pencil', mass: 0.010, spread: 0.65 },
    { prefix: '04_', id: 'scissors', mass: 0.035, spread: 0.08 },
  ].map(({ prefix, id, mass, spread }) => {
    const mesh = model.children.find(node => node.name.startsWith(prefix));
    const bounds = new Box3().setFromObject(mesh.clone());
    const center = bounds.getCenter(new Vector3());
    const halfExtents = bounds.getSize(new Vector3()).multiplyScalar(0.5);
    const object = new Group();
    object.name = id;
    object.position.copy(center);
    model.add(object);
    object.add(mesh);
    mesh.position.sub(center);
    const body = createPhysicsBody(physics, {
      id, object3D: object,
      initialTransform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: cup.scale.toArray() },
      physics: { bodyType: 'dynamic', suggestedMass: mass, friction: 0.55, restitution: 0.12,
        colliders: [{ type: 'box', halfExtents: halfExtents.toArray() }] },
    });
    body.rigidBody.enableCcd(true);
    body.rigidBody.setEnabled(false);
    for (const collider of body.colliders) collider.setSolverGroups(CONTENTS_SOLVER_GROUPS);
    return { body, object, center, spread };
  });
  let released = false;
  return {
    update() {
      if (!released) {
        const rotation = cup.getWorldQuaternion(new Quaternion());
        const mouth = new Vector3(0, 1, 0).applyQuaternion(rotation);
        if (mouth.y > SPILL_TILT || !cup.parent) return;
        const sideways = new Vector3(1, 0, 0).applyQuaternion(rotation);
        const cupVelocity = holder.rigidBody.linvel();
        for (const { body, object, spread } of pieces) {
          cup.parent.attach(object);
          const velocity = mouth.clone().multiplyScalar(0.85)
            .addScaledVector(sideways, spread).addScaledVector(cupVelocity, 0.25);
          const rigid = body.rigidBody;
          rigid.setTranslation(object.position, true);
          rigid.setRotation(rotation, true);
          rigid.setLinvel(velocity, true);
          rigid.setAngvel({ x: 2, y: spread * 5, z: -2 }, true);
          rigid.setEnabled(true);
        }
        released = true;
      }
      for (const { body } of pieces) syncPhysicsBody(body);
    },
    reset() {
      for (const { body, object, center } of pieces) {
        body.rigidBody.setEnabled(false);
        model.add(object);
        object.position.copy(center);
        object.quaternion.identity();
        object.scale.setScalar(1);
      }
      released = false;
    },
  };
}

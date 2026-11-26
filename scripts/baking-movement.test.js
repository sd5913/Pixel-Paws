import test from 'node:test';
import assert from 'node:assert/strict';
import { createBakingPhysics } from '../src/physics/baking-physics.js';
import { JOYSTICK_SPEED } from '../src/joystick.js';

test('kitchen movement preserves the dash speed through the physical motor', async () => {
  const environment = await createBakingPhysics(.78, 1.95);
  try {
    function travel(speed) {
      environment.resetCat();
      for (let frame = 0; frame < 18; frame++) {
        const position = environment.catBody.translation();
        environment.step(1 / 60, { x: position.x + speed / 60, y: position.z }, speed);
      }
      return environment.catBody.translation().x;
    }
    const walk = travel(JOYSTICK_SPEED.walk);
    const dash = travel(JOYSTICK_SPEED.dash);
    assert.ok(dash > walk * 1.8, `Dash ${dash} must be faster than walk ${walk}`);
    const position = environment.catBody.translation();
    assert.ok(Math.abs(position.y - .98) < .01, 'Cat remains on the table');
  } finally { environment.physics.dispose(); }
});

test('walking can push a heavy kitchen prop while keeping physical contact', async () => {
  const environment = await createBakingPhysics(.78, 1.95);
  const { world, rapier: R } = environment.physics;
  try {
    const prop = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.65, .98, 0));
    world.createCollider(R.ColliderDesc.cuboid(.20, .18, .20).setMass(.6).setFriction(.65), prop);
    for (let frame = 0; frame < 90; frame++) {
      const position = environment.catBody.translation();
      environment.step(1 / 60, { x: position.x + JOYSTICK_SPEED.walk / 60, y: 0 });
    }
    assert.ok(prop.translation().x > 1.0, `Prop should move, reached ${prop.translation().x}`);
    assert.ok(environment.catBody.translation().x < prop.translation().x, 'Cat must not pass through the prop');
  } finally { environment.physics.dispose(); }
});

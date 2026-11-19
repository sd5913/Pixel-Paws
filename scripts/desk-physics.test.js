import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Group, Vector3 } from 'three';
import { loadStudyScene } from '../src/assets/study-scene.js';
import { parseGlb } from '../src/assets/load-assets.js';
import { createDeskPhysics } from '../src/physics/desk-physics.js';
import { createPhysicsEventManager } from '../src/physics/physics-events.js';
import { connectPhysicsScoring } from '../src/physics-score-bridge.js';
import { createScoring } from '../src/scoring.js';
import { JOYSTICK_SPEED } from '../src/joystick.js';

async function fixture({ legacy = false } = {}) {
  const layout = JSON.parse(await readFile('src/scenes/study-desk-gameplay.scene.json', 'utf8'));
  if (legacy) {
    const [desk] = layout.instances;
    layout.instances = [desk,
      { id: 'preview-mug-on-desk', assetId: 'mug', audioMaterial: 'ceramic',
        transform: { position: [.891, .75, -1.276], rotation: [0, 0, 0, 1], scale: [3.6, 3.6, 3.6] },
        physics: { bodyType: 'dynamic', colliderSet: 'default' }, scoring: { size: 'small' } },
    ];
  }
  return loadStudyScene({
    fetchImpl: async path => ({ ok: true, json: async () => path.includes('scenes/') ? layout : JSON.parse(await readFile(`src/${path.slice(2)}`, 'utf8')) }),
    loadModel: async path => {
      const bytes = await readFile(`src/${path}`);
      return parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    },
  });
}

test('real cat contact pushes the mug off the desk, scores and resets physics', async () => {
  const study = await fixture({ legacy: true });
  const player = new Group();
  player.position.y = study.surface.height;
  const endings = [];
  const score = createScoring({ onEnd: result => endings.push(result) });
  score.startRound(study.targets.filter(target => target.id === 'preview-mug-on-desk')); // Isolate original cup scoring in this contact test.
  const events = createPhysicsEventManager();
  const disconnect = connectPhysicsScoring(events, score);
  const simulation = await createDeskPhysics(study, player, { events, windowWall: false });
  try {
    const mug = simulation.bodies.find(entry => entry.instance.assetId === 'mug');
    assert.ok(Math.abs(mug.body.rigidBody.mass() - 0.4) < 1e-5);
    // Reach the cup using the same walking speed and tabletop limits as gameplay.
    for (let frame = 0; frame < 600 && !endings.length; frame++) {
      if (frame < 100) player.position.x = Math.min(0.891, player.position.x + JOYSTICK_SPEED.walk / 60);
      else player.position.z = Math.max(-1.98 + 0.352, player.position.z - JOYSTICK_SPEED.walk / 60);
      simulation.step(1 / 60);
    }
    assert.equal(score.snapshot().total, 20);
    assert.equal(endings.length, 1);
    assert.equal(endings[0].reason, 'cleared');
    player.position.set(0, study.surface.height, 0);
    study.reset();
    simulation.reset();
    assert.ok(mug.instance.object3D.position.distanceTo(new Vector3(0.891, 0.75, -1.276)) < 1e-6);
    assert.deepEqual(Object.values(mug.body.rigidBody.linvel()), [0, 0, 0]);
    assert.deepEqual(Object.values(mug.body.rigidBody.angvel()), [0, 0, 0]);
    score.startRound(study.targets.filter(target => target.id === 'preview-mug-on-desk')); // Isolate original cup scoring in this contact test.
    for (let frame = 0; frame < 60; frame++) simulation.step(1 / 60);
    assert.equal(score.snapshot().total, 0);
  } finally { disconnect(); simulation.dispose(); }
});

test('the cup settles and restarts without stale events', async () => {
  const study = await fixture({ legacy: true });
  const player = new Group();
  player.position.y = study.surface.height;
  const endings = [];
  const score = createScoring({ onEnd: result => endings.push(result) });
  score.startRound(study.targets);
  const events = createPhysicsEventManager();
  const disconnect = connectPhysicsScoring(events, score);
  const simulation = await createDeskPhysics(study, player, { events, windowWall: false });
  try {
    const mugs = simulation.bodies.filter(entry => entry.instance.assetId === 'mug');
    assert.equal(mugs.length, 1);
    for (const { instance, body } of mugs) {
      const scale = instance.initialTransform.scale;
      const expected = instance.physics.colliders[0].halfExtents.map((value, axis) => value * scale[axis]);
      const actual = body.colliders[0].halfExtents();
      for (const [axis, value] of Object.entries(actual)) {
        assert.ok(Math.abs(value - expected['xyz'.indexOf(axis)]) < 1e-6);
      }
      assert.ok(Math.abs(body.rigidBody.mass() - 0.4) < 1e-5);
    }
    for (let frame = 0; frame < 60; frame++) simulation.step(1 / 60);
    assert.equal(score.snapshot().total, 0);
    // Move actual rigid bodies below the tabletop; detectors produce the events.
    mugs[0].body.rigidBody.setTranslation({ x: 0, y: -2, z: 0 }, true);
    simulation.step(1 / 60);
    assert.equal(score.snapshot().total, 20);
    assert.equal(score.snapshot().state, 'ended');
    assert.equal(endings.length, 1);
    study.reset();
    simulation.reset();
    score.startRound(study.targets);
    for (let frame = 0; frame < 60; frame++) simulation.step(1 / 60);
    assert.equal(score.snapshot().total, 0);
    assert.equal(score.snapshot().fallenCount, 0);
    assert.equal(endings.length, 1);
    for (const { instance } of mugs) {
      assert.deepEqual(instance.object3D.scale.toArray(), instance.initialTransform.scale);
    }
  } finally { disconnect(); simulation.dispose(); }
});

test('swat hits all colliders in the fixed forward box, excludes side/back/far bodies and never scores directly', async () => {
  const study = await fixture({ legacy: true });
  const desk = study.instances.find(instance => instance.assetId === 'desk');
  const mug = study.instances.find(instance => instance.assetId === 'mug');
  study.instances = [desk, mug, ...Array.from({ length: 4 }, (_, index) => ({
    ...mug, id: `swat-fixture-${index}`, object3D: mug.object3D.clone(),
    physics: { ...mug.physics, suggestedMass: index === 0 ? 0.5 : 0.25 },
  }))];
  const player = new Group();
  player.position.y = study.surface.height;
  const events = createPhysicsEventManager();
  const score = createScoring();
  score.startRound(study.targets);
  const disconnect = connectPhysicsScoring(events, score);
  const simulation = await createDeskPhysics(study, player, { events, windowWall: false });
  try {
    const mugs = simulation.bodies.filter(entry => entry.instance.assetId === 'mug');
    // Side/far targets overlapped the previous larger box, but must now miss.
    const places = [[-.15, -.45], [.15, -.45], [.52, -.45], [0, 1], [0, -.9]];
    mugs.forEach(({ body }, i) => body.rigidBody.setTranslation({ x: places[i][0], y: .75, z: places[i][1] }, true));
    simulation.physics.world.propagateModifiedBodyPositionsToColliders();
    const hits = simulation.swat(player.position, Math.PI);
    assert.deepEqual(hits, mugs.slice(0, 2).map(entry => entry.instance.id));
    assert.equal(score.snapshot().total, 0);
    for (const { body } of mugs.slice(0, 2)) {
      assert.ok(Math.abs(body.rigidBody.linvel().z * body.rigidBody.mass() + .525) < 1e-5);
      assert.ok(Math.abs(body.rigidBody.linvel().y * body.rigidBody.mass() - .06) < 1e-5);
      assert.ok(body.rigidBody.angvel().y > 0, 'left-side contact adds rightward yaw');
      assert.ok(Math.hypot(...Object.values(body.rigidBody.angvel())) > 0);
    }
    assert.ok(Math.abs(mugs[0].body.rigidBody.linvel().z / mugs[1].body.rigidBody.linvel().z - 2) < 1e-5,
      'twice the mass receives half the launch speed from the same paw strike');
    for (const { body } of mugs.slice(2)) assert.equal(Math.hypot(...Object.values(body.rigidBody.linvel())), 0);
    assert.deepEqual(simulation.swat({ x: 20, y: .75, z: 20 }, 0), []);
    simulation.step(1 / 60);
    assert.ok(mugs[0].body.rigidBody.translation().z < places[0][1]);
  } finally { disconnect(); simulation.dispose(); }
});

test('real Rapier impulse reports ceramic on wood, then goes quiet while resting', async () => {
  const study = await fixture({ legacy: true });
  const player = new Group();
  player.position.set(0, study.surface.height, 0);
  const events = createPhysicsEventManager();
  const impacts = [];
  events.bus.on('physics:impact', event => impacts.push(event));
  const simulation = await createDeskPhysics(study, player, { events, windowWall: false });
  try {
    const mug = simulation.bodies[1].body;
    mug.rigidBody.setTranslation({ x: .891, y: 1.2, z: -1.276 }, true);
    for (let i = 0; i < 90; i++) simulation.step(1 / 60);
    const hit = impacts.find(event => event.objectId === mug.id && event.surfaceMaterial === 'wood');
    assert.ok(hit, 'real contact manifold emits opted-in material pair');
    assert.equal(hit.audioMaterial, 'ceramic');
    assert.ok(hit.impactStrength > 0.025);
    assert.ok(Object.values(hit.position).every(Number.isFinite));
    const count = impacts.length;
    for (let i = 0; i < 120; i++) simulation.step(1 / 60);
    assert.equal(impacts.length, count, 'resting contacts stay silent');
    simulation.reset();
  } finally { simulation.dispose(); }
});

test('the new ink bottle can be swatted and scores when it falls', async () => {
  const study = await fixture();
  study.instances = study.instances.filter(item => ['desk', 'desk-lamp', 'ink-bottle'].includes(item.assetId));
  const ink = study.instances.find(item => item.assetId === 'ink-bottle');
  ink.initialTransform.position = [0, .75, -.62];
  ink.object3D.position.fromArray(ink.initialTransform.position);
  const player = new Group();
  player.position.y = study.surface.height;
  const events = createPhysicsEventManager();
  const score = createScoring();
  score.startRound(study.targets);
  const disconnect = connectPhysicsScoring(events, score);
  const simulation = await createDeskPhysics(study, player, { events });
  try {
    const lamp = simulation.bodies.find(entry => entry.instance.id === 'desk-lamp');
    const [x, y, z] = lamp.instance.initialTransform.position;
    assert.ok(lamp.body.rigidBody.isDynamic());
    assert.ok(!simulation.blocksCat(x, y, z));
    assert.ok(!simulation.blocksCat(0, study.surface.height, 0));
    for (let frame = 0; frame < 30; frame++) simulation.step(1 / 60);
    const inkPosition = simulation.bodies.find(entry => entry.instance.id === 'ink-bottle').instance.object3D.position;
    assert.ok(simulation.swat({ x: inkPosition.x, y: inkPosition.y, z: inkPosition.z + 0.3 }, Math.PI).includes('ink-bottle'));
    const { body, instance } = simulation.bodies.find(entry => entry.instance.id === 'ink-bottle');
    assert.ok(body.rigidBody.linvel().z < 0, 'swat accelerates the bottle forward');
    for (let frame = 0; frame < 45; frame++) simulation.step(1 / 60);
    assert.ok(Number.isFinite(instance.object3D.position.z));
    body.rigidBody.setTranslation({ x: 2, y: -2, z: 0 }, true);
    simulation.step(1 / 60);
    assert.equal(score.snapshot().fallenCount, 1);
    assert.ok(simulation.swat({ x: x + 0.5, y, z }, -Math.PI / 2).includes('desk-lamp'));
    assert.ok(lamp.body.rigidBody.linvel().x < 0, 'heavy lamp still responds to the paw');
    for (let frame = 0; frame < 30; frame++) simulation.step(1 / 60);
    const lampTravel = lamp.instance.object3D.position.distanceTo(new Vector3(x, y, z));
    assert.ok(lampTravel > 0.1, `lamp responds visibly to a single swat: ${lampTravel}`);
    simulation.reset();
    assert.ok(lamp.instance.object3D.position.distanceTo(new Vector3(x, y, z)) < 1e-6);
  } finally { disconnect(); simulation.dispose(); }
});

test('the window wall stops a fast prop while the side edge still allows falls', async () => {
  const study = await fixture();
  study.instances = study.instances.filter(({ assetId }) => ['desk', 'ink-bottle'].includes(assetId));
  const player = new Group();
  player.position.y = study.surface.height;
  const simulation = await createDeskPhysics(study, player, { events: createPhysicsEventManager() });
  const bottle = simulation.bodies.find(entry => entry.instance.id === 'ink-bottle').body.rigidBody;
  const { height, centerXZ: [x, z], halfExtentsXZ: [halfWidth, halfDepth] } = study.surface;
  const rear = z - halfDepth;
  const step = frames => {
    for (let frame = 0; frame < frames; frame++) simulation.step(1 / 60);
  };
  try {
    assert.ok(simulation.blocksCat(x, height, rear + 0.1));
    bottle.setTranslation({ x, y: height, z: rear + 0.5 }, true);
    bottle.setLinvel({ x: 0, y: 0, z: -12 }, true);
    step(90);
    assert.ok(bottle.translation().z >= rear);
    assert.ok(bottle.translation().y >= height - 0.12);
    for (const side of [-1, 1]) {
      simulation.reset();
      bottle.setTranslation({ x: x + side * (halfWidth - 0.22), y: height + 0.42, z: rear + 0.5 }, true);
      bottle.setLinvel({ x: side * 4, y: 0, z: -18 }, true);
      bottle.setAngvel({ x: 13, y: 7, z: 3 }, true);
      for (let frame = 0; frame < 16; frame++) {
        step(1);
        assert.ok(bottle.translation().z >= rear - 0.01, JSON.stringify({side,frame,position:bottle.translation(),velocity:bottle.linvel()}));
      }
    }
    simulation.reset();
    bottle.setTranslation({ x: x + halfWidth - 0.15, y: height, z }, true);
    bottle.setLinvel({ x: 5, y: 0, z: 0 }, true);
    step(90);
    assert.ok(bottle.translation().y < height - 0.5);
  } finally { simulation.dispose(); }
});

test('one swat topples the lamp without requiring a second strike', async () => {
  const study = await fixture();
  study.instances = study.instances.filter(({ assetId }) => ['desk', 'desk-lamp'].includes(assetId));
  const player = new Group();
  const lampInstance = study.instances.find(({ assetId }) => assetId === 'desk-lamp');
  const [x, y, z] = lampInstance.initialTransform.position;
  player.position.set(x + .5, y, z);
  const simulation = await createDeskPhysics(study, player, { events: createPhysicsEventManager() });
  try {
    for (let i = 0; i < 60; i++) simulation.step(1 / 60);
    assert.ok(simulation.swat(player.position, -Math.PI / 2).includes('desk-lamp'));
    let minUpright = 1;
    const lamp = simulation.bodies.find(({ instance }) => instance.assetId === 'desk-lamp').body;
    for (let i = 0; i < 120; i++) {
      simulation.step(1 / 60);
      const q = lamp.rigidBody.rotation();
      minUpright = Math.min(minUpright, 1 - 2 * (q.x ** 2 + q.z ** 2));
    }
    assert.ok(minUpright < .5, `lamp must tip beyond 60 degrees: upright=${minUpright}`);
  } finally { simulation.dispose(); }
});

test('a dash transfers less motion to a heavier version of the same prop', async () => {
  async function dash(mass) {
    const study = await fixture({ legacy: true });
    const mug = study.instances.find(({ assetId }) => assetId === 'mug');
    mug.physics = { ...mug.physics, suggestedMass: mass };
    mug.initialTransform.position = [0, study.surface.height, -.6];
    const player = new Group();
    player.position.set(0, study.surface.height, 0);
    const simulation = await createDeskPhysics(study, player, { events: createPhysicsEventManager(), windowWall: false });
    try {
      simulation.reset();
      for (let i = 0; i < 30; i++) simulation.step(1 / 60);
      const prop = simulation.bodies.find(({ instance }) => instance.assetId === 'mug').body;
      const before = prop.rigidBody.translation().z;
      for (let i = 0; i < 12; i++) {
        player.position.z -= JOYSTICK_SPEED.dash / 60;
        simulation.step(1 / 60);
      }
      return { travel: before - prop.rigidBody.translation().z, catTravel: -player.position.z };
    } finally { simulation.dispose(); }
  }
  const light = await dash(.15);
  const heavy = await dash(.6);
  assert.ok(light.travel > .01, JSON.stringify({ light, heavy }));
  assert.ok(heavy.travel < light.travel * .85, JSON.stringify({ light, heavy }));
  assert.ok(heavy.catTravel < light.catTravel, 'a heavier prop also slows the cat more');
});

test('movement motor covers the same distance at 30, 60 and 120 render frames per second', async () => {
  for (const fps of [30, 60, 120]) {
    const study = await fixture();
    study.instances = study.instances.filter(({ assetId }) => assetId === 'desk');
    const player = new Group();
    player.position.set(0, study.surface.height, 0);
    const simulation = await createDeskPhysics(study, player, { events: createPhysicsEventManager(), windowWall: false });
    try {
      for (let i = 0; i < fps; i++) simulation.step(1 / fps, { x: JOYSTICK_SPEED.walk, z: 0 });
      assert.ok(Math.abs(player.position.x - JOYSTICK_SPEED.walk) < .001, `fps=${fps}, x=${player.position.x}`);
    } finally { simulation.dispose(); }
  }
});

test('eraser is heavier but still lighter than the lamp, and resists swat accordingly', async () => {
  const study = await fixture();
  study.instances = study.instances.filter(({ assetId }) => ['desk', 'eraser'].includes(assetId));
  const player = new Group();
  player.position.set(0, study.surface.height, 0);
  const simulation = await createDeskPhysics(study, player, { events: createPhysicsEventManager(), windowWall: false });
  try {
    const eraser = simulation.bodies.find(({ instance }) => instance.assetId === 'eraser').body.rigidBody;
    assert.ok(Math.abs(eraser.mass() - .18) < 1e-5);
    eraser.setTranslation({ x: 0, y: study.surface.height, z: -.4 }, true);
    simulation.physics.world.propagateModifiedBodyPositionsToColliders();
    assert.deepEqual(simulation.swat(player.position, Math.PI), ['eraser']);
    assert.ok(Math.abs(eraser.linvel().z + .525 / .18) < 1e-5);
  } finally { simulation.dispose(); }
});

test('new rounds randomize every prop within the desk, clear of spawn and each other', async () => {
  const study = await fixture();
  let seed = 123456789;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const desk = study.instances.find(({ assetId }) => assetId === 'desk');
  const originalDesk = structuredClone(desk.initialTransform);
  const { Box3 } = await import('three');
  for (let round = 0; round < 100; round++) {
    const previous = new Map(study.instances.map(instance => [instance.id, [...instance.initialTransform.position]]));
    study.reset({ randomize: true, random });
    const boxes = [];
    for (const instance of study.instances.filter(item => item.physics.bodyType === 'dynamic' && item.assetId !== 'notebook-stack')) {
      const position = instance.initialTransform.position;
      const before = previous.get(instance.id);
      assert.ok(Math.hypot(position[0] - before[0], position[2] - before[2]) >= .12);
      assert.equal(position[1], before[1], 'preserve the authored tabletop height');
      instance.object3D.updateMatrixWorld(true);
      const box = new Box3().setFromObject(instance.object3D);
      const [cx, cz] = study.surface.centerXZ;
      const [hx, hz] = study.surface.halfExtentsXZ;
      assert.ok(box.min.x >= cx - hx + .119 && box.max.x <= cx + hx - .119, instance.id);
      assert.ok(box.min.z >= cz - hz + .119 && box.max.z <= cz + hz - .119, instance.id);
      const intersectsXZ = other => box.min.x < other.max.x && box.max.x > other.min.x
        && box.min.z < other.max.z && box.max.z > other.min.z;
      assert.ok(!intersectsXZ({ min: { x: -.42, z: -.42 }, max: { x: .42, z: .42 } }), 'spawn stays clear');
      for (const other of boxes) assert.ok(!intersectsXZ(other), `overlap on round ${round}: ${instance.id}`);
      boxes.push(box);
    }
    assert.deepEqual(desk.initialTransform, originalDesk);
    const snapshot = study.instances.map(instance => instance.object3D.position.toArray());
    study.reset();
    assert.deepEqual(study.instances.map(instance => instance.object3D.position.toArray()), snapshot,
      'ordinary reset preserves the current layout');
  }
});

test('randomized rounds reset real bodies and do not score during initial settling', async () => {
  const study = await fixture();
  const player = new Group();
  player.position.set(0, study.surface.height, 0);
  const events = createPhysicsEventManager();
  const score = createScoring();
  const disconnect = connectPhysicsScoring(events, score);
  const simulation = await createDeskPhysics(study, player, { events });
  let seed = 42;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try {
    for (let round = 0; round < 20; round++) {
      study.reset({ randomize: true, random });
      simulation.reset();
      score.startRound(study.targets);
      for (const { instance, body } of simulation.bodies) {
        const expected = instance.initialTransform.position;
        const actual = body.rigidBody.translation();
        assert.ok(new Vector3(actual.x, actual.y, actual.z).distanceTo(new Vector3(...expected)) < 1e-5);
        assert.deepEqual(Object.values(body.rigidBody.linvel()), [0, 0, 0]);
      }
      for (let frame = 0; frame < 120; frame++) simulation.step(1 / 60, { x: 0, z: 0 });
      assert.equal(score.snapshot().total, 0, `round ${round} should start stable`);
    }
  } finally { disconnect(); simulation.dispose(); }
});

test('cat motor reverses immediately after a blocked dash and respects the desk edge', async () => {
  const study = await fixture();
  study.instances = study.instances.filter(({ assetId }) => assetId === 'desk');
  const player = new Group();
  player.position.y = study.surface.height;
  const edgeMargin = 0.352;
  const simulation = await createDeskPhysics(study, player, {
    events: createPhysicsEventManager(), windowWall: false, edgeMargin,
  });
  try {
    const { world, rapier } = simulation.physics;
    world.createCollider(rapier.ColliderDesc.cuboid(0.8, 0.5, 0.025)
      .setTranslation(0, study.surface.height + 0.3, -0.65));
    const dash = JOYSTICK_SPEED.dash;
    for (let frame = 0; frame < 45; frame++) simulation.step(1 / 30, { x: 0, z: -dash });
    assert.ok(player.position.z < -0.25 && player.position.z > -0.40, 'cat stops at the obstacle');
    const blocked = player.position.z;
    simulation.step(1 / 30, { x: 0, z: JOYSTICK_SPEED.walk });
    assert.ok(player.position.z > blocked + 0.03, 'reverses on the next frame');
    for (let frame = 0; frame < 45; frame++) simulation.step(1 / 30, { x: 0, z: dash });
    const edge = study.surface.centerXZ[1] + study.surface.halfExtentsXZ[1] - edgeMargin;
    assert.ok(Math.abs(player.position.z - edge) < 0.001, 'stays on the desk at full dash speed');
  } finally {
    simulation.dispose();
  }
});

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
    assert.ok(Math.abs(mug.body.rigidBody.mass() - 0.25) < 1e-5);
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
      assert.ok(Math.abs(body.rigidBody.mass() - 0.25) < 1e-5);
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
      assert.ok(Math.abs(body.rigidBody.linvel().z + 2.1) < 1e-5);
      assert.ok(Math.abs(body.rigidBody.linvel().y - .35) < 1e-5);
      assert.ok(body.rigidBody.angvel().y > 0, 'left-side contact adds rightward yaw');
      assert.ok(Math.hypot(...Object.values(body.rigidBody.angvel())) > 0);
    }
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
    assert.ok(simulation.swat(player.position, Math.PI).includes('ink-bottle'));
    const { body, instance } = simulation.bodies.find(entry => entry.instance.id === 'ink-bottle');
    for (let frame = 0; frame < 45; frame++) simulation.step(1 / 60);
    assert.ok(instance.object3D.position.z < instance.initialTransform.position[2] - 0.1);
    body.rigidBody.setTranslation({ x: 2, y: -2, z: 0 }, true);
    simulation.step(1 / 60);
    assert.equal(score.snapshot().fallenCount, 1);
    assert.ok(simulation.swat({ x: x + 0.5, y, z }, -Math.PI / 2).includes('desk-lamp'));
    for (let frame = 0; frame < 30; frame++) simulation.step(1 / 60);
    assert.ok(lamp.instance.object3D.position.distanceTo(new Vector3(x, y, z)) > 0.1);
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

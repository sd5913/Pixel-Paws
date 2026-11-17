import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { createAfternoonRoom, styleStudyMaterials } from '../src/visuals/afternoon-room.js';
import { createContactShadows } from '../src/visuals/contact-shadows.js';
import { createImpactFeedback } from '../src/visuals/impact-feedback.js';

const surface = { height: .75, centerXZ: [0, 0], halfExtentsXZ: [1.485, 1.98] };

test('impact feedback uses a bounded pool, restores visual scale and leaves physical position alone', () => {
  const scene = new T.Scene(), object = new T.Group();
  object.position.set(.1, .75, -.4); object.scale.set(.17, .17, .17);
  const position = object.position.clone(), scale = object.scale.clone();
  const feedback = createImpactFeedback(scene);
  const childCount = scene.children[0].children.length;
  for (let i = 0; i < 100; i++) feedback.burst(object.position, .525, object, true);
  feedback.update(.05, new T.Camera());
  assert.equal(scene.children[0].children.length, childCount);
  assert.ok(!object.scale.equals(scale), 'brief squash gives a visible hit response');
  assert.ok(object.position.equals(position), 'feedback does not move the physical root');
  feedback.reset();
  assert.ok(object.scale.equals(scale));
  feedback.dispose();
  assert.equal(scene.children.length, 0);
});

test('reduced-motion mode disables particles, squash and camera shake', () => {
  const scene = new T.Scene(), object = new T.Group(), camera = new T.Camera();
  const feedback = createImpactFeedback(scene, { reducedMotion: true });
  feedback.burst(new T.Vector3(0, .75, 0), 1, object, true);
  feedback.update(.05, camera);
  assert.deepEqual(object.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(camera.position.toArray(), [0, 0, 0]);
  assert.ok(scene.children[0].children.slice(1).every(child => !child.visible));
  feedback.dispose();
});

test('afternoon material tuning clones materials and preserves the approved mug', () => {
  const original = new T.MeshStandardMaterial({ name: 'Oat wood tabletop', color: '#c8aa86', roughness: .8 });
  const desk = new T.Mesh(new T.BoxGeometry(), original), mug = new T.Mesh(new T.BoxGeometry(), original);
  const appearance = styleStudyMaterials([{ assetId: 'desk', object3D: desk }, { assetId: 'mug', object3D: mug }]);
  assert.notEqual(desk.material, original);
  assert.ok(desk.material.map);
  assert.equal(mug.material, original);
  assert.equal(original.map, null);
  assert.equal(original.color.getHexString(), 'c8aa86');
  appearance.dispose(); desk.geometry.dispose(); mug.geometry.dispose(); original.dispose();
});

test('contact shadows follow randomized positions and hide under fallen props', () => {
  const scene = new T.Scene(), player = new T.Group(), object = new T.Group();
  player.position.y = object.position.y = surface.height;
  const instance = { object3D: object, initialTransform: { position: [0, .75, 0] },
    bounds: { center: [0, .1, 0], halfExtents: [.1, .1, .1] }, physics: { bodyType: 'dynamic' } };
  const shadows = createContactShadows(scene, [instance], player, surface);
  object.position.x = .7; shadows.update();
  assert.equal(scene.children[0].position.x, .7);
  assert.ok(scene.children[0].visible);
  object.position.y = -1; shadows.update();
  assert.equal(scene.children[0].visible, false);
  shadows.dispose(); assert.equal(scene.children.length, 0);
});

test('room dressing is decorative and has no gameplay physics metadata', () => {
  const room = createAfternoonRoom(surface);
  assert.equal(room.userData.decorative, true);
  room.traverse(object => assert.equal(object.userData.physics, undefined));
  assert.ok(room.getObjectByName('Sage plant outside play area'));
  let drawCalls = 0;
  room.traverse(object => { if (object.isMesh) drawCalls++; });
  assert.ok(drawCalls < 30, `batch room decoration: ${drawCalls} draw calls`);
  room.userData.dispose();
});

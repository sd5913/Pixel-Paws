import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from 'three';
import { createEventBus } from './events.js';
import { ImpactVFXManager } from './impact-vfx-manager.js';
import { createObstacleFeedback } from './obstacle-feedback.js';

test('VFX hook receives the collision data and unsubscribes on disposal', () => {
  const bus = createEventBus();
  const received = [];
  const vfx = new ImpactVFXManager(bus, { onImpact: event => received.push(event) });
  const impact = { position: { x: 1, y: 2, z: 3 }, audioMaterial: 'ceramic', impactStrength: .8 };
  bus.emit('physics:impact', impact);
  assert.deepEqual(received, [impact]);
  vfx.dispose();
  bus.emit('physics:impact', impact);
  assert.equal(received.length, 1);
});

test('obstacle feedback reuses one orange outline and cleans up', () => {
  const bus = createEventBus();
  const scene = new Scene();
  const object = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  object.add(mesh);
  const feedback = createObstacleFeedback(bus, scene, id => id === 'obstacle' ? object : null);
  const outline = scene.children[0];
  assert.equal(outline.material.color.getHex(), 0xff9800);
  bus.emit('physics:impact', { obstacleId: 'obstacle' });
  assert.equal(outline.visible, false);
  bus.emit('game:obstacle-hit', { obstacleId: 'obstacle' });
  assert.equal(outline.visible, true);
  feedback.update(.3);
  assert.equal(outline.visible, false);
  bus.emit('game:obstacle-hit', { obstacleId: 'obstacle' });
  feedback.reset();
  assert.equal(outline.visible, false);
  feedback.dispose();
  assert.equal(scene.children.length, 0);
  mesh.geometry.dispose(); mesh.material.dispose();
});

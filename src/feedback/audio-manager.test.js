import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AudioManager } from './audio-manager.js';
import { Group } from 'three';

// Audio hardware is unavailable in Node. Exercise manager lifecycle with the same
// public Three.js interfaces; the browser smoke check exercises real Web Audio.
class Listener extends Group {
  context = { state: 'suspended', resume: async () => { this.context.state = 'running'; },
    decodeAudioData: async data => data };
  gain = { disconnect() {} };
  setMasterVolume(value) { this.volume = value; }
}
class Sound extends Group {
  isPlaying = false;
  disconnected = false;
  setBuffer(buffer) { this.buffer = buffer; }
  setRefDistance() {}
  setMaxDistance() {}
  setVolume(value) { this.volume = value; }
  setPlaybackRate(value) { this.rate = value; }
  play() { this.isPlaying = true; }
  stop() { this.isPlaying = false; }
  disconnect() { this.disconnected = true; }
}
const three = { AudioListener: Listener, PositionalAudio: Sound, Audio: Sound };
const hit = { audioMaterial: 'ceramic', surfaceMaterial: 'wood', impactStrength: .2, position: { x: 1, y: 2, z: 3 } };

test('audio is pooled, unlocks, clamps gain, warns once and disposes', async () => {
  const warnings = [];
  const manager = new AudioManager({ three, development: true, warn: message => warnings.push(message),
    fetchImpl: async url => ({ ok: true, json: async () => ['impacts/ceramic/wood/medium/a.mp3', 'ui/start.mp3'],
      arrayBuffer: async () => new ArrayBuffer(2) }) });
  const camera = new Group();
  const scene = new Group();
  manager.init(camera, scene);
  manager.init(camera, scene);
  await manager.preload();
  assert.equal(manager.playImpact(hit), false, 'locked impacts are discarded');
  await manager.unlock();
  const count = scene.children.length;
  for (let i = 0; i < 30; i++) assert.equal(manager.playImpact(hit), true);
  assert.equal(scene.children.length, count);
  assert.equal(count, 10);
  assert.equal(camera.children.length, 1);
  assert.deepEqual(scene.children[0].position.toArray(), [1, 2, 3]);
  assert.ok(scene.children[0].rate >= .96 && scene.children[0].rate <= 1.04);
  assert.equal(manager.playUISound('start'), true);
  manager.setMasterVolume(5);
  const listener = camera.children[0];
  assert.equal(listener.volume, 1);
  manager.setMuted(true);
  assert.equal(listener.volume, 0);
  assert.equal(manager.playImpact(hit), false);
  manager.setMuted(false);
  for (let i = 0; i < 2; i++) manager.playImpact({ ...hit, audioMaterial: 'paper' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /paper\/wood\/medium/);
  manager.dispose();
  assert.equal(camera.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(manager.playImpact(hit), false);
});

test('failed samples and disposal during preload are harmless', async () => {
  let finish;
  const manager = new AudioManager({ three, warn: () => {},
    fetchImpl: async () => ({ ok: true, json: async () => ['impacts/ceramic/wood/medium/bad.mp3'],
      arrayBuffer: () => new Promise(resolve => { finish = resolve; }) }) });
  manager.init(new Group(), new Group());
  const pending = manager.preload();
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  manager.dispose();
  finish(new ArrayBuffer(0));
  await pending;
  assert.equal(manager.playImpact(hit), false);
  const failed = new AudioManager({ three, warn: () => {}, fetchImpl: async () => { throw new Error('offline'); } });
  failed.init(new Group(), new Group());
  await failed.preload();
  await failed.unlock();
  assert.equal(failed.playImpact(hit), false);
  failed.dispose();
});

test('one missing sample does not discard working variants', async () => {
  const warnings = [];
  const manager = new AudioManager({ three, warn: message => warnings.push(message),
    fetchImpl: async url => ({ ok: !url.endsWith('missing.mp3'), status: 404,
      json: async () => ['impacts/ceramic/wood/medium/good.mp3', 'impacts/ceramic/wood/medium/missing.mp3'],
      arrayBuffer: async () => new ArrayBuffer(2) }) });
  manager.init(new Group(), new Group());
  await manager.preload();
  await manager.unlock();
  assert.equal(manager.playImpact(hit), true);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /missing.mp3/);
  manager.dispose();
});

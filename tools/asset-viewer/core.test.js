import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { parseGlb } from '../../src/assets/load-assets.js';
import { prepareModel, setModelStyle, createColliderLayer, frameCamera, modelMetadata, selectionInstances } from './core.js';

const manifest = JSON.parse(await readFile(new URL('../../src/assets/asset-manifest.json', import.meta.url)));
const layout = JSON.parse(await readFile(new URL('../../src/scenes/study-desk-preview.scene.json', import.meta.url)));
const mug = manifest.assets.find(a => a.id === 'mug');
const bytes = await readFile(new URL('../../src/assets/models/mug.glb', import.meta.url));
const source = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

test('inspection and art switching preserve native geometry and original source materials', () => {
  const record = prepareModel(source, mug);
  const meshes = []; source.traverse(o => { if (o.isMesh) meshes.push(o); });
  const originalColor = meshes[0].material.color.clone();
  for (const preset of ['soft-pastel', 'warm-illustrated', 'faceted-diorama']) {
    setModelStyle(record, { mode: 'art', preset, wireframe: true });
    assert.equal(record.meshes[0].mesh.material.wireframe, true);
    assert.equal(meshes[0].material.wireframe, false);
    assert.equal(record.meshes[0].mesh.geometry, meshes[0].geometry);
    setModelStyle(record, { mode: 'inspection', preset, wireframe: false });
    assert.equal(record.meshes[0].mesh.material.type, meshes[0].material.type);
    assert.deepEqual(record.meshes[0].mesh.material.color, originalColor);
  }
  assert.deepEqual(record.object.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(record.object.position.toArray(), [0, 0, 0]);
  assert.equal(source.children[0].geometry, record.object.children[0].geometry);
});

test('mug metadata reports actual geometry rather than a target and records the pivot exception', () => {
  const data = modelMetadata(prepareModel(source, mug), mug);
  data.dimensions.forEach((n, i) => assert.ok(Math.abs(n - mug.dimensionsMeters[i]) < 1e-6));
  assert.equal(data.triangles, 612);
  assert.equal(data.materials, 2);
  assert.equal(data.boundsMatch, true);
  assert.equal(data.front, '+Z');
  assert.equal(data.approvedSha256, mug.approvedSha256);
});

test('compound colliders apply scene transforms once, without double-applying asset visualScale', () => {
  const entry = structuredClone(manifest.assets.find(a => a.id === 'desk'));
  entry.visualScale = [2, 2, 2]; // collider dimensions already include this scale
  const transform = { position: [3, 1, -2], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2], scale: [1.5, 1, 1] };
  const { group, warnings } = createColliderLayer(entry, transform);
  assert.equal(group.children.length, 5);
  assert.deepEqual(warnings, []);
  group.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(group.children[0]);
  assert.deepEqual(bounds.getCenter(new T.Vector3()).toArray().map(n => +n.toFixed(4)), [3, 1.7, -2]);
  assert.deepEqual(bounds.getSize(new T.Vector3()).toArray().map(n => +n.toFixed(4)), [0.9, 0.1, 2.7]);
});

test('unsupported node colliders are reported explicitly rather than fabricated', () => {
  const entry = { ...mug, colliders: [{ type: 'convex-hull', center: [0, 0, 0], includeNodes: ['body'] }] };
  const { group, warnings } = createColliderLayer(entry);
  assert.equal(group.children.length, 0);
  assert.match(warnings.join(' '), /convex-hull/);
});

test('camera fitting contains all model bounds in narrow portrait and landscape views', () => {
  const box = new T.Box3(new T.Vector3(-1.25, -0.15, -1), new T.Vector3(1.25, 0.85, 1.1));
  for (const aspect of [0.45, 1, 2.5]) {
    const camera = new T.OrthographicCamera();
    frameCamera(camera, box, aspect, 70, 150);
    camera.updateMatrixWorld();
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new T.Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
    }
    assert.equal(camera.zoom, 1);
  }
});

test('scene selection follows the shared layout and unknown assets cannot silently fall back', () => {
  const instances = selectionInstances('desk-scene', manifest, layout);
  assert.deepEqual(instances, layout.instances);
  assert.notEqual(instances, layout.instances);
  assert.deepEqual(selectionInstances('mug', manifest, layout)[0].transform.scale, [1, 1, 1]);
  assert.throws(() => selectionInstances('missing', manifest, layout), /Unknown asset/);
});

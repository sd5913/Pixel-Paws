import * as T from 'three';
import { loadGlb } from '../../src/assets/load-assets.js';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const controls = Object.fromEntries(['asset', 'elevation', 'azimuth', 'collider', 'desk'].map(id => [id, document.getElementById(id)]));
const scene = new T.Scene();
scene.background = new T.Color('#EEE5E9');
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
viewport.append(renderer.domElement);
scene.add(new T.HemisphereLight('#ffffff', '#C8AA86', 2));
const sun = new T.DirectionalLight('#ffffff', 2.5);
sun.position.set(3, 6, 4);
scene.add(sun);
const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
const target = new T.Vector3();
const colliderGroup = new T.Group();
scene.add(colliderGroup);
const ground = new T.GridHelper(2, 20, '#A9BBA0', '#C8AA86');
ground.position.y = -0.0001;
scene.add(ground);
const deskOutline = new T.LineLoop(new T.BufferGeometry().setFromPoints([
  new T.Vector3(-0.9, 0, -0.45), new T.Vector3(0.9, 0, -0.45),
  new T.Vector3(0.9, 0, 0.45), new T.Vector3(-0.9, 0, 0.45),
]), new T.LineBasicMaterial({ color: '#514A50' }));
scene.add(deskOutline);
let model;
let entry;
let request = 0;

function render() {
  if (!entry) return;
  viewport.style.aspectRatio = `${window.innerWidth} / ${window.innerHeight}`;
  const width = viewport.clientWidth, height = viewport.clientHeight;
  renderer.setSize(width, height);
  const aspect = width / height;
  const deskScale = controls.desk.checked;
  const sphereRadius = deskScale ? Math.hypot(0.9, 0.45, entry.dimensionsMeters[1])
    : Math.hypot(...entry.dimensionsMeters) / 2;
  // A sphere bounds any azimuth/elevation; fit both portrait axes with margin.
  const halfHeight = sphereRadius * 1.2 / Math.min(aspect, 1);
  camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
  camera.top = halfHeight; camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  target.fromArray(deskScale ? [0, entry.dimensionsMeters[1] / 2, 0] : entry.bounds.center);
  const e = T.MathUtils.degToRad(Number(controls.elevation.value));
  const a = T.MathUtils.degToRad(Number(controls.azimuth.value));
  camera.position.set(5 * Math.cos(e) * Math.sin(a), 5 * Math.sin(e), 5 * Math.cos(e) * Math.cos(a)).add(target);
  camera.lookAt(target);
  document.querySelector('#angle').value = `${controls.elevation.value}°`;
  colliderGroup.visible = controls.collider.checked;
  deskOutline.visible = deskScale;
  ground.visible = deskScale;
  renderer.render(scene, camera);
}

try {
  const response = await fetch('./assets/asset-manifest.json');
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  const manifest = await response.json();
  for (const asset of manifest.assets) controls.asset.add(new Option(asset.id, asset.id));
  controls.asset.value = 'mug';
  async function select() {
    const token = ++request;
    status.textContent = 'Loading…';
    try {
      const asset = manifest.assets.find(a => a.id === controls.asset.value);
      const source = await loadGlb(`./${asset.path}`);
      if (token !== request) return;
      if (model) scene.remove(model);
      model = source.clone(true);
      model.scale.fromArray(asset.visualScale);
      scene.add(model);
      entry = asset;
      for (const child of [...colliderGroup.children]) {
        child.geometry.dispose(); child.material.dispose(); colliderGroup.remove(child);
      }
      for (const collider of asset.colliders) {
        if (collider.type !== 'box') continue;
        const center = new T.Vector3().fromArray(collider.center);
        const half = new T.Vector3().fromArray(collider.halfExtents);
        colliderGroup.add(new T.Box3Helper(new T.Box3(center.clone().sub(half), center.clone().add(half)), '#514A50'));
      }
      status.textContent = `${asset.id}: ${asset.dimensionsMeters.map(n => n.toFixed(4)).join(' × ')} m (W × H × D). Orthographic; native scale and origin preserved. Collider overlay supports boxes.`;
      render();
    } catch (error) { status.textContent = `Preview failed: ${error.message}`; console.error(error); }
  }
  controls.asset.addEventListener('change', select);
  for (const control of Object.values(controls).filter(c => c !== controls.asset)) control.addEventListener('input', render);
  window.addEventListener('resize', render);
  await select();
} catch (error) { status.textContent = `Preview failed: ${error.message}`; console.error(error); }

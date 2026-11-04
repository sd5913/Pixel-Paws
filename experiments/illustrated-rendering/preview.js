import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { parseGlb } from '../../src/assets/load-assets.js';
import mugData from '../../src/assets/models/mug.glb';
import deskData from '../../src/assets/models/desk.glb';

// Throwaway viewer. No game entry point, generators, colliders or controls are imported.
const presets = {
  'soft-pastel': {
    name: 'Soft Pastel', number: '01', description: 'Powdery blue, oat wood and a soft rose atmosphere.',
    background: '#eee8e2', floor: '#dfcdbb', seam: '#cebba9', wall: '#e4c5b9',
    trim: '#d1aba0', window: '#cfdae4', base: '#d5b9ac', rug: '#e2d7cb',
    sky: '#fff4ef', bounce: '#c8bbd6', sun: '#fff4dc', ambient: 2.5, key: 1.0,
    exposure: 1.05, wash: 0.25, tint: '#ffe8dc', palette: ['#dfcdbb', '#b4ced1', '#e4c5b9', '#cfdae4'],
  },
  'warm-illustrated': {
    name: 'Warm Illustrated', number: '02', description: 'Apricot wood, honey light and lavender shade.',
    background: '#eee3d6', floor: '#e3b880', seam: '#ce9e69', wall: '#e9b292',
    trim: '#cb8d6d', window: '#c9c5df', base: '#ca9778', rug: '#ecd2ae',
    sky: '#ffe9cf', bounce: '#aa9bc0', sun: '#ffe2ad', ambient: 2.3, key: 1.5,
    exposure: 1.0, wash: 0.12, tint: '#ffc591', palette: ['#e3b880', '#e9b292', '#c9c5df', '#9dcbc5'],
  },
  'faceted-diorama': {
    name: 'Faceted Diorama', number: '03', description: 'Matte planes, sage accents and sculpted shadows.',
    background: '#e7ddcf', floor: '#cda880', seam: '#b59070', wall: '#d0a18b',
    trim: '#ad785e', window: '#b5b8ce', base: '#b7836b', rug: '#ded0b9',
    sky: '#fff0db', bounce: '#9c9ab3', sun: '#ffe4b7', ambient: 1.25, key: 2.1,
    exposure: 1, wash: 0.04, tint: '#ffe5c2', palette: ['#cda880', '#9eaf9b', '#b5b8ce', '#b7836b'],
  },
};

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#loading');
let renderer;
try { renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true }); }
catch (error) { status.textContent = `WebGL is unavailable: ${error.message}`; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.VSMShadowMap;
viewport.append(renderer.domElement);
const scene = new T.Scene();
const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);
const hemisphere = new T.HemisphereLight();
const sun = new T.DirectionalLight();
sun.position.set(-2.5, 5, -1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 12 });
sun.shadow.normalBias = 0.007;
sun.shadow.bias = -0.00015;
sun.shadow.radius = 4;
sun.shadow.blurSamples = 8;
scene.add(hemisphere, sun, sun.target);
const stage = new T.Group();
const detail = new T.Group();
scene.add(stage, detail);
const decorations = [];

function box(parent, size, position, colorRole, radius = 0.015) {
  const mesh = new T.Mesh(new RoundedBoxGeometry(...size, 2, radius), new T.MeshLambertMaterial());
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  decorations.push({ mesh, colorRole });
  return mesh;
}

// Ephemeral scene dressing, never exported to GLB or registered with the game.
box(stage, [2.48, 0.13, 2.04], [0, -0.075, 0.08], 'base', 0.07);
for (let i = 0; i < 8; i++) {
  box(stage, [2.40, 0.035, 0.245], [0, 0, -0.78 + i * 0.25], 'floor', 0.007);
}
box(stage, [2.45, 0.82, 0.07], [0, 0.40, 1.035], 'wall', 0.025);
box(stage, [0.065, 0.82, 2.04], [-1.205, 0.40, 0.045], 'wall', 0.025);
box(stage, [2.4, 0.05, 0.035], [0, 0.04, 0.982], 'trim', 0.008);
box(stage, [0.025, 0.05, 1.97], [-1.16, 0.04, 0.05], 'trim', 0.006);
// A little lavender window echoes the supplied illustration's warm/cool contrast.
box(stage, [0.70, 0.52, 0.027], [0.15, 0.48, 0.985], 'trim', 0.035);
box(stage, [0.60, 0.42, 0.018], [0.15, 0.49, 0.966], 'window', 0.02);
box(stage, [0.035, 0.44, 0.025], [0.15, 0.49, 0.95], 'trim', 0.004);
box(stage, [0.62, 0.028, 0.025], [0.15, 0.49, 0.95], 'trim', 0.004);
box(stage, [0.79, 0.045, 0.13], [0.15, 0.235, 0.94], 'trim', 0.008);
box(stage, [2.0, 0.009, 1.12], [0.02, 0.022, -0.12], 'rug', 0.045);
// A few quiet stitch marks keep the stage graphic rather than photorealistic.
for (const x of [-0.91, 0.95]) {
  for (let z = -0.56; z < 0.36; z += 0.11) box(stage, [0.008, 0.002, 0.045], [x, 0.028, z], 'trim', 0.001);
}
const detailPlinth = new T.Mesh(new T.CylinderGeometry(0.12, 0.126, 0.012, 32), new T.MeshLambertMaterial());
detailPlinth.position.y = -0.006;
detailPlinth.receiveShadow = true;
detail.add(detailPlinth);
decorations.push({ mesh: detailPlinth, colorRole: 'rug' });

let active = Object.hasOwn(presets, new URLSearchParams(location.search).get('preset'))
  ? new URLSearchParams(location.search).get('preset') : 'warm-illustrated';
let view = 'scene';
let ready = false;
const models = [];
const rampData = new Uint8Array([110, 170, 220, 255]);
const ramp = new T.DataTexture(rampData, 4, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;

function styleMaterial(source, preset) {
  const options = { color: source.color.clone(), vertexColors: source.vertexColors,
    side: source.side, transparent: source.transparent, opacity: source.opacity };
  const material = active === 'faceted-diorama'
    ? new T.MeshToonMaterial({ ...options, gradientMap: ramp })
    : new T.MeshLambertMaterial(options);
  // Apply a uniform paint wash after Three.js reads the original linear vertex colors.
  // Geometry, baked normals, transforms and source materials remain untouched.
  const tint = new T.Color(preset.tint);
  material.onBeforeCompile = shader => {
    shader.uniforms.paintTint = { value: tint };
    shader.uniforms.paintWash = { value: preset.wash };
    shader.fragmentShader = 'uniform vec3 paintTint; uniform float paintWash;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, paintTint, paintWash);');
  };
  material.customProgramCacheKey = () => `paint-${active}`;
  return material;
}

function render() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const target = new T.Vector3(...(view === 'scene' ? [0, 0.32, 0.10] : [0.012, 0.04, 0]));
  // Fit projected stage corners with margin on both axes, also at narrow mobile widths.
  const halfHeight = view === 'scene' ? Math.max(1.82, 1.86 / aspect) : Math.max(0.14, 0.155 / aspect);
  Object.assign(camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
  const elevation = T.MathUtils.degToRad(70);
  const azimuth = T.MathUtils.degToRad(view === 'scene' ? 150 : 30);
  camera.position.set(5 * Math.cos(elevation) * Math.sin(azimuth), 5 * Math.sin(elevation), 5 * Math.cos(elevation) * Math.cos(azimuth)).add(target);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  stage.visible = view === 'scene';
  detail.visible = view === 'mug';
  const shadowSpan = view === 'scene' ? 2 : 0.22;
  Object.assign(sun.shadow.camera, { left: -shadowSpan, right: shadowSpan, top: shadowSpan, bottom: -shadowSpan });
  sun.shadow.camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

function applyPreset() {
  const p = presets[active];
  scene.background = new T.Color(p.background);
  hemisphere.color.set(p.sky); hemisphere.groundColor.set(p.bounce); hemisphere.intensity = p.ambient;
  sun.color.set(p.sun); sun.intensity = p.key;
  renderer.toneMappingExposure = p.exposure;
  for (const { mesh, colorRole } of decorations) mesh.material.color.set(p[colorRole]);
  for (const { mesh, original } of models) {
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material !== original) material.dispose();
    }
    mesh.material = Array.isArray(original) ? original.map(m => styleMaterial(m, p)) : styleMaterial(original, p);
  }
  document.querySelector('.artboard').style.background = p.background;
  document.querySelector('#preset-title').textContent = p.name;
  document.querySelector('#preset-description').textContent = p.description;
  document.querySelector('#preset-number').textContent = `${p.number} / 03`;
  document.querySelector('#palette').replaceChildren(...p.palette.map(color => {
    const swatch = document.createElement('i'); swatch.style.background = color; return swatch;
  }));
  document.querySelector(`input[value="${active}"]`).checked = true;
  render();
}

function registerModel(model) {
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    models.push({ mesh, original: mesh.material });
  });
}

for (const input of document.querySelectorAll('input[name=preset]')) input.addEventListener('change', () => {
  active = input.value;
  const url = new URL(location.href); url.searchParams.set('preset', active);
  // file:// standalone documents may prohibit history changes.
  try { history.replaceState(null, '', url); } catch { /* Selection still works offline. */ }
  applyPreset();
});
for (const [id, next] of [['scene-view', 'scene'], ['mug-view', 'mug']]) {
  document.getElementById(id).addEventListener('click', () => {
    view = next;
    document.querySelector('#scene-view').setAttribute('aria-pressed', String(view === 'scene'));
    document.querySelector('#mug-view').setAttribute('aria-pressed', String(view === 'mug'));
    viewport.setAttribute('aria-label', view === 'scene' ? 'Orthographic study desk and mug diorama' : 'Close-up of the approved mug at native scale');
    render();
  });
}
document.querySelector('#download').addEventListener('click', () => {
  if (!ready) return;
  render();
  renderer.domElement.toBlob(blob => {
    if (!blob) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `pixel-paws-${active}-${view}.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
});
new ResizeObserver(render).observe(viewport);
try {
  const [desk, mug] = await Promise.all([parseGlb(deskData.slice().buffer), parseGlb(mugData.slice().buffer)]);
  // Preserve native scale and orientation. The mug rests on the Y=.75 tabletop.
  desk.position.y = 0.027;
  mug.position.set(0.58, 0.777, 0.27);
  stage.add(desk, mug);
  const detailMug = mug.clone(true); detailMug.position.set(0, 0, 0); detail.add(detailMug);
  registerModel(desk); registerModel(mug); registerModel(detailMug);
  ready = true;
  status.remove();
  document.querySelector('#download').disabled = false;
  applyPreset();
  document.documentElement.dataset.previewReady = 'true';
} catch (error) {
  status.textContent = `Unable to load the study assets: ${error.message}`;
  console.error(error);
}

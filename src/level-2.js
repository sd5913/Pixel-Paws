import { createLevelUI } from './level-ui.js';
import { AudioManager } from './feedback/audio-manager.js';
import { SWAT } from './swat.js';
import { createBakingPhysics } from './physics/baking-physics.js';
import { createKitchenProps } from './kitchen-props.js';
import { loadGlb } from './assets/load-assets.js';
import { createMilkJug } from './milk-jug.js';
import { createMixingBowl } from './mixing-bowl.js';
import { PLAY_CAMERA, resizePlayCamera } from './play-camera.js';
import * as THREE from 'three';
import { CAT_EDGE_MARGIN, createCatAvatar } from './assets/cat-avatar.js';
import { joystickInput, JOYSTICK_SPEED } from './joystick.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f6ddd2');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.querySelector('main').append(renderer.domElement);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);
const tableHeight = 0.78;
const tableRadius = 1.95;
const rearOffset = 1.4 - tableRadius;
const { elevation, distance, focusHeight, frameZ } = PLAY_CAMERA;
const focus = new THREE.Vector3(0, tableHeight + focusHeight, frameZ);
const cameraOffset = new THREE.Vector3(0, distance * Math.sin(elevation), distance * Math.cos(elevation));
camera.position.copy(focus).add(cameraOffset);
camera.lookAt(focus);
const matte = color => new THREE.MeshStandardMaterial({ color, roughness: 0.83 });
function mesh(geometry, material, x, y, z, parent = scene) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
const box = (w, h, d, material, x, y, z, parent) =>
  mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
const rearBox = (w, h, d, material, x, y, z) => box(w, h, d, material, x, y, z + rearOffset);
const cylinder = (top, bottom, h, material, x, y, z, sides = 48, parent) =>
  mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material, x, y, z, parent);

const ivory = matte('#fff0d7');
const rose = matte('#dca49f');
const plaster = matte('#f4dcd0');
const wood = matte('#dbab83');
box(14, 0.1, 12, matte('#e6bfa2'), 0, -0.05, 0);
rearBox(7.6, 3.3, 0.13, plaster, 0, 1.65, -1.95).castShadow = false;
rearBox(7.6, 0.13, 0.12, ivory, 0, 0.11, -1.84);
for (let x = -3; x <= 3; x += 0.32) {
  rearBox(0.26, 0.36, 0.06, rose, x, 0.29, -1.85);
}
rearBox(7.6, 0.08, 0.16, ivory, 0, 0.48, -1.82);

// A luminous window insert, with a shallow sill and layered garden silhouettes.
const windowGlass = new THREE.MeshBasicMaterial({ color: '#fff1dc' });
const garden = new THREE.MeshBasicMaterial({ color: '#e8dcc1' });
rearBox(3.48, 1.05, 0.04, windowGlass, 0, 1.14, -1.86).castShadow = false;
for (let i = 0; i < 11; i++) {
  const silhouette = mesh(new THREE.SphereGeometry(0.20, 8, 5), garden, -1.55 + i * 0.31, 0.75 + (i % 3) * 0.045, -1.826 + rearOffset);
  silhouette.scale.set(1.25, 0.85, 0.04);
  silhouette.castShadow = false;
}
for (const x of [-1.74, 0, 1.74]) rearBox(0.09, 1.14, 0.12, rose, x, 1.14, -1.79);
for (const y of [0.58, 1.70]) rearBox(3.57, 0.09, 0.12, rose, 0, y, -1.79);
rearBox(3.72, 0.09, 0.49, ivory, 0, 0.55, -1.63);

function planter(x, y, z, color, scale) {
  const group = new THREE.Group();
  group.position.set(x, y, z + rearOffset);
  group.scale.setScalar(scale);
  scene.add(group);
  const pot = matte(color);
  cylinder(0.125, 0.087, 0.16, pot, 0, 0.08, 0, 12, group);
  cylinder(0.133, 0.133, 0.028, pot, 0, 0.155, 0, 12, group);
  cylinder(0.11, 0.11, 0.014, matte('#766052'), 0, 0.166, 0, 12, group);
  return group;
}

const cactusGreen = matte('#63865a');
function addCactus(x, z, color, scale) {
  const cactus = planter(x, 0.60, z, color, scale);
  for (const [offset, y, radius, length, tilt] of [
    [0, 0.325, 0.067, 0.18, 0],
    [-0.072, 0.27, 0.039, 0.095, 0.52],
    [0.063, 0.29, 0.044, 0.106, -0.57],
  ]) {
    const stem = mesh(new THREE.SphereGeometry(1, 12, 8), cactusGreen, offset, y, 0, cactus);
    stem.scale.set(radius, length, radius);
    stem.rotation.z = tilt;
  }
}

const leafColors = ['#709680', '#91aa85', '#a7b58b'].map(matte);
function addSucculent(x, z, color, scale) {
  const succulent = planter(x, 0.60, z, color, scale);
  for (let ring = 0; ring < 3; ring++) {
    const count = 9 - ring * 2;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + ring * 0.43;
      const radius = 0.106 - ring * 0.032;
      const pivot = new THREE.Group();
      pivot.position.set(Math.sin(angle) * radius, 0.19 + ring * 0.037, Math.cos(angle) * radius);
      pivot.rotation.y = angle;
      succulent.add(pivot);
      const leaf = mesh(new THREE.SphereGeometry(1, 8, 5), leafColors[ring], 0, 0, 0, pivot);
      leaf.scale.set(0.039, 0.023, 0.085 - ring * 0.013);
      leaf.rotation.x = -0.32 - ring * 0.21;
    }
  }
}

addCactus(-0.89, -1.58, '#c48069', 1.1);
addCactus(-1.18, -1.49, '#e2ab83', 0.64);
addSucculent(-0.65, -1.49, '#e9ba9e', 0.58);
addSucculent(0.86, -1.55, '#ddab92', 1.08);
addSucculent(1.19, -1.49, '#bc8275', 0.65);
addCactus(0.59, -1.58, '#edc5a8', 0.58);

// Circular play surface, 2.8 m across. The cloth is scenery and sits just above it.

cylinder(tableRadius, tableRadius, 0.09, ivory, 0, tableHeight - 0.045, 0, 96);
cylinder(tableRadius - 0.07, tableRadius - 0.1, 0.085, ivory, 0, 0.66, 0, 96);
cylinder(0.13, 0.2, 0.61, ivory, 0, 0.32, 0);
cylinder(0.39, 0.46, 0.08, ivory, 0, 0.045, 0);
for (const side of [-1, 1]) {
  box(0.53, 0.045, 0.48, wood, side * (tableRadius + 0.32), 0.42, 0.47);
  box(0.49, 0.43, 0.035, rose, side * (tableRadius + 0.32), 0.66, 0.68);
  for (const x of [-0.21, 0.21]) for (const z of [-0.17, 0.17]) {
    box(0.042, 0.4, 0.042, wood, side * (tableRadius + 0.32) + x, 0.2, 0.47 + z);
  }
}

const weave = document.createElement('canvas');
weave.width = weave.height = 128;
const paint = weave.getContext('2d');
paint.fillStyle = '#fff7ee';
paint.fillRect(0, 0, 128, 128);
paint.fillStyle = 'rgba(194, 53, 67, .47)';
paint.fillRect(0, 0, 64, 128);
paint.fillRect(0, 0, 128, 64);
for (let i = 0; i < 128; i += 4) {
  paint.fillStyle = 'rgba(255, 246, 234, .16)';
  paint.fillRect(i, 0, 1, 128);
  paint.fillRect(0, i, 128, 1);
}
const checks = new THREE.CanvasTexture(weave);
checks.colorSpace = THREE.SRGBColorSpace;
checks.wrapS = checks.wrapT = THREE.RepeatWrapping;
checks.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const clothMaterial = new THREE.MeshStandardMaterial({ map: checks, roughness: 0.95, side: THREE.DoubleSide });

const segments = 128;
const positions = [0, tableHeight + 0.007, 0];
const uvs = [0, 0];
const indices = [];
const rings = [
  [-0.003, 0.007, 0, 0], [0.016, -0.012, 0, 0.008],
  [0.038, -0.075, 0.018, 0.018], [0.060, -0.19, 0.034, 0.024],
  [0.074, -0.305, 0.056, 0.026],
];
for (const [offset, y, fold, ripple] of rings) {
  const radius = tableRadius + offset;
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const r = radius + fold * Math.sin(12 * angle) + fold * 0.23 * Math.sin(19 * angle);
    const x = Math.cos(angle), z = Math.sin(angle);
    positions.push(x * r, tableHeight + y + ripple * Math.cos(angle * 12), z * r);
    const spread = tableRadius - 0.003 + Math.hypot(offset + 0.003, y - 0.007);
    uvs.push(x * spread / 0.31, z * spread / 0.31);
  }
}
for (let i = 0; i < segments; i++) indices.push(0, i + 2, i + 1);
for (let ring = 0; ring < rings.length - 1; ring++) {
  for (let i = 0; i < segments; i++) {
    const a = 1 + ring * (segments + 1) + i;
    const b = a + segments + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
}
const cloth = new THREE.BufferGeometry();
cloth.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
cloth.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
cloth.setIndex(indices);
cloth.computeVertexNormals();
mesh(cloth, clothMaterial, 0, 0, 0);

scene.add(new THREE.HemisphereLight('#fff2df', '#b9846c', 1.25));
const sunlight = new THREE.DirectionalLight('#ffd39c', 3.15);
sunlight.position.set(-2.0, 2.8, -4.0);
sunlight.target.position.set(0, 0.6, 0);
scene.add(sunlight, sunlight.target);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, { left: -4.2, right: 4.2, top: 4.2, bottom: -4.2, near: 0.2, far: 12 });
sunlight.shadow.normalBias = 0.025;
sunlight.shadow.bias = -0.00025;
const fill = new THREE.DirectionalLight('#fff1ea', 0.65);
fill.position.set(2, 2, 3);
scene.add(fill);

function resize() {
  const { clientWidth: width, clientHeight: height } = renderer.domElement.parentElement;
  const aspect = width / height;
  resizePlayCamera(camera, aspect);
  renderer.setSize(width, height);
}
window.addEventListener('resize', resize);
resize();
const cat = await createCatAvatar();
cat.object.position.y = tableHeight + 0.007;
cat.object.traverse(child => {
  if (child.isMesh) child.castShadow = child.receiveShadow = true;
});
scene.add(cat.object);
const audio = new AudioManager();
audio.init(camera,scene);
void audio.preload();
window.addEventListener('pagehide',event=>{if(!event.persisted)audio.dispose();});
const bakingPhysics = await createBakingPhysics(tableHeight, tableRadius, audio);
const mixingBowl = await createMixingBowl(scene, renderer, tableHeight, tableRadius, loadGlb, bakingPhysics);
const milkJug = await createMilkJug(scene, renderer, tableHeight, tableRadius, loadGlb, bakingPhysics);
const kitchenProps = await createKitchenProps(scene, bakingPhysics, tableHeight);

const swat = () => { if (!levelUI.playing) return; const strike=strikeDirection(); if(!strike.moving)cat.swat(); mixingBowl.swat(cat.object.position, strike.yaw); milkJug.swat(cat.object.position, strike.yaw); levelUI.recordSwat(kitchenProps.swat(cat.object.position, strike.yaw)); return true; };

const levelUI = createLevelUI({ level: 2, camera, protectedRules: [{id:'15-glass-measuring-jug',name:'Glass measuring jug',penalty:50},{id:'05-mixing-bowl-and-whisk',name:'Mixing bowl',penalty:50}], targets: [...kitchenProps.scoreTargets, ...mixingBowl.scoreTargets, ...milkJug.scoreTargets], onSwat: () => swat(), onRestart: () => {
  bakingPhysics.resetCat(); kitchenProps.reset(); milkJug.reset(); mixingBowl.reset();
 cat.reset(); cat.object.position.set(0, tableHeight + 0.007, 0); resetInput();
} });
function strikeDirection() {
  const input=levelUI.read();let x=drag?.x ?? input.x,z=drag?.z ?? input.z;
  for(const code of pressed){const d=directions.get(code);if(d){x+=d[0];z+=d[1];}}
  return {moving:Math.hypot(x,z)>.01,yaw:Math.hypot(x,z)>.01?Math.atan2(x,z):cat.object.rotation.y};
}
const directions = new Map([
  ['ArrowLeft', [-1, 0]], ['KeyA', [-1, 0]], ['ArrowRight', [1, 0]], ['KeyD', [1, 0]],
  ['ArrowUp', [0, -1]], ['KeyW', [0, -1]], ['ArrowDown', [0, 1]], ['KeyS', [0, 1]],
]);
const pressed = new Set();
const canvas = renderer.domElement;
let drag = null;
const resetInput = () => { pressed.clear(); drag = null; };
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
window.addEventListener('keydown', event => {
  if (!levelUI.playing) return;
  if (directions.has(event.code)) {
    event.preventDefault();
    pressed.add(event.code);
  }
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') pressed.add(event.code);
  if (event.code === 'KeyK' && !event.repeat) levelUI.requestSwat();
});
window.addEventListener('keyup', event => pressed.delete(event.code));
canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown', event => {
  if (!levelUI.playing || drag || event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, z: 0 };
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  Object.assign(drag, joystickInput(event.clientX - drag.startX, event.clientY - drag.startY, 54, 22));
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, event => {
    if (drag?.id === event.pointerId) drag = null;
  });
}

const position = cat.object.position;
const next = new THREE.Vector2();
const walkRadius = tableRadius - CAT_EDGE_MARGIN;
const clock = new THREE.Timer();
renderer.setAnimationLoop(timestamp => {
  clock.update(timestamp);
  levelUI.tick();
  if (!levelUI.playing) { resetInput(); renderer.render(scene, camera); return; }
  const input = levelUI.read();
  let x = drag?.x ?? input.x;
  let z = drag?.z ?? input.z;
  for (const code of pressed) {
    const direction = directions.get(code);
    if (!direction) continue;
    const [dx, dz] = direction;
    x += dx;
    z += dz;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  const dashing = (drag?.dash ?? input.dash) || pressed.has('ShiftLeft') || pressed.has('ShiftRight');
  const speed = dashing ? JOYSTICK_SPEED.dash : JOYSTICK_SPEED.walk;
  const distance = speed * delta
    / Math.max(1, Math.hypot(x, z));
  next.set(position.x + x * distance, position.z + z * distance).clampLength(0, walkRadius);
  bakingPhysics.step(delta,next,speed);
  const actual = bakingPhysics.catBody.translation();
  cat.update(delta,x*distance,z*distance);
  position.x=actual.x;
  position.z=actual.z;
  // Keep the play angle and scale, following the cat as in the first level.
  const follow = 1 - Math.exp(-10 * delta);
  focus.x += (position.x - focus.x) * follow;
  focus.z += (position.z + frameZ - focus.z) * follow;
  camera.position.copy(focus).add(cameraOffset);
  camera.lookAt(focus);

  kitchenProps.update();
  mixingBowl.update(delta, position);
  milkJug.update(delta, position);
  renderer.render(scene, camera);
});

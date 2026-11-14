import { AudioManager } from './feedback/audio-manager.js';
import { ImpactVFXManager } from './feedback/impact-vfx-manager.js';
import { createObstacleFeedback } from './feedback/obstacle-feedback.js';
import { createCatAvatar, CAT_EDGE_MARGIN } from './assets/cat-avatar.js';
import { createJoystick, JOYSTICK_SPEED } from './joystick.js';
import { createScoring } from './scoring.js';
import { createRoundTimer, formatRoundTime } from './round-timer.js';
import { createDeskPhysics } from './physics/desk-physics.js';
import { physicsEvents } from './physics/physics-events.js';
import { connectPhysicsScoring } from './physics-score-bridge.js';
import { createSwat } from './swat.js';
import * as THREE from 'three';

import { loadStudyScene } from './assets/study-scene.js';
import { createWindowBackdrop } from './assets/window-backdrop.js';

const ui = {
  score: document.querySelector('#score'),
  status: document.querySelector('#status'),
  start: document.querySelector('#start'),
  startArt: document.querySelector('#start-art'),
  result: document.querySelector('#result'),
  finalScore: document.querySelector('#final-score'),
  replay: document.querySelector('#replay'),
  timer: document.querySelector('#timer'),
};

const gameRoot = document.querySelector('#game-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f1e8e3');

const camera = new THREE.OrthographicCamera(-1.8, 1.8, 3, -3, 0.01, 100);
camera.position.set(0, 4.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(gameRoot.clientWidth, gameRoot.clientHeight);
gameRoot.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight('#f2f6ff', '#c6a494', 1.65);
scene.add(ambient);

// Window light enters from the back left and casts shadows across the desk.
const sun = new THREE.DirectionalLight('#ffe2bf', 2.25);
sun.position.set(-3.6, 6, -4.8);
sun.target.position.y = 0.75;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 15 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.008;
sun.shadow.bias = -0.00015;
sun.shadow.radius = 4;
sun.shadow.intensity = 0.76;
scene.add(sun);
scene.add(sun.target);

const world = new THREE.Group();
scene.add(world);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e6d9d1', roughness: 1 }));
floor.receiveShadow = true;
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
world.add(floor);
let tabletop = { height: 0.75, centerXZ: [0, 0], halfExtentsXZ: [0.9, 0.45] };

const player = new THREE.Group();
player.position.set(0, tabletop.height, 0);
scene.add(player);
let catAvatar = null;
let deskPhysics = null;
let catLoadError = false;
let movementX = 0;
let movementZ = 0;
const scoreAnchors = new Map();
const audio = new AudioManager();
audio.init(camera, scene);
void audio.preload();
const disconnectAudio = physicsEvents.bus.on('physics:impact', event => audio.playImpact(event));
const impactVFX = new ImpactVFXManager(physicsEvents.bus);
const obstacleFeedback = createObstacleFeedback(physicsEvents.bus, scene, id => scoreAnchors.get(id));
let lastScoringId = null;
let lastDisplayedScore = 0;
let resultRevealTimer;
ui.start.disabled = true;
ui.status.textContent = 'Loading desk and cat...';
void Promise.all([createCatAvatar(), loadStudyScene()]).then(async ([avatar, study]) => {
  catAvatar = avatar;
  tabletop = study.surface;
  world.add(createWindowBackdrop(tabletop));
  avatar.object.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  player.add(avatar.object);
  world.add(...study.instances.map(instance => instance.object3D));
  for (const instance of study.instances) scoreAnchors.set(instance.id, instance.object3D);
  deskPhysics = await createDeskPhysics(study, player);
  resetTargets = () => { study.reset(); deskPhysics.reset(); };
  if (!debugScoring) roundTargets = study.targets;
  resetPrototypeScene();
  ui.start.disabled = false;
  renderScore(scoring.snapshot());
}).catch(error => {
  catLoadError = true;
  document.querySelector('#retry').hidden = false;
  ui.status.textContent = 'Could not load scene. Refresh to retry.';
  ui.status.parentElement.hidden = false;
  console.error('Scene failed to load.', error);
});

// Keep the same viewing angle while following movement on every world axis.
const followPosition = player.position.clone();
const cameraFocusOffset = new THREE.Vector3(0, 0.05, 0);
const cameraElevation = THREE.MathUtils.degToRad(50);
const cameraOffset = new THREE.Vector3(0,
  3 * Math.sin(cameraElevation) + cameraFocusOffset.y,
  3 * Math.cos(cameraElevation));
const cameraFocus = new THREE.Vector3();
const cameraFrameOffset = new THREE.Vector3(0, 0, -0.35);
function updateFollowCamera(delta, immediate = false) {
  if (immediate) followPosition.copy(player.position);
  else followPosition.lerp(player.position, 1 - Math.exp(-10 * delta));
  camera.position.copy(followPosition).add(cameraOffset).add(cameraFrameOffset);
  cameraFocus.copy(followPosition).add(cameraFocusOffset).add(cameraFrameOffset);
  camera.lookAt(cameraFocus);
}
updateFollowCamera(0, true);

const playerState = {
  x: 0,
  z: 0,
  y: 0,
  vy: 0,
  grounded: true,
  speed: 0,
};

const joystick = createJoystick(document.querySelector('#joystick'));
const timer = createRoundTimer({ onExpire: () => scoring.endRound('timeout') });

const debugScoring = new URLSearchParams(location.search).get('debugScoring') === '1';
const debugTargets = ['small', 'medium', 'large'].map(size => ({ id: 'debug-' + size, size }));
let roundTargets = debugScoring ? debugTargets : [];
let resetTargets = null;
const scoring = createScoring({ onChange: renderScore, onEnd: () => { started = false; timer.stop(); resetInput(); } });
function notifyToppled(id) {
  if (paused) return false;
  timer.tick(performance.now());
  lastScoringId = id;
  return scoring.notifyToppled(id);
}
function notifyFallen(id) {
  if (paused) return false;
  timer.tick(performance.now());
  lastScoringId = id;
  return scoring.notifyFallen(id);
}
const disconnectScoring = connectPhysicsScoring(physicsEvents, { notifyToppled, notifyFallen });
window.pixelPawsScoring = {
  configureRound({ targets, resetScene }) {
    if (scoring.snapshot().state === 'playing') throw new Error('End current round first');
    if (typeof resetScene !== 'function') throw new TypeError('resetScene callback required');
    roundTargets = targets.map(target => ({ ...target }));
    resetTargets = resetScene;
  },
  startRound, notifyToppled, notifyFallen,
  endRound: scoring.endRound, snapshot: scoring.snapshot,
};
let started = false;
let paused = false;
const pauseMenu = document.querySelector("#pause-menu");
let lastTimestamp = 0;
const swatButton = document.querySelector('#swat');
const swat = createSwat({
  canStart: () => started && Boolean(deskPhysics && catAvatar),
  onStart: () => catAvatar.swat(),
  onHit: () => { if (started) deskPhysics.swat(player.position, catAvatar.object.rotation.y); },
  onReset: () => catAvatar?.cancelSwat(),
});
function requestSwat() {
  timer.tick(performance.now());
  swat.request();
}
swatButton.addEventListener('click', requestSwat);

const keys = { left: false, right: false, forward: false, back: false };
function resetInput() {
  swat.reset();
  for (const key of Object.keys(keys)) keys[key] = false;
  joystick.reset();
  movementX = movementZ = 0;
}

function showScoreGain(amount) {
  const source = scoreAnchors.get(lastScoringId);
  const point = source ? source.position.clone() : player.position.clone();
  point.y = tabletop.height + 0.4;
  point.project(camera);
  const bounds = gameRoot.getBoundingClientRect();
  const popup = document.createElement('span');
  popup.className = 'score-popup';
  popup.textContent = `+${amount}`;
  popup.setAttribute('aria-hidden', 'true');
  popup.style.left = `${Math.max(45, Math.min(bounds.width - 45, (point.x + 1) / 2 * bounds.width))}px`;
  popup.style.top = `${Math.max(110, Math.min(bounds.height - 160, (1 - point.y) / 2 * bounds.height))}px`;
  gameRoot.append(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
  setTimeout(() => popup.remove(), 1200);
}

function renderScore(snapshot) {
  if (catLoadError) return;
  const gained = snapshot.total - lastDisplayedScore;
  if (gained > 0) showScoreGain(gained);
  lastDisplayedScore = snapshot.total;
  clearTimeout(resultRevealTimer);
  document.body.dataset.gameState = snapshot.state;
  ui.score.textContent = snapshot.total;
  ui.score.setAttribute('aria-label', `Score ${snapshot.total}`);
  const label = snapshot.state === 'ready' ? 'Start' : 'Restart';
  ui.start.setAttribute('aria-label', label);
  ui.startArt.src = `assets/ui/ui-button-${label.toLowerCase()}.png`;
  if (snapshot.state === 'ended' && snapshot.reason !== 'restart' && snapshot.reason !== 'home') {
    document.querySelector('.result-art').src = 'assets/ui/ui-result-panel-' + (snapshot.reason === 'cleared' ? 'cleared' : 'timeout') + '.png';
    ui.finalScore.textContent = snapshot.total;
    ui.finalScore.setAttribute('aria-label', `Final score ${snapshot.total}`);
    const reveal = () => { if (!ui.result.open) ui.result.showModal(); };
    // Stop the round immediately, but let the final points remain visible first.
    if (gained > 0) resultRevealTimer = setTimeout(reveal, 700);
    else reveal();
  } else if (ui.result.open) ui.result.close();
  ui.status.textContent = snapshot.state === 'ended'
    ? 'Game Over (' + (snapshot.reason === 'cleared' ? 'all targets cleared' : snapshot.reason === 'collision' ? 'prototype collision' : 'round ended') + ') - Final score ' + snapshot.total
    : snapshot.state === 'ready' ? 'Press Start to play.'
    : 'Fallen ' + snapshot.fallenCount + '/' + snapshot.targetCount + (debugScoring ? ' - Developer simulation' : '');
}

function onKey(event, pressed) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (pressed && target?.closest('input, textarea, select, [contenteditable]')) return;
  // Start/Restart keeps keyboard focus; K and the touch button share one action.
  if ((event.code === 'KeyK' || event.key?.toLowerCase() === 'k') && pressed && !event.repeat) {
    requestSwat();
    event.preventDefault();
    return;
  }
  if (pressed && target?.closest('button')) return;
  const directions = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'forward', KeyW: 'forward', ArrowDown: 'back', KeyS: 'back' };
  if (directions[event.code]) {
    event.preventDefault();
    keys[directions[event.code]] = pressed;
  }
}
window.addEventListener('keydown', event => onKey(event, true));
window.addEventListener('keyup', event => onKey(event, false));
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });

function resetPrototypeScene() {
  obstacleFeedback.reset();
  for (const popup of gameRoot.querySelectorAll('.score-popup')) popup.remove();
  player.position.set(0, tabletop.height, 0);
  catAvatar?.reset();
  updateFollowCamera(0, true);
  playerState.x = 0;
  playerState.z = 0;
  playerState.y = 0;
  playerState.vy = 0;
  playerState.grounded = true;
  playerState.speed = 0;
  resetInput();
}


async function startRound() {
  if (ui.start.disabled) return;
  void audio.unlock().then(unlocked => { if (unlocked) audio.playUISound('start'); });
  ui.start.disabled = true;
  paused = false;
  if (pauseMenu.open) pauseMenu.close();
  ui.status.parentElement.hidden = true;
  started = false;
  scoring.endRound('restart');
  try {
    resetPrototypeScene();
    if (resetTargets) await resetTargets();
    scoring.startRound(roundTargets);
    timer.start(performance.now());
    started = true;
  } catch (error) {
    ui.status.textContent = 'Could not start. Check target configuration or scene reset.';
    ui.status.parentElement.hidden = false;
    console.error(error);
  } finally { ui.start.disabled = false; }
}
function pauseRound() {
  if (!started) return;
  timer.tick(performance.now());
  if (!started) return;
  timer.stop(); started = false; paused = true; resetInput();
  document.body.dataset.gameState = 'paused';
  pauseMenu.showModal();
}
function resumeRound() {
  if (!paused) return;
  paused = false; started = true;
  timer.resume(performance.now());
  pauseMenu.close(); document.body.dataset.gameState = 'playing';
}
async function goHome() {
  started = false; paused = false; timer.stop(); resetInput();
  clearTimeout(resultRevealTimer);
  if (pauseMenu.open) pauseMenu.close();
  if (ui.result.open) ui.result.close();
  scoring.endRound('home');
  resetPrototypeScene();
  if (resetTargets) await resetTargets();
  scoring.reset();
}
document.querySelector('#pause-button').addEventListener('click', pauseRound);
document.querySelector('#resume').addEventListener('click', resumeRound);
document.querySelector('#pause-restart').addEventListener('click', startRound);
for (const button of document.querySelectorAll('.home-button')) button.addEventListener('click', () => { void goHome().catch(console.error); });
pauseMenu.addEventListener('cancel', event => { event.preventDefault(); resumeRound(); });
document.querySelector('#retry').addEventListener('click', () => location.reload());
ui.start.addEventListener('click', startRound);
ui.replay.addEventListener('click', startRound);
ui.result.addEventListener('cancel', event => event.preventDefault());
if (debugScoring) {
  const panel = document.querySelector('#scoring-debug');
  panel.hidden = false;
  for (const target of debugTargets) {
    const row = document.createElement('p');
    row.append(target.id + ': ');
    for (const [label, notify] of [['Topple (repeat to test)', notifyToppled], ['Fall (repeat to test)', notifyFallen]]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', () => notify(target.id));
      row.append(button);
    }
    panel.append(row);
  }
  document.querySelector('#debug-clear').addEventListener('click', () => {
    for (const target of debugTargets) notifyFallen(target.id);
  });
}

function stepGame(delta) {
  movementX = movementZ = 0;
  if (!started || swat.active) return;
  const input = joystick.read();
  const dx = input.x + Number(keys.right) - Number(keys.left);
  const dz = input.z + Number(keys.back) - Number(keys.forward);
  const magnitude = Math.max(1, Math.hypot(dx, dz));
  const speed = input.dash ? JOYSTICK_SPEED.dash : JOYSTICK_SPEED.walk;
  const moveX = dx / magnitude * speed * delta;
  const moveZ = dz / magnitude * speed * delta;
  const nextX = THREE.MathUtils.clamp(playerState.x + moveX, tabletop.centerXZ[0] - tabletop.halfExtentsXZ[0] + CAT_EDGE_MARGIN, tabletop.centerXZ[0] + tabletop.halfExtentsXZ[0] - CAT_EDGE_MARGIN);
  const nextZ = THREE.MathUtils.clamp(playerState.z + moveZ, tabletop.centerXZ[1] - tabletop.halfExtentsXZ[1] + CAT_EDGE_MARGIN, tabletop.centerXZ[1] + tabletop.halfExtentsXZ[1] - CAT_EDGE_MARGIN);
  if (!deskPhysics.blocksCat(nextX, tabletop.height, playerState.z)) playerState.x = nextX;
  if (!deskPhysics.blocksCat(playerState.x, tabletop.height, nextZ)) playerState.z = nextZ;

  player.position.x = playerState.x;
  player.position.z = playerState.z;
  player.position.y = tabletop.height;
  movementX = moveX;
  movementZ = moveZ;

}

function animate(timestamp) {
  const delta = Math.min((timestamp - (lastTimestamp || timestamp)) / 1000, 0.05);
  lastTimestamp = timestamp;
  const remaining = timer.tick(timestamp);
  ui.timer.textContent = formatRoundTime(remaining);
  ui.timer.parentElement.setAttribute('aria-label', `Time remaining ${remaining} seconds`);
  stepGame(delta);
  if (started) swat.update(delta);
  swatButton.disabled = !started || swat.active;
  if (started) deskPhysics?.step(delta);
  if (!paused) catAvatar?.update(delta, movementX, movementZ);
  updateFollowCamera(delta);
  obstacleFeedback.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resizeRenderer() {
  const width = gameRoot.clientWidth;
  const height = gameRoot.clientHeight;
  renderer.setSize(width, height);
  const aspect = width / height;
  // Frame the area around the cat instead of shrinking the whole desk to fit.
  const halfHeight = Math.max(0.8, 1.15 / aspect);
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();
renderScore(scoring.snapshot());
requestAnimationFrame(animate);

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disconnectAudio();
  disconnectScoring();
  impactVFX.dispose();
  obstacleFeedback.dispose();
  audio.dispose();
  deskPhysics?.dispose();
});

import { finishLoading, failLoading } from './loading-screen.js';
import { createCampaignProgress } from './campaign-progress.js';
import { mountAudioSettings, confirmProgressReset } from './campaign-ui.js';
import { ensureControlsGuide } from './controls-guide.js';
import { resetSavedProgress } from './reset-progress.js';
import { bindResultScroll } from './result-scroll.js';
import { setWordmark } from './ui-wordmark.js';
import { bindSwatButton } from './swat-button.js';
import { PLAY_CAMERA, resizePlayCamera } from './play-camera.js';
import { AudioManager } from './feedback/audio-manager.js';
import { ImpactVFXManager } from './feedback/impact-vfx-manager.js';
import { createObstacleFeedback } from './feedback/obstacle-feedback.js';
import { createCatAvatar, CAT_EDGE_MARGIN } from './assets/cat-avatar.js';
import { createJoystick, JOYSTICK_SPEED } from './joystick.js';
import { createGameLogic } from './ui-gameplay/game-logic.js';
import { COMBO_WINDOW_MS, roundRating } from './ui-gameplay/scoring.js';
import { formatRoundTime } from './ui-gameplay/round-timer.js';
import { ACHIEVEMENTS, createAchievements } from './achievements.js';
import digitArt from './assets/ui/ui-nishiki-digits.svg';
import startArt from './assets/ui/ui-button-start-pixel.svg';
import { presets } from '../experiments/illustrated-rendering/presets.js';
import { createDeskPhysics } from './physics/desk-physics.js';
import { physicsEvents } from './physics/physics-events.js';
import { connectPhysicsScoring } from './physics-score-bridge.js';
import * as THREE from 'three';

import { loadStudyScene } from './assets/study-scene.js';
import { createWindowBackdrop } from './assets/window-backdrop.js';
import { createAfternoonRoom, styleStudyMaterials } from './visuals/afternoon-room.js';
import { createContactShadows } from './visuals/contact-shadows.js';
import { createImpactFeedback } from './visuals/impact-feedback.js';

const ui = {
  score: document.querySelector('#score'),
  status: document.querySelector('#status'),
  start: document.querySelector('#start'),
  result: document.querySelector('#result'),
  finalScore: document.querySelector('#final-score'),
  bestScore: document.querySelector('#best-score'),
  newRecord: document.querySelector('#new-record'),
  resultArt: document.querySelector('.result-art'),
  nextLevel: document.querySelector('#next-level'),
  timer: document.querySelector('#timer'),
  finalCountdown: document.querySelector('#final-countdown'),
  comboClock: document.querySelector('#combo-clock'),
  comboFill: document.querySelector('#combo-clock span'),
  roundRating: document.querySelector('#round-rating'),
  resultConfetti: document.querySelector('#result-confetti'),
};

// Bundle the artwork so controls and counters survive interrupted asset requests.
const artworkParser = new DOMParser();
const digitLibrary = artworkParser.parseFromString(digitArt, 'image/svg+xml').documentElement;
digitLibrary.classList.add('digit-library');
digitLibrary.setAttribute('aria-hidden', 'true');
document.body.prepend(digitLibrary);
const startGraphic = artworkParser.parseFromString(startArt, 'image/svg+xml').documentElement;
startGraphic.setAttribute('aria-hidden', 'true');
ui.start.replaceChildren(startGraphic);

const gameRoot = document.querySelector('#game-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d6cbbd');
scene.fog = new THREE.Fog('#d6cbbd', 8, 22);

const camera = new THREE.OrthographicCamera(-1.8, 1.8, 3, -3, 0.01, 100);
camera.position.set(0, 4.5, 12);
const homeCamera = new THREE.PerspectiveCamera(43, 1, 0.01, 100);
const homeRay = new THREE.Raycaster();
const homePointer = new THREE.Vector2();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
let gameplayExposure = 1.05;
renderer.toneMappingExposure = gameplayExposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(gameRoot.clientWidth, gameRoot.clientHeight, false);
gameRoot.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight('#c4d9f1', '#aa8874', .85);
scene.add(ambient);
const coolFill = new THREE.DirectionalLight('#c2d7f1', .38);
coolFill.position.set(4, 3, 2);
scene.add(coolFill);

// Light the title character from the side so the face and ears retain depth.
const coverKey = new THREE.DirectionalLight('#ffd6a1', 1.8);
coverKey.position.set(-1.25, 2.4, 1.6);
coverKey.target.position.set(0, 0.98, 0);
coverKey.castShadow = true;
coverKey.shadow.mapSize.set(1024, 1024);
Object.assign(coverKey.shadow.camera, {
  left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.1, far: 5,
});
coverKey.shadow.camera.updateProjectionMatrix();
coverKey.shadow.bias = -0.00015;
coverKey.shadow.normalBias = 0.008;
coverKey.shadow.intensity = 0.75;
coverKey.visible = false;
scene.add(coverKey, coverKey.target);

// Window light enters from the back left and casts shadows across the desk.
const sun = new THREE.DirectionalLight('#ffdda4', 3.4);
sun.position.set(-3.2, 4.8, -5.4);
sun.target.position.y = 0.75;
sun.castShadow = true;
const shadowSize = window.innerWidth < 600 ? 1024 : 2048;
sun.shadow.mapSize.set(shadowSize, shadowSize);
Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 15 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.003;
sun.shadow.bias = -0.00015;
sun.shadow.radius = 4;
sun.shadow.intensity = .88;
scene.add(sun);
scene.add(sun.target);

const world = new THREE.Group();
scene.add(world);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#cdbba3', roughness: 1 }));
floor.receiveShadow = true;
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
world.add(floor);

const appearance = document.querySelector('#appearance');
const settings = document.querySelector('#settings');
setWordmark(settings.querySelector('#settings-title'), 'Settings');
setWordmark(settings.querySelector('#appearance legend'), 'Look');
setWordmark(settings.querySelector('#reset-title'), 'Reset');
setWordmark(settings.querySelector('#reset-achievements'), 'Reset');
mountAudioSettings(settings.querySelector('.settings-content'));
document.querySelector('#settings-button').addEventListener('click', () => {
  if (game.playing) { pauseRound(); pauseMenu.close(); }
  settings.showModal();
});
settings.addEventListener('close', () => { if (game.paused && !pauseMenu.open) pauseMenu.showModal(); });
const originalAppearance = {
  background: '#EEE5E9', floor: '#EEE5E9', sky: '#dff7ff', bounce: '#11252e',
  sun: '#ffe1a8', ambient: 1.4, key: 1.4, exposure: 1,
};
const appearanceOptions = document.querySelector('#appearance-options');
const originalLook = { name: 'Original', palette: [originalAppearance.background, originalAppearance.sky, originalAppearance.sun] };
for (const [id, look] of [['', originalLook], ...Object.entries(presets)]) {
  const option = document.createElement('label');
  option.className = 'look-option';
  const radio = document.createElement('input');
  radio.className = 'sr-only';
  radio.type = 'radio';
  radio.name = 'look';
  radio.value = id;
  radio.checked = id === '';
  const palette = document.createElement('span');
  palette.className = 'look-palette';
  palette.setAttribute('aria-hidden', 'true');
  for (const color of look.palette.slice(0, 3)) {
    const swatch = document.createElement('span');
    swatch.style.backgroundColor = color;
    palette.append(swatch);
  }
  const label = document.createElement('span');
  setWordmark(label, look.name);
  option.append(radio, palette, label);
  appearanceOptions.append(option);
}
appearance.addEventListener('change', event => {
  const id = event.target.value;
  const preset = Object.hasOwn(presets, id) ? presets[id] : null;
  const style = preset ?? originalAppearance;
  scene.background.set(style.background);
  floor.material.color.set(style.floor);
  ambient.color.set(style.sky);
  ambient.groundColor.set(style.bounce);
  ambient.intensity = style.ambient;
  sun.color.set(style.sun);
  sun.intensity = style.key;
  renderer.toneMapping = preset ? THREE.NeutralToneMapping : THREE.NoToneMapping;
  gameplayExposure = style.exposure;
});
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
const audio = new AudioManager({ fetchImpl: (...args) => globalThis.fetch(...args) });
audio.init(camera, scene);
void audio.preload();
const disconnectAudio = physicsEvents.bus.on('physics:impact', event => audio.playImpact(event));
const visualFeedback = createImpactFeedback(scene, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
const impactVFX = new ImpactVFXManager(physicsEvents.bus, { onImpact(event) {
  if (!game.playing || event.impactStrength < .08) return;
  visualFeedback.burst(event.position, event.impactStrength, scoreAnchors.get(event.objectId));
} });
let contactShadows = null;
let studyMaterials = null;
let roomEnvironment = null;
const obstacleFeedback = createObstacleFeedback(physicsEvents.bus, scene, id => scoreAnchors.get(id));
let lastScoringId = null;
let lastDisplayedScore = 0;
let lastDisplayedComboBonus = 0;
let resultRevealTimer;
ui.start.disabled = true;
ui.status.textContent = 'Loading desk and cat...';
void Promise.all([createCatAvatar(), loadStudyScene()]).then(async ([avatar, study]) => {
  catAvatar = avatar;
  tabletop = study.surface;
  world.add(createWindowBackdrop(tabletop));
  roomEnvironment = createAfternoonRoom(tabletop);
  world.add(roomEnvironment);
  studyMaterials = styleStudyMaterials(study.instances);
  contactShadows = createContactShadows(scene, study.instances, player, tabletop);
  avatar.object.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  player.add(avatar.object);
  world.add(...study.instances.map(instance => instance.object3D));
  for (const instance of study.instances) scoreAnchors.set(instance.id, instance.object3D);
  deskPhysics = await createDeskPhysics(study, player, { edgeMargin: CAT_EDGE_MARGIN, audio });
  resetTargets = () => { study.reset({ randomize: true }); deskPhysics.reset(); };
  if (!debugScoring) roundTargets = study.targets;
  resetPrototypeScene();
  ui.start.disabled = false;
  finishLoading();
  renderScore(game.snapshot());
}).catch(error => {
  failLoading();
  catLoadError = true;
  document.querySelector('#retry').hidden = false;
  ui.status.textContent = 'Could not load scene. Refresh to retry.';
  ui.status.parentElement.hidden = false;
  console.error('Scene failed to load.', error);
});

// Keep the same viewing angle while following movement on every world axis.
const followPosition = player.position.clone();
const cameraFocusOffset = new THREE.Vector3(0, PLAY_CAMERA.focusHeight, 0);
const cameraElevation = PLAY_CAMERA.elevation;
const cameraOffset = new THREE.Vector3(0,
  PLAY_CAMERA.distance * Math.sin(cameraElevation) + cameraFocusOffset.y,
  PLAY_CAMERA.distance * Math.cos(cameraElevation));
const cameraFocus = new THREE.Vector3();
const cameraFrameOffset = new THREE.Vector3(0, 0, PLAY_CAMERA.frameZ);
function updateFollowCamera(delta, immediate = false) {
  if (immediate) followPosition.copy(player.position);
  else followPosition.lerp(player.position, 1 - Math.exp(-10 * delta));
  camera.position.copy(followPosition).add(cameraOffset).add(cameraFrameOffset);
  cameraFocus.copy(followPosition).add(cameraFocusOffset).add(cameraFrameOffset);
  camera.lookAt(cameraFocus);
}
function updateHomeCamera() {
  const { x, y, z } = player.position;
  const distance = 0.30 + 1.58 * Math.max(1, 0.46 / homeCamera.aspect);
  homeCamera.position.set(x, y + 0.49, z + distance);
  homeCamera.lookAt(x, y + 0.40, z + 0.17);
}

function pointsAtHomeCat(event) {
  if (document.body.dataset.gameState !== 'ready' || !catAvatar || ui.start.disabled) return false;
  const bounds = renderer.domElement.getBoundingClientRect();
  homePointer.set(
    (event.clientX - bounds.left) / bounds.width * 2 - 1,
    1 - (event.clientY - bounds.top) / bounds.height * 2,
  );
  homeRay.setFromCamera(homePointer, homeCamera);
  return homeRay.intersectObject(catAvatar.object, true).length > 0;
}

renderer.domElement.addEventListener('click', event => {
  if (!pointsAtHomeCat(event)) return;
  catAvatar.swat();
  void audio.unlock().then(async unlocked => {
    if (!unlocked) return;
    await audio.preload();
    if (document.body.dataset.gameState === 'ready') audio.playCatMeow();
  });
});
renderer.domElement.addEventListener('pointermove', event => {
  renderer.domElement.style.cursor = pointsAtHomeCat(event) ? 'pointer' : '';
});
renderer.domElement.addEventListener('pointerleave', () => {
  renderer.domElement.style.cursor = '';
});
updateFollowCamera(0, true);

const joystick = createJoystick(document.querySelector('#joystick'));

const debugScoring = new URLSearchParams(location.search).get('debugScoring') === '1';
const BEST_SCORE_KEY = 'pixel-paws.best-score';
let bestScore = 0;
try {
  const storedScore = Number(localStorage.getItem(BEST_SCORE_KEY));
  if (Number.isSafeInteger(storedScore) && storedScore >= 0) bestScore = storedScore;
} catch {
  // A blocked save still allows the session to keep a best score.
}
const debugTargets = ['small', 'medium', 'large'].map(size => ({ id: 'debug-' + size, size }));
let roundTargets = debugScoring ? debugTargets : [];
let resetTargets = null;
let customRound = false;
const achievements = createAchievements();
let movingSwat = false;
let strikeYaw = 0;
const game = createGameLogic({
  async resetScene() {
    resetPrototypeScene();
    await resetTargets?.();
    if (!debugScoring && !customRound) await ensureControlsGuide({
      onStart() { document.body.dataset.gameState = 'tutorial'; },
      onFinish() { resetMovement(); },
    });
    await showRoundIntro('Knock them off!');
  },
  onChange: renderScore,
  onEnd(result, elapsedMs) {
    resetMovement();
    renderUnlocks(achievements.settle(result, elapsedMs));
  },
  canSwat: () => Boolean(deskPhysics && catAvatar),
  onSwat(phase) {
    if (phase === 'start') {
      const input=joystick.read();
      const dx=input.x+Number(keys.right)-Number(keys.left),dz=input.z+Number(keys.back)-Number(keys.forward);
      movingSwat=Math.hypot(dx,dz)>.01;
      strikeYaw=movingSwat?Math.atan2(dx,dz):catAvatar.object.rotation.y;
      achievements.recordSwat(deskPhysics.swat(player.position,strikeYaw));
      if(!movingSwat)catAvatar.swat();
    }
    if (phase === 'cancel') catAvatar?.cancelSwat();
  },
});
function notifyToppled(id) {
  lastScoringId = id;
  return game.notifyToppled(id);
}
function notifyFallen(id) {
  lastScoringId = id;
  return game.notifyFallen(id);
}
const disconnectScoring = connectPhysicsScoring(physicsEvents, { notifyToppled, notifyFallen });
window.pixelPawsScoring = {
  configureRound({ targets, resetScene }) {
    if (game.snapshot().state === 'playing' || game.snapshot().resetting) throw new Error('End current round first');
    if (typeof resetScene !== 'function') throw new TypeError('resetScene callback required');
    customRound = true;
    roundTargets = targets.map(target => ({ ...target }));
    resetTargets = resetScene;
  },
  startRound,
  notifyToppled(id) { achievements.discard(); return notifyToppled(id); },
  notifyFallen(id) { achievements.discard(); return notifyFallen(id); },
  endRound(reason) { achievements.discard(); return game.endRound(reason); },
  snapshot: game.snapshot,
};
const pauseMenu = document.querySelector("#pause-menu");
const roundIntro = document.querySelector('#round-intro');
const roundIntroMessage = roundIntro.querySelector('p');
roundIntro.addEventListener('cancel', event => event.preventDefault());
let lastTimestamp = 0;
const swatButton = document.querySelector('#swat');
bindSwatButton(swatButton, () => game.requestSwat({retrigger:true}));

const achievementBook = document.querySelector('#achievement-book');
const achievementPages = document.querySelector('#achievement-pages');
const achievementTrack = document.querySelector('#achievement-track');
const achievementTemplate = document.querySelector('#achievement-page-template');
const achievementAnnouncement = document.querySelector('#achievement-announcement');
const achievementPageNumber = document.querySelector('#achievement-page-number');
const previousAchievement = document.querySelector('#achievement-previous');
const nextAchievement = document.querySelector('#achievement-next');
const storageNote = document.querySelector('#achievement-storage-note');
const newAchievements = document.querySelector('#new-achievements');
bindResultScroll(newAchievements);
const newAchievementList = newAchievements.querySelector('ul');
let achievementIndex = 0;
let achievementSwipe = null;

function renderUnlocks(unlocked) {
  newAchievementList.replaceChildren(...unlocked.map(({ name }) => {
    const item = document.createElement('li');
    item.textContent = name;
    return item;
  }));
  newAchievements.hidden = unlocked.length === 0;
}

document.querySelector('#reset-achievements').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    if (!await confirmProgressReset()) return;
    const reset = resetSavedProgress() && achievements.reset();
    if (reset) {
      renderUnlocks([]);
      bestScore = 0;
      ui.bestScore.textContent = 'Best score: 0';
      ui.newRecord.hidden = true;
      ui.roundRating.dataset.stars = '0';
      ui.roundRating.setAttribute('aria-label', '0 out of 3 stars');
    }
    document.querySelector('#achievement-reset-status').textContent = reset ? 'Progress reset.' : 'Could not reset progress on this device.';
  } finally { button.disabled = false; }
});


function positionAchievementTrack(offset = 0) {
  achievementTrack.style.transform = `translateX(calc(${-100 * achievementIndex}% + ${offset}px))`;
}

function showAchievementPage() {
  const total = ACHIEVEMENTS.length;
  for (const [index, page] of Array.from(achievementTrack.children).entries()) {
    page.setAttribute('aria-hidden', String(index !== achievementIndex));
  }
  achievementPageNumber.textContent = `${achievementIndex + 1} / ${total}`;
  achievementAnnouncement.textContent = `${ACHIEVEMENTS[achievementIndex].name}, page ${achievementIndex + 1} of ${total}`;
  previousAchievement.setAttribute('aria-disabled', String(achievementIndex === 0));
  nextAchievement.setAttribute('aria-disabled', String(achievementIndex === total - 1));
  positionAchievementTrack();
}

function turnAchievementPage(step) {
  const nextIndex = achievementIndex + step;
  if (achievementSwipe || nextIndex < 0 || nextIndex >= ACHIEVEMENTS.length) return;
  achievementIndex = nextIndex;
  showAchievementPage();
}

function openAchievementBook() {
  const progress = achievements.snapshot();
  achievementTrack.replaceChildren(...ACHIEVEMENTS.map(({ id, name, description, fallGoal }) => {
    const page = achievementTemplate.content.firstElementChild.cloneNode(true);
    const unlocked = Boolean(progress.unlocked[id]);
    const badgeUrl = `assets/ui/achievement-badges/${id}.png`;
    page.querySelector('.achievement-badge').src = badgeUrl;
    const lock = page.querySelector('.achievement-lock');
    lock.hidden = unlocked;
    if (!unlocked) lock.style.setProperty('--badge-mask', `url("${badgeUrl}")`);
    page.querySelector('.achievement-name').textContent = name;
    page.querySelector('.achievement-condition').textContent = description;
    if (fallGoal && !unlocked) {
      const counter = page.querySelector('.achievement-progress');
      counter.textContent = `${Math.min(fallGoal, progress.totalFalls)} / ${fallGoal}`;
      counter.hidden = false;
    }
    return page;
  }));
  achievementSwipe = null;
  achievementTrack.classList.remove('is-dragging');
  achievementIndex = 0;
  storageNote.hidden = !progress.persistenceFailed;
  showAchievementPage();
  achievementBook.showModal();
}

for (const button of document.querySelectorAll('.achievement-button')) button.addEventListener('click', openAchievementBook);
previousAchievement.addEventListener('click', () => turnAchievementPage(-1));
nextAchievement.addEventListener('click', () => turnAchievementPage(1));

achievementPages.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  const viewport = achievementPages.getBoundingClientRect();
  const offset = achievementTrack.getBoundingClientRect().left - viewport.left + achievementIndex * viewport.width;
  achievementSwipe = { id: event.pointerId, x: event.clientX, y: event.clientY, width: viewport.width, offset, dragging: false };
  achievementTrack.classList.add('is-dragging');
  positionAchievementTrack(offset);
  achievementPages.setPointerCapture(event.pointerId);
});
achievementPages.addEventListener('pointermove', event => {
  const swipe = achievementSwipe;
  if (swipe?.id !== event.pointerId) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (!swipe.dragging && (Math.abs(dx) < 6 || Math.abs(dx) < 1.5 * Math.abs(dy))) return;
  swipe.dragging = true;
  let offset = Math.max(-swipe.width, Math.min(swipe.width, swipe.offset + dx));
  if ((achievementIndex === 0 && offset > 0) || (achievementIndex === ACHIEVEMENTS.length - 1 && offset < 0)) {
    offset *= 0.22;
  }
  positionAchievementTrack(offset);
});

function finishAchievementSwipe(event) {
  const swipe = achievementSwipe;
  if (swipe?.id !== event.pointerId) return;
  achievementSwipe = null;
  achievementTrack.classList.remove('is-dragging');
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (event.type === 'pointerup' && swipe.dragging && Math.abs(dx) >= 44 && Math.abs(dx) >= 1.5 * Math.abs(dy)) {
    turnAchievementPage(dx < 0 ? 1 : -1);
  }
  positionAchievementTrack();
}

achievementPages.addEventListener('pointerup', finishAchievementSwipe);
achievementPages.addEventListener('pointercancel', finishAchievementSwipe);
achievementPages.addEventListener('lostpointercapture', finishAchievementSwipe);
achievementBook.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  event.stopPropagation();
  turnAchievementPage(event.key === 'ArrowLeft' ? -1 : 1);
});

const keys = { left: false, right: false, forward: false, back: false, dash: false };
function resetInput() {
  game.cancelSwat();
  resetMovement();
}
function resetMovement() {
  for (const key of Object.keys(keys)) keys[key] = false;
  joystick.reset();
  movementX = movementZ = 0;
}

function showScoreGain(amount, comboCount, bonus) {
  const source = scoreAnchors.get(lastScoringId);
  const point = source ? source.position.clone() : player.position.clone();
  point.y = tabletop.height + 0.4;
  point.project(camera);
  const bounds = gameRoot.getBoundingClientRect();
  const popup = document.createElement('span');
  popup.className = 'score-popup';
  popup.textContent = `+${amount}`;
  if (bonus > 0) {
    const detail = document.createElement('small');
    detail.textContent = `${comboCount}× COMBO · +${bonus} BONUS`;
    popup.append(detail);
  }
  popup.setAttribute('aria-hidden', 'true');
  const margin = bonus > 0 ? 84 : 45;
  popup.style.left = `${Math.max(margin, Math.min(bounds.width - margin, (point.x + 1) / 2 * bounds.width))}px`;
  popup.style.top = `${Math.max(110, Math.min(bounds.height - 160, (1 - point.y) / 2 * bounds.height))}px`;
  gameRoot.append(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
  setTimeout(() => popup.remove(), 1200);
}

function renderDigits(element, value) {
  const text = String(value);
  if (element.dataset.digits === text) return;
  element.dataset.digits = text;
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = text;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const artwork = document.createElementNS(svgNamespace, 'svg');
  artwork.classList.add('display-digits');
  artwork.setAttribute('aria-hidden', 'true');
  let x = 0;
  for (const character of text) {
    const colon = character === ':';
    const width = colon ? 25 : 61;
    const glyph = document.createElementNS(svgNamespace, 'use');
    glyph.setAttribute('href', `#${colon ? 'colon' : 'digit-' + character}`);
    glyph.setAttribute('x', x);
    glyph.setAttribute('width', width);
    glyph.setAttribute('height', 95);
    artwork.append(glyph);
    x += width;
  }
  artwork.setAttribute('viewBox', `0 0 ${x} 95`);
  artwork.setAttribute('width', x);
  artwork.setAttribute('height', 95);
  element.replaceChildren(label, artwork);
}

function showResultConfetti() {
  const colors = ['#ffd05c', '#f78962', '#5bbbd2', '#ef9aab', '#fff2b1'];
  const paths = [[-37, -15], [-32, -27], [-25, -34], [-19, -14], [-14, -29], [-8, -39], [0, -23],
    [8, -36], [14, -19], [20, -31], [27, -22], [33, -30], [37, -16]];
  ui.resultConfetti.replaceChildren(...paths.map(([spread, rise], index) => {
    const piece = document.createElement('span');
    piece.style.setProperty('--paper', colors[index % colors.length]);
    piece.style.setProperty('--spread', `${spread}cqw`);
    piece.style.setProperty('--rise', `${rise}cqw`);
    piece.style.setProperty('--spin', `${(spread < 0 ? -1 : 1) * (120 + index * 19)}deg`);
    piece.style.setProperty('--delay', `${(index % 4) * 28}ms`);
    return piece;
  }));
}

function renderScore(snapshot) {
  if (catLoadError) return;
  const gained = snapshot.total - lastDisplayedScore;
  if (gained > 0) showScoreGain(gained, snapshot.comboCount, snapshot.comboBonus - lastDisplayedComboBonus);
  lastDisplayedScore = snapshot.total;
  lastDisplayedComboBonus = snapshot.comboBonus;
  clearTimeout(resultRevealTimer);
  document.body.dataset.gameState = snapshot.state;
  if (snapshot.state !== 'ready') renderer.domElement.style.cursor = '';
  renderDigits(ui.score, snapshot.total);
  ui.score.setAttribute('aria-label', `Score ${snapshot.total}`);
  if (snapshot.state === 'ended' && snapshot.reason !== 'restart' && snapshot.reason !== 'home') {
    const { stars } = roundRating(snapshot);
    const cleared = snapshot.reason === 'cleared';
    ui.nextLevel.textContent = cleared ? 'Next' : 'Retry';
    if (!debugScoring && !customRound) createCampaignProgress().record(1, snapshot, stars);
    ui.resultArt.src = `assets/ui/ui-results-${cleared ? 'cleared' : 'time-up'}.png`;
    ui.roundRating.querySelector('img').src = ui.resultArt.src;
    ui.result.setAttribute('aria-label', cleared ? 'Table cleared' : 'Time’s up');
    const newRecord = !debugScoring && !customRound && (cleared || snapshot.reason === 'timeout') && snapshot.total > bestScore;
    if (newRecord) {
      bestScore = snapshot.total;
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
      } catch {
        // Keep the in-memory record for the current session.
      }
    }
    ui.newRecord.hidden = !newRecord;
    ui.bestScore.textContent = `Best score: ${bestScore}`;
    renderDigits(ui.finalScore, snapshot.total);
    ui.finalScore.setAttribute('aria-label', `Final score ${snapshot.total}`);
    ui.roundRating.setAttribute('aria-label', `${stars} out of 3 stars`);
    ui.roundRating.dataset.stars = stars;
    const reveal = () => {
      if (ui.result.open) return;
      if (stars === 3) showResultConfetti();
      else ui.resultConfetti.replaceChildren();
      ui.result.showModal();
    };
    // Stop the round immediately, but let the final points remain visible first.
    if (gained > 0 && !cleared) resultRevealTimer = setTimeout(reveal, 700);
    else reveal();
  } else if (ui.result.open) ui.result.close();
  ui.status.textContent = snapshot.state === 'ended'
    ? 'Game Over (' + (snapshot.reason === 'cleared' ? 'all targets cleared' : snapshot.reason === 'collision' ? 'prototype collision' : 'round ended') + ') - Final score ' + snapshot.total
    : snapshot.state === 'ready' ? 'Press Start to play.'
    : 'Fallen ' + snapshot.fallenCount + '/' + snapshot.targetCount + (debugScoring ? ' - Developer simulation' : '');
}

function onKey(event, pressed) {
  if (roundIntro.open) return;
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (pressed && target?.closest('input, textarea, select, [contenteditable]')) return;
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { keys.dash = pressed; return; }
  // Start/Restart keeps keyboard focus; K and the touch button share one action.
  if ((event.code === 'KeyK' || event.key?.toLowerCase() === 'k') && pressed && !event.repeat) {
    game.requestSwat({retrigger:true});
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
  visualFeedback.reset();
  obstacleFeedback.reset();
  for (const popup of gameRoot.querySelectorAll('.score-popup')) popup.remove();
  player.position.set(0, tabletop.height, 0);
  catAvatar?.reset();
  updateFollowCamera(0, true);
  resetInput();
}


async function showRoundIntro(firstMessage) {
  document.body.dataset.gameState = 'countdown';
  roundIntroMessage.textContent = '';
  roundIntro.showModal();
  try {
    for (const message of [firstMessage, 'Ready?', 'Go!']) {
      roundIntroMessage.textContent = message;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } finally {
    roundIntro.close();
  }
}

async function startRound() {
  if (ui.start.disabled) return;
  void audio.unlock().then(unlocked => { if (unlocked) audio.playUISound('start'); });
  ui.start.disabled = true;
  if (pauseMenu.open) pauseMenu.close();
  if (ui.result.open) ui.result.close();
  ui.status.parentElement.hidden = true;
  try {
    if (await game.start(roundTargets)) {
      renderUnlocks([]);
      if (!debugScoring && !customRound) achievements.start(roundTargets);
    }
  } catch (error) {
    renderScore(game.snapshot());
    ui.status.textContent = 'Could not start. Check target configuration or scene reset.';
    ui.status.parentElement.hidden = false;
    console.error(error);
  } finally { ui.start.disabled = false; }
}
function pauseRound() {
  if (!game.pause()) return;
  resetMovement();
  document.body.dataset.gameState = 'paused';
  pauseMenu.showModal();
}
async function resumeRound() {
  if (!game.paused || ui.start.disabled) return;
  ui.start.disabled = true;
  pauseMenu.close();
  try {
    await showRoundIntro('Back to it!');
    if (game.resume()) document.body.dataset.gameState = 'playing';
  } finally {
    ui.start.disabled = false;
  }
}
async function goHome() {
  if (ui.start.disabled) return;
  ui.start.disabled = true;
  achievements.discard();
  clearTimeout(resultRevealTimer);
  if (pauseMenu.open) pauseMenu.close();
  if (ui.result.open) ui.result.close();
  game.home();
  try {
    resetPrototypeScene();
    await resetTargets?.();
  } finally {
    ui.start.disabled = false;
  }
}
document.querySelector('#pause-button').addEventListener('click', pauseRound);
document.querySelector('#resume').addEventListener('click', resumeRound);
document.querySelector('#pause-restart').addEventListener('click', startRound);
for (const button of document.querySelectorAll('.home-button')) button.addEventListener('click', () => { void goHome().catch(console.error); });
pauseMenu.addEventListener('cancel', event => { event.preventDefault(); resumeRound(); });
document.querySelector('#retry').addEventListener('click', () => location.reload());
ui.start.addEventListener('click', startRound);
ui.nextLevel.addEventListener('click', () => {
  if (game.snapshot().reason === 'cleared') window.location.assign('./level-2.html');
  else void startRound();
});
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
  if (!deskPhysics) return;
  if (!game.playing) {
    // Let already-falling props finish landing behind the results panel.
    if (game.snapshot().state === 'ended') deskPhysics.step(delta, {x:0,z:0});
    return;
  }

  const input = joystick.read();
  const dx = input.x + Number(keys.right) - Number(keys.left);
  const dz = input.z + Number(keys.back) - Number(keys.forward);
  const speed = input.dash || keys.dash ? JOYSTICK_SPEED.dash : JOYSTICK_SPEED.walk;
  const scale = speed / Math.max(1, Math.hypot(dx, dz));
  const { x, z } = player.position;
  if (!deskPhysics.step(delta, { x: dx * scale, z: dz * scale })) return;
  movementX = dx * scale * delta;
  movementZ = dz * scale * delta;
}
function animate(timestamp) {
  const delta = Math.min((timestamp - (lastTimestamp || timestamp)) / 1000, 0.05);
  lastTimestamp = timestamp;
  const remaining = game.remainingSeconds();
  renderDigits(ui.timer, formatRoundTime(remaining));
  ui.timer.parentElement.setAttribute('aria-label', `Time remaining ${remaining} seconds`);
  const showCountdown = game.playing && remaining > 0 && remaining <= 10;
  ui.finalCountdown.hidden = !showCountdown;
  if (showCountdown) renderDigits(ui.finalCountdown, remaining);
  game.tick(delta);
  stepGame(delta);
  swatButton.disabled = !game.playing;
  const comboRemaining = game.comboRemainingMs;
  ui.comboClock.hidden = comboRemaining <= 0;
  if(comboRemaining>0) document.querySelector('#combo-clock strong').textContent='COMBO ×'+game.snapshot().comboCount;
  if (comboRemaining > 0) ui.comboFill.style.width = `${100 * comboRemaining / COMBO_WINDOW_MS}%`;
  const homeView = document.body.dataset.gameState === 'ready';
  if (homeView && catAvatar) catAvatar.object.rotation.y = 0;
  if (!game.paused) catAvatar?.update(delta, movementX, movementZ);
  if (homeView) updateHomeCamera();
  else updateFollowCamera(delta);
  obstacleFeedback.update(delta);
  coverKey.visible = homeView;
  renderer.toneMappingExposure = gameplayExposure * (homeView ? 1.06 : 1);
  renderer.render(scene, homeView ? homeCamera : camera);
  requestAnimationFrame(animate);
}

function resizeRenderer() {
  const width = gameRoot.clientWidth;
  const height = gameRoot.clientHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  homeCamera.aspect = aspect;
  homeCamera.updateProjectionMatrix();
  resizePlayCamera(camera, aspect);
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();
renderScore(game.snapshot());
requestAnimationFrame(animate);

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disconnectAudio();
  disconnectScoring();
  impactVFX.dispose();
  visualFeedback.dispose();
  contactShadows?.dispose();
  studyMaterials?.dispose();
  roomEnvironment?.userData.dispose();
  obstacleFeedback.dispose();
  audio.dispose();
  deskPhysics?.dispose();
});

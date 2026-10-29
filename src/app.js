import { nextMessage } from './logic.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const ui = {
  score: document.querySelector('#score'),
  status: document.querySelector('#status'),
  start: document.querySelector('#start'),
};

const gameRoot = document.querySelector('#game-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#08131f');
scene.fog = new THREE.Fog('#08131f', 18, 56);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 4.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(gameRoot.clientWidth, gameRoot.clientHeight);
gameRoot.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight('#dff7ff', '#11252e', 1.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight('#ffe1a8', 1.4);
sun.position.set(6, 10, 4);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(18, 1, 70),
  new THREE.MeshStandardMaterial({ color: '#1f4d46', roughness: 0.9, metalness: 0.1 }),
);
ground.position.set(0, -1.2, -18);
world.add(ground);

const laneLineMaterial = new THREE.MeshStandardMaterial({ color: '#7ad8d0', emissive: '#0f7d6a', emissiveIntensity: 0.6 });
for (let i = -16; i <= 16; i += 4) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 2), laneLineMaterial);
  line.position.set(i * 0.7, 0.05, -18);
  world.add(line);
}

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 1.1, 1.1),
  new THREE.MeshStandardMaterial({ color: '#ffbf69', roughness: 0.6, metalness: 0.1 }),
);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 24, 24),
  new THREE.MeshStandardMaterial({ color: '#ffd9a8', roughness: 0.6 }),
);
head.position.y = 0.95;
const nose = new THREE.Mesh(
  new THREE.ConeGeometry(0.12, 0.46, 12),
  new THREE.MeshStandardMaterial({ color: '#ff8a65' }),
);
nose.rotation.x = Math.PI / 2;
nose.position.set(0, 0.9, 0.58);
player.add(body, head, nose);
player.position.set(0, 0.5, 5);
scene.add(player);

const playerState = {
  x: 0,
  y: 0,
  vy: 0,
  grounded: true,
  speed: 0,
};

const controls = {
  pointerTargetX: 0,
  pointerActive: false,
};

const obstacles = [];
const pickups = [];
let score = 0;
let started = false;
let lastObstacleTime = 0;
let lastPickupTime = 0;
let lastTimestamp = 0;

const keys = { left: false, right: false };

const updateHud = () => {
  ui.score.textContent = `Score ${score}`;
  ui.status.textContent = nextMessage(score);
};

function setStarted(value) {
  started = value;
  ui.start.textContent = value ? 'Restart run' : 'Start run';
  if (!value) {
    ui.status.textContent = 'Ready when you are.';
  }
}

function spawnObstacle() {
  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: '#ff7b72', emissive: '#7d241d', emissiveIntensity: 0.6 }),
  );
  obstacle.position.set((Math.random() * 2 - 1) * 5, 0.5, -35);
  scene.add(obstacle);
  obstacles.push(obstacle);
}

function spawnPickup() {
  const pickup = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#7cf0ff', emissive: '#5ec1ff', emissiveIntensity: 0.85 }),
  );
  pickup.position.set((Math.random() * 2 - 1) * 5, 1.5, -30);
  pickup.userData.spin = Math.random() * Math.PI * 2;
  scene.add(pickup);
  pickups.push(pickup);
}

function jump() {
  if (!started || !playerState.grounded) return;
  playerState.vy = 7.5;
  playerState.grounded = false;
}

function onKey(event, isPressed) {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = isPressed;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = isPressed;
  if (event.code === 'Space' && isPressed) jump();
}

window.addEventListener('keydown', (event) => {
  onKey(event, true);
  if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD') {
    controls.pointerActive = false;
  }
});
window.addEventListener('keyup', (event) => {
  onKey(event, false);
  if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowRight' || event.code === 'KeyD') {
    controls.pointerActive = false;
  }
});
window.addEventListener('pointermove', (event) => {
  controls.pointerTargetX = (event.clientX / window.innerWidth) * 2 - 1;
  controls.pointerActive = true;
});
window.addEventListener('pointerleave', () => {
  controls.pointerActive = false;
});

ui.start.addEventListener('click', () => {
  score = 0;
  updateHud();
  for (const obstacle of obstacles) scene.remove(obstacle);
  for (const pickup of pickups) scene.remove(pickup);
  obstacles.length = 0;
  pickups.length = 0;
  player.position.set(0, 0.5, 5);
  playerState.x = 0;
  playerState.y = 0;
  playerState.vy = 0;
  playerState.grounded = true;
  lastObstacleTime = 0;
  lastPickupTime = 0;
  setStarted(true);
});

function stepGame(delta) {
  if (!started) return;

  const moveDirection = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  if (moveDirection !== 0) {
    playerState.speed += (moveDirection * 12 - playerState.speed) * 0.12;
    playerState.x += playerState.speed * delta;
    controls.pointerActive = false;
  } else if (controls.pointerActive) {
    const pointerTarget = controls.pointerTargetX * 5.2;
    playerState.x += (pointerTarget - playerState.x) * 0.18;
  }

  playerState.x = THREE.MathUtils.clamp(playerState.x, -5.2, 5.2);

  playerState.vy -= 16 * delta;
  playerState.y += playerState.vy * delta;
  if (playerState.y <= 0) {
    playerState.y = 0;
    playerState.vy = 0;
    playerState.grounded = true;
  }

  player.position.x = playerState.x;
  player.position.y = 0.5 + playerState.y;

  lastObstacleTime += delta;
  if (lastObstacleTime > 0.9) {
    spawnObstacle();
    lastObstacleTime = 0;
  }

  lastPickupTime += delta;
  if (lastPickupTime > 1.25) {
    spawnPickup();
    lastPickupTime = 0;
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.position.z += 11 * delta;
    if (obstacle.position.z > 8) {
      scene.remove(obstacle);
      obstacles.splice(i, 1);
    } else if (obstacle.position.distanceTo(player.position) < 1.3) {
      setStarted(false);
      ui.status.textContent = 'The run ended. Tap Start run to try again.';
      return;
    }
  }

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.position.z += 11 * delta;
    pickup.rotation.y += 0.08;
    pickup.rotation.x += 0.12;
    pickup.position.y += Math.sin((performance.now() * 0.005) + pickup.userData.spin) * 0.007;
    if (pickup.position.z > 8) {
      scene.remove(pickup);
      pickups.splice(i, 1);
    } else if (pickup.position.distanceTo(player.position) < 1.4) {
      score += 1;
      updateHud();
      scene.remove(pickup);
      pickups.splice(i, 1);
    }
  }

  camera.position.x += (player.position.x * 0.7 - camera.position.x) * 0.08;
  camera.position.y += (4.2 + player.position.y * 0.3 - camera.position.y) * 0.08;
  camera.lookAt(player.position.x * 0.3, 1.2, 0);
}

function animate(timestamp) {
  const delta = Math.min((timestamp - (lastTimestamp || timestamp)) / 1000, 0.05);
  lastTimestamp = timestamp;
  stepGame(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resizeRenderer() {
  const width = gameRoot.clientWidth;
  const height = gameRoot.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();
updateHud();
setStarted(false);
requestAnimationFrame(animate);

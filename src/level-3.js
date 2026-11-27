import { createLevelUI } from './level-ui.js';
import {createChristmasPhysics,clampChristmasTarget,addChristmasEnvironmentColliders} from './physics/christmas-physics.js';
import {createChristmasProps} from './christmas-props.js';
import {SWAT} from './swat.js';
import {batchStaticMeshes} from './assets/batch-static-meshes.js';
import { AudioManager } from './feedback/audio-manager.js';
import * as THREE from 'three';
import { PLAY_CAMERA, resizePlayCamera } from './play-camera.js';
import { createCatAvatar } from './assets/cat-avatar.js';
import { loadGlb } from './assets/load-assets.js';
import { joystickInput, JOYSTICK_SPEED } from './joystick.js';
const scene = new THREE.Scene();
scene.background = new THREE.Color('#39251d');
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
document.querySelector('main').append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30);
const tableHeight=.807;
const {elevation,distance,focusHeight,frameZ}=PLAY_CAMERA;
const focus=new THREE.Vector3(0,tableHeight+focusHeight,frameZ);
const cameraOffset=new THREE.Vector3(0,distance*Math.sin(elevation),distance*Math.cos(elevation));
camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);
const audio = new AudioManager();
audio.init(camera,scene);
void audio.preload();
window.addEventListener('pagehide',event=>{if(!event.persisted)audio.dispose();});
const room=await loadGlb('./assets/models/christmas-room.glb');
room.traverse(child=>{if(child.isMesh)child.castShadow=child.receiveShadow=true;});
const flames = [];
room.traverse(child => {
  if (child.name === 'Red_woven_blanket') child.material = new THREE.MeshStandardMaterial({color:'#8f2632', roughness:1});
  if (child.name.startsWith('Amber_flame') || child.name.startsWith('Golden_heart')) flames.push(child);
});
// Preserve the original mantel decorations alongside the movable tabletop copies.

// Keep authored environment parts available for solid collision proxies.
scene.add(room);
scene.add(new THREE.HemisphereLight('#ffe6c5','#674334',2.1));
const key=new THREE.DirectionalLight('#ffcf94',2.6);key.position.set(-3,5,2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5});key.shadow.normalBias=.025;scene.add(key);
const fireLight=new THREE.PointLight('#ff9b3d',9,8,2);fireLight.position.set(0,.65,-2.95);scene.add(fireLight);
function resize() {
  const { clientWidth: width, clientHeight: height } = renderer.domElement.parentElement;
  const aspect = width / height;
  resizePlayCamera(camera, aspect);
  camera.left *= 1.15; camera.right *= 1.15;
  camera.top *= 1.15; camera.bottom *= 1.15;
  camera.updateProjectionMatrix();
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
const christmasPhysics=await createChristmasPhysics(tableHeight,audio);
addChristmasEnvironmentColliders(christmasPhysics.physics,room);
const christmasProps=await createChristmasProps(scene,christmasPhysics,tableHeight);


const swat=()=>{
  if(!levelUI.playing)return;
  const strike=strikeDirection();if(!strike.moving)cat.swat();levelUI.recordSwat(christmasProps.swat(cat.object.position,strike.yaw));return true;
};
const levelUI = createLevelUI({ level: 3, camera, protectedRules: [{id:'christmas-11',name:'Snow globe',penalty:80},{id:'christmas-17',name:'Vintage lantern',penalty:80}], targets: christmasProps.entries.filter(e=>!e.spec.scenery).map(e=>({...e,id:'christmas-'+e.spec.id,points:e.spec.height>=.4?30:e.spec.flat?10:20, readBounds: () => new THREE.Box3(e.half.clone().negate(), e.half.clone()).applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(e.object.quaternion).setPosition(e.object.position))})), tableHeight, tableShape: { halfWidth: 1.95, halfDepth: 2.65 }, onSwat: swat, onRestart: () => {
resetInput();cat.reset();christmasPhysics.resetCat();christmasProps.reset();cat.object.position.set(0,tableHeight+.007,0);focus.set(0,tableHeight+focusHeight,frameZ);
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
const clock = new THREE.Timer();
renderer.setAnimationLoop(timestamp => {
  clock.update(timestamp);
  levelUI.tick();
  if (!levelUI.playing) { resetInput(); renderer.render(scene, camera); return; }
  const input=levelUI.read();
  let x = drag?.x ?? input.x;
  let z = drag?.z ?? input.z;
  for (const code of pressed) {
    const direction=directions.get(code);if(!direction)continue;
    const [dx, dz] = direction;
    x += dx;
    z += dz;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  const dashing=(drag?.dash ?? input.dash)||pressed.has('ShiftLeft')||pressed.has('ShiftRight');
  const speed=dashing?JOYSTICK_SPEED.dash:JOYSTICK_SPEED.walk;
  const distance = speed * delta
    / Math.max(1, Math.hypot(x, z));
  const target=clampChristmasTarget(position.x+x*distance,position.z+z*distance);
  next.set(target.x,target.z);
  christmasPhysics.step(delta,next,speed);
  const actual=christmasPhysics.catBody.translation();
  cat.update(delta,x*distance,z*distance);
  position.x=actual.x;position.z=actual.z;
  christmasProps.update(delta);
  // Keep the play angle and scale, following the cat as in the first level.
  const follow = 1 - Math.exp(-10 * delta);
  focus.x += (position.x - focus.x) * follow;
  focus.z += (position.z + frameZ - focus.z) * follow;
  camera.position.copy(focus).add(cameraOffset);
  camera.lookAt(focus);
  flames.forEach((flame, index) => {
    flame.scale.y = .96 + .05 * Math.sin(timestamp * .004 + index * 1.7);
    flame.scale.x = 1 + .035 * Math.sin(timestamp * .003 + index);
  });
  fireLight.intensity = 2.8 + Math.sin(timestamp * .007) * .3 + Math.sin(timestamp * .013) * .15;
  renderer.render(scene, camera);
});

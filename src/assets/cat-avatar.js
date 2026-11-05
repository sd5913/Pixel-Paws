import { AnimationMixer, LoopOnce } from 'three';
import { SWAT } from '../swat.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { loadGlb } from './load-assets.js';

export const CAT_VISUAL_SCALE = 1.6;
export const CAT_EDGE_MARGIN = 0.22 * CAT_VISUAL_SCALE;

export async function createCatAvatar({ loadModel = loadGlb } = {}) {
  const source = await loadModel('assets/models/mikan-cat.glb');
  const object = clone(source);
  // User-requested gameplay scale; preserve the source GLB and its native metadata.
  object.scale.setScalar(CAT_VISUAL_SCALE);
  const mixer = new AnimationMixer(object);
  const actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current;
  const paw = actions.get('PawWave');
  if (paw) {
    paw.setLoop(LoopOnce, 1);
    paw.clampWhenFinished = true;
    paw.timeScale = paw.getClip().duration / SWAT.duration;
  }
  function cancelSwat() {
    if (current === paw) { paw.stop(); current = null; play('Idle'); }
  }
  function play(name) {
    const next = actions.get(name);
    if (!next || current === next) return;
    current?.fadeOut(0.15);
    next.reset().fadeIn(0.15).play();
    current = next;
  }
  function reset() {
    mixer.stopAllAction();
    current = null;
    object.rotation.y = Math.PI;
    play('Idle');
  }
  reset();
  return {
    object, reset, cancelSwat,
    swat() { play('PawWave'); },
    update(delta, dx, dz) {
      if (current === paw && paw.isRunning()) { mixer.update(delta); return; }
      const moving = Math.hypot(dx, dz) > 0.001;
      if (moving) object.rotation.y = Math.atan2(dx, dz); // Source faces +Z.
      play(moving ? 'Walk' : 'Idle');
      mixer.update(delta);
    },
  };
}

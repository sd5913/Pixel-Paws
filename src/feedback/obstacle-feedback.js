import { BoxHelper } from 'three';

// The active game had no obstacle outline utility. Reuse one lightweight orange
// box outline for explicitly marked obstacles, independent of impact audio/score.
export function createObstacleFeedback(bus, scene, resolveObject) {
  const outline = new BoxHelper(undefined, 0xff9800);
  outline.visible = false;
  scene.add(outline);
  let remaining = 0;
  let object = null;
  const off = bus.on('game:obstacle-hit', event => {
    object = resolveObject(event.obstacleId);
    if (!object) return;
    outline.setFromObject(object);
    outline.visible = true;
    remaining = 0.2;
  });
  return {
    update(delta) {
      remaining = Math.max(0, remaining - delta);
      outline.visible = remaining > 0;
      if (outline.visible && object) outline.setFromObject(object);
    },
    reset() { remaining = 0; outline.visible = false; object = null; },
    dispose() { off(); outline.removeFromParent(); outline.geometry.dispose(); outline.material.dispose(); },
  };
}

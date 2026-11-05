// Shared keyboard/touch action timing and physical tuning, in metres and seconds.
export const SWAT = Object.freeze({
  duration: 0.75, impactTime: 0.24,
  width: 0.45, depth: 0.35, height: 0.45, forwardOffset: 0.4, centerHeight: 0.25,
  forwardSpeed: 2.1, upwardSpeed: 0.35,
  leftContactOffset: 0.06,
});

export function createSwat({ canStart, onStart, onHit, onReset = () => {} }) {
  let elapsed = null;
  let hit = false;
  return {
    get active() { return elapsed !== null; },
    request() {
      if (elapsed !== null || !canStart()) return false;
      elapsed = 0;
      hit = false;
      onStart();
      return true;
    },
    update(delta) {
      if (elapsed === null) return;
      elapsed += delta;
      if (!hit && elapsed >= SWAT.impactTime) {
        hit = true;
        onHit();
      }
      if (elapsed >= SWAT.duration) elapsed = null;
    },
    reset() { elapsed = null; hit = false; onReset(); },
  };
}

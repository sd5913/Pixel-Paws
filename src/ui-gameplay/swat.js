// Shared keyboard/touch action timing. Physics tuning belongs to the scene owner.
export const SWAT = Object.freeze({
  duration: 0.75, impactTime: 0.24,
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

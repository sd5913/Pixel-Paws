export const ROUND_SECONDS = 45;

// Use a monotonic deadline so slow frames/background tabs do not extend a round.
export function createRoundTimer({ onExpire = () => {} } = {}) {
  let remainingMs = ROUND_SECONDS * 1000;
  let deadline = 0;
  let running = false;
  return {
    get elapsedMs() { return ROUND_SECONDS * 1000 - remainingMs; },
    start(now) {
      remainingMs = ROUND_SECONDS * 1000;
      deadline = now + ROUND_SECONDS * 1000;
      running = true;
    },
    tick(now) {
      if (running) {
        remainingMs = Math.min(ROUND_SECONDS * 1000, Math.max(0, deadline - now));
        if (remainingMs === 0) {
          running = false;
          onExpire();
        }
      }
      return Math.ceil(remainingMs / 1000);
    },
    stop() { running = false; },
    resume(now) {
      if (running || remainingMs <= 0) return;
      deadline = now + remainingMs;
      running = true;
    },
  };
}

export function formatRoundTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

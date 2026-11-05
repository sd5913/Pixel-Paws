export const ROUND_SECONDS = 60;

// Use a monotonic deadline so slow frames/background tabs do not extend a round.
export function createRoundTimer({ onExpire = () => {} } = {}) {
  let remaining = ROUND_SECONDS;
  let deadline = 0;
  let running = false;
  return {
    start(now) {
      remaining = ROUND_SECONDS;
      deadline = now + ROUND_SECONDS * 1000;
      running = true;
    },
    tick(now) {
      if (running) {
        remaining = Math.min(ROUND_SECONDS, Math.max(0, (deadline - now) / 1000));
        if (remaining === 0) {
          running = false;
          onExpire();
        }
      }
      return Math.ceil(remaining);
    },
    stop() { running = false; },
    resume(now) {
      if (running || remaining <= 0) return;
      deadline = now + remaining * 1000;
      running = true;
    },
  };
}

export function formatRoundTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

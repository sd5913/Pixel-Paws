import { createScoring } from './scoring.js';
import { createRoundTimer } from './round-timer.js';
import { createSwat } from './swat.js';

// This module never moves a character, detects hits, or applies physical forces.
export function createGameLogic({ now = () => performance.now(), resetScene = async () => {},
  onChange = () => {}, onEnd = () => {}, canSwat = () => true, onSwat = () => {} } = {}) {
  let paused = false, resetting = false, generation = 0;
  const score = createScoring({ onChange, onEnd: result => {
    timer.stop(); action.reset(); onEnd(result, timer.elapsedMs);
  } });
  const timer = createRoundTimer({ onExpire: () => score.endRound('timeout') });
  const playing = () => !paused && !resetting && score.snapshot().state === 'playing';
  const action = createSwat({ canStart: () => playing() && canSwat(), onStart: () => onSwat('start'),
    onHit: () => { if (playing()) onSwat('impact'); }, onReset: () => onSwat('cancel') });
  return {
    get playing() { return playing(); },
    get paused() { return paused; },
    get swatting() { return action.active; },
    get comboRemainingMs() { return score.comboRemainingMs(timer.elapsedMs); },
    cancelSwat() { action.reset(); },
    remainingSeconds(timestamp = now()) { return timer.tick(timestamp); },
    snapshot() { const seconds = timer.tick(now()); return { ...score.snapshot(), paused, resetting, seconds, swatting: action.active }; },
    async start(targets) {
      if (resetting) return false;
      const token = ++generation;
      resetting = true; paused = false; timer.stop(); action.reset(); score.endRound('restart');
      try {
        await resetScene();
        if (token !== generation) return false;
        score.startRound(targets); timer.start(now()); return true;
      } finally { if (token === generation) resetting = false; }
    },
    pause() { timer.tick(now()); if (!playing()) return false; paused = true; timer.stop(); action.reset(); return true; },
    resume() { if (!paused || resetting) return false; paused = false; timer.resume(now()); return true; },
    home() { generation++; resetting = false; paused = false; timer.stop(); action.reset(); score.reset(); },
    tick(delta) { timer.tick(now()); if (playing()) action.update(delta); },
    requestSwat() { timer.tick(now()); return action.request(); },
    notifyToppled(id) { timer.tick(now()); return playing() && score.notifyToppled(id); },
    notifyFallen(id) { timer.tick(now()); return playing() && score.notifyFallen(id, timer.elapsedMs); },
    endRound(reason = 'manual') { return score.endRound(reason); },
  };
}

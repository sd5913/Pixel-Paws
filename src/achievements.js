import { roundRating } from './ui-gameplay/scoring.js';

const FALL_GOAL = 75;

export const ACHIEVEMENTS = Object.freeze([
  { id: 'first-fall', name: 'First Mischief', description: 'Knock one target off the desk.', qualifies: round => round.fallenCount >= 1 },
  { id: 'first-swat', name: 'Paw Power', description: 'Swat four different targets in one round.', qualifies: round => round.uniqueSwatHits >= 4 },
  { id: 'double-swat', name: 'Double Tap', description: 'Land two swats that each hit at least two targets in one round.', qualifies: round => round.multiTargetSwats >= 2 },
  { id: 'clear-desk', name: 'Clean Sweep', description: 'Clear every target and earn three stars in the same round.', qualifies: round => round.cleared && round.stars === 3 },
  { id: 'speed-clear', name: 'Lightning Paws', description: 'Clear the desk in 25 seconds or less.', qualifies: round => round.cleared && round.elapsedMs <= 25_000 },
  { id: 'desk-dominoes', name: 'Desk Dominoes', description: 'Reach a six-target fall combo in one round.', qualifies: round => round.bestCombo >= 6 },
  { id: 'fall-25', name: 'Repeat Offender', description: `Knock ${FALL_GOAL} targets off the desk across finished rounds.`, fallGoal: FALL_GOAL, qualifies: round => round.totalFalls >= FALL_GOAL },
]);

const STORAGE_KEY = 'pixel-paws.achievements';

export function createAchievements({ storage = () => globalThis.localStorage, now = () => new Date().toISOString() } = {}) {
  let saved = { version: 1, totalFalls: 0, unlocked: {} };
  let persistenceFailed = false;
  let round = null;
  try {
    const data = JSON.parse(storage().getItem(STORAGE_KEY));
    if (data?.version === 1) {
      if (Number.isSafeInteger(data.totalFalls) && data.totalFalls >= 0) saved.totalFalls = data.totalFalls;
      for (const { id } of ACHIEVEMENTS) {
        const timestamp = data.unlocked?.[id];
        if (typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp))) saved.unlocked[id] = timestamp;
      }
    }
  } catch {
    // A missing or unreadable save must not prevent play.
  }

  return {
    reset() {
      try {
        storage().removeItem(STORAGE_KEY);
      } catch {
        return false;
      }
      saved = { version: 1, totalFalls: 0, unlocked: {} };
      persistenceFailed = false;
      round = null;
      return true;
    },
    start(targets) {
      round = { targets: new Set(targets.map(({ id }) => id)), swatHits: new Set(), multiTargetSwats: 0 };
    },
    discard() { round = null; },
    recordSwat(hitIds) {
      if (!round) return;
      const hits = new Set(hitIds.filter(id => round.targets.has(id)));
      for (const id of hits) round.swatHits.add(id);
      if (hits.size >= 2) round.multiTargetSwats++;
    },
    settle(result, elapsedMs) {
      const finished = round;
      round = null;
      if (!finished || !['cleared', 'timeout'].includes(result.reason)) return [];
      if (result.fallenCount === 0 && finished.swatHits.size === 0) return [];

      saved.totalFalls = Math.min(Number.MAX_SAFE_INTEGER, saved.totalFalls + result.fallenCount);
      const context = {
        fallenCount: result.fallenCount, uniqueSwatHits: finished.swatHits.size,
        multiTargetSwats: finished.multiTargetSwats, stars: roundRating(result).stars, bestCombo: result.bestCombo,
        cleared: result.reason === 'cleared' && result.targetCount > 0 && result.fallenCount === result.targetCount,
        elapsedMs, totalFalls: saved.totalFalls,
      };
      const unlocked = ACHIEVEMENTS.filter(item => !saved.unlocked[item.id] && item.qualifies(context));
      if (unlocked.length) {
        const timestamp = now();
        for (const { id } of unlocked) saved.unlocked[id] = timestamp;
      }
      try {
        storage().setItem(STORAGE_KEY, JSON.stringify(saved));
        persistenceFailed = false;
      } catch {
        persistenceFailed = true;
      }
      return unlocked;
    },
    snapshot() { return { totalFalls: saved.totalFalls, unlocked: { ...saved.unlocked }, persistenceFailed }; },
  };
}

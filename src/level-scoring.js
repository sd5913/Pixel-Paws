// Scoring deliberately has no dependency on rendering, models or physics.
export const SCORE_VALUES = Object.freeze({
  objectKnockedOver: 10,
  objectFellOffTable: 10,
});
export const COMBO_WINDOW_MS = 2000;
const COMBO_STEP = 5;
const MAX_COMBO_BONUS = 15;

export function roundRating({ targetCount, total, baseMax: configuredBase }) {
  if (!targetCount) return { stars: 0, nextScore: null };
  const baseMax = configuredBase ?? targetCount * (SCORE_VALUES.objectKnockedOver + SCORE_VALUES.objectFellOffTable);
  const firstStar = Math.ceil(baseMax * 0.25);
  const maxComboBonus = targetCount < 3
    ? (targetCount - 1) * COMBO_STEP
    : 3 * COMBO_STEP + (targetCount - 3) * MAX_COMBO_BONUS;
  const thirdStar = baseMax + Math.min(Math.ceil(baseMax * 0.375), maxComboBonus);
  if (targetCount > 1 && total >= thirdStar) return { stars: 3, nextScore: null };
  if (total >= baseMax) return { stars: 2, nextScore: targetCount > 1 ? thirdStar : null };
  if (total >= firstStar) return { stars: 1, nextScore: baseMax };
  return { stars: 0, nextScore: firstStar };
}

export function createScoring({ onChange = () => {}, onEnd = () => {} } = {}) {
  let state = 'ready';
  let total = 0;
  let reason = null;
  let targets = new Map();
  let combo = { count: 0, best: 0, bonus: 0, lastFallAt: null };
  const snapshot = () => ({
    state, total, reason, targetCount: targets.size,
    baseMax: [...targets.values()].reduce((sum, item) => sum + item.points, 0),
    comboCount: combo.count, bestCombo: combo.best, comboBonus: combo.bonus,
    fallenCount: [...targets.values()].filter((item) => item.fallen).length,
    targets: [...targets].map(([id, item]) => ({ id, ...item })),
  });
  const publish = () => onChange(snapshot());
  function endRound(endReason = 'manual') {
    if (state !== 'playing') return false;
    state = 'ended';
    reason = endReason;
    publish();
    onEnd(snapshot());
    return true;
  }
  function startRound(items = []) {
    // Validate the entire roster before replacing the previous round.
    const roster = new Map();
    for (const { id, size, points = 20 } of items) {
      if (typeof id !== 'string' || !id.trim()) {
        throw new TypeError('Targets require a non-empty string id');
      }
      if (!Number.isFinite(points) || points <= 0) throw new TypeError('Target points must be positive');
      if (!roster.has(id)) roster.set(id, { size, points, toppled: false, fallen: false });
    }
    targets = roster;
    total = 0;
    combo = { count: 0, best: 0, bonus: 0, lastFallAt: null };
    reason = null;
    state = 'playing';
    publish();
  }
  function record(id, fall, elapsedMs) {
    const item = targets.get(id);
    if (state !== 'playing' || !item || item.fallen || (!fall && item.toppled)) return false;
    if (!fall) {
      total += Math.floor(item.points / 2);
      item.toppled = true;
    }
    if (fall) {
      total += item.points - Math.floor(item.points / 2);
      // Complete the target's score without inventing a physical topple event.
      if (!item.toppled) total += Math.floor(item.points / 2);
      item.fallen = true;
      if (Number.isFinite(elapsedMs)) {
        const interval = elapsedMs - (combo.lastFallAt ?? -Infinity);
        combo.count = interval >= 0 && interval <= COMBO_WINDOW_MS ? combo.count + 1 : 1;
        combo.lastFallAt = elapsedMs;
        combo.best = Math.max(combo.best, combo.count);
        const bonus = Math.min((combo.count - 1) * COMBO_STEP, MAX_COMBO_BONUS);
        combo.bonus += bonus;
        total += bonus;
      }
    }
    if (targets.size > 0 && [...targets.values()].every((target) => target.fallen)) {
      endRound('cleared');
    } else publish();
    return true;
  }
  function reset() {
    state = 'ready'; total = 0; reason = null; targets = new Map();
    combo = { count: 0, best: 0, bonus: 0, lastFallAt: null };
    publish();
  }
  return { snapshot, startRound, endRound, reset,
    comboRemainingMs(elapsedMs) {
      if (state !== 'playing' || combo.lastFallAt === null) return 0;
      return Math.max(0, COMBO_WINDOW_MS - (elapsedMs - combo.lastFallAt));
    },
    notifyToppled: (id) => record(id, false),
    notifyFallen: (id, elapsedMs) => record(id, true, elapsedMs) };
}

// Scoring deliberately has no dependency on rendering, models or physics.
export const SCORE_VALUES = Object.freeze({
  objectKnockedOver: 10,
  objectFellOffTable: 10,
});

export function createScoring({ onChange = () => {}, onEnd = () => {} } = {}) {
  let state = 'ready';
  let total = 0;
  let reason = null;
  let targets = new Map();
  const snapshot = () => ({
    state, total, reason, targetCount: targets.size,
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
    for (const { id, size } of items) {
      if (typeof id !== 'string' || !id.trim()) {
        throw new TypeError('Targets require a non-empty string id');
      }
      if (!roster.has(id)) roster.set(id, { size, toppled: false, fallen: false });
    }
    targets = roster;
    total = 0;
    reason = null;
    state = 'playing';
    publish();
  }
  function record(id, fall) {
    const item = targets.get(id);
    if (state !== 'playing' || !item || item.fallen || (!fall && item.toppled)) return false;
    if (!fall) {
      total += SCORE_VALUES.objectKnockedOver;
      item.toppled = true;
    }
    if (fall) {
      total += SCORE_VALUES.objectFellOffTable;
      // Complete the target's score without inventing a physical topple event.
      if (!item.toppled) total += SCORE_VALUES.objectKnockedOver;
      item.fallen = true;
    }
    if (targets.size > 0 && [...targets.values()].every((target) => target.fallen)) {
      endRound('cleared');
    } else publish();
    return true;
  }
  function reset() { state = 'ready'; total = 0; reason = null; targets = new Map(); publish(); }
  return { snapshot, startRound, endRound, reset,
    notifyToppled: (id) => record(id, false),
    notifyFallen: (id) => record(id, true) };
}

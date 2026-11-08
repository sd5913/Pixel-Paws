import { IMPACT_CONFIG } from './config.js';

// Input is already reduced to one strongest contact per rigid-body pair/substep.
export function createImpactFilter(config = IMPACT_CONFIG) {
  const pairs = new Map();
  return {
    update(samples, time) {
      const present = new Set();
      const impacts = [];
      for (const sample of samples) {
        present.add(sample.pairId);
        const previous = pairs.get(sample.pairId);
        const strength = sample.impactStrength;
        const began = !previous?.active;
        const increased = strength >= (previous?.strength ?? 0) * config.strengthIncreaseRatio
          && strength - (previous?.strength ?? 0) >= config.strengthIncreaseMinimum;
        const meaningful = Number.isFinite(strength) && strength >= config.minImpulse;
        const cooled = time - (previous?.lastEmit ?? -Infinity) >= config.cooldownSeconds;
        const emit = meaningful && cooled && (began || increased);
        if (emit) impacts.push(sample);
        pairs.set(sample.pairId, { active: true, strength,
          lastEmit: emit ? time : (previous?.lastEmit ?? -Infinity) });
      }
      for (const [key, state] of pairs) {
        if (!present.has(key)) {
          state.active = false;
          state.strength = 0;
          if (time - state.lastEmit > config.cooldownSeconds) pairs.delete(key);
        }
      }
      return impacts;
    },
    reset() { pairs.clear(); },
  };
}

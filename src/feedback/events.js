/** @typedef {'plastic'|'paper'|'metal'|'ceramic'|'glass'|'wood'} AudioMaterial */
/**
 * @typedef {Object} ImpactEvent
 * @property {string} objectId
 * @property {string} otherObjectId
 * @property {AudioMaterial|undefined} audioMaterial
 * @property {AudioMaterial|undefined} surfaceMaterial
 * @property {{x:number,y:number,z:number}} position World-space contact point.
 * @property {number} impactStrength Normal impulse in N·s.
 * @property {number} [relativeSpeed]
 * @property {boolean} isObstacle
 * @property {string|undefined} obstacleId
 */
/** @typedef {{
 * 'physics:impact': ImpactEvent,
 * 'game:object-cleared': {objectId:string},
 * 'game:obstacle-hit': ImpactEvent
 * }} GameEvents */

export function createEventBus() {
  const listeners = new Map();
  return {
    /** @template {keyof GameEvents} K
     * @param {K} type
     * @param {(event: GameEvents[K]) => void} callback
     * @returns {() => void}
     */
    on(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      const group = listeners.get(type);
      group.add(callback);
      return () => {
        group.delete(callback);
        if (!group.size && listeners.get(type) === group) listeners.delete(type);
      };
    },
    /** @template {keyof GameEvents} K
     * @param {K} type
     * @param {GameEvents[K]} event
     */
    emit(type, event) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback(event);
    },
  };
}

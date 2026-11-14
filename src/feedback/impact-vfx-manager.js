// Future particles receive the full shared impact event, never a physics-engine object.
export class ImpactVFXManager {
  /** @param {ReturnType<import('./events.js').createEventBus>} bus
   * @param {{onImpact?: (event: import('./events.js').ImpactEvent) => void}} options
   */
  constructor(bus, { onImpact = () => {} } = {}) {
    this.unsubscribe = bus.on('physics:impact', event => onImpact(event));
  }

  dispose() { this.unsubscribe(); }
}

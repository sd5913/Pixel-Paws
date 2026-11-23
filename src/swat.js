import { SWAT as timing } from './ui-gameplay/swat.js';
export { createSwat } from './ui-gameplay/swat.js';

// Physical tuning in metres and seconds.
export const SWAT = Object.freeze({
  ...timing,
  width: 0.32, depth: 0.25, height: 0.45, forwardOffset: 0.32, centerHeight: 0.25,
  // Fixed paw impulse (N·s): heavier objects resist the same strike.
  forwardImpulse: 0.525, upwardImpulse: 0.06,
  leftContactOffset: 0.06,
});

// Shared close-range test for the kitchen's independent physics objects.
export function inSwatRange(position, yaw, point) {
  const dx=point.x-position.x, dz=point.z-position.z;
  const forward=dx*Math.sin(yaw)+dz*Math.cos(yaw);
  const sideways=dx*Math.cos(yaw)-dz*Math.sin(yaw);
  return forward>=.08 && forward<=.52 && Math.abs(sideways)<=.24;
}

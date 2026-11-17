import { SWAT as timing } from './ui-gameplay/swat.js';
export { createSwat } from './ui-gameplay/swat.js';

// Physical tuning in metres and seconds.
export const SWAT = Object.freeze({
  ...timing,
  width: 0.45, depth: 0.35, height: 0.45, forwardOffset: 0.4, centerHeight: 0.25,
  // Fixed paw impulse (N·s): heavier objects resist the same strike.
  forwardImpulse: 0.525, upwardImpulse: 0.06,
  leftContactOffset: 0.06,
});

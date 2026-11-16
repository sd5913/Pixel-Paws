import { SWAT as timing } from './ui-gameplay/swat.js';
export { createSwat } from './ui-gameplay/swat.js';

// Physical tuning in metres and seconds.
export const SWAT = Object.freeze({
  ...timing,
  width: 0.45, depth: 0.35, height: 0.45, forwardOffset: 0.4, centerHeight: 0.25,
  forwardSpeed: 2.1, upwardSpeed: 0.35,
  leftContactOffset: 0.06,
});

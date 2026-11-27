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

// Test the visible-sized physical carrier, rather than requiring its centre
// to fit inside the paw area (which excludes cushions and other large props).
export function swatIntersectsBody(physics, body, position, yaw) {
  const { rapier: R } = physics;
  const center = { x: position.x + Math.sin(yaw) * SWAT.forwardOffset,
    y: position.y + SWAT.centerHeight, z: position.z + Math.cos(yaw) * SWAT.forwardOffset };
  const rotation = { x:0, y:Math.sin(yaw/2), z:0, w:Math.cos(yaw/2) };
  const shape = new R.Cuboid(SWAT.width/2, SWAT.height/2, SWAT.depth/2);
  for (let i=0;i<body.numColliders();i++) {
    if (body.collider(i).intersectsShape(shape, center, rotation)) return true;
  }
  return false;
}

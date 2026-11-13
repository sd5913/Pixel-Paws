// A normalized planar movement input; the character controller owns movement.
export function joystickVector(dx, dy, radius) {
  const length = Math.hypot(dx, dy);
  const scale = Math.max(radius, length);
  return length < radius * 0.12 ? { x: 0, z: 0 } : { x: dx / scale, z: dy / scale };
}

export const JOYSTICK_SPEED = Object.freeze({ walk: 0.8, dash: 2.8 });
export function joystickInput(dx, dy, baseRadius, knobRadius) {
  return { ...joystickVector(dx, dy, baseRadius - knobRadius),
    dash: Math.hypot(dx, dy) > baseRadius };
}

export function createJoystick(element) {
  const knob = element.querySelector('.joystick-knob');
  let pointerId = null;
  let value = { x: 0, z: 0, dash: false };
  function reset() {
    const captured = pointerId;
    pointerId = null;
    value = { x: 0, z: 0, dash: false };
    element.classList.remove('is-dashing');
    knob.style.transform = 'translate(0px, 0px)';
    if (captured !== null && element.hasPointerCapture(captured)) element.releasePointerCapture(captured);
  }
  function update(event) {
    const box = element.getBoundingClientRect();
    const dx = event.clientX - box.left - box.width / 2;
    const dy = event.clientY - box.top - box.height / 2;
    value = joystickInput(dx, dy, box.width / 2, knob.offsetWidth / 2);
    element.classList.toggle('is-dashing', value.dash);
    const length = Math.hypot(dx, dy);
    const travel = Math.min(length, box.width * 0.8 - knob.offsetWidth / 2);
    knob.style.transform = length ? `translate(${dx / length * travel}px, ${dy / length * travel}px)` : 'translate(0px, 0px)';
  }
  element.addEventListener('pointerdown', (event) => {
    if (pointerId !== null || event.button !== 0) return;
    event.preventDefault();
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    update(event);
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) update(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(type, (event) => { if (event.pointerId === pointerId) reset(); });
  }
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  return { read: () => ({ ...value }), reset };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector, joystickInput, createJoystick } from '../src/ui-gameplay/joystick.js';

test('joystick center dead zone stops drift', () => {
  assert.deepEqual(joystickVector(3, 2, 36), { x: 0, z: 0 });
});

test('original pad walks, outer region dashes, returning inside immediately walks', () => {
  assert.equal(joystickInput(70, 0, 70, 28).dash, false);
  assert.equal(joystickInput(71, 0, 70, 28).dash, true);
  assert.equal(joystickInput(69, 0, 70, 28).dash, false);
  assert.equal(joystickInput(0, 0, 70, 28).dash, false);
  const far = joystickInput(500, -500, 70, 28);
  assert.ok(Math.abs(Math.hypot(far.x, far.z) - 1) < 1e-9);
});

test('outer drag retains capture and cancellation/focus loss clears dash feedback', () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const listeners = {};
  const windowEvents = {};
  const classes = new Set();
  let capture = null;
  const knob = { offsetWidth: 56, style: {} };
  const element = {
    querySelector: () => knob,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 140, height: 140 }),
    classList: { remove: key => classes.delete(key), toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    setPointerCapture: id => { capture = id; },
    hasPointerCapture: id => capture === id,
    releasePointerCapture: () => { capture = null; },
  };
  globalThis.window = { addEventListener: (name, fn) => { windowEvents[name] = fn; } };
  globalThis.document = { addEventListener() {} };
  try {
    const input = createJoystick(element);
    listeners.pointerdown({ button: 0, pointerId: 1, clientX: 90, clientY: 70, preventDefault() {} });
    listeners.pointermove({ pointerId: 1, clientX: 200, clientY: 70 });
    assert.equal(input.read().dash, true);
    assert.equal(classes.has('is-dashing'), true);
    listeners.pointermove({ pointerId: 2, clientX: 70, clientY: 70 });
    assert.equal(input.read().dash, true);
    listeners.pointercancel({ pointerId: 1 });
    assert.deepEqual(input.read(), { x: 0, z: 0, dash: false });
    assert.equal(classes.has('is-dashing'), false);
    listeners.pointerdown({ button: 0, pointerId: 3, clientX: 139, clientY: 70, preventDefault() {} });
    listeners.pointermove({ pointerId: 3, clientX: 200, clientY: 70 });
    windowEvents.blur();
    assert.equal(input.read().dash, false);
    assert.equal(capture, null);
  } finally {
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});
test('joystick preserves analog speed and forward direction', () => {
  assert.deepEqual(joystickVector(18, 0, 36), { x: 0.5, z: 0 });
  assert.deepEqual(joystickVector(0, -36, 36), { x: 0, z: -1 });
});
test('dragging beyond the pad clamps diagonal speed', () => {
  const value = joystickVector(300, 400, 36);
  assert.equal(value.x, 0.6);
  assert.equal(value.z, 0.8);
  assert.equal(Math.hypot(value.x, value.z), 1);
});

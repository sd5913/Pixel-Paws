import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEventBus } from './events.js';
import { createImpactFilter } from './impact-filter.js';

test('bus delivers immutable subscription snapshots and unsubscribes', () => {
  const bus = createEventBus();
  const seen = [];
  const off = bus.on('physics:impact', event => seen.push(event.objectId));
  bus.emit('physics:impact', { objectId: 'mug' });
  off();
  bus.emit('physics:impact', { objectId: 'other' });
  assert.deepEqual(seen, ['mug']);
});

test('filter suppresses support impulses, vibration and cooldown but permits renewed impacts', () => {
  const filter = createImpactFilter();
  const sample = strength => ({ pairId: 'desk:mug', impactStrength: strength });
  assert.equal(filter.update([sample(0.001)], 0)[0], undefined);
  assert.equal(filter.update([sample(0.2)], 0.02).length, 1);
  assert.equal(filter.update([sample(0.2)], 0.2).length, 0);
  assert.equal(filter.update([sample(0.21)], 0.3).length, 0);
  assert.equal(filter.update([sample(0.6)], 0.31).length, 1);
  filter.update([], 0.32);
  assert.equal(filter.update([sample(1)], 0.35).length, 0);
  filter.update([], 0.4);
  assert.equal(filter.update([sample(0.4)], 0.5).length, 1);
  filter.reset();
  assert.equal(filter.update([sample(0.2)], 0).length, 1);
});

test('pair cooldowns are independent and nonfinite strengths are ignored', () => {
  const filter = createImpactFilter();
  const sample = (pairId, impactStrength) => ({ pairId, impactStrength });
  assert.equal(filter.update([sample('a', .2), sample('b', .2)], 0).length, 2);
  assert.equal(filter.update([sample('a', .8), sample('c', .2), sample('bad', NaN)], .01).length, 1);
});

test('repeated unsubscribe never removes a newer subscription', () => {
  const bus = createEventBus();
  const off = bus.on('physics:impact', () => {});
  off();
  let count = 0;
  bus.on('physics:impact', () => count++);
  off();
  bus.emit('physics:impact', { objectId: 'mug' });
  assert.equal(count, 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSwat, SWAT } from '../src/swat.js';

test('swat shares one delayed hit, rejects spam and resets pending hits', () => {
  let playing = false, starts = 0, hits = 0;
  const swat = createSwat({ canStart: () => playing, onStart: () => starts++, onHit: () => hits++ });
  assert.equal(swat.request(), false);
  playing = true;
  assert.equal(swat.request(), true);
  assert.equal(swat.request(), false);
  swat.update(SWAT.impactTime - .01);
  assert.equal(hits, 0);
  swat.update(.02);
  assert.equal(hits, 1);
  swat.update(SWAT.duration);
  assert.equal(hits, 1);
  assert.equal(swat.active, false);
  swat.request();
  swat.reset();
  swat.update(1);
  assert.equal(hits, 1);
  assert.equal(swat.active, false);
  playing = false;
  assert.equal(swat.request(), false);
  assert.equal(starts, 2);
});

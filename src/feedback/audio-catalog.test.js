import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAudioPath, impactLevel, impactVolume } from './audio-catalog.js';

test('catalog groups material pairs and UI variants and rejects malformed paths', () => {
  assert.deepEqual(parseAudioPath('impacts/ceramic/wood/heavy/hit-01.mp3'),
    { key: 'ceramic/wood/heavy', kind: 'impact' });
  assert.deepEqual(parseAudioPath('ui/start/click-01.ogg'), { key: 'start', kind: 'ui' });
  for (const path of ['../ui/start.mp3', 'impacts/nope/wood/light/a.mp3', 'impacts/paper/wood/light/README.md']) {
    assert.equal(parseAudioPath(path), null);
  }
  assert.equal(impactLevel(.02), 'light');
  assert.equal(impactLevel(.2), 'medium');
  assert.equal(impactLevel(1), 'heavy');
  assert.ok(impactVolume(1000) <= .85);
  assert.ok(impactVolume(-1) >= 0);
});

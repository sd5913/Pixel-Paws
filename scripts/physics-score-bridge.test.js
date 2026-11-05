import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectPhysicsScoring } from '../src/physics-score-bridge.js';
import { createScoring } from '../src/scoring.js';

test('bridge filters shared events, ignores unknown IDs and disconnects', () => {
  const listeners = new Map();
  const events = { on(type, callback) {
    listeners.set(type, callback);
    return () => listeners.delete(type);
  } };
  const emit = (type, objectId) => listeners.get(type)?.({ type, objectId, otherObjectId: null });
  const scoring = createScoring();
  const disconnect = connectPhysicsScoring(events, scoring);
  emit('fallen', 'mug');
  assert.equal(scoring.snapshot().total, 0);
  scoring.startRound([{ id: 'mug' }, { id: 'book' }, { id: 'box' }]);
  for (const type of ['collision-start', 'collision-end', 'settled']) emit(type, 'mug');
  emit('fallen', 'unknown');
  assert.equal(scoring.snapshot().total, 0);
  for (const id of ['mug', 'book', 'box']) {
    emit('tipped-over', id);
    emit('tipped-over', id);
    emit('fallen', id);
    emit('fallen', id);
  }
  assert.equal(scoring.snapshot().total, 60);
  assert.equal(scoring.snapshot().state, 'ended');
  disconnect();
  assert.equal(listeners.size, 0);
  scoring.startRound([{ id: 'mug' }]);
  emit('fallen', 'mug');
  assert.equal(scoring.snapshot().total, 0);
});

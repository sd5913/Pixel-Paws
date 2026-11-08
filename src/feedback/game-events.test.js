import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPhysicsEventManager } from '../physics/physics-events.js';
import { connectPhysicsScoring } from '../physics-score-bridge.js';
import { createScoring } from '../scoring.js';

test('impacts never score and obstacle impacts produce independent feedback', () => {
  const events = createPhysicsEventManager();
  const scoring = createScoring();
  scoring.startRound([{ id: 'mug' }]);
  const off = connectPhysicsScoring(events, scoring);
  const hits = [];
  events.bus.on('game:obstacle-hit', event => hits.push(event));
  events.bus.emit('physics:impact', { objectId: 'mug', isObstacle: true, obstacleId: 'wall' });
  assert.equal(scoring.snapshot().total, 0);
  assert.equal(hits.length, 1);
  events.bus.emit('game:object-cleared', { objectId: 'mug' });
  assert.equal(scoring.snapshot().total, 20);
  off();
  events.bus.emit('physics:impact', { isObstacle: true });
  assert.equal(hits.length, 1);
});

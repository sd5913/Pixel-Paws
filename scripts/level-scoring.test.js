import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoring, roundRating } from '../src/level-scoring.js';

test('weighted carriers score once, including topple then clear and odd point values', () => {
  const score = createScoring();
  score.startRound([{ id: 'scale', points: 30 }, { id: 'bag', points: 11 }]);
  score.notifyToppled('scale');
  assert.equal(score.snapshot().total, 15);
  score.notifyToppled('scale');
  score.notifyFallen('scale', 0);
  score.notifyFallen('scale', 1);
  assert.equal(score.snapshot().total, 30);
  score.notifyFallen('bag', 2500);
  assert.equal(score.snapshot().total, 41);
  assert.equal(score.snapshot().reason, 'cleared');
  assert.equal(roundRating(score.snapshot()).stars, 2);
});

test('stars use the room base score and three stars require combo points', () => {
  const score = createScoring();
  score.startRound([{ id: 'a', points: 30 }, { id: 'b', points: 20 }, { id: 'c', points: 10 }]);
  assert.equal(roundRating({ targetCount: 3, baseMax: 60, total: 60 }).stars, 2);
  for (const [i, id] of ['a', 'b', 'c'].entries()) score.notifyFallen(id, i * 600);
  assert.equal(score.snapshot().total, 75);
  assert.equal(roundRating(score.snapshot()).stars, 3);
  score.startRound([{ id: 'a', points: 30 }]);
  assert.equal(score.snapshot().total, 0);
  assert.equal(score.snapshot().comboBonus, 0);
});

test('empty scenery cannot grant stars or a clear', () => {
  const score = createScoring();
  score.startRound([]);
  score.notifyFallen('fireplace', 1);
  assert.equal(score.snapshot().total, 0);
  assert.equal(score.snapshot().state, 'playing');
  assert.equal(roundRating(score.snapshot()).stars, 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScoring } from '../src/ui-gameplay/scoring.js';

for (const kind of ['Mug', 'Book', 'Box']) test(kind + ' awards 10 for toppling and completes 20 on falling', () => {
  const game = createScoring();
  game.startRound([{ id: kind }, { id: 'other' }]);
  game.notifyToppled(kind);
  game.notifyToppled(kind);
  assert.equal(game.snapshot().total, 10);
  game.notifyFallen(kind);
  game.notifyFallen(kind);
  assert.equal(game.snapshot().total, 20);
  assert.equal(game.snapshot().state, 'playing');
  game.notifyFallen('other');
  assert.equal(game.snapshot().total, 40);
  assert.equal(game.snapshot().state, 'ended');
});

test('direct fall completes 20 without inventing a topple; late events cannot score', () => {
  const game = createScoring();
  game.startRound([{ id: 'a' }, { id: 'b' }]);
  game.notifyFallen('a');
  assert.equal(game.snapshot().total, 20);
  assert.equal(game.snapshot().targets[0].toppled, false);
  assert.equal(game.notifyToppled('a'), false);
  assert.equal(game.notifyFallen('a'), false);
  assert.equal(game.snapshot().state, 'playing');
  assert.equal(game.snapshot().total, 20);
});

test('a final direct fall settles with 20 and restarting restores direct-fall credit', () => {
  const endings = [];
  const game = createScoring({ onEnd: result => endings.push(result) });
  for (let round = 0; round < 2; round++) {
    game.startRound([{ id: 'cup' }]);
    assert.equal(game.snapshot().total, 0);
    game.notifyFallen('cup');
    assert.equal(endings[round].total, 20);
    assert.equal(endings[round].fallenCount, 1);
    assert.equal(game.notifyToppled('cup'), false);
    assert.equal(game.notifyFallen('cup'), false);
  }
  assert.equal(endings.length, 2);
});

test('lifecycle, unique registration, final award before single settlement and restart', () => {
  const endings = [];
  const game = createScoring({ onEnd: result => endings.push(result) });
  assert.equal(game.notifyFallen('a'), false);
  game.startRound([{ id: 'a' }, { id: 'a' }, { id: 'b' }]);
  assert.equal(game.snapshot().targetCount, 2);
  assert.equal(game.notifyFallen('unknown'), false);
  game.notifyToppled('a');
  game.notifyFallen('a');
  assert.equal(endings.length, 0);
  game.notifyFallen('b');
  assert.equal(endings.length, 1);
  assert.equal(endings[0].total, 40);
  assert.equal(endings[0].reason, 'cleared');
  assert.equal(game.notifyToppled('b'), false);
  assert.equal(game.endRound('timeout'), false);
  game.startRound([{ id: 'a' }]);
  assert.equal(game.snapshot().total, 0);
  assert.equal(game.snapshot().fallenCount, 0);
  game.notifyToppled('a');
  assert.equal(game.snapshot().total, 10);
  game.endRound('timeout');
  assert.equal(game.notifyFallen('a'), false);
  assert.equal(endings.length, 2);
});

test('empty roster stays active; validation is atomic; snapshots cannot mutate records', () => {
  const game = createScoring();
  game.startRound([]);
  assert.equal(game.snapshot().state, 'playing');
  assert.throws(() => game.startRound([{ id: '' }]), TypeError);
  assert.equal(game.snapshot().targetCount, 0);
  game.startRound([{ id: 'a' }]);
  game.snapshot().targets[0].fallen = true;
  game.notifyFallen('a');
  assert.equal(game.snapshot().total, 20);
});

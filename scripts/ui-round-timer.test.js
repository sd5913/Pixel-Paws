import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoundTimer, formatRoundTime } from '../src/ui-gameplay/round-timer.js';
import { createScoring } from '../src/ui-gameplay/scoring.js';

test('pause preserves fractional time and resume excludes time spent paused', () => {
  let expirations = 0;
  const timer = createRoundTimer({ onExpire: () => expirations++ });
  timer.start(0);
  timer.tick(12345);
  timer.stop();
  assert.equal(timer.tick(90000), 48);
  timer.resume(100000);
  assert.equal(timer.tick(147654), 1);
  assert.equal(timer.tick(147655), 0);
  assert.equal(expirations, 1);
  timer.resume(200000);
  timer.tick(300000);
  assert.equal(expirations, 1);
});

test('timer starts at 60 seconds and expires once at the exact deadline', () => {
  let expirations = 0;
  const timer = createRoundTimer({ onExpire: () => expirations++ });
  assert.equal(timer.tick(900000), 60);
  timer.start(1000);
  assert.equal(timer.tick(1000), 60);
  assert.equal(timer.tick(2000), 59);
  assert.equal(timer.tick(60999), 1);
  assert.equal(expirations, 0);
  assert.equal(timer.tick(61000), 0);
  timer.tick(100000);
  assert.equal(expirations, 1);
  assert.equal(formatRoundTime(60), '01:00');
  assert.equal(formatRoundTime(9), '00:09');
  assert.equal(formatRoundTime(0), '00:00');
});

test('slow frames consume real elapsed time; restart creates a new deadline', () => {
  let expirations = 0;
  const timer = createRoundTimer({ onExpire: () => expirations++ });
  timer.start(0);
  assert.equal(timer.tick(55000), 5);
  timer.stop();
  assert.equal(timer.tick(90000), 5);
  assert.equal(expirations, 0);
  timer.start(100000);
  assert.equal(timer.tick(100000), 60);
  assert.equal(timer.tick(161000), 0);
  assert.equal(expirations, 1);
});

test('timeout settles existing points once; clearing early stops the timer', () => {
  const endings = [];
  const timer = createRoundTimer({ onExpire: () => game.endRound('timeout') });
  const game = createScoring({ onEnd: result => { endings.push(result); timer.stop(); } });
  game.startRound([{ id: 'mug', size: 'small' }]);
  timer.start(0);
  game.notifyToppled('mug');
  timer.tick(60000);
  assert.equal(endings[0].reason, 'timeout');
  assert.equal(endings[0].total, 10);
  assert.equal(game.notifyFallen('mug'), false);
  timer.tick(90000);
  assert.equal(endings.length, 1);
  game.startRound([{ id: 'mug', size: 'small' }]);
  timer.start(100000);
  game.notifyFallen('mug');
  timer.tick(200000);
  assert.equal(endings.length, 2);
  assert.equal(endings[1].reason, 'cleared');
});

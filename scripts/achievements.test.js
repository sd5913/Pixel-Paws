import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAchievements } from '../src/achievements.js';
import { createGameLogic } from '../src/ui-gameplay/game-logic.js';

test('a three-star clear in exactly 25 active seconds grants the harder badges once', async () => {
  let raw = JSON.stringify({ version: 1, totalFalls: 69, unlocked: {} });
  const storage = () => ({
    getItem: () => raw,
    setItem: (_, value) => { raw = value; },
  });
  const achievements = createAchievements({ storage });
  const targets = ['one', 'two', 'three', 'four', 'five', 'six'].map(id => ({ id }));
  let now = 0;
  let result;
  const game = createGameLogic({ now: () => now, onEnd(snapshot, elapsedMs) {
    result = snapshot;
    assert.equal(elapsedMs, 25_000);
    assert.deepEqual(achievements.settle(snapshot, elapsedMs).map(({ id }) => id), [
      'first-fall', 'first-swat', 'double-swat', 'clear-desk', 'speed-clear', 'desk-dominoes', 'fall-25',
    ]);
  } });
  await game.start(targets);
  achievements.start(targets);
  achievements.recordSwat(['one', 'one', 'two', 'crate']);
  achievements.recordSwat(['three', 'four']);
  now = 10_000;
  assert.equal(game.pause(), true);
  now = 100_000;
  assert.equal(game.resume(), true);
  now = 115_000;
  for (const { id } of targets) game.notifyFallen(id);
  assert.deepEqual(achievements.settle(result, 25_000), []);
  const reloaded = createAchievements({ storage }).snapshot();
  assert.equal(reloaded.totalFalls, 75);
  assert.equal(Object.keys(reloaded.unlocked).length, 7);
});

test('abandoned rounds, duplicate hits, and a clear after the time threshold do not grant the respective badges', () => {
  const achievements = createAchievements({ storage: () => { throw new Error('Storage unavailable'); } });
  const targets = [{ id: 'one' }, { id: 'two' }];
  achievements.start(targets);
  achievements.recordSwat(['one', 'two']);
  assert.deepEqual(achievements.settle({ reason: 'restart', fallenCount: 1 }, 20_000), []);
  achievements.start(targets);
  achievements.recordSwat(['one', 'one']);
  achievements.recordSwat(['two']);
  achievements.recordSwat(['one', 'two']);
  assert.deepEqual(
    achievements.settle({ reason: 'cleared', fallenCount: 2, targetCount: 2, total: 40 }, 25_001).map(({ id }) => id),
    ['first-fall'],
  );
  assert.equal(achievements.snapshot().totalFalls, 2);
  assert.equal(achievements.snapshot().persistenceFailed, true);
});

test('a badge earned under the previous rules stays unlocked', () => {
  const earnedAt = '2026-01-01T00:00:00.000Z';
  const achievements = createAchievements({ storage: () => ({
    getItem: () => JSON.stringify({ version: 1, totalFalls: 25, unlocked: { 'fall-25': earnedAt } }),
  }) });
  assert.deepEqual(achievements.snapshot().unlocked, { 'fall-25': earnedAt });
  assert.equal(achievements.snapshot().totalFalls, 25);
});

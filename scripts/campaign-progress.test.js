import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCampaignProgress } from '../src/campaign-progress.js';
import { createAchievements } from '../src/achievements.js';
import { normalizeAudioPreferences, readAudioPreferences } from '../src/audio-preferences.js';

test('campaign saves independent bests, clear flags and stars without losing legacy scores', () => {
  const values = new Map([['pixel-paws.level-2.best-score', '400']]);
  const storage = () => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) });
  const campaign = createCampaignProgress(storage);
  campaign.record(2, { total: 370, reason: 'cleared' }, 2);
  campaign.record(2, { total: -50, reason: 'timeout' }, 0);
  campaign.record(3, { total: 1030, reason: 'cleared' }, 3);
  campaign.record(1, { total: 50, reason: 'restart' }, 3);
  assert.equal(campaign.complete(), false);
  campaign.record(1, { total: 200, reason: 'cleared' }, 2);
  const restored = createCampaignProgress(storage);
  assert.deepEqual(restored.snapshot()[2], { best: 400, stars: 2, cleared: true });
  assert.equal(restored.snapshot()[3].stars, 3);
  assert.equal(restored.complete(), true);
});

test('achievement clear badge uses each room rating and excludes protected hits', () => {
  const storage = () => ({ getItem: () => null, setItem() {} });
  const achievements = createAchievements({ storage });
  const targets = ['one', 'two', 'three', 'four'].map(id => ({ id }));
  achievements.start(targets);
  achievements.recordSwat(['one', 'two', 'three', 'protected']);
  const result = { reason: 'cleared', targetCount: 4, fallenCount: 4, total: 300, bestCombo: 4 };
  const badges = achievements.settle(result, 30_000, 2).map(item => item.id);
  assert.equal(badges.includes('clear-desk'), false);
  assert.equal(badges.includes('first-swat'), false);
  achievements.start(targets);
  const unlocked = achievements.settle(result, 30_000, 3).map(item => item.id);
  assert.equal(unlocked.includes('clear-desk'), true);
});

test('audio preferences survive reload and reject corrupt values', () => {
  const prefs = { musicEnabled: false, musicVolume: .35, effectsEnabled: true, effectsVolume: .6 };
  assert.deepEqual(readAudioPreferences({ getItem: () => JSON.stringify(prefs) }), prefs);
  assert.deepEqual(normalizeAudioPreferences({ musicVolume: -1, effectsVolume: 4, musicEnabled: 'false' }), {
    musicEnabled: true, musicVolume: 0, effectsEnabled: true, effectsVolume: 1,
  });
});

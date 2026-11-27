import test from 'node:test';
import assert from 'node:assert/strict';
import { resetSavedProgress } from '../src/reset-progress.js';
import { createCampaignProgress } from '../src/campaign-progress.js';

test('RESET clears every room score, stars, clear flags, badges and guide completion', () => {
  const values = new Map([
    ['pixel-paws.achievements', JSON.stringify({ version: 1, totalFalls: 75, unlocked: {} })],
    ['pixel-paws.controls-seen', '7'],
    ['pixel-paws.best-score', '635'],
    ['pixel-paws.level-2.best-score', '685'],
    ['pixel-paws.level-3.best-score', '1095'],
    ['pixel-paws.campaign', JSON.stringify({1:{best:635,stars:3,cleared:true},2:{best:685,stars:3,cleared:true},3:{best:1095,stars:3,cleared:true}})],
    ['pixel-paws.audio', 'saved audio settings'],
  ]);
  const storage = () => ({ getItem: key => values.get(key), removeItem: key => values.delete(key) });
  assert.equal(resetSavedProgress(storage), true);
  assert.deepEqual([...values], [['pixel-paws.audio', 'saved audio settings']]);
  const fresh = createCampaignProgress(storage);
  for (const progress of Object.values(fresh.snapshot())) assert.deepEqual(progress, {best:0,stars:0,cleared:false});
  assert.equal(fresh.complete(), false);
});

test('RESET reports unavailable storage instead of claiming success', () => {
  assert.equal(resetSavedProgress(() => { throw new Error('Blocked storage'); }), false);
});

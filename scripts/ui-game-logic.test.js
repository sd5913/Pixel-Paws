import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameLogic} from '../src/ui-gameplay/game-logic.js';
import {roundRating} from '../src/ui-gameplay/scoring.js';

test('fall combos use active time, ignore duplicates and reset when the window expires', async () => {
  let now = 0;
  const game = createGameLogic({ now: () => now });
  await game.start(['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id })));
  game.notifyFallen('a');
  assert.equal(game.comboRemainingMs, 2000);
  now = 1500;
  game.pause();
  now = 10_000;
  assert.equal(game.comboRemainingMs, 500);
  game.resume();
  now = 10_500;
  game.notifyFallen('b');
  assert.equal(game.comboRemainingMs, 2000);
  assert.equal(game.snapshot().comboBonus, 5);
  assert.equal(game.notifyFallen('b'), false);
  game.notifyFallen('c');
  game.notifyFallen('d');
  game.notifyFallen('e');
  assert.equal(game.snapshot().comboBonus, 45);
  now = 12_501;
  game.tick(0);
  assert.equal(game.comboRemainingMs, 0);
  game.notifyFallen('f');
  const result = game.snapshot();
  assert.equal(result.total, 165);
  assert.equal(result.bestCombo, 5);
  assert.equal(result.comboCount, 1);
  assert.deepEqual(roundRating(result), { stars: 3, nextScore: null });
  assert.deepEqual(roundRating({ targetCount: 6, total: 45 }), { stars: 1, nextScore: 120 });
  assert.deepEqual(roundRating({ targetCount: 8, total: 160 }), { stars: 2, nextScore: 220 });
  assert.deepEqual(roundRating({ targetCount: 8, total: 219 }), { stars: 2, nextScore: 220 });
  assert.deepEqual(roundRating({ targetCount: 8, total: 220 }), { stars: 3, nextScore: null });
  assert.deepEqual(roundRating({ targetCount: 3, total: 75 }), { stars: 3, nextScore: null });
  await game.start([{ id: 'a' }]);
  assert.equal(game.snapshot().comboBonus, 0);
});

test('lifecycle connects reset, pause, deadline, swat and independent scoring guards', async()=>{
 let now=0,resets=0;const phases=[];
 const game=createGameLogic({now:()=>now,resetScene:async()=>resets++,onSwat:p=>phases.push(p)});
 assert.equal(game.requestSwat(),false);
 await game.start([{id:'a'},{id:'b'}]);
 assert.equal(resets,1);game.notifyToppled('a');
 now=10000;game.pause();now=90000;
 assert.equal(game.snapshot().seconds,35);
 assert.equal(game.notifyFallen('a'),false);assert.equal(game.requestSwat(),false);
 game.resume();game.requestSwat();game.tick(.25);
 assert.ok(phases.includes('impact'));
 game.notifyFallen('a');assert.equal(game.snapshot().total,20);
 now=140000;assert.equal(game.snapshot().state,'ended');
 assert.equal(game.notifyFallen('b'),false);
 game.home();assert.equal(game.snapshot().state,'ready');assert.equal(game.snapshot().total,0);
});

test('Home invalidates an asynchronous reset and reset failure never starts a round', async()=>{
 let resolve;const game=createGameLogic({resetScene:()=>new Promise(done=>resolve=done)});
 const start=game.start([{id:'a'}]);game.home();resolve();assert.equal(await start,false);
 assert.equal(game.snapshot().state,'ready');
 const failed=createGameLogic({resetScene:async()=>{throw Error('reset failed');}});
 await assert.rejects(failed.start([]),/reset failed/);
 assert.equal(failed.snapshot().resetting,false);assert.equal(failed.requestSwat(),false);
});

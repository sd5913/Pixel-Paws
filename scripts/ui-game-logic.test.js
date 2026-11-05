import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameLogic} from '../src/ui-gameplay/game-logic.js';

test('lifecycle connects reset, pause, deadline, swat and independent scoring guards', async()=>{
 let now=0,resets=0;const phases=[];
 const game=createGameLogic({now:()=>now,resetScene:async()=>resets++,onSwat:p=>phases.push(p)});
 assert.equal(game.requestSwat(),false);
 await game.start([{id:'a'},{id:'b'}]);
 assert.equal(resets,1);game.notifyToppled('a');
 now=10000;game.pause();now=90000;
 assert.equal(game.snapshot().seconds,50);
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

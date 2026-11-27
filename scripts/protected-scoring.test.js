import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoring,roundRating} from '../src/level-scoring.js';

test('protected objects deduct once, reset combo and do not block a clear',()=>{
  const score=createScoring();
  const targets=[{id:'cookie',points:10},{id:'book',points:20}];
  const protectedItems=[{id:'jug',penalty:50}];
  score.startRound(targets,protectedItems);
  score.notifyFallen('cookie',0);
  score.notifyProtectedFall('jug');score.notifyProtectedFall('jug');
  assert.equal(score.snapshot().total,-40);
  assert.equal(score.snapshot().comboCount,0);
  assert.equal(score.snapshot().targetCount,2);
  assert.equal(score.snapshot().baseMax,30);
  score.notifyFallen('book',100);
  assert.equal(score.snapshot().reason,'cleared');
  assert.equal(score.snapshot().total,-20);
  assert.equal(roundRating(score.snapshot()).stars,0);
  assert.equal(score.notifyProtectedFall('jug'),false);
  score.startRound(targets,protectedItems);
  assert.equal(score.snapshot().total,0);
  assert.equal(score.notifyProtectedFall('jug'),true);
  assert.equal(score.snapshot().total,-50);
});

test('keeping the protected globe does not require knocking it off to win',()=>{
  const score=createScoring();
  score.startRound([{id:'gift',points:30}],[{id:'globe',penalty:80}]);
  score.notifyToppled('globe');score.notifyFallen('globe',0);
  assert.equal(score.snapshot().total,0);
  score.notifyFallen('gift',500);
  assert.equal(score.snapshot().reason,'cleared');
  assert.equal(score.snapshot().total,30);
});

test('protected items are excluded even if a room submits its full roster',()=>{
  for(const protectedItems of [
    [{id:'15-glass-measuring-jug',penalty:50},{id:'05-mixing-bowl-and-whisk',penalty:50}],
    [{id:'christmas-11',penalty:80},{id:'christmas-17',penalty:80}],
  ]){
    const score=createScoring();
    score.startRound([{id:'ordinary',points:20},...protectedItems.map(p=>({id:p.id,points:30}))],protectedItems);
    assert.equal(score.snapshot().targetCount,1);
    assert.equal(score.snapshot().baseMax,20);
    score.notifyFallen('ordinary',0);
    assert.equal(score.snapshot().reason,'cleared');
    assert.equal(score.snapshot().total,20);
    assert.equal(score.snapshot().fallenCount,1);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { hasLeftRoundTable, loosePartHasLeftTable, hasLeftRectangularTable } from '../src/table-clearance.js';
import { createScoring } from '../src/level-scoring.js';

const bounds = (x, y, z, r = .1) => ({
  min: { x:x-r, y:y-r, z:z-r }, max: { x:x+r, y:y+r, z:z+r },
});

test('Christmas room uses its longer rectangular tabletop, not the kitchen radius', () => {
  const shape={halfWidth:1.95,halfDepth:2.65};
  assert.equal(hasLeftRectangularTable(bounds(1.6,.95,2.3),.807,shape),false);
  assert.equal(hasLeftRectangularTable(bounds(0,.95,2.7),.807,shape),false);
  assert.equal(hasLeftRectangularTable(bounds(0,.95,2.9),.807,shape),true);
  assert.equal(hasLeftRectangularTable(bounds(-2.2,.95,0),.807,shape),true);
  assert.equal(hasLeftRectangularTable(bounds(0,.2,0),.807,shape),true);
});

test('props caught outside the tabletop clear without a half-metre drop', () => {
  assert.equal(hasLeftRoundTable(bounds(2.3,.7,0), .78, 1.95), true);
  assert.equal(hasLeftRoundTable(bounds(0,.9,0), .78, 1.95), false);
  assert.equal(hasLeftRoundTable(bounds(1.96,.9,0), .78, 1.95), false);
  assert.equal(hasLeftRoundTable(bounds(0,.2,0), .78, 1.95), true);
  assert.equal(hasLeftRoundTable({min:{x:Infinity},max:{x:-Infinity}},.78,1.95),false);
});

test('all members must leave before a loose cutter group is cleared', () => {
  const outside = {x:2.2,y:.75,z:0};
  const inside = {x:0,y:.85,z:0};
  assert.equal([outside,inside].every(p=>loosePartHasLeftTable(p,.78,1.95)),false);
  assert.equal([outside,{x:0,y:.1,z:0}].every(p=>loosePartHasLeftTable(p,.78,1.95)),true);
});

test('the final carrier caught on a chair completes the round once; spills are not targets', () => {
  let endings=0;
  const score=createScoring({onEnd:()=>endings++});
  score.startRound([{id:'bowl',points:30},{id:'jar',points:20}]);
  score.notifyFallen('jar',0);
  if(hasLeftRoundTable(bounds(2.3,.7,0),.78,1.95))score.notifyFallen('bowl',3000);
  score.notifyFallen('bowl',3100);
  score.notifyFallen('milk-puddle',3200);
  assert.equal(score.snapshot().reason,'cleared');
  assert.equal(score.snapshot().total,50);
  assert.equal(endings,1);
});

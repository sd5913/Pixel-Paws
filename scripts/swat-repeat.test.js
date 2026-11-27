import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwat} from '../src/ui-gameplay/swat.js';

test('gameplay requests can strike repeatedly without waiting for animation recovery',()=>{
  let playing=true,presses=0;
  const action=createSwat({canStart:()=>playing,onStart:()=>presses++,onHit:()=>{}});
  for(let i=0;i<10;i++) {
    assert.equal(action.request({retrigger:true}),true);
    action.update(.01);
  }
  assert.equal(presses,10);
  playing=false;
  assert.equal(action.request({retrigger:true}),false);
  assert.equal(presses,10);
});

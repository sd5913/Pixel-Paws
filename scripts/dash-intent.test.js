import test from 'node:test';
import assert from 'node:assert/strict';
import {stableDash} from '../src/joystick.js';

test('small pointer fluctuations at the dash edge cannot toggle speed repeatedly',()=>{
  let dash=false;
  for(const distance of [70,73,69,75,71]) {
    dash=stableDash(distance,72,dash);assert.equal(dash,false);
  }
  dash=stableDash(90,72,dash);assert.equal(dash,true);
  for(const distance of [73,71,75,69,72]) {
    dash=stableDash(distance,72,dash);assert.equal(dash,true);
  }
  assert.equal(stableDash(60,72,dash),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSwatButton } from '../src/swat-button.js';

test('a non-primary touch swats immediately without waiting for the movement finger', () => {
  const listeners = {};
  const button = { disabled:false, addEventListener:(name,handler)=>{listeners[name]=handler;} };
  let hits=0, prevented=0, stopped=0;
  bindSwatButton(button,()=>hits++);
  listeners.pointerdown({button:0,pointerId:2,pointerType:'touch',isPrimary:false,
    preventDefault:()=>prevented++,stopPropagation:()=>stopped++});
  assert.equal(hits,1);
  assert.equal(prevented,1);
  assert.equal(stopped,1);
  listeners.click({detail:1});
  assert.equal(hits,1,'the following pointer click must not double-hit');
  listeners.click({detail:0});
  assert.equal(hits,2,'keyboard activation remains available');
  button.disabled=true;
  listeners.pointerdown({button:0});
  listeners.click({detail:0});
  assert.equal(hits,2,'disabled controls never trigger a hit');
});

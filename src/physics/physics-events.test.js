
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPhysicsEventManager } from './physics-events.js';

test('dispatches collision events using registered object IDs', () => {
  const manager = createPhysicsEventManager();

  const mug = {
    id: 'mug',
    events: { collision: true },
    colliders: [{ handle: 1 }],
  };

  const desk = {
    id: 'desk',
    events: { collision: true },
    colliders: [{ handle: 2 }],
  };

  manager.registerBody(mug);
  manager.registerBody(desk);

  const mugEvents = [];
  const deskEvents = [];

  manager.on('collision-start', (event) => {
    if (event.objectId === 'mug') mugEvents.push(event);
    if (event.objectId === 'desk') deskEvents.push(event);
  });

  manager.processCollisionEvents([
    {
      collider1: 1,
      collider2: 2,
      started: true,
    },
  ]);

  assert.equal(mugEvents.length, 1);
  assert.equal(deskEvents.length, 1);

  assert.deepEqual(mugEvents[0], {
    type: 'collision-start',
    objectId: 'mug',
    otherObjectId: 'desk',
  });

  assert.deepEqual(deskEvents[0], {
    type: 'collision-start',
    objectId: 'desk',
    otherObjectId: 'mug',
  });
});

test('does not dispatch collision events for disabled objects', () => {
  const manager = createPhysicsEventManager();

  manager.registerBody({
    id: 'mug',
    events: { collision: false },
    colliders: [{ handle: 1 }],
  });

  let eventCount = 0;

  manager.on('collision-start', () => {
    eventCount += 1;
  });

  manager.processCollisionEvents([
    {
      collider1: 1,
      collider2: 2,
      started: true,
    },
  ]);

  assert.equal(eventCount, 0);
});

test('unregisters removed physics bodies', () => {
  const manager = createPhysicsEventManager();

  const mug = {
    id: 'mug',
    events: { collision: true },
    colliders: [{ handle: 1 }],
  };

  manager.registerBody(mug);
  manager.unregisterBody(mug);

  let eventCount = 0;

  manager.on('collision-start', () => {
    eventCount += 1;
  });

  manager.processCollisionEvents([
    {
      collider1: 1,
      collider2: 2,
      started: true,
    },
  ]);

  assert.equal(eventCount, 0);
});
// 创建用于测试的模拟物理物体
function createTrackedBody(events = {}) {
  const state = {
    position: { x: 0, y: 10, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  };

  return {
    id: 'test-mug',
    events,
    colliders: [{ handle: 10 }],
    rigidBody: {
      translation: () => state.position,
      rotation: () => state.rotation,
      linvel: () => state.velocity,
      angvel: () => state.angularVelocity,
    },
    testState: state,
  };
}

// 测试倾倒事件
test('dispatches tipped-over event only once', () => {
  const manager = createPhysicsEventManager();
  const mug = createTrackedBody({ tippedOver: true });

  manager.registerBody(mug);

  const events = [];
  manager.on('tipped-over', (event) => events.push(event));

  // 将物体旋转 60 度
  mug.testState.rotation = {
    x: 0,
    y: 0,
    z: Math.sin(Math.PI / 6),
    w: Math.cos(Math.PI / 6),
  };

  manager.updateBodyStates(0.1);
  manager.updateBodyStates(0.1);

  assert.equal(events.length, 1);
  assert.equal(events[0].objectId, 'test-mug');
});

// 测试掉落事件
test('dispatches fallen event only once', () => {
  const manager = createPhysicsEventManager();
  const mug = createTrackedBody({ fallen: true });

  manager.registerBody(mug);

  const events = [];
  manager.on('fallen', (event) => events.push(event));

  // 下降超过 1.5 个单位
  mug.testState.position.y = 8;

  manager.updateBodyStates(0.1);
  manager.updateBodyStates(0.1);

  assert.equal(events.length, 1);
  assert.equal(events[0].objectId, 'test-mug');
});

// 测试静止事件
test('dispatches settled event after remaining still', () => {
  const manager = createPhysicsEventManager();
  const mug = createTrackedBody({ settled: true });

  manager.registerBody(mug);

  const events = [];
  manager.on('settled', (event) => events.push(event));

  // 连续低速运行超过 0.6 秒
  manager.updateBodyStates(0.2);
  manager.updateBodyStates(0.2);
  manager.updateBodyStates(0.2);
  manager.updateBodyStates(0.2);

  assert.equal(events.length, 1);
  assert.equal(events[0].objectId, 'test-mug');
});
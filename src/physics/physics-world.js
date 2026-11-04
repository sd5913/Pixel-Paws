
import * as RAPIER from '@dimforge/rapier3d-compat';

// 避免重复初始化 WASM
let initializationPromise = null;

async function initializeRapier() {
  if (!initializationPromise) {
    initializationPromise = RAPIER.init({});
  }

  await initializationPromise;
}

// 创建物理世界
export async function createPhysicsWorld({
  gravity = { x: 0, y: -9.81, z: 0 },
  timestep = 1 / 60,
  maxSubSteps = 5,
} = {}) {
  // 初始化 Rapier
  await initializeRapier();

  // 创建物理世界
  const world = new RAPIER.World(gravity);
  world.timestep = timestep;

  // 固定时间步长累积器
  let accumulator = 0;

  // 更新物理模拟
  function step(delta) {
    if (!Number.isFinite(delta) || delta <= 0) return;

    // 避免程序卡顿后积累过多时间
    accumulator += Math.min(delta, 0.1);

    let subSteps = 0;

    while (accumulator >= timestep && subSteps < maxSubSteps) {
      world.step();
      accumulator -= timestep;
      subSteps += 1;
    }

    // 超出最大模拟步数时，丢弃多余时间
    if (subSteps >= maxSubSteps) {
      accumulator = Math.min(accumulator, timestep);
    }

    return subSteps;
  }

  // 释放物理世界
  function dispose() {
    world.free();
    accumulator = 0;
  }

  return {
    rapier: RAPIER,
    world,
    step,
    dispose,
    timestep,
  };
}

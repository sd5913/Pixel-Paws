
import test from 'node:test';
import assert from 'node:assert/strict';

import { createPhysicsWorld } from './physics-world.js';
import {
  createPhysicsBody,
  syncPhysicsBody,
  removePhysicsBody,
} from './physics-body.js';

test('creates a Rapier rigid body and collider', async () => {
  const physicsWorld = await createPhysicsWorld();

  try {
    // 模拟一个 Three.js 模型对象
    const object3D = {
      position: {
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
      quaternion: {
        set(x, y, z, w) {
          this.x = x;
          this.y = y;
          this.z = z;
          this.w = w;
        },
      },
    };

    // 模拟 asset-manifest 和 scene layout 提供的数据
    const instance = {
      object3D,
      initialTransform: {
        position: [3.8, -0.7, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      physics: {
        bodyType: 'static',
        colliders: [
          {
            type: 'box',
            center: [0, 0.5, 0],
            halfExtents: [0.5, 0.5, 0.5],
          },
        ],
      },
    };

    const physicsBody = createPhysicsBody(
      physicsWorld,
      instance,
    );

    // 检查刚体是否创建成功
    assert.ok(physicsBody.rigidBody);

    // 检查碰撞体是否创建成功
    assert.equal(physicsBody.colliders.length, 1);

    // 检查刚体初始位置
    const position = physicsBody.rigidBody.translation();

    assert.ok(Math.abs(position.x - 3.8) < 0.00001);
    assert.ok(Math.abs(position.y - (-0.7)) < 0.00001);
    assert.ok(Math.abs(position.z - 0) < 0.00001);

    // 检查模型同步功能
    syncPhysicsBody(physicsBody);

    assert.ok(Math.abs(object3D.position.x - 3.8) < 0.00001);
    assert.ok(Math.abs(object3D.position.y - (-0.7)) < 0.00001);
    assert.ok(Math.abs(object3D.position.z - 0) < 0.00001);

    console.log('Physics body test passed');
  } finally {
    physicsWorld.dispose();
  }
});


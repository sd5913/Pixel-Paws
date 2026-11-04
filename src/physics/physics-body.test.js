
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

test('applies mass, friction and restitution to a dynamic body', async () => {
  const physicsWorld = await createPhysicsWorld();

  try {
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

    const instance = {
      object3D,
      initialTransform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      physics: {
        bodyType: 'dynamic',
        suggestedMass: 0.25,
        friction: 0.65,
        restitution: 0.1,
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

    const { rigidBody, colliders } = physicsBody;

    // 验证实际质量
    assert.ok(
      Math.abs(rigidBody.mass() - 0.25) < 0.00001,
      `Expected mass 0.25, got ${rigidBody.mass()}`,
    );

    // 验证摩擦力
    assert.ok(
      Math.abs(colliders[0].friction() - 0.65) < 0.00001,
    );

    // 验证碰撞弹性
    assert.ok(
      Math.abs(colliders[0].restitution() - 0.1) < 0.00001,
    );

    console.log('Dynamic physics parameters test passed');
  } finally {
    physicsWorld.dispose();
  }
});
test('removes a physics body and disposes its Three.js resources', async () => {
  const physicsWorld = await createPhysicsWorld();

  try {
    let removedFromParent = false;
    let geometryDisposed = 0;
    let materialDisposed = 0;

    const mesh = {
      isMesh: true,
      geometry: {
        dispose() {
          geometryDisposed++;
        },
      },
      material: {
        dispose() {
          materialDisposed++;
        },
      },
    };

    const object3D = {
      position: {
        set() {},
      },
      quaternion: {
        set() {},
      },
      removeFromParent() {
        removedFromParent = true;
      },
      traverse(callback) {
        callback(mesh);
      },
    };

    const instance = {
      object3D,
      initialTransform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      physics: {
        bodyType: 'dynamic',
        colliders: [
          {
            type: 'box',
            center: [0, 0, 0],
            halfExtents: [0.5, 0.5, 0.5],
          },
        ],
      },
    };

    const physicsBody = createPhysicsBody(
      physicsWorld,
      instance,
    );

    const handle = physicsBody.rigidBody.handle;

    // 销毁物理对象
    removePhysicsBody(physicsWorld, physicsBody);

    // 验证 Rapier 刚体已经移除
    assert.ok(!physicsWorld.world.getRigidBody(handle));

    // 验证 Three.js 模型已经移除
    assert.equal(removedFromParent, true);

    // 验证几何体和材质已经释放
    assert.equal(geometryDisposed, 1);
    assert.equal(materialDisposed, 1);

    // 验证对象已经标记为销毁
    assert.equal(physicsBody.removed, true);

    // 再次销毁，确认不会重复释放资源
    removePhysicsBody(physicsWorld, physicsBody);

    assert.equal(geometryDisposed, 1);
    assert.equal(materialDisposed, 1);

    console.log('Physics body removal test passed');
  } finally {
    physicsWorld.dispose();
  }
});
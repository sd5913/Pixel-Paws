import { createEventBus } from '../feedback/events.js';
import { createRapierImpactReporter } from '../feedback/rapier-impacts.js';


/**
 * 通用物理事件管理器
 *
 * 负责：
 * 1. 将 Rapier Collider Handle 映射到物理对象 ID
 * 2. 接收物理碰撞事件
 * 3. 向游戏逻辑分发统一事件
 *
 * 不负责计算分数，也不负责 UI。
 */

export function createPhysicsEventManager({ bus = createEventBus() } = {}) {
  const impacts = createRapierImpactReporter(bus);
  const bodiesByColliderHandle = new Map();
  const listeners = new Map();
  const registeredBodies = new Set();
  const bodyStates = new Map();

  // 注册物理对象
  function registerBody(physicsBody) {
  if (!physicsBody || physicsBody.removed) return;

  for (const collider of physicsBody.colliders) {
    bodiesByColliderHandle.set(collider.handle, physicsBody);
  }

  registeredBodies.add(physicsBody);

  const position = physicsBody.rigidBody?.translation?.();

bodyStates.set(physicsBody, {
  initialY: position?.y ?? physicsBody.object3D?.position?.y ?? 0,
  tippedOver: false,
  fallen: false,
  settled: false,
  settledTime: 0,
});
}

  // 注销物理对象
  function unregisterBody(physicsBody) {
  if (!physicsBody) return;

  for (const collider of physicsBody.colliders) {
    bodiesByColliderHandle.delete(collider.handle);
  }

  registeredBodies.delete(physicsBody);
  bodyStates.delete(physicsBody);
}

  // 监听指定类型的事件
  function on(eventType, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Event callback must be a function.');
    }

    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }

    const callbacks = listeners.get(eventType);
    callbacks.add(callback);

    // 返回取消监听的方法
    return () => {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        listeners.delete(eventType);
      }
    };
  }

  // 分发事件
  function emit(event) {
    const callbacks = listeners.get(event.type);

    if (!callbacks) return;

    for (const callback of callbacks) {
      callback(event);
    }
  }

  // 处理 Rapier 产生的碰撞事件
  function processCollisionEvents(collisionEvents) {

    for (const collision of collisionEvents) {
      const body1 = bodiesByColliderHandle.get(collision.collider1);
      const body2 = bodiesByColliderHandle.get(collision.collider2);

      if (!body1 && !body2) continue;

      const eventType = collision.started
        ? 'collision-start'
        : 'collision-end';

      // 只向启用了碰撞事件的物体分发通知
      if (body1?.events?.collision === true) {
        emit({
          type: eventType,
          objectId: body1.id,
          otherObjectId: body2?.id ?? null,
        });
      }

      if (body2?.events?.collision === true) {
        emit({
          type: eventType,
          objectId: body2.id,
          otherObjectId: body1?.id ?? null,
        });
      }
    }
  }

  function updateBodyStates(delta) {
  for (const body of registeredBodies) {
    if (body.removed) continue;

    const state = bodyStates.get(body);
    const events = body.events ?? {};

    const position = body.rigidBody.translation();
    const rotation = body.rigidBody.rotation();
    const velocity = body.rigidBody.linvel();
    const angularVelocity = body.rigidBody.angvel();

    // 1. 检测倾倒：倾斜超过 45 度
    const upY = 1 - 2 * (
      rotation.x * rotation.x +
      rotation.z * rotation.z
    );

    const tiltAngle = Math.acos(
      Math.max(-1, Math.min(1, upY))
    );

    if (
      events.tippedOver === true &&
      !state.tippedOver &&
      tiltAngle > Math.PI / 4
    ) {
      state.tippedOver = true;

      emit({
        type: 'tipped-over',
        isObstacle: Boolean(body.isObstacle),
        objectId: body.id,
        otherObjectId: null,
      });
    }

    // 2. 检测掉落：比初始高度下降 0.5 个单位
if (
  events.fallen === true &&
  !state.fallen &&
  position.y < state.initialY - 0.5
) {
  state.fallen = true;

  emit({
    type: 'fallen',
    isObstacle: Boolean(body.isObstacle),
    objectId: body.id,
    otherObjectId: null,
  });
}

    // 3. 检测静止：低速持续 0.6 秒
    const speed = Math.hypot(
      velocity.x, velocity.y, velocity.z
    );

    const spin = Math.hypot(
      angularVelocity.x,
      angularVelocity.y,
      angularVelocity.z
    );

    if (events.settled === true && !state.settled) {
      if (speed < 0.08 && spin < 0.1) {
        state.settledTime += delta;
      } else {
        state.settledTime = 0;
      }

      if (state.settledTime >= 0.6) {
        state.settled = true;

        emit({
          type: 'settled',
          objectId: body.id,
          otherObjectId: null,
        });
      }
    }
  }
}

  return {
    bus,
    processImpacts: (world, delta) => impacts.step(world, bodiesByColliderHandle, delta),
    resetImpacts: () => impacts.reset(),
    registerBody,
    unregisterBody,
    on,
    processCollisionEvents,
    updateBodyStates,
  };
}
export const physicsEvents = createPhysicsEventManager();
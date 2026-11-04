
/**
 * 根据场景模型的物理配置创建 Rapier 刚体和碰撞体
 */

// 根据项目配置创建不同类型的刚体
function createRigidBodyDescriptor(RAPIER, bodyType) {
  switch (bodyType) {
    case 'static':
      return RAPIER.RigidBodyDesc.fixed();

    case 'dynamic':
      return RAPIER.RigidBodyDesc.dynamic();

    case 'kinematic':
      return RAPIER.RigidBodyDesc.kinematicPositionBased();

    default:
      throw new Error(`Unsupported body type: ${bodyType}`);
  }
}

// 根据碰撞体配置创建碰撞体描述
function createColliderDescriptor(RAPIER, collider, scale) {
  switch (collider.type) {
    case 'box': {
      const [hx, hy, hz] = collider.halfExtents;

      const descriptor = RAPIER.ColliderDesc.cuboid(
        hx * scale[0],
        hy * scale[1],
        hz * scale[2],
      );

      const center = collider.center ?? [0, 0, 0];

      descriptor.setTranslation(
        center[0] * scale[0],
        center[1] * scale[1],
        center[2] * scale[2],
      );

      return descriptor;
    }

    case 'none':
      return null;

    default:
      throw new Error(
        `Unsupported collider type: ${collider.type}`,
      );
  }
}

/**
 * 创建一个物理模型
 *
 * @param {Object} physicsWorld - createPhysicsWorld() 返回的结果
 * @param {Object} instance - loadSceneAssetInstances() 返回的模型实例
 */
export function createPhysicsBody(physicsWorld, instance) {
  const { rapier: RAPIER, world } = physicsWorld;

  const {
    id,
    assetId,
    object3D,
    initialTransform,
    physics,
    events = {},
  } = instance;

  // 获取模型的初始位置、旋转和缩放
  const position = initialTransform.position;
  const rotation = initialTransform.rotation;
  const scale = initialTransform.scale;

  // 创建刚体
  const rigidBodyDesc = createRigidBodyDescriptor(
    RAPIER,
    physics.bodyType,
  );

  rigidBodyDesc.setTranslation(
    position[0],
    position[1],
    position[2],
  );

  rigidBodyDesc.setRotation({
    x: rotation[0],
    y: rotation[1],
    z: rotation[2],
    w: rotation[3],
  });

  // 设置质量、重心和转动惯量
  if (
    physics.bodyType === 'dynamic' &&
    Number.isFinite(physics.suggestedMass) &&
    physics.suggestedMass > 0
  ) {
    const boxCollider = physics.colliders.find(
      (collider) => collider.type === 'box',
    );

    if (boxCollider) {
      const mass = physics.suggestedMass;

      const [hx, hy, hz] = boxCollider.halfExtents.map(
        (value, index) => value * scale[index],
      );

      const center = boxCollider.center ?? [0, 0, 0];

      const centerOfMass = {
        x: center[0] * scale[0],
        y: center[1] * scale[1],
        z: center[2] * scale[2],
      };

      const principalAngularInertia = {
        x: (mass / 3) * (hy ** 2 + hz ** 2),
        y: (mass / 3) * (hx ** 2 + hz ** 2),
        z: (mass / 3) * (hx ** 2 + hy ** 2),
      };

      rigidBodyDesc.setAdditionalMassProperties(
        mass,
        centerOfMass,
        principalAngularInertia,
        { x: 0, y: 0, z: 0, w: 1 },
      );
    }
  }

  const rigidBody = world.createRigidBody(rigidBodyDesc);

  // 创建碰撞体
  const colliders = [];

  for (const collider of physics.colliders) {
    const colliderDesc = createColliderDescriptor(
      RAPIER,
      collider,
      scale,
    );

    if (!colliderDesc) continue;

    // 保留显式设置的刚体质量
    if (
      physics.bodyType === 'dynamic' &&
      Number.isFinite(physics.suggestedMass) &&
      physics.suggestedMass > 0
    ) {
      colliderDesc.setDensity(0);
    }

    // 设置摩擦力
    if (Number.isFinite(physics.friction)) {
      colliderDesc.setFriction(physics.friction);
    }

    // 设置碰撞弹性
    if (Number.isFinite(physics.restitution)) {
      colliderDesc.setRestitution(physics.restitution);
    }

    // 根据场景配置启用碰撞事件
    if (events.collision === true) {
      colliderDesc.setActiveEvents(
        RAPIER.ActiveEvents.COLLISION_EVENTS,
      );
    }

    const rapierCollider = world.createCollider(
      colliderDesc,
      rigidBody,
    );

    colliders.push(rapierCollider);
  }

  // 重新计算刚体质量属性
  rigidBody.recomputeMassPropertiesFromColliders();

  return {
    id: id ?? assetId ?? object3D.name,
    assetId,
    rigidBody,
    colliders,
    object3D,
    events: { ...events },
    removed: false,
  };
}

/**
 * 将 Rapier 刚体的位置和旋转同步到 Three.js 模型
 */
export function syncPhysicsBody(physicsBody) {
  const { rigidBody, object3D } = physicsBody;

  const position = rigidBody.translation();
  const rotation = rigidBody.rotation();

  object3D.position.set(
    position.x,
    position.y,
    position.z,
  );

  object3D.quaternion.set(
    rotation.x,
    rotation.y,
    rotation.z,
    rotation.w,
  );
}

/**
 * 销毁物理对象，同时清理 Rapier 和 Three.js 资源
 *
 * @param {Object} physicsWorld - createPhysicsWorld() 返回的结果
 * @param {Object} physicsBody - createPhysicsBody() 返回的物理对象
 */
export function removePhysicsBody(physicsWorld, physicsBody) {
  if (!physicsWorld || !physicsBody || physicsBody.removed) {
    return;
  }

  const { world } = physicsWorld;
  const { rigidBody, object3D } = physicsBody;

  // 删除 Rapier 刚体及其附属碰撞体
  if (rigidBody && world.getRigidBody(rigidBody.handle)) {
    world.removeRigidBody(rigidBody);
  }

  // 删除 Three.js 模型
  if (object3D) {
    object3D.removeFromParent();

    object3D.traverse((child) => {
      if (!child.isMesh) return;

      child.geometry?.dispose();

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material?.dispose();
      }
    });
  }

  physicsBody.removed = true;
}

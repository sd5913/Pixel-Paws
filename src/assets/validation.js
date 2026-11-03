const COLLIDER_TYPES = new Set([
  'none',
  'box',
  'sphere',
  'capsule',
  'cylinder',
  'convex-hull',
  'trimesh',
]);
const BODY_TYPES = new Set(['static', 'dynamic', 'kinematic']);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isFiniteVector(value, length) {
  return Array.isArray(value)
    && value.length === length
    && value.every(Number.isFinite);
}

function isPositiveVector(value, length) {
  return isFiniteVector(value, length) && value.every((component) => component > 0);
}

export function validateAssetManifest(manifest) {
  invariant(manifest && typeof manifest === 'object', 'Asset manifest must be an object.');
  invariant(manifest.schemaVersion === 1, 'Asset manifest schemaVersion must be 1.');
  invariant(
    manifest.coordinateSystem?.units === 'meters'
      && manifest.coordinateSystem?.upAxis === 'Y'
      && manifest.coordinateSystem?.forwardAxis === '-Z'
      && manifest.coordinateSystem?.handedness === 'right',
    'Asset manifest must use meters, right-handed Y-up coordinates, and -Z forward.',
  );
  invariant(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'Asset manifest must contain assets.');

  const assetIds = new Set();
  for (const asset of manifest.assets) {
    invariant(typeof asset.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id), 'Asset id must be kebab-case.');
    invariant(!assetIds.has(asset.id), `Duplicate asset id: ${asset.id}`);
    assetIds.add(asset.id);

    invariant(typeof asset.path === 'string' && asset.path.endsWith('.glb'), `Asset ${asset.id} path must reference a .glb file.`);
    invariant(isPositiveVector(asset.visualScale, 3), `Asset ${asset.id} visualScale must contain three positive numbers.`);
    invariant(asset.pivot?.type === 'base-center' || asset.pivot?.type === 'center', `Asset ${asset.id} pivot type is invalid.`);
    invariant(isFiniteVector(asset.pivot?.offset, 3), `Asset ${asset.id} pivot offset must contain three finite numbers.`);
    invariant(isFiniteVector(asset.bounds?.center, 3), `Asset ${asset.id} bounds center must contain three finite numbers.`);
    invariant(isPositiveVector(asset.bounds?.halfExtents, 3), `Asset ${asset.id} bounds halfExtents must contain three positive numbers.`);
    invariant(Array.isArray(asset.colliders), `Asset ${asset.id} colliders must be an array.`);

    for (const collider of asset.colliders) {
      invariant(COLLIDER_TYPES.has(collider.type), `Asset ${asset.id} collider type ${collider.type} is invalid.`);
      if (collider.type === 'none') continue;
      invariant(isFiniteVector(collider.center, 3), `Asset ${asset.id} collider center must contain three finite numbers.`);
      if (collider.type === 'box') {
        invariant(isPositiveVector(collider.halfExtents, 3), `Asset ${asset.id} collider halfExtents must contain three positive numbers.`);
      }
      if (collider.type === 'sphere' || collider.type === 'capsule' || collider.type === 'cylinder') {
        invariant(Number.isFinite(collider.radius) && collider.radius > 0, `Asset ${asset.id} collider radius must be positive.`);
      }
      if (collider.type === 'capsule' || collider.type === 'cylinder') {
        invariant(Number.isFinite(collider.halfHeight) && collider.halfHeight > 0, `Asset ${asset.id} collider halfHeight must be positive.`);
      }
      if (collider.type === 'convex-hull' || collider.type === 'trimesh') {
        invariant(
          Array.isArray(collider.includeNodes)
            && collider.includeNodes.length > 0
            && collider.includeNodes.every((node) => typeof node === 'string' && node.length > 0),
          `Asset ${asset.id} collider includeNodes must contain at least one node name.`,
        );
      }
    }

    invariant(typeof asset.render?.castShadow === 'boolean', `Asset ${asset.id} render.castShadow must be boolean.`);
    invariant(typeof asset.render?.receiveShadow === 'boolean', `Asset ${asset.id} render.receiveShadow must be boolean.`);
  }

  return manifest;
}

export function validateSceneLayout(layout, manifest) {
  validateAssetManifest(manifest);
  invariant(layout && typeof layout === 'object', 'Scene layout must be an object.');
  invariant(layout.schemaVersion === 1, 'Scene layout schemaVersion must be 1.');
  invariant(typeof layout.id === 'string' && layout.id.length > 0, 'Scene layout id is required.');
  invariant(Array.isArray(layout.instances), 'Scene layout instances must be an array.');

  const assetIds = new Set(manifest.assets.map((asset) => asset.id));
  const instanceIds = new Set();
  for (const instance of layout.instances) {
    invariant(typeof instance.id === 'string' && instance.id.length > 0, 'Scene instance id is required.');
    invariant(!instanceIds.has(instance.id), `Duplicate scene instance id: ${instance.id}`);
    instanceIds.add(instance.id);
    invariant(assetIds.has(instance.assetId), `Scene instance ${instance.id} references unknown asset ${instance.assetId}.`);
    invariant(isFiniteVector(instance.transform?.position, 3), `Scene instance ${instance.id} position must contain three finite numbers.`);
    invariant(isPositiveVector(instance.transform?.scale, 3), `Scene instance ${instance.id} scale must contain three positive numbers.`);
    invariant(isFiniteVector(instance.transform?.rotation, 4), `Scene instance ${instance.id} rotation must be a quaternion.`);

    const quaternionLength = Math.hypot(...instance.transform.rotation);
    invariant(Math.abs(quaternionLength - 1) < 1e-6, `Scene instance ${instance.id} must use a normalized quaternion.`);
    invariant(BODY_TYPES.has(instance.physics?.bodyType), `Scene instance ${instance.id} physics bodyType is invalid.`);
    invariant(instance.physics?.colliderSet === 'default', `Scene instance ${instance.id} colliderSet must be default.`);
  }

  return layout;
}


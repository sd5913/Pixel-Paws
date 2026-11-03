# Asset pipeline

The app bundles the npm-installed `three` package and `GLTFLoader` with esbuild. GLB files and JSON scene data are copied from `src/` to `www/`, so the Capacitor application does not need a CDN or a network connection to load Three.js assets.

## Add an asset

1. Export one self-contained `.glb` file into `src/assets/models/`.
2. Use metres, right-handed Y-up coordinates, and `-Z` forward. Apply transforms before export and keep the GLB root scale at `[1, 1, 1]`.
3. Add one entry to `src/assets/asset-manifest.json`. Bounds and collider measurements are local-space metres after `visualScale` is applied.
4. Add scene instances to a file under `src/scenes/`. Rotations are normalized quaternions in `[x, y, z, w]` order.
5. Run `npm run assets:validate`, `npm test`, and `npm run build`.

The placeholder model is reproducible with `node scripts/create-placeholder-glb.mjs`. It exists only to verify the pipeline and should not be treated as a final game asset.

## Manifest and layout contract

`src/assets/validation.js` is the executable schema for schema version 1. It validates identifiers, coordinates, scale, pivots, bounds, collider descriptors, render flags, scene references, body types, and transforms. `scripts/validate-asset-files.mjs` additionally rejects paths outside `src/`, missing files, and files without a GLB header.

Supported collider type names are `none`, `box`, `sphere`, `capsule`, `cylinder`, `convex-hull`, and `trimesh`. A box provides `halfExtents`; a sphere provides `radius`; capsules and cylinders provide `radius` and `halfHeight`; convex hulls and triangle meshes provide the GLB node names in `includeNodes`. All collidable shapes provide a local-space `center`. Milestone 1 only validates and exposes these descriptors; it does not create collision shapes or physics bodies.

## Physics handoff

`instantiateAssetLayout()` in `src/assets/load-assets.js` returns one descriptor per scene instance:

```js
{
  id,
  assetId,
  object3D,
  initialTransform: {
    position: [x, y, z],
    rotation: [x, y, z, w],
    scale: [x, y, z]
  },
  pivot: { type, offset: [x, y, z] },
  bounds: { center: [x, y, z], halfExtents: [x, y, z] },
  physics: {
    bodyType: 'static' | 'dynamic' | 'kinematic',
    colliderSet: 'default',
    colliders: [/* engine-neutral collider descriptors */]
  }
}
```

The layout owns the initial pose. After physics starts, physics should own dynamic and kinematic poses and copy them to `object3D`; rendering should not independently update those transforms. Static instance transforms remain layout-owned. Collider centers are offsets from the declared asset pivot.

The preview deliberately does not register its placeholder with the runner's current collision, obstacle, pickup, input, or scoring systems.

## Build behavior

`npm run build` first validates checked-in asset data, then:

- bundles `src/app.js`, `three`, and Three.js add-ons into `www/app.js`;
- copies `index.html` and `style.css`;
- copies `src/assets/` to `www/assets/`;
- copies `src/scenes/` to `www/scenes/`.

The existing Capacitor `webDir` remains `www`, so `npm run android:sync` and the Android build workflow are unchanged.

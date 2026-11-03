# Asset validation and preview workflow

Use Node 24 and the committed npm lockfile. From repository root:

```sh
npm ci
npm run assets:inspect -- src/assets/models/mug.glb
npm run assets:validate
npm run assets:reproduce:mug
npm test
npm run build
npm run assets:preview
```

`assets:validate` is already part of the web build. It checks every manifest model
and scene layout, packaged paths, unique IDs, dimensions and physics fields. It
runs Khronos `gltf-validator`, rejects errors/warnings, loads through Three.js,
measures transformed vertices and compares manifest dimensions/center/half-extents
within **1e-6 m**. Approved assets additionally match their SHA-256. The mug has
zero errors/warnings and two informational unused-UV messages; those are harmless.
Tests cover truncation, invalid metadata, measurement mismatches and the legacy
text-pivot loader regression. `asset-spec.json` is checked against the mug as well.

The inspector supports the project's self-contained, uncompressed, untextured
GLBs. It explicitly rejects images/required extensions needing browser decoding;
extend it with a tested decoder before claiming such an asset is fully validated.
Bounds describe the default loaded pose, not an animation sweep. For future
characters inspect animated envelopes and paw visibility separately. Structural
validation cannot certify style, animation quality or collision behavior.

## Safe reference reproduction

The approved GLB identifies `THREE.GLTFExporter r180`. The runtime uses r186.1.
The development-only `three-mug-reference` npm alias pins **0.180.0**; the wrapper
provides it as `three` only inside temporary reproduction directories. The
generator's geometry/material code is preserved; only relocated output paths
and its usage comment changed. Two isolated runs must match each other and the
approved GLB/spec. The wrapper verifies originals remain unchanged and cleans up.

Never invoke the relocated generator directly for routine verification: its output
paths intentionally point to `../models/mug.glb` and `../asset-spec.json`. Use the
wrapper. If reproduction differs on another platform, report the dependency/runtime
and difference; never overwrite the approved artifact to make verification pass.

## Three.js review

`npm run assets:preview` builds an isolated viewer under ignored `work/asset-preview/`
and serves it locally at `http://127.0.0.1:4173`. It does not change the app or export
any assets. Select the mug, inspect the 65°, 70°, 75° orthographic portrait views,
toggle collider bounds, and use desk-scale view to judge its actual size. Rotate the
view azimuth to inspect the +Z paw, +X handle, rim, inner wall and underside edges.
Review at 390×844 and 360×800. The desk rectangle is a scale guide, not a new desk asset.

Record loading errors, clipping, silhouette, color/material comparison, contact
plane and collider offset. Keep visual approval distinct from automated checks:
the mug was already approved by the user; this workflow does not revoke or redo
that design. Future character acceptance additionally requires the animation
checks in [SCENE_GUIDE.md](SCENE_GUIDE.md).

## Review handoff

Include modified paths, model digest, measured W/H/D, target discrepancies,
collider approximation, commands and their results, preview evidence and blocked
checks. Run existing tests/builds and report Android tooling limitations if a
native build is unavailable. Do not merge the review PR automatically.

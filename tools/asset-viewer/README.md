# Shared Three.js Asset Viewer

A read-only workspace for inspecting the manifest assets and comparing the three
illustrated rendering presets. The game is never imported. Approved GLBs, source
geometry, native pivots and scale remain unchanged.

## Run

From the repository root with Node 24:

```sh
npm ci
npm run viewer:serve
```

Open **http://localhost:4175/asset-viewer/**. `PORT=4176` selects a different port.
The existing fixed-composition study is still available separately:

```sh
node experiments/illustrated-rendering/serve.mjs
# http://localhost:4174
```

## Inspect and compare

- Select **mug**, **desk**, **placeholder crate**, or the combined **Desk scene**.
  The list is generated from `src/assets/asset-manifest.json`. The combined view
  uses `src/scenes/study-desk-preview.scene.json`, including its native transforms.
- **Model Inspection** uses the GLBs' original PBR materials and neutral lighting.
  **Art Preview** uses the shared **Soft Pastel**, **Warm Illustrated**, or
  **Faceted Diorama** preset values. Returning to inspection restores original
  materials, including their vertex colors. Source geometry is shared read-only.
- Drag to orbit. Scroll or use **+ / −** to zoom. Right-drag to pan. Touch uses
  one finger to orbit and two fingers to zoom/pan. **Reset camera** fits the
  selection again: 70° elevation in Art Preview and 32° in Model Inspection.
- Toggle **Wireframe**, blue **Bounding boxes**, and green **Colliders** in
  either mode. Bounds are measured from the loaded model. Collider geometry is
  a visualization of the manifest, with instance transforms applied once; no
  physics engine or simulation runs. The desk has five compound collider boxes.
- Dimensions are measured in meters from the GLB at its manifest scale. Expand
  metadata for source path, vertices, pivot exception, front axis, approval hash,
  scene placement, interaction surfaces and suggested physical properties.
  Only an asset with an `approvedSha256` is labelled **HASH VERIFIED**; other
  manifest assets do not acquire approval merely by appearing here.
- **Save PNG** exports the current canvas. **Download offline viewer** saves the
  complete viewer with all manifest GLBs embedded. Selection, mode and preset are
  encoded in the URL for sharing when hosted.

The native mug is approximately 0.1191 × 0.0960 × 0.0880 m, with its handle
extending +X and its paw facing +Z. It remains small on the full-size desk; use
individual inspection to examine it. Cameras and helpers never re-center,
rotate, re-scale, simplify or re-export the approved geometry.

Box, sphere, cylinder and capsule colliders are visualized. Future `convex-hull`
and `trimesh` colliders display an explicit unsupported notice and their node
metadata; the viewer does not invent substitute colliders.

## Build and GitHub Pages preparation

```sh
npm run viewer:build
# work/viewer-pages/asset-viewer/index.html
```

The output is a self-contained HTML file plus the Three.js license. It has no
CDN, external asset fetches or root-relative resource paths, so it works under
`/<repository>/asset-viewer/` and can be opened offline in a modern WebGL browser.
Builds write only the `asset-viewer/` subdirectory and never remove unrelated
output files, root `index.html`, or `CNAME`. Use a separate output directory when
building beside an existing `asset-viewer/` page of your own.

`.github/workflows/asset-viewer.yml` runs checks and uploads **asset-viewer-pages**
and browser evidence as ordinary Actions artifacts. **It cannot deploy:** it has
only `contents: read`, no Pages deployment job, no OIDC permission and no Pages
configuration changes. The existing game/Cloudflare workflows remain untouched.

Before a future, explicitly approved Pages publication:

1. Inspect the repository's **Settings → Pages** and any existing publishing
   workflow/source. Do not switch its source or publish a viewer-only artifact
   over an existing site: GitHub Pages deployments replace the entire site.
2. If a site exists, integrate `asset-viewer/` into that site's existing build
   output and deploy the **complete** site through its own approved pipeline.
   Alternatively use a separate hosting repository for this viewer.
3. If there is no existing site, choose GitHub Actions as the Pages source and
   add a separately reviewed manual deployment workflow/environment. Publish
   the prepared package, then visit
   `https://<owner>.github.io/<repository>/asset-viewer/`.

No site is enabled, overwritten or deployed by this PR.

## Validate

```sh
npm test
npm run build
npm run assets:reproduce:mug
npm run assets:reproduce:desk
npx playwright install chromium
npm run viewer:check
```

On machines with Chromium already installed:

```sh
VIEWER_BROWSER_PATH=/usr/bin/chromium npm run viewer:check
```

Browser checks cover each asset, both modes, all presets, material restoration,
orbit, camera zoom/reset, overlays, PNG export, URL persistence, invalid URL
fallback, responsive widths 360/390/768/1440, and standalone offline execution.
Screenshots and JSON results go to ignored `work/asset-viewer-review/`. Managed
Chromium may block `file://`; the offline test loads the actual standalone HTML
into an offline blank document instead. Software WebGL checks are not mobile GPU
performance measurements.

Unit/build tests cover geometry/material isolation, measured dimensions, camera
framing, transformed compound colliders, explicit unsupported collider types,
exact preservation of preset values, newly added manifest assets entering the
build, rejected approved-GLB tampering, and preservation of existing site files.

## Files and scope

- `app.js`, `index.html`, `style.css`: standalone responsive viewer and UI.
- `core.js`: immutable model preparation, rendering style changes, measured
  metadata, collider layers and camera framing.
- `stage.js`: temporary Art Preview stage matching the original study.
- `build.mjs`, `serve.mjs`: validated manifest-driven embedding and local server.
- `*.test.js`, `browser-check.mjs`: unit, build and browser validation.
- `experiments/illustrated-rendering/presets.js`: the original preset values,
  shared by the fixed study and the viewer. Existing screenshots remain intact.

No main-game, physics, touch-control, generator, skill, manifest or GLB changes.

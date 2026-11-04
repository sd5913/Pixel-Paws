---
name: cozy-lowpoly-assets
description: Use when creating, revising, organizing, validating or previewing Pixel Paws 3D game assets, procedural generators, GLB exports, materials, scale metadata or physics handoff manifests.
---

# Cozy low-poly assets

Create reproducible assets in the **Cozy Stylized Low-Poly Diorama** style.
Treat approved assets as immutable references; measured geometry is authoritative.
Run commands from the repository root with Node 24.

## Workflow

1. **Read art direction.** Read `AGENTS.md`, [style](../../../docs/assets/STYLE_GUIDE.md),
   [scale](../../../docs/assets/SCALE_GUIDE.md), [scene and character](../../../docs/assets/SCENE_GUIDE.md),
   and [manifest](../../../docs/assets/ASSET_MANIFEST.md) guides. Check the active
   branch and existing changes before editing. Continue from the user's feature branch.
2. **Inspect approved references.** Inspect `src/assets/models/mug.glb`, its
   generator and `src/assets/asset-spec.json`. Run
   `npm run assets:inspect -- src/assets/models/mug.glb` and `npm run assets:preview`.
   The mug is approved; never regenerate in place, redesign, re-center, rotate or
   rescale it to meet a target. Chat attachments are not repository image files.
3. **Plan geometry and proportions.** Record the requested asset ID, silhouette,
   W/H/D targets, primitive breakdown, segment counts, named parts, face normals,
   palette, origin, forward axis and collider approximation before generation.
   Use chunky rounded forms, gentle facets and readable details at mobile scale.
   Targets and measurements are separate fields; a mismatch is reported, not normalized.
4. **Generate reproducibly when requested.** Put deterministic Node/Three.js
   generators in `src/assets/generators/`. Pin dependencies in the lockfile;
   fix seeds and parameters. Export to a scratch directory first. For the reference
   mug use only `npm run assets:reproduce:mug`, which compares isolated outputs.
   An organization/documentation task does not authorize new assets.
5. **Apply materials.** Reuse named sRGB palette colors through `THREE.Color`;
   preserve linear vertex colors in GLB. Use matte PBR, zero metalness, documented
   roughness and minimal textures. Bake facet normals; avoid viewer-only shading tricks.
6. **Export GLB.** Export self-contained glTF 2.0 binary in meters, Y-up, unit root
   scale and bottom-center origin. New assets face -Z; retain the mug's +Z front.
   Reserve `extras.pivot` for Three.js numeric pivots; use `pivotConvention` for text.
7. **Produce handoff metadata.** Add actual W/H/D, native pivot and bounds, collider
   type/size/offset, suggested mass, friction, restitution and body classification
   to the shared manifest. Keep generators independent of physics engines.
8. **Validate.** Follow [validation](../../../docs/assets/VALIDATION.md). Require
   structural GLB checks, measured bounds, correct paths, deterministic reproduction,
   tests and build. Report unsupported decoders or blocked checks explicitly.
9. **Preview and deliver.** Review orthographic portrait views at 65°, 70° and 75°
   above horizontal, actual desk scale, silhouette and collider alignment. For a
   character, verify front paws throughout the push animation. Record real preview
   evidence and remaining limitations; request review without merging automatically.

## Required handoff

Provide asset/generator paths, parameters and dependency versions; measured W/H/D
and target comparison; native origin/axis exceptions; collider dimensions and offset;
physical suggestions; validation results; preview evidence; and approval status.
Use the existing mug manifest entry as the worked example. Only explicit approval
to change that asset authorizes replacing its recorded SHA-256.

---
name: cozy-lowpoly-assets
description: Use when creating, revising, organizing, validating or previewing Pixel Paws 3D game assets, procedural generators, GLB exports, materials, scale metadata or physics handoff manifests.
---

# Cozy low-poly assets

Create reproducible assets in the **Cozy Stylized Low-Poly Diorama** style.
Treat approved assets as immutable references; measured geometry is authoritative.
Run commands from the repository root with Node 24.

New asset geometry must be authored, exported and re-imported using **Blender
Python / bpy** on the execution host requested by the user. Preserve the legacy
Node generators only for isolated reproduction of approved references. A cloud
Blender installation does not establish access to the user's local Blender.

## Workflow

1. **Read art direction.** Read `AGENTS.md`, [style](../../../docs/assets/STYLE_GUIDE.md),
   [scale](../../../docs/assets/SCALE_GUIDE.md), [scene and character](../../../docs/assets/SCENE_GUIDE.md),
   and [manifest](../../../docs/assets/ASSET_MANIFEST.md) guides. Check the active
   branch and existing changes before editing. Use the user's requested independent
   feature branch and preserve all pre-existing uncommitted changes.
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
4. **Check Blender before production.** Establish the actual machine/connection,
   executable, Blender version and available glTF operator properties. Run
   `blender --background --factory-startup --python-exit-code 1 --python scripts/blender/probe.py -- --report work/blender-capabilities.json`
   on that machine (substitute its discovered executable). See
   [local execution handoff](../../../docs/assets/BLENDER_MIGRATION.md).
   Match bpy APIs to the observed version. If the required host cannot execute
   Blender, report the missing connection/capability and leave production blocked;
   never substitute another host or direct Node/Three.js GLB generation silently.
5. **Generate reproducibly when requested.** Keep Blender `.py` sources under
   `src/assets/generators/`, editable `.blend` files under `src/assets/blender/`,
   and final runtime GLBs under the existing `src/assets/models/`. Use a shared
   authoring configuration for dimensions, named sRGB palette, PBR values,
   bevel/segment counts and explicit export settings; keep design targets separate
   from measured exports. Fix seeds, pin the verified Blender version and retain
   the exact command/configuration in the report. Export to `work/` first and
   promote only after acceptance. Keep `.blend` sources outside the app package.
   For the reference mug use only `npm run assets:reproduce:mug`, which compares
   isolated legacy outputs; it is not the new production path. An
   organization/documentation task does not authorize new assets.
6. **Apply materials.** Reuse named sRGB palette colors; convert sRGB channels
   to Blender's linear working space before assigning shader values. Use
   Principled BSDF, matte PBR, zero metalness, documented roughness and minimal
   textures. Preserve imported linear vertex colors and material node graphs.
   Select flat/smooth face shading, sharp edges and bevels per surface: broad
   readable planes with gentle edge highlights, not indiscriminate smoothing.
   Solid and thick-walled surfaces must have correct outward normals; do not
   globally enable double-sided materials to conceal reversed faces. Intentional
   open sheets may be two-sided with that decision recorded per material.
7. **Export GLB.** Export self-contained glTF 2.0 binary in meters, Y-up, unit root
   scale and bottom-center origin. New assets face -Z; retain the mug's +Z front.
   Reserve `extras.pivot` for Three.js numeric pivots; use `pivotConvention` for text.
   Author in Blender meters, Z-up; the glTF exporter converts axes to game Y-up.
   For new assets, game -Z front corresponds to Blender +Y; game +X right stays
   Blender +X. Do not add a second axis rotation in the loader. Export evaluated
   modifier geometry, normals and materials, retaining separately named nodes.
   Detect export flags from the installed operator API and record their values.
   Apply transforms only to static, unparented, unanimated geometry where safe.
   For parents, constraints, armatures, animation and moving pivots, preserve
   local matrices, rest poses and tracks; verify the hierarchy after re-import.
8. **Produce handoff metadata.** Add actual W/H/D, native pivot and bounds, collider
   type/size/offset, suggested mass, friction, restitution and body classification
   to the shared manifest. Keep generators independent of physics engines.
9. **Validate.** Follow [validation](../../../docs/assets/VALIDATION.md). Require
   structural GLB checks, measured bounds, correct paths, deterministic reproduction,
   tests and build. Report unsupported decoders or blocked checks explicitly.
   Classify each part as closed solid, hollow with real wall thickness, or
   intentionally open sheet. Check evaluated meshes for degenerate/duplicate
   faces, coincident/internal surfaces, unintended intersections, inconsistent
   winding/normals, and negative local/world scale. Closed solids and thick shells
   require closed, consistently oriented surface boundaries; sheets require
   documented open edges. Check minimum wall thickness in context. Record
   intentional approved mug overlaps separately; do not repair the reference.
   State the limits of automated overlap/normal detection and require visual
   inspection of cavities, inner walls, undersides and joints.
   Re-import the scratch GLB in a fresh Blender scene and load it through the
   project's `parseGlb`/`instantiateAssetLayout`: compare transformed bounds,
   axes, native origin, node names, hierarchy, materials and movable pivots.
   For the mug import only a copy/reference and render front (+Z), right (+X)
   and top (+Y) views without rewriting its GLB.
10. **Preview and deliver.** Review orthographic portrait views at 65°, 70° and 75°
   above horizontal, actual desk scale, silhouette and collider alignment. For a
   character, verify front paws throughout the push animation. Record real preview
   evidence and remaining limitations; request review without merging automatically.
   Also inspect the actual gameplay renderer in `src/app.js`: its lighting,
   tone mapping and 50° following orthographic camera differ from the asset
   review viewer. A review-viewer screenshot alone does not verify game visuals.
   Measure every relevant gameplay instance after manifest `visualScale` and
   scene-instance scale/rotation, not just the native GLB. Show the single new
   sample beside the approved mug through existing manifest/layout registration;
   keep this inspection separate from gameplay/physics/scoring changes.

## Structure for future interactions

- Use stable, unique descriptive nodes such as `eraser-body`, `pen-cap`,
  `book-front-cover`, `book-back-cover`, `book-pages`. Detachable/moving pieces
  remain separate nodes, even when they share materials.
- Place part-local origins at motion pivots (hinge/spine for covers, insertion
  axis for caps); document parent, local rest transform, axis and allowed motion.
  Keep the asset root at its declared base-center without recentering children.
- Mug fracture variants share the intact mug's native body-bottom origin,
  meters, +Z front and +X handle direction. Use stable fragment names and
  assembled rest transforms; do not independently recenter/normalize fragments.
- Collider descriptors stay in the shared manifest and follow existing offsets.
  Blender rigid-body settings do not configure or validate Rapier. Claim engine
  integration only after the project adapter and runtime have been tested.

## Required handoff

Provide asset/generator paths, parameters and dependency versions; measured W/H/D
and target comparison; native origin/axis exceptions; collider dimensions and offset;
physical suggestions; validation results; preview evidence; and approval status.
Use the existing mug manifest entry as the worked example. Only explicit approval
to change that asset authorizes replacing its recorded SHA-256.
Separate automated results, human visual acceptance and blocked/unexecuted steps.
Identify the execution host: never describe cloud output as local Blender output.

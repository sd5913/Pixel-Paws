# Shared asset manifest and physics handoff

`src/assets/asset-manifest.json` is the single shared manifest. The existing schema
version 1 gains required authoring fields `dimensionsMeters` and `physics` in this
repository; update older entries together. `src/assets/validation.js` is the
executable shape contract; file validation additionally measures actual GLBs.
No physics engine is imported or invoked by the generator, validator or preview.

## Fields

| Field | Contract |
| --- | --- |
| `id` | Unique kebab-case asset ID |
| `path` | Packaged relative path, e.g. `assets/models/mug.glb`; source path is `src/` + path, build path is `www/` + path |
| `visualScale` | Three positive XYZ values; new assets use `[1,1,1]`; approved mug stays unit scale |
| `dimensionsMeters` | Actual `[width,height,depth]` after visualScale, before scene transforms; never a design target |
| `pivot.type` | Existing `base-center` (bottom-center) or legacy `center` |
| `pivot.offset` | Native origin's offset from the declared pivot, meters after visualScale; `[0,0,0]` for current entries; descriptive only, not automatically applied by loader |
| `pivot.basis` | Optional explanation of approved exceptions (mug centered on vessel body) |
| `bounds.center` | Actual AABB center relative to native origin, after visualScale |
| `bounds.halfExtents` | Positive XYZ half sizes; doubled values equal dimensionsMeters |
| `interactionSurfaces` | Optional named handoff planes; a walkable surface records local `height`, `centerXZ`, and `halfExtentsXZ` without implementing movement or collision |
| `colliders` | Engine-neutral shape descriptors; compound shapes are multiple entries |
| `physics.bodyType` | Suggested `static`, `dynamic`, or existing supported `kinematic`; layout controls actual instance classification |
| `physics.suggestedMass` | Kilograms; zero for static, positive for dynamic/kinematic (kinematic mass is ignored by engines that do not use it) |
| `physics.friction` | Dimensionless nonnegative surface coefficient |
| `physics.restitution` | Dimensionless value 0–1 |
| `render` | Existing boolean castShadow and receiveShadow flags |
| `approvedSha256` | Optional immutable approved GLB digest; mug validation checks it |
| `visualFront` | Optional native-front exception; mug is +Z, new assets use project -Z |

Physical values are **suggestions for later tuning**, not measured material
properties or proven game balance. For the mug: dynamic, **0.25 kg**, friction
**0.65**, restitution **0.10**. Placeholder: static, 0 kg. No new scene instance
or gameplay registration is created for the mug.

## Collider descriptors

All collidable shapes have `center: [x,y,z]`: the collider's offset from the GLB's
native origin, in asset-local meters after visualScale. Axes are unrotated asset
axes. A physics adapter applies scene instance rotation/translation to the local
center and scales dimensions **once**, without applying visualScale again.

| `type` | Dimensions / source |
| --- | --- |
| `none` | No collider |
| `box` | `halfExtents: [x,y,z]`; full dimensions are twice these values |
| `sphere` | `radius` |
| `cylinder` | Y-axis `radius`, `halfHeight` (half the full cylinder height) |
| `capsule` | Y-axis `radius`, `halfHeight` (half the straight segment; total height `2*(halfHeight+radius)`) |
| `convex-hull` | `includeNodes`: exact names of GLB source nodes; selected vertices relative to center |
| `trimesh` | `includeNodes`: exact GLB source nodes, with their local hierarchy transforms; normally for static geometry |

Prefer primitive/compound colliders for movable props. Do not use a dynamic
concave triangle mesh as a generic default. Nonuniform instance scaling of spheres
or capsules needs an explicit engine-specific policy; start with unit/uniform scales.
For node-based colliders resolve names from GLB JSON (Three.js may sanitize names).

The mug's initial box is conservative: full size
`[0.11909234523773193,0.09600000083446503,0.08799999952316284]`, center
`[0.015546172857284546,0.04800000041723251,0]`. It fills both cup cavity and handle
aperture. This is suitable as a provisional pushable prop proxy, not a claim of
exact collision geometry. If openings matter, the physics developer supplies
compound convex descriptors in this manifest without editing the generator.

## Study desk handoff

The desk is a static environment object with zero mass, friction 0.75 and
restitution 0.05. Its `tabletop` interaction surface spans 1.80 × 0.90 m at local
Y=0.75. The recommended compound collider consists of one tabletop box centered
at `[0,0.70,0]` with half-extents `[0.90,0.05,0.45]`, plus four leg boxes centered
at X=±0.72, Y=0.325, Z=±0.31 with half-extents `[0.08,0.325,0.08]`.

These shapes keep the walkable top and ground supports aligned while leaving the
decorative aprons and drawer out of collision. A physics adapter can load
`assets/models/desk.glb`, read these five local boxes and attach them to one static
body without importing or modifying the desk generator.

## Consumer procedure

Load the GLB through `src/assets/load-assets.js` so the r180 text-pivot compatibility
adapter is used. Keep the native origin; do not subtract `bounds.center` as an
implicit recenter operation. Obtain geometry, collider offsets and material
defaults by asset ID from this manifest. The existing layout loader returns
colliders and body classification; mass/friction/restitution remain accessible
on the manifest entry for the physics adapter to consume. Scene instance
`physics.bodyType` overrides the suggested asset classification.

Attach a collider using the dimensions and offsets above. Let the physics body
own the dynamic pose after simulation begins. Visual assets/generators do not
select an engine, create bodies, simulate motion or tune gameplay.

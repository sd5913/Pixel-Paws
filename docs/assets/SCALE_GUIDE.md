# Scale and origins

Use right-handed **Y-up**, **1 world unit = 1 meter**, X width, Y height, Z depth.
Dimensions always use **width, height, depth** order. New assets face **-Z** and
have unit root scale `[1,1,1]`. Author their bottom-center at `[0,0,0]`: the X/Z
center of their full bounds and minimum Y. Ground contact is Y=0 in asset space.
In the existing manifest this convention is named `base-center`.

## Initial design targets

| Asset | Width × height × depth (m) | Interpretation |
| --- | --- | --- |
| Desk | 1.80 × 0.75 × 0.90 | Overall dimensions; top surface at Y=0.75 when placed at ground |
| Cat | width to be designed × ~0.35 × ~0.45 | Length along Z; define whether tail is included in each brief |
| Mug | width/depth from design × ~0.20 tall | Target only; approved reference remains 0.096 tall |
| Book | 0.25 × 0.04 × 0.18 | Closed book lying flat |
| Plant | width/depth from design × ~0.30 tall | Include pot and foliage |
| Desk lamp | width/depth from design × ~0.45 tall | Include base and shade |

These are initial targets, not permission to scale approved assets. Measure exports
before making decisions. Leave unspecified dimensions unspecified until design.

## Study desk: measured export

The generated desk meets its initial target at native scale:

| Measurement | Meters |
| --- | --- |
| Width × height × depth | 1.7999999523 × 0.7499999881 × 0.8999999762 |
| Minimum XYZ | [-0.8999999762, 0.0000000119, -0.4499999881] |
| Maximum XYZ | [0.8999999762, 0.75, 0.4499999881] |
| Manifest dimensions | 1.80 × 0.75 × 0.90 |

The differences from the decimal targets are 32-bit vertex precision and remain
below the manifest tolerance of 1e-6 m. The native origin is the full-bounds
bottom-center, root scale is `[1,1,1]`, and the visual front is -Z. The flat
walkable surface and top of the tabletop collider are both Y=0.75.

## Approved mug: measured, unchanged

The GLB's transformed vertex bounds (including handle and emblem) are:

| Measurement | Meters |
| --- | --- |
| Width | 0.11909234523773193 |
| Height | 0.09600000083446503 |
| Depth | 0.08799999952316284 |
| Minimum XYZ | [-0.04399999976158142, 0, -0.04399999976158142] |
| Maximum XYZ | [0.07509234547615051, 0.09600000083446503, 0.04399999976158142] |
| AABB center / full-box collider offset | [0.015546172857284546, 0.04800000041723251, 0] |

Its origin is at the **vessel body's bottom-center**, not the handle-inclusive
X/Z bounds center. The body sits on Y=0; the handle extends +X. Preserve this approved
exception. `pivot.offset=[0,0,0]` records the native GLB origin without applying a
translation. The full bounds bottom-center would be `[0.015546172857284546,0,0]`;
do not bake that re-centering into the reference or assume a symmetric box about X=0.
Its raised paw faces **+Z**, an explicit exception to the project's -Z forward.

The height is about **48%** of the initial 0.20 m target. No scale change is needed
to establish it as a style reference. Keep `visualScale=[1,1,1]`; any future change
requires an explicit request and a new measurement/review. `asset-spec.json` is
the preserved export report, not a future asset design-input schema.

## Placement and collider coordinates

At identity scale, place a bottom-center prop on the desk at Y=0.75; place the cat's
paw contact plane there too. Do not place the cat on the room floor beside the desk.
Collider centers are offsets from the **native asset origin**, in asset axes,
after `visualScale` but before scene-instance scale/rotation/translation. Box
dimensions are `2 * halfExtents`. Mass uses kilograms; friction and restitution
are dimensionless suggestions. See [ASSET_MANIFEST.md](ASSET_MANIFEST.md).

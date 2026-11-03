# Cozy Stylized Low-Poly Diorama

The approved reference is `src/assets/models/mug.glb`, authored by
`src/assets/generators/generate-mug.mjs`. Its geometry and materials take precedence
over generic style defaults. The diorama/laundry and dim-sum images were attached
to the task conversation; no copies were found in this repository. Do not invent
image paths or claim those images are locally available.

## Visual language

- Soft low-poly geometry with rounded, chunky, toy-like proportions.
- Gentle, deliberately placed facets and simplified handcrafted details.
- Muted pastel colors, matte PBR materials and minimal texture complexity.
- Strong silhouettes readable in a mobile portrait orthographic view.
- Consistent proportions, segment density and material treatment across a set.

## Palette

Colors below are **sRGB hex**. The first two are taken from the approved generator;
the other colors are proposed companions for future assets, not sampled image colors.

| Name | Hex | Use |
| --- | --- | --- |
| Cloud blue | `#9DCBD8` | Approved mug body/handle; ceramic accents |
| Warm cream | `#FFF0D7` | Approved mug lip and raised paw; paper/highlights |
| Dusty rose | `#D9A6AE` | Small fabric/paint accents |
| Soft sage | `#A9BBA0` | Foliage and green accents |
| Muted lavender | `#B9ACC9` | Secondary painted props |
| Oat wood | `#C8AA86` | Desk and natural wood |
| Warm charcoal | `#514A50` | Eyes, small dark details; avoid large black areas |
| Diorama ground | `#EEE5E9` | Neutral preview background only |

Use `new THREE.Color(hex)` so Three.js converts sRGB input to linear working color.
Vertex colors exported to glTF are linear; do not insert raw hex channel ratios as
linear vertex colors. Keep renderer output sRGB and exposure consistent during review.

## Materials and geometry

The mug uses two `MeshStandardMaterial`s: ceramic roughness **0.65**, enamel
roughness **0.70**, both metalness **0**. Its blue/cream ceramic colors are vertex
colors on a white material; the cream emblem is a separate material. No textures.
Future props should start around roughness 0.65–0.9 and metalness 0. Treat polished
or transparent materials as deliberate exceptions, not defaults.

The mug demonstrates a 12-segment lathed vessel, a rolled thick rim, a six-sided
handle tube along an eight-segment curve, and simple raised paw shapes. Face normals
are baked using split vertices. Preserve rounded silhouettes while letting broad
planes catch soft light. Avoid razor-thin walls, tiny unresolvable engraving, noisy
textures, dense smoothing and exaggerated specular highlights.

The reference has **612 triangles, 1,836 position vertices, two materials/two draw
calls, zero textures**, and is **78,852 bytes**. Use this as a small-prop comparison,
not an exact polygon budget for every asset. Record complexity and justify increases
for larger silhouettes or animation. Remove degenerate faces; inspect winding and
normals. Overlapping hidden ceramic parts in the approved mug are intentional.

Do not alter the mug to conform to a later convention. Scale and origin exceptions
are documented in [SCALE_GUIDE.md](SCALE_GUIDE.md).

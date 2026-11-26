# Level two kitchen assets 16–22

Source: teammate PR #43, commit 9f38a1ec96da1fd7d0e957ace9c1555b359d348b. All seven GLBs are copied unchanged, including materials and authored node transforms. No geometry was generated or repaired. Inspection uses local Node 24.21.0 and the project Three.js/glTF validator.

## Measured dimensions

Dimensions are X/Y/Z in meters. Native scale is retained in the shared manifest; the existing kitchen runtime applies a uniform instance scale, centers X/Z and aligns the bottom to the tabletop. Width and maximum height are layout limits, not model export targets.

| Asset | Native W/H/D | Instance scale | Gameplay W/H/D | Triangles |
| --- | --- | --- | --- | --- |
| 16-strawberry-cupcake | 1.8200 × 2.5687 × 1.8200 | 0.15385 | 0.2800 × 0.3952 × 0.2800 | 2397 |
| 17-blueberry-and-strawberries | 2.9740 × 0.9713 × 1.2774 | 0.10760 | 0.3200 × 0.1045 × 0.1375 | 552 |
| 18-cake-slice | 1.8200 × 1.9826 × 2.1880 | 0.13711 | 0.2495 × 0.2718 × 0.3000 | 300 |
| 19-cookies | 1.7873 × 0.2200 × 1.9931 | 0.12543 | 0.2242 × 0.0276 × 0.2500 | 428 |
| 20-butter-block-and-knife | 2.5600 × 0.8200 × 2.5600 | 0.14063 | 0.3600 × 0.1153 × 0.3600 | 392 |
| 21-butter-cubes | 2.0352 × 0.9200 × 1.9976 | 0.15232 | 0.3100 × 0.1401 × 0.3043 | 132 |
| 22-lemon | 2.1203 × 1.5000 × 1.2600 | 0.12734 | 0.2700 × 0.1910 × 0.1604 | 158 |

## Collision and detachable parts

The cupcake, cake slice, cookie and lemon use solid bounding boxes matching their scaled visual bounds. The butter plate has its own solid box; butter and knife remain separate held assemblies until the carrier tilts, moves quickly or they are swatted. The three berries and three butter cubes have independent bodies from the start. Berries use convex hulls, cubes use solid boxes with a minimum half-height of 0.006 m. Loose parts preserve their source transforms across restart. All bodies use CCD and gravity; new carriers have damping and extra solver iterations to settle. Each body participates in the existing contact and landing audio system.

Manifest collider centers and half-extents describe the original assembly before instance scale. Runtime carrier colliders exclude detachable contents. Runtime physics uses 0.8 of the configured mass, friction 0.65 (loose parts 0.7), restitution 0 and contact skin 0.003 m (loose parts 0.002 m). The manifest mass is a suggestion for the complete assembly.

## Validation and limits

All seven files pass glTF validation with zero errors/warnings. Existing approved mug reproduces byte-for-byte in two isolated local runs, using a Windows directory junction for the dependency link. Actual GLBs are covered by the kitchen stillness test before/after restart and a floor-retention/reset regression. Chrome gameplay preview verifies loading, restart and no page errors at 390×844.

These imported assets were not re-authored in Blender. glTF structure and runtime inspection do not establish watertightness, wall thickness or absence of internal mesh intersections. Solid collision proxies intentionally cover cavities and food silhouettes. Human visual approval is pending.

# Cozy study desk design

## Intent

Create the first production asset generated through the `cozy-lowpoly-assets`
workflow: a freestanding wooden study desk that establishes the playable surface
for the cat and visually belongs beside the approved mug.

## Geometry plan

- Exact outer bounds: **1.80 m W × 0.75 m H × 0.90 m D**.
- Y-up, -Z front, unit root scale, full-bounds bottom-center origin at `[0,0,0]`.
- A 0.10 m rounded tabletop spans the full bounds; top surface is Y=0.75 m.
- Four 0.16 m chunky rounded legs run from Y=0 to the tabletop underside.
- Rounded aprons reinforce the silhouette without reducing the top play area.
- A shallow centered drawer and cream pull face -Z, identifying the desk front.
- Parts are merged by material for at most three draw calls. There are no textures.

The tabletop, legs and aprons use oat wood `#C8AA86`; the drawer uses soft sage
`#A9BBA0`; its
pull uses warm cream `#FFF0D7`. All materials are matte PBR, metalness 0, with
baked low-poly facet normals.

## Gameplay space and preview

The complete 1.80 × 0.90 m top remains flat and walkable. The approved mug is
previewed at `[0.58,0.75,0.27]`, toward the back-right, leaving the central and
front tabletop clear for the future cat. This placement uses the mug's unchanged
native vessel-bottom origin and unit scale.

The standalone asset review scene displays the desk and mug together at 65°, 70°
and 75° orthographic elevation. It does not register either object with gameplay.

## Physics handoff

The desk is static with zero suggested mass, friction 0.75 and restitution 0.05.
Recommended compound box colliders are the tabletop plus four legs. The tabletop
collider is centered at `[0,0.70,0]`, has half-extents `[0.90,0.05,0.45]`, and its
top is exactly Y=0.75. The decorative aprons and drawer remain visual-only and are
intentionally omitted from the conservative collider set; they do not need separate
colliders for the planned tabletop interaction.

## Alternatives considered

- A plain five-box table would be cheaper, but would not test the rounded, faceted
  material language or read clearly as a study desk.
- A desk with shelves or a tall hutch would reduce the playable top area and obscure
  the cat/push interaction in the portrait camera.
- The selected freestanding drawer desk keeps a strong miniature silhouette, exact
  scale, low draw-call count, and a broad unobstructed surface.

## Constraints

The mug remains byte-identical. No gameplay, physics engine, controls, scoring or
touch code changes are part of this milestone. The GLB and generator must reproduce
deterministically, validate structurally, match manifest bounds, and remain suitable
for mobile portrait rendering.

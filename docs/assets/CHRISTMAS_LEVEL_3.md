# Level three: supplied Christmas models

Source: teammate branch `assets/add-level-3-models`, commit `65df6da1b1322be7c38280544ab0c81d370948d9`. All 27 supplied GLBs retain their original paths and bytes. Four additional props reuse the two candles and two small firs already present in `christmas-room.glb`; no new model geometry is authored. Work is verified on local Windows with Node 24 and the project's locked Three.js/Rapier dependencies.

`src/christmas-prop-layout.js` owns placement. `christmas-level-3-handoff.json` records all 33 instances: source hashes, selected bounds, scale, final dimensions, collider and mass. Incoming filenames retain their spaces/uppercase characters and use direct loading rather than the older shared manifest's lowercase-path contract. Dedicated validation covers all 27 supplied files plus the original room GLB.

## Layout and movement

- Retain the walnut table, solid red cloth, front/back fringe, fireplace and large Christmas tree.
- All 33 prop instances are now movable on the tabletop. Transfer the string lights, garland, bow, stocking, house, two candles and two small firs from the mantel to the table. Place the supplied gift box on the table at 72% of its earlier size. Older background gifts beneath the large tree remain scenery.
- The bear and two cushions retain their doubled size. Restore the gingerbread man to half the preceding revision. Enlarge the snow globe to 0.56 m width and lantern to 0.40 m width. Six baubles retain the common diameter established from the original displayed string-light bulbs; the tabletop string retains that bulb scale and is laid across the front of the wooden table.
- Flat props lie flat. Re-space the back row and tabletop decorations to avoid overlapping initial collision boxes. Each prop has its own solid box, mass 0.08 kg, gravity, CCD and damping.
- The wood tabletop has half-extents 1.95 × 2.65 m. Both rendering input and physics use this footprint with a 0.18 m center inset: maximum cat center X/Z are ±1.77 / ±2.47 m. This replaces the smaller cloth-based limits. Finite-mass motion and bounded swats let the cat push props fully off all four wooden edges.
- Fallen props remain on the floor. First contact and first floor landing each trigger one independent sound. Restart resets props, cat, sound phases and visual effects. This remains an interaction preview; level-three timed scoring is not introduced.

## Lantern and snow globe

The lantern has a warm point light inside its flame, a soft additive glow and subtle intensity flicker. Both move with the rigid prop. The globe contains 84 small snow particles, deterministically initialised and continuously drifting downwards in world gravity. Particles are recycled within an inset sphere when the globe tilts or rolls. Snow is a visual effect, with no individual particle collision or fluid simulation. Restart restores the initial particle state.

The snow globe's large `Studio_floor` presentation mesh is omitted from the runtime instance. Three named glass slots (`Crystal - transparent faceted shell`, `Clear globe`, `Light amber glazing`) are cloned at runtime with opacity 0.14, no depth writes and no transmission pass; transparent shells do not cast opaque shadows. Geometry, source materials and source GLBs remain unchanged. Reused fir foliage is aligned with its original trunk to compensate for the old room's rear-offset mismatch.

Compatible opaque pieces are batched by material in memory. Transparent pieces, invisible nodes, negative transforms, animated flames, skinned meshes and morph targets remain separate. This reduces draw calls without rewriting source geometry. Browser render-call measurements are not real-phone frame-rate guarantees.

## Validation and limits

Tests load real geometry with embedded texture references bypassed for Node; Chrome separately renders original images/materials. Checks cover all source GLB structures, transformed bounds after batching, rest before/after reset, solid floor retention, actual cat pushing, both audio phases, pushing off all four wooden edges, snow confinement under rotation, and a lantern light attached to its prop. Phone/wide gameplay captures verify all 33 instances, moving snow, active lantern light and controls without page errors.

The asset viewer now uses precise transformed-vertex bounds consistently with the asset validator, fixing the prior CI failure for rotated models. Solid boxes are conservative proxies: cavities, cushion softness and new breakage are not simulated. Structural validation does not prove watertightness, wall thickness or absence of internal mesh intersections. Teammate visual review remains pending; no automatic merge to main.

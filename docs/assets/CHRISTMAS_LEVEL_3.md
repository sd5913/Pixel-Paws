# Level three: supplied Christmas models

Source: teammate branch `assets/add-level-3-models`, commit `65df6da1b1322be7c38280544ab0c81d370948d9`. All 27 GLBs retain their original paths and bytes. No new geometry was authored or exported. Integration was performed on the local Windows host with Node 24 and the project's locked Three.js/Rapier dependencies.

`src/christmas-prop-layout.js` is the runtime placement catalog. `christmas-level-3-handoff.json` records each source hash, bounds, instance scale, final dimensions, collider, mass and static/dynamic role. These incoming filenames contain spaces and uppercase letters and remain outside the older shared manifest's lowercase-path contract, matching the existing direct-loading kitchen integration. The dedicated Christmas validation test covers all 27 files.

## Scene and interactions

- Preserve the dark walnut table, solid red cloth, front/back fringe, fireplace and Christmas tree.
- Place lights, garland, ribbon, stocking and cottage around the mantel. Replace the older procedural cottage. Keep the supplied gift box on the floor beside the table.
- Put the other 21 props on the tabletop, leaving the center clear for the cat. Envelope, cushions, cookies, candy cane and flat ornaments lie flat. Each movable prop has an independent solid box, gravity, CCD and damping.
- The cat uses the same finite-mass acceleration tuning as level two and pushes actual rigid bodies. A narrow forward swat applies bounded impulses. Props remain on the floor after falling.
- First contact and first landing each trigger one independent pop through the existing audio system. Restart resets rigid bodies, the cat and both sound phases. BGM follows the existing audio lifecycle.
- This remains a scene/interaction preview; full level-three timed scoring is not introduced.

## Import exceptions and rendering

The snow globe's `Studio_floor` is excluded from the runtime instance; otherwise its 200-unit presentation floor would dwarf the prop. Inactive scenes and unused exporter objects are not instantiated. Authored node transforms and source materials are preserved, with three named glass slots (`Crystal - transparent faceted shell`, `Clear globe`, `Light amber glazing`) cloned at runtime and rendered with opacity 0.14, no depth writes and no transmission pass. This makes the globe interior and lantern flame visible on mobile. Transparent shells do not cast opaque shadows.

Compatible opaque pieces of each rigid assembly and the room are merged by material in memory. Transparent pieces, invisible nodes, negative transforms, animated flames, skinned meshes and morph targets remain separate. The source GLBs are not rewritten, and source geometry is not mutated. The initial portrait preview dropped from roughly 2,100 to roughly 370 render calls. This is a headless Chrome measurement, not a real-phone frame-rate claim.

## Validation and limits

All 27 models undergo glTF structural validation. Actual geometry is loaded for the physics tests (embedded texture references are bypassed for Node measurements); Chrome separately checks actual images/materials, all 27 scene instances, movement, swat and restart at phone and wide viewports. Tests cover rest before/after restart, solid floor support, physical cat contact and the two audio phases. The original mug is reproduced in isolation without rewriting it; a Windows junction supplies the dependency link.

Solid boxes are conservative approximations; openings, soft cushions and glass are not physically simulated. No new fracture or liquid effects are claimed for these props. Structural validation does not establish mesh watertightness, wall thickness, or absence of internal intersections. Imported art and final composition remain subject to teammate review. No automatic merge to main.

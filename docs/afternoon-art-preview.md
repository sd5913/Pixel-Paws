# Afternoon desk — local art preview

This art pass is submitted for review in PR #14. The public playtest also includes
the separate UI work from `feature/updated-playtest`; this PR does not duplicate it.

## Visual direction

Preserve the existing cozy low-poly silhouettes. Use honey-colored window light,
cool blue ambient fill, soft purple-brown contact shadows, and muted room dressing.
The playable surface, camera framing, object transforms, collision shapes, masses,
random placement, and score rules are unchanged.

## Implementation

- `src/visuals/afternoon-room.js`: deterministic room geometry, a bookcase, books,
  two sage plants, an abstract wall print, and subtle floorboard seams. Everything
  is outside the playable desk and has no collider. Room dressing is batched into
  20 mesh draws / 1,784 triangles. Objects use matte, zero-metalness materials.
- Room proportions: bookcase 1.02 m wide, 1.75 m high, 0.50 m deep; framed print
  0.78 × 0.98 × 0.06 m; plant pot 0.28 m diameter × 0.22 m tall before instance
  scaling. Unit scene coordinates are meters, Y up. These are procedural runtime
  decorations, not GLB exports or gameplay asset-manifest entries.
- A deterministic 256² wood texture adds low-contrast grain to the desk top.
  Runtime material clones distinguish glass, rubber, paper, and enamel without
  mutating cached GLB materials. The approved mug is explicitly excluded.
- `src/visuals/contact-shadows.js`: a shared 64² radial texture anchors the cat and
  props to the desk. Shadows follow randomized positions, fade with height, and
  hide when props fall below the desk.
- `src/visuals/impact-feedback.js`: a fixed 48-particle pool and four short rings,
  subtle 0.14 s visual squash, and a small decaying camera offset. Feedback changes
  no physical pose; reset restores original scales before generating a new layout.
  Reduced-motion preference disables these effects.
- `src/app.js`: warmer key/cooler fill, ACES tone mapping, soft shadow sampling,
  1,024 px mobile / 2,048 px desktop shadow map, and distant room fog. Fog provides
  depth separation; this draft does not implement depth-of-field blur.
- `src/style.css`: a light, non-interactive edge vignette.

No dependencies or model files changed. Three.js remains the locked 0.186.1.

## Verification

- 109 automated tests pass on the PR branch (113 on the combined UI playtest), including feedback reset, reduced motion, shared
  material preservation, contact-shadow tracking, and bounded room draw count.
- Production build and 12-asset structural validation pass.
- Two isolated mug reproduction runs match the approved SHA-256 exactly:
  `e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e`.
- `git diff --check` passes.
- Initial browser screenshots were verified; interactive visual review and mobile
  GPU/frame-time measurements remain pending.
  Chromium screenshots of the combined UI playtest at 1100×800 and 390×844
  were captured and inspected. Shared desktop interaction and GPU/frame-time
  measurements remain unverified.

Before upload, inspect portrait widths 360 and 390 px and desktop, check the home
camera and multiple cat headings, verify window shadows and glass highlights,
then test swat, dash, pause/resume, random-layout restart, and reduced motion.

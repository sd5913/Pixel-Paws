# MVP scene and character design

This is a design contract, not a change to the current runner demo. The cat stands
and moves **directly on the desk surface**, pushing objects off its edges. The
desk's initial overall size is 1.80 × 0.75 × 0.90 m; with a bottom-center desk at
the world origin its top is Y=0.75. Objects and cat paw contact planes rest there.
Leave enough clear desk area for movement and paw reach. Keep edges visually legible.

## Camera and mobile framing

- Orthographic projection in mobile portrait orientation.
- Initial elevation **70° above the horizontal XZ plane**, adjustable **65–75°**.
  This equals 20° from vertical initially, not 70° from vertical.
- Look toward the desk center; choose azimuth for readable cat front paws and prop
  silhouettes. Review several cat headings; a camera angle alone does not prove
  the paws remain visible.
- For distance `r`, elevation `e`, azimuth `a`, use camera offset
  `[r*cos(e)*sin(a), r*sin(e), r*cos(e)*cos(a)]` from the look-at target.
  Convert degrees to radians. Orthographic distance does not determine zoom;
  adjust frustum size, preserving aspect ratio and updating on resize.
- Frame the full desk with margin for falling objects and future mobile UI safe
  areas. Review at 390×844 and a narrow 360×800 viewport. Do not crop desk edges
  merely to fill portrait height; check scale/readability in context.

## Character requirements for future generation

Target approximately 0.35 m tall and 0.45 m long, with width and tail envelope
specified in the character brief. Use a chunky torso, readable ears and a simple
face. Separate front paw silhouettes from the torso/head in the 65–75° views.
Plan named paw/leg parts and pivots for animation; keep the paw contact plane at
local Y=0 in the standing pose. Use -Z forward for a new character.

Before accepting a future cat, preview idle, walk, push wind-up, contact and recovery
at 65°, 70° and 75°, from multiple headings, on the desk at actual scale. Both the
contacting paw and the pushed object's movement must remain understandable. Check
head/body occlusion and prop heights; correct character/animation design rather
than silently replacing the camera with perspective. Record frame evidence.

No cat asset or animations are introduced here, so paw visibility remains a future
character acceptance check. Do not implement movement, collision response, touch
controls or scoring as part of asset authoring. Visual models and metadata are
handed to the gameplay and physics developers separately.

# UI and gameplay review handoff

## Proposed commit / PR

Title: Add mobile game UI, scoring, timer and paw-swat gameplay

Description: Replace the runner prototype with the shared desk scene and animated cat. Connect reusable physics events to duplicate-safe scoring (10 for toppling, 20 total after falling), five-target clear settlement, a 60-second timer and actual scene/body reset. Add mobile joystick outer-zone Dash, forward-region paw swats shared by K and SWAT, supplied PNG UI, pause/resume/home, distinct result panels and the approved white-outline logo.

## Reviewer entry points

- src/scoring.js: isolated rules and round lifecycle.
- src/round-timer.js: deadline, stop and resume.
- src/swat.js / src/joystick.js: action timing, input and tuning.
- src/physics-score-bridge.js: shared event mapping.
- src/physics/desk-physics.js: gameplay adapter, hits and reset.
- src/app.js: UI, scene and lifecycle connections.
- src/assets/ui and src/scenes: artwork and scene data.

## Try it

Use Node 24; run npm ci, npm test, npm run build and npm run preview. Open http://127.0.0.1:4173/.

1. Start; check the approved logo, HUD, joystick and SWAT button. No in-game Restart button should appear.
2. Walk within the pad, drag outside for Dash, release to stop. Cat stays on the table.
3. Face a nearby mug and press K or SWAT. Only the fixed forward area is hit. Empty swats do not score; repeated events cannot duplicate points.
4. Topple earns 10; a later fall adds 10. Direct fall earns 20. Five fallen mugs settle once at 100.
5. Pause freezes time, input, animation and physics. Resume keeps remaining time; Restart resets five bodies and 60 seconds. Home returns to the logo and clears score.
6. Let 60 seconds expire; verify TIME'S UP art. Clear all targets to verify TABLE CLEARED art. Replay starts fresh.
7. Optional ?debugScoring=1 uses three synthetic targets; direct clear totals 60. Normal gameplay hides controls.

## Integration notes

The PR conflict resolution integrates fetched main f9872f5 into feature/ui-gameplay. Main itself is not modified. The resource viewer, illustrated-rendering experiments, generators, validation rules and all package scripts/dependencies from main are preserved. Gameplay app.js remains the tabletop game instead of the old runner/physics demo. Physics world/body retain the newer shared event-enabled implementation from the teammate physics branch. The loader reads the nested asset.physics contract. The shared manifest preserves main entries and adds measured cat metadata; no model bytes change.

Physics helpers/events come from fetched origin/physics/rapier-integration ec940cb. Detection remains >45 degrees from world up (immediate) and body origin >0.5 below initial Y, rather than the original full-bounds proposal. Gameplay impulses live in the adapter; score rules remain separate. Box colliders, varied mug sizes, swat timing and Android performance need teammate/device review. PawWave is accelerated, with approximate contact timing.

Legacy JPGs, unused masks and the old logo were backed up outside the repository. Current PNG assets retain supplied transparency. No generated www, node_modules, credentials, signing material, commit, push, PR or deployment is included. Use GitHub Desktop to review all changed files, commit on feature/ui-gameplay, Publish branch / Push origin, then open a PR targeting main for teammate review.


## Conflict-resolution validation

Node 24: npm ci, all 64 npm tests, npm run build and npm run viewer:build passed. npm run assets:reproduce:mug was attempted both inside and outside the sandbox but is blocked by Windows EPERM on a dependency directory symlink; no reference model was regenerated. Approved mug digest/GLB checks and desk/cat measurements pass. Viewer asset-count testing now follows manifest growth rather than a hardcoded count.

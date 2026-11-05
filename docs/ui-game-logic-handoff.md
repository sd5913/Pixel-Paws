# UI and game-logic handoff

This branch only ADDS files. Existing game entry, build/package files, 3D assets, scenes, asset loader, manifest and physics modules are unchanged from main. The complete playable prototype remains in the original D:/GitHub/Pixel-Paws checkout and backup/full-local-playable-20261105 at 7b00c1d.

## Included

src/ui-gameplay contains supplied UI artwork and the approved logo, an explicitly mounted Shadow DOM interface, pure scoring, 60-second deadline/pause/resume, lifecycle/reset coordination, joystick/Dash input and K/SWAT action timing. No model, scene, animation execution, collision/hit detection, force tuning or Rapier dependency is added. All existing dependencies are reused.

## Review without 3D

Use Node 24. Run npm ci, npm test and npm run build. To view this independent UI review, run node scripts/ui-preview.mjs and open http://127.0.0.1:4176/. This is a labeled simulation, not a replacement game. Start, simulate topple/fall, pause/resume, Restart, Home and timeout can be checked. Three direct falls total 60. K/SWAT emits action phases and does not directly score. The root game's existing build/entry are deliberately unchanged and do not automatically mount this UI.

## Teammate integration (explicit changes in a later integration PR)

Import mountGameUI from src/ui-gameplay/ui.js into your game. Supply a dedicated full-screen host element (position:fixed;inset:0;pointer-events:none). The module isolates its styles and IDs in Shadow DOM. When bundling, copy src/ui-gameplay/assets beside the built module or pass assetBase pointing at the packaged UI folder. It requires no Three.js import.

```js
const {game, dispose} = mountGameUI(host, {
  targets: () => sceneTargets.map(item => ({id:item.id})),
  resetScene: async () => resetExistingSceneAndPhysics(),
  onInput: ({x,z,dash}) => characterController.setInput({x,z,dash}),
  onPlaying: playing => setExistingSimulationEnabled(playing),
  onSwat: phase => {
    // start: play your paw animation
    // impact: test your fixed front region and apply your physical impulse
    // cancel: stop a pending action
  },
});
// Shared event mapping: subscribe once; retain and call unsubscribe on disposal.
const offTopple = physicsEvents.on('tipped-over', e => game.notifyToppled(e.objectId));
const offFall = physicsEvents.on('fallen', e => game.notifyFallen(e.objectId));
// On scene disposal: offTopple(); offFall(); dispose();
```

Only registered IDs count. Topple earns 10 once; fall completes that object's total to 20 (direct fall +20). Late/repeated events cannot add more. Last fall scores before one settlement. Empty rosters do not clear. Timeout uses the same end entry. Pause freezes scoring, input and action timing; onPlaying must freeze teammate physics and animations too. Restart waits for the supplied resetScene before enabling the round; scene owner must clear old physics events/velocities. Home returns UI to ready and zeros points; actual scene restoration happens on the next Start via resetScene. Do not claim scene/physics reset or animation is implemented by this package itself.

## Validation

54 tests and the existing repository build passed. Includes original main tests plus UI rule/input/timer/action/lifecycle tests. Physical execution and device touch feel remain integration tasks. No dependency or build system changes, and no modifications to teammate-owned files.

The old feature/ui-gameplay PR contains the full prototype and should not be merged as this scoped delivery. Open a separate PR from feature/ui-game-logic to main and use this document as the review description. Keep the old PR unmerged or close it manually after the team agrees; do not merge both.

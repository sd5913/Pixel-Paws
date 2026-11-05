# Scoring and game logic

## Current rules

The team's updated rules replace the original size-tier proposal. All target types share the same scoring rules. Falling completes the target total regardless of its orientation:

| Physics event | Scoring event | Points per target per round |
| --- | --- | --- |
| `tipped-over` | `objectKnockedOver` | +10 once |
| `fallen` | `objectFellOffTable` | Complete the target total to 20 (+10 or +20) |

Values are centralized in `SCORE_VALUES` in `src/scoring.js`. Size and weight do not affect points. A topple earns +10. Falling adds +10 if the topple was already credited, or +20 otherwise. No physical topple event is invented: the toppled flag still records only observed topples. After a target falls, all later notifications for it are ignored. Repeated events, unknown IDs and events before Start or after settlement award nothing.

Duplicate IDs count once. Only all registered targets falling clears a round; toppling all targets does not. An empty roster does not automatically clear. The final fall is credited before the single settlement callback. The five-mug scene has a maximum of 100 points; five direct falls without topples also total 100.

## Integration

`src/physics-score-bridge.js` subscribes to the shared `physicsEvents` manager. Collision and settled events do not score. Physics owns detection, game logic owns points, and UI displays snapshots. See `docs/physics-integration.md` for detector differences and reset details.

`renderScore(snapshot)` in `src/app.js` updates total score, floating positive increments and final score. `createScoring({ onChange, onEnd })` is independent of rendering and physics. Replace UI artwork at this connection without recalculating points.

Start, Restart and Replay reset the scene, physical bodies, per-body event records and score, then begin a fresh 60-second deadline. Clearing targets or timeout calls `endRound(reason)`. Gameplay stops immediately; a short visual delay lets the final award appear before the result panel.

The current scene registers its target roster from scene configuration. For another scene, configure it before starting:

```js
const api = window.pixelPawsScoring;
api.configureRound({
  targets: [{ id: 'cup-01' }, { id: 'box-01' }],
  async resetScene() {
    // Restore meshes, bodies, velocities and forces.
    // Clear physics event records and discard pending old notifications.
  },
});
await api.startRound();
```

Body IDs must match target IDs. The installed bridge listens to `physicsEvents.on('tipped-over', ...)` and `physicsEvents.on('fallen', ...)`. Do not add a second scoring listener. The manager generates notifications through registered body-state updates; it has no public emit method. `api.notifyToppled(id)` and `api.notifyFallen(id)` support another event source or explicit simulation with the same scoring/deadline guards. `api.endRound('timeout')` and `api.snapshot()` expose settlement and state. End the active round before replacing its configuration. A failed reset prevents the next round from starting.

## Local verification

Use Node 24:

```sh
npm ci
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/`. Press Start, push mugs with the joystick, and drag beyond the inner pad for continuous Dash. A topple shows +10; a fall shows +10 or +20 depending on previous credit. Restart should restore five mugs, zero score and 60 seconds. Let time expire to test timeout settlement, then Replay.

Optional `?debugScoring=1` replaces the roster with three synthetic IDs and shows labeled test controls. Before Start they must not score. Topple then Fall on one target gives 20; repeats give 0. Directly falling all three in a fresh round gives 60 and settles. These controls use production scoring but do not test physical detection. Normal preview hides them.

Automated tests cover shared Mug/Book/Box rules, independent duplicates, direct falls, lifecycle guards, unique IDs, final award before single settlement, empty rosters, reset, bridge filtering and real Rapier pushing/reset. Browser and device playtesting remain necessary for tuning.

## Review handoff

Suggested PR title: Integrate shared physics events with scoring and mobile game UI.

Suggested description: Connect shared tipped-over/fallen events to +10 topple credit and a completed 20-point total on falling; add settlement, 60-second rounds, scene/body reset, mobile UI and joystick Dash. Preserve the team's detector and document its thresholds. Include rule, bridge and real-body integration tests.

After review, commit source, assets, tests and documentation on `feature/ui-gameplay`, push that branch, and open a PR targeting `main` for teammate review. Do not commit generated `www/`, dependencies or secrets. This task does not automatically commit, push, create a PR or merge.

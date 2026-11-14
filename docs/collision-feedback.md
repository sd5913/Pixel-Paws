# Collision feedback

## Stack and boundaries

The inspected app uses JavaScript ES modules, esbuild (`scripts/build.mjs`), Three.js r186 and `@dimforge/rapier3d-compat` 0.19.3. There is no Vite configuration, prior audio manager, particle library or orange obstacle outline in the active `src/app.js` game. `src/ui-gameplay/` is a separate UI prototype and is unchanged.

Rapier contact manifolds are sampled immediately after **each fixed substep**, before later substeps overwrite impulses. `contactImpulse()` supplies normal impulse in N·s, and `solverContactPoint()` supplies a world-space contact point. Multiple colliders on the same rigid-body pair are reduced to the strongest manifold; this prevents compound desk colliders producing several sounds. Relative speed is optional in the event contract and is omitted: post-solver velocity would misrepresent the incoming speed. No physics engine was assumed or replaced.

```
Rapier fixed step -> contact manifold -> pair filter -> physics:impact
  -> AudioManager.playImpact
  -> ImpactVFXManager (currently a no-op hook)
  -> gameplay bridge -> game:obstacle-hit -> orange obstacle outline

existing fallen detector -> gameplay bridge -> game:object-cleared
  -> scoring subscriber -> existing onChange/renderScore -> score/progress UI
```

The event bus has JSDoc event/payload types, following the JavaScript codebase without introducing TypeScript. Impact payloads include `objectId`, `otherObjectId`, `audioMaterial`, `surfaceMaterial`, `position` (`{x,y,z}` in world coordinates), `impactStrength`, `isObstacle`, and optional `obstacleId`/`relativeSpeed`. Missing audio metadata opts an object out of sound; physics/VFX events still work.

Ordinary impacts never award points. The existing independent once-only topple bonus remains unchanged. Clearance is the existing `fallen` condition: the body's origin is more than 0.5 m below its initial Y, once per reset. The bridge emits `game:object-cleared` only for that condition and excludes obstacles. The scoring subscriber rejects unknown, repeated and inactive-round clearances. Debug scoring controls remain available as before.

## Give an object audio

In a scene instance in `src/scenes/*.scene.json`, add:

```json
{ "audioMaterial": "ceramic" }
```

This is an additional property on the existing full instance, not a replacement for its ID, transform or physics. To default all instances of an asset, put `audioMaterial` on its entry in `src/assets/asset-manifest.json`; per-instance values take precedence. Allowed materials: `plastic`, `paper`, `metal`, `ceramic`, `glass`, `wood`. Metadata is validated and carried through the existing asset factory to the physics body. AudioManager never checks object names.

Declare `surfaceMaterial` on a surface instance or asset. For object-object contacts, the other object's `audioMaterial` is the fallback surface type. Undefined surfaces stay unknown; the system does not assume every surface is wood. One pair produces one impact, preferring an opted-in dynamic body. If both bodies have metadata, one representative is used, rather than layering two sounds.

The existing `preview-mug-on-desk` is the ceramic integration example. Only that mug opts in; other mugs keep their current configuration. `preview-study-desk` declares `surfaceMaterial: "wood"`. No GLB, scale, collider, mass or motion behavior changes.

Objects marked `isObstacle: true` produce the separate obstacle feedback event and do not score via the physics bridge. The active game had no obstacle instances or orange outline to reuse; a single lightweight reusable orange box outline is supplied. To try it, mark a collidable object as an obstacle in a local scene configuration, collide a dynamic object with it, and observe the outline without score gain. There are no new default obstacle objects.

## Add MP3 samples

Put legally licensed short samples here:

```
src/assets/audio/impacts/<audioMaterial>/<surfaceMaterial>/<level>/<variant>.mp3
src/assets/audio/ui/<soundId>/<variant>.mp3
```

For example, `src/assets/audio/impacts/ceramic/wood/medium/hit-01.mp3`. Levels must be exactly `light`, `medium`, `heavy`. Folder names must match the material IDs. Filenames are arbitrary variants; lowercase kebab-case is recommended. The UI API also supports a single `ui/<soundId>.mp3`. `playUISound('start')` is connected to Start/Restart. `movement/` is reserved and discovered/copied but has no playback API yet.

The plastic, paper, metal, ceramic and glass vs wood folders for all three levels are intentionally empty. No binary audio is included. WAV, OGG and M4A are also discovered; check codec support on the target WebView. Use short, trimmed, consistently normalized recordings; long music should not be added to this short-sample preload catalog.

Because this is esbuild, not Vite, `buildAudioAssets()` recursively discovers local files during every build, copies them to `www/assets/audio/`, and writes `catalog.json`. The runtime fetches that local catalog and preloads/decodeAudioData buffers. No hand-maintained sample list is needed. Empty folders generate `[]`, and missing/failed files are skipped. Development on localhost warns once for each missing requested material/level or UI ID. You can explicitly set `development: true` in the AudioManager constructor for remote development. There is no fallback to a different material or intensity level.

**Cloudflare and external storage are not required.** These sound effects ship with the app, work offline once installed, and use relative asset URLs compatible with Capacitor.

## Tune and extend

`src/feedback/config.js` holds the central settings:

- `minImpulse`: ignore normal impulses below 0.025 N·s.
- `cooldownSeconds`: 0.11 s per rigid-body pair, retained across brief separations.
- `strengthIncreaseRatio` / `strengthIncreaseMinimum`: retrigger sustained contacts only after a significant increase. Steady support and small vibration stay silent.
- `mediumImpulse` / `heavyImpulse`: select intensity folders at 0.15 / 0.5 N·s.
- `fullVolumeImpulse`, `minVolume`, `maxVolume`: square-root impulse-to-gain curve with clamping.
- `poolSize`: ten positional voices; `uiPoolSize`: three non-positional voices. Free voices are reused, then busy voices are stolen. Web Audio buffer-source nodes are single-use by browser design; Three.js listener, gain, panner and audio objects are pooled.
- Playback rate range: 0.96–1.04. Spatial attenuation: `refDistance` and `maxDistance` (Three's default inverse distance model).

Tune against real samples and device speakers. Add a new material ID to `AUDIO_MATERIALS` and the JSDoc `AudioMaterial` union in `events.js`, then create folders for the combinations you need. No AudioManager object-name branches or physics changes are required.

`AudioManager` exposes `init(camera, scene)`, `preload()`, `unlock()`, `playImpact(event)`, `playUISound(id)`, `setMasterVolume(0..1)`, `setMuted(boolean)` and `dispose()`. Init once with the active camera and world scene; the app uses a scene with identity transform for world-space source positions. Init attaches one listener and allocates the pools. First pointer/key gesture or Start resumes the context. Locked impacts are discarded rather than replayed later. Dispose unsubscribes gesture listeners, stops/disconnects nodes and releases buffers without closing Three's globally shared context. The app's pagehide cleanup also disconnects event subscriptions and disposes physics; back/forward-cache pages retain their state.

For future particles, pass `{ onImpact(event) { /* position, materials, strength */ } }` to `ImpactVFXManager`. Dispose managers and event subscriptions when replacing a game scene. Physics contains no audio, UI or scoring calls.

## Build, verify and package

Use Node 24 (repository instructions):

```sh
npm ci
npm test
npm run build
npm run preview
npm run android:sync
```

Build validates assets and emits `www`; `capacitor.config.json` already has `webDir: "www"`. Android sync rebuilds and copies all bundled files, including the catalog and sounds, into Capacitor. Then use the existing Android Studio/Gradle workflow. There is no configured iOS platform in this checkout; if one is added, build then use `npx cap sync ios`. No native code edits are needed. Do not commit `www` or native generated output.

No lint or type-check scripts are configured. Unit/integration checks cover contact filtering, real Rapier impulses/rest/reset, existing scoring and swats, audio pooling/lifecycle, empty catalog discovery, and VFX/outline subscriptions. A Chromium mobile smoke check also exercised scene loading, Start, swat, pause/resume, empty catalog, and actual Web Audio unlock/playback/pooling/mute/disposal using an in-memory silent test buffer. No playable sound files are shipped, so final listening, codec and attenuation checks require licensed samples and an Android/iOS device.

## File inventory

Created files:

- `docs/collision-feedback.md`
- `docs/superpowers/plans/2026-11-08-collision-feedback.md`
- `scripts/audio-assets.mjs`
- `scripts/audio-assets.test.js`
- `src/assets/audio/README.md`
- `src/assets/audio/impacts/ceramic/wood/heavy/.gitkeep`
- `src/assets/audio/impacts/ceramic/wood/light/.gitkeep`
- `src/assets/audio/impacts/ceramic/wood/medium/.gitkeep`
- `src/assets/audio/impacts/glass/wood/heavy/.gitkeep`
- `src/assets/audio/impacts/glass/wood/light/.gitkeep`
- `src/assets/audio/impacts/glass/wood/medium/.gitkeep`
- `src/assets/audio/impacts/metal/wood/heavy/.gitkeep`
- `src/assets/audio/impacts/metal/wood/light/.gitkeep`
- `src/assets/audio/impacts/metal/wood/medium/.gitkeep`
- `src/assets/audio/impacts/paper/wood/heavy/.gitkeep`
- `src/assets/audio/impacts/paper/wood/light/.gitkeep`
- `src/assets/audio/impacts/paper/wood/medium/.gitkeep`
- `src/assets/audio/impacts/plastic/wood/heavy/.gitkeep`
- `src/assets/audio/impacts/plastic/wood/light/.gitkeep`
- `src/assets/audio/impacts/plastic/wood/medium/.gitkeep`
- `src/assets/audio/movement/.gitkeep`
- `src/assets/audio/ui/.gitkeep`
- `src/feedback/audio-catalog.js`
- `src/feedback/audio-catalog.test.js`
- `src/feedback/audio-manager.js`
- `src/feedback/audio-manager.test.js`
- `src/feedback/config.js`
- `src/feedback/events.js`
- `src/feedback/game-events.test.js`
- `src/feedback/impact-filter.js`
- `src/feedback/impact-filter.test.js`
- `src/feedback/impact-vfx-manager.js`
- `src/feedback/impact-vfx-manager.test.js`
- `src/feedback/obstacle-feedback.js`
- `src/feedback/rapier-impacts.js`

Modified files:

- `scripts/build.mjs`
- `scripts/desk-physics.test.js`
- `src/app.js`
- `src/assets/load-assets.js`
- `src/assets/validation.js`
- `src/physics-score-bridge.js`
- `src/physics/desk-physics.js`
- `src/physics/physics-body.js`
- `src/physics/physics-events.js`
- `src/physics/physics-world.js`
- `src/scenes/study-desk-gameplay.scene.json`

Responsibilities: `events.js` defines the typed bus; `config.js` centralizes tuning/material IDs; `impact-filter.js` gates pair contacts; `rapier-impacts.js` reads contact manifolds; `audio-catalog.js` selects groups/levels/gain; `audio-manager.js` owns Web Audio; `impact-vfx-manager.js` is the future-effects hook; `obstacle-feedback.js` renders the reusable outline. Corresponding tests cover behavior. `audio-assets.mjs` discovers and copies packaged samples, and `build.mjs` invokes it. The scene JSON opts in the mug and desk; asset loading/validation and physics-body code carry metadata. Physics world/events/desk integration capture impulses and reset state. The scoring bridge maps gameplay events, and `app.js` wires subscribers, unlock, frame updates and cleanup. The README and placeholders reserve sample folders; the plan records implementation decisions.

Final verification: Node v24.19.0; `npm ci` succeeded; `npm test` passed 96/96 tests; `npm run build` validated four assets across three layouts and emitted the site; `git diff --check` passed; Capacitor output/catalog existence checks passed. `npm run preview` plus `node work/browser-feedback-check.mjs` passed the Chromium smoke checks described above (using installed `/usr/bin/chromium`). The smoke script is an ignored intermediate under `work/`, not a shipped module. Existing dependency notices were uuid deprecation during install and Rapier WASM initialization deprecation during tests. No lint/type-check commands exist in package.json. Capacitor sync/device listening remain manual; no native files were modified.

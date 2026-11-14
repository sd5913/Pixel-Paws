# Collision Feedback Implementation Plan

**Goal:** Implement the user's collision-feedback specification using the existing JavaScript/esbuild/Three.js/Rapier stack.

**Architecture:** Keep legacy physics notifications intact. Sample Rapier contact manifolds after each fixed substep, reduce compound-collider contacts to body pairs, and publish filtered impulses through a JSDoc-typed bus. Audio, VFX and gameplay subscribe independently. esbuild generates a bundled audio catalog and copies discovered files into www.

**Constraints:** No new dependencies, fabricated audio, native code or generated output commits. Preserve object physics and existing topple scoring; route successful falls through game:object-cleared. Only the original movable mug opts into ceramic audio; the desk declares wood. There is no existing obstacle outline in the active app, so provide a small reusable orange box-outline subscriber for explicitly marked obstacles.

- [x] Add behavior tests for bus unsubscribe, weak/resting impacts, strength increases, pair cooldown and reset; run red.
- [x] Implement typed shared events, central thresholds, pair filtering and per-substep Rapier manifold collection; preserve existing collision callbacks.
- [x] Add physics metadata propagation and the original mug/desk metadata example.
- [x] Route fallen notifications through a gameplay clearance event and preserve independent topple rules. Subscribe UI scoring and obstacle outline separately.
- [x] Test catalog parsing, missing audio, source pooling, preload failures and disposal; implement Three.js audio manager and VFX hook with startup unlock.
- [x] Add esbuild catalog discovery/copy support and empty audio folders; verify the existing build fixture and a discovered sample fixture.
- [x] Document files, conventions, tuning, lifecycle, build and Capacitor sync.
- [x] Run npm ci, npm test, npm run build and browser smoke checks; verify Capacitor webDir and inspect final diff.

**Review focus:** Fixed substeps must not lose impulses; sustained support forces must stay silent; cooldown survives end/start; empty/failed samples never break gameplay; disposal during preload never repopulates buffers; unknown/obstacle IDs never award points.

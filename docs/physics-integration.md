# Shared physics event integration

## Source and ownership

Fetched `origin/physics/rapier-integration` is at `ec940cb` (Adjust fallen event detection threshold), following `659de1c` (Complete reusable physics event API). The team's physics-world.js, physics-body.js, physics-events.js and event tests are reused directly. Selected files are integrated without merging the branch or replacing the game with its demo. Rapier uses ^0.19.3.

Physics detects states, game logic calculates points, and UI displays the result. There is no UI-side tilt or fall detector.

## Runtime path

1. `src/physics/desk-physics.js` creates the desk, five mug bodies and a kinematic cat proxy using the team's helper. The loader reads physical properties from the manifest's asset.physics fields.
2. Bodies register with shared `physicsEvents`. Dynamic objects enable collision, tipped-over, fallen and settled notifications. Cat and desk enable collisions.
3. Each simulation step drains Rapier collision events and calls processCollisionEvents() and updateBodyStates(). Payloads contain type, objectId and otherObjectId.
4. `src/physics-score-bridge.js` forwards tipped-over to notifyToppled(objectId) and fallen to notifyFallen(objectId). App wrappers enforce the timer deadline and select the floating-score anchor. Other events do not score.
5. `src/scoring.js` awards +10 for toppling and completes each fallen target to 20 points. Direct falls award +20; later events for that target award nothing. This compensation is game logic and does not alter the physics detector. No size tiers or combos apply.

Target IDs and physics body IDs must match. Use the same bridge for Mug, Book and Box; do not write per-model scoring. Unregistered targets cannot score or affect clear progress.

## Current teammate detector

Imported behavior is unchanged:

- Tipped-over: current rotation tilts the body's Y axis over 45 degrees from world up, immediately, once per registration.
- Fallen: body origin descends more than 0.5 world units from its initial Y, once per registration.
- Settled: linear speed below 0.08 and angular speed below 0.1 for 0.6 seconds, once per registration.

This differs from the original suggestions: 60 degrees held for 0.2 seconds relative to the initial upright pose, and complete collision bounds below the table. The current detector does not inspect complete bounds or normalize arbitrary initial model axes. These settings belong to Physics Group; game logic does not reinterpret them. Review other model orientations and collider sizes with Physics Group before adding targets. The previous local target-events.js detector has been removed to prevent competing definitions.

## Reset and lifecycle

Start/Restart/Replay restore body positions and rotations, clear velocities, forces and torques, reset the cat proxy, drain pending collisions, and unregister/register bodies to clear per-body event records. Visual poses are synchronized. Actual mug bodies reset, not just scores. Physics pauses before Start and after settlement. Disposal unregisters bodies before freeing the world.

## Verification and limits

Tests load packaged desk and mug GLBs. Real cat contact pushes the original mug off the table, earns both events for 20 points and settles once. A five-body test checks independent direct falls (100 points), final-only settlement, initial stability and reset without stale events. Shared manager tests cover collision, tilt, fall and settled notifications. Bridge and rule tests cover filtering and lifecycle guards.

Manual check: Start in the normal preview, push mugs with the joystick and outer Dash region, check +10 topple increments and +10/+20 fall increments, and Restart/Replay. Five mugs should return, score should reset and time should show 60 seconds. Explicit debug mode scores only its three synthetic IDs, not physical mugs.

Colliders remain simple boxes, including the cat proxy and cup cavity/handle approximation. There is no separate paw contact. Detector tuning, other model orientations, balance and Android performance require team/device review. No commit, push, PR, remote branch merge or deployment is performed.

## Varied-size mug playtest

The five gameplay mugs now use uniform scales 3.6, 4.2, 4.8, 5.4 and 6, respectively (1.2x through 2x their previous scale of 3). Existing positions are retained: original cup right/far, mug-2 left/far, mug-3 right/near, mug-4 left/near and mug-5 center/far. Both mesh and collider use the instance scale. All masses remain 0.25, friction remains 0.65, and scoring remains 10 for toppling / 20 total after falling. This isolates the size change without modifying shared physics detection. Larger cups are not guaranteed to topple more easily: their base width, center of mass, inertia and contact height all change together. Current automated tests check initial stability, collision scale, physical contact and reset, but do not establish reliable on-table toppling for every size. Compare walking and outer-joystick Dash in the preview and report which sizes tip before leaving the table.

## Player swat (replaces the remote K-key demo)

K and the bottom-right SWAT button now trigger the same production action in normal gameplay. No debug flag is required. The old fixed-target torque shortcut is removed. PawWave plays once at increased speed over 0.75 seconds. Movement/turning pauses during this brief action. At 0.24 seconds, one oriented box intersection query checks the physical colliders in front of the cat. All intersecting dynamic objects receive one forward/upward impulse at a point above their centre of mass. A miss still animates but applies no force and awards no points. The usual physics events alone determine scoring.

Tuning is centralized in src/swat.js: box width 0.45 m, depth 0.35 m, height 0.45 m, centre 0.4 m forward and 0.25 m above the cat's base. The region follows the cat's facing direction and never seeks a target. Impulses use mass times configured velocity change (2.1 m/s forward, 0.35 m/s upward). Cooldown equals animation duration; holding K does not repeat. Start/Replay resets the action. Focus loss, hidden tabs and settlement cancel pending impact; editable fields ignore K. The controller refuses pre-start and post-end actions.

The SWAT button uses a transparent, code-native SVG at src/assets/ui/ui-button-swat.svg, with brick red, pale grey and cream paw artwork. Replace that image or its img source to use final artwork without changing logic. It supports ordinary touch click while joystick input remains separately captured. Normal gameplay hides it before Start and after settlement.

Tests verify animation motion, one delayed hit, spam rejection/cancellation, multiple in-region targets, side/back/far misses, real body velocity/rotation and scoring only after physical simulation. The front box and timing approximate the PawWave contact rather than matching each animated claw precisely. Device testing and art review should tune reach, animation timing and force together.

The paw contact point is offset 0.06 m toward the cat's left, in addition to the existing 0.1 m upward offset. The same forward impulse therefore creates a small rightward yaw through real off-centre contact. The offset rotates with the cat; linear impulse, hit region and scoring are unchanged. Adjust SWAT.leftContactOffset to tune this spin.

# Additional room UI and scoring

## Protected-object rules

Level one has no protected objects. Level two protects the glass measuring jug
and mixing bowl (50 points deducted per object). Level three protects the snow
globe and vintage lantern (80 points deducted per object). Each deduction happens at most once per round,
breaks the active combo and can make the score negative. Breaking or tipping
an object on the tabletop does not itself trigger a drop penalty.

Protected objects are excluded from clear targets and the base score used for
star ratings. The updated level-two thresholds are 93 / 370 / 509; level-three
thresholds are 165 / 660 / 1030. A new round/restart shows the actual models inside circular frames, with red
penalty bubbles. The borderless overlay counts down five seconds and starts
the round automatically; there is no confirmation button or extra countdown.
Resuming does not repeat the warning. Gameplay does not display the warning.

All rooms have a loading screen and retry state for load errors. Levels two and
three show signed score popups at the affected object, bonus text on a combo,
and a combo count alongside the yellow time bar. Decorative fragments and
puddles remain excluded from scoring.

Levels 2 and 3 reuse the first level's HUD, digit artwork, combo meter, countdown,
pause artwork and result layout. Each round lasts 45 active seconds. Pausing and
the three-second resume countdown do not consume round time.

## Kitchen

Each carrier group scores once. Toppling awards half its base points; clearing
awards the remainder. A direct clear awards the full base value. A broken ordinary jar
also completes its group. Detached contents and shards never score again.
Cookie cutters count as one group, completed when all cutters leave the table.
Clearance uses the world-space footprint and tabletop height, not a model pivot
or a fixed drop distance. Props caught by chairs beyond the tabletop still count.

| Points | Groups |
| --- | --- |
| 10 | Piping bag, cookie cutters, oven mitt, berries, cookies, butter cubes, lemon |
| 20 | Recipe book, spice jar, jam, ceramic bowl, egg tray, rolling pin, cupcake, cake slice, butter with knife |
| 30 | Kitchen scale, utensil holder, cutting board, cake stand |

Total base score: 370. Star thresholds: 93 / 370 / 509. Consecutive clears within
two active seconds add 5, 10, then at most 15 bonus points per clear. The timer
and scoring stop immediately when all groups are completed. Records are saved
separately for each room.

## Christmas room

The updated room registers 31 scoring groups and two protected objects: the snow globe and vintage lantern. Static scenery, snow, lights
and other effects are excluded. Tall items (at least 0.4 m) award 30 points, flat
items award 10 and other small props award 20. Base score: 660; star thresholds:
165 / 660 / 1030. Clearance uses the rectangular 3.9 by 5.3 m tabletop and the
physical carrier bounds, so snow/glow effects cannot block a clear. Third-level
three stars require the base score plus 85% of the theoretically available combo
bonus (370 out of 435 bonus points). One protected-object drop prevents three
stars even with a perfect combo. Other levels retain their previous thresholds.

## Try it

Run `npm run build`, then `npm run preview`. Open `/play.html` for level one,
`/level-2.html` for the kitchen or `/level-3.html` for the Christmas room.
Complete level one and select Next to enter level two; clearing the kitchen
enables Next to level three. A timeout offers Retry instead.

In the kitchen, drag the joystick beyond its base to dash; return inside to walk.
Keyboard movement supports Shift to dash. The physical movement motor accepts
both speed limits, with a stronger finite pushing force during a dash. Prop
masses, friction, colliders and source models remain unchanged.

## Campaign UI and saved settings

The time readout is smaller than the score readout so it has more breathing
room inside its artwork. The home screen offers a compact room selector with
each room's saved best score, highest star rating and cleared status. All rooms
remain directly playable. Existing score records are retained. A timeout offers
Retry; successful first and second rooms offer Next. The third room offers Replay
and a completion message, with an all-rooms message only after all three clears.

The seven achievements now record real swat hits and finished rounds in all
three rooms. Protected objects cannot contribute to hit achievements or target
clear counts. Clean Sweep uses the current room's star thresholds, including the
harder third-room rating. Unlocked badges continue to appear in the home book.

Settings has separate music and sound-effect switches and volume sliders. These
settings persist across room navigation and reloads. Sound settings are also
available while paused; closing them returns to the pause menu. First-time players
see a brief move/dash/swat guide before the initial round countdown. The guide
and countdowns do not consume the 45-second round timer.

## Validation

Validated with Node 24 after `npm ci`: the production build and asset validation
pass. `npm test` passes 167 of 168 checks; the remaining iOS export-options check
cannot spawn `python3` in this Windows sandbox (EACCES). No iOS files changed.

Chrome at a 390 by 844 touch viewport verifies simultaneous joystick/SWAT in all
three rooms, first-use guidance, smaller time digits, sound persistence, pause /
settings / resume, timeout / retry, and successful room results. Physical-body
clear checks leave both protected objects on the table and verify 20 kitchen
targets and 31 Christmas targets. Saved progress survives room navigation. No
browser exceptions were observed. Build output and local QA screenshots are
excluded from the feature-branch commit.

# Additional room UI and scoring

Levels 2 and 3 reuse the first level's HUD, digit artwork, combo meter, countdown,
pause artwork and result layout. Each round lasts 45 active seconds. Pausing and
the three-second resume countdown do not consume round time.

## Kitchen

Each carrier group scores once. Toppling awards half its base points; clearing
awards the remainder. A direct clear awards the full base value. A broken jar or
jug also completes its group. Detached contents and shards never score again.
Cookie cutters count as one group, completed when all cutters leave the table.
Clearance uses the world-space footprint and tabletop height, not a model pivot
or a fixed drop distance. Props caught by chairs beyond the tabletop still count.

| Points | Groups |
| --- | --- |
| 10 | Piping bag, cookie cutters, oven mitt |
| 20 | Recipe book, spice jar, jam, ceramic bowl, egg tray, rolling pin |
| 30 | Kitchen scale, utensil holder, mixing bowl, cutting board, cake stand, measuring jug |

Total base score: 330. Star thresholds: 83 / 330 / 454. Consecutive clears within
two active seconds add 5, 10, then at most 15 bonus points per clear. The timer
and scoring stop immediately when all groups are completed. Records are saved
separately for each room.

## Christmas room

The updated room registers 33 movable carrier groups. Static scenery, snow, lights
and other effects are excluded. Tall items (at least 0.4 m) award 30 points, flat
items award 10 and other small props award 20. Base score: 720; star thresholds:
180 / 720 / 990. Clearance uses the rectangular 3.9 by 5.3 m tabletop and the
physical carrier bounds, so snow/glow effects cannot block a clear.

The kitchen now also includes food groups 16–22: 20 points for the cupcake, cake
slice and butter with knife, and 10 for berries, cookies, butter cubes and lemon.
Its updated base score is 430; star thresholds are 108 / 430 / 592.

## Try it

Run `npm run build`, then `npm run preview`. Open `/play.html` for level one,
`/level-2.html` for the kitchen or `/level-3.html` for the Christmas room.
Complete level one and select Next to enter level two; clearing the kitchen
enables Next to level three. A timeout offers Retry instead.

In the kitchen, drag the joystick beyond its base to dash; return inside to walk.
Keyboard movement supports Shift to dash. The physical movement motor accepts
both speed limits, with a stronger finite pushing force during a dash. Prop
masses, friction, colliders and source models remain unchanged.

# Joystick outer-zone dash

The separate Dash button and its cooldown are removed. The 168 px joystick pad remains the walking zone. Dragging beyond its 84 px radius continuously moves at 2.8 metres/second; inside uses analog walking up to 0.55 metres/second. Speeds are centralized in JOYSTICK_SPEED in src/joystick.js. No burst timer or cooldown applies.

A 1.6x diameter translucent outer region appears only while the pointer is outside the original pad. Pointer capture allows moving beyond the original element without losing control. Returning inside stops dash immediately; releasing, pointer cancellation, focus loss, tab hiding, restart and game end clear input and hide the outer zone. The pad is horizontally centered near the bottom, with enough clearance for its outer region. Landscape uses a 144 px pad. Keyboard movement remains walking.

Refresh the ordinary preview and press Start. Press inside the pad and drag around it to walk, then drag outside to dash continuously and reveal the translucent zone. Return inside, release outside, and restart while dashing to verify cleanup. Table edge limits, real cup pushing, scoring and the 60-second round remain in effect. Unused legacy button artwork is excluded from this change.

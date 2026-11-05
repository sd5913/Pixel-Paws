# Mobile UI asset handoff

The game occupies the entire available viewport. HUD and controls overlay the 3D scene; there is no separate website header, footer, navigation or scrolling page. Start and results remain inside the game. Portrait is the initial design reference; landscape remains usable without locking device orientation.

## Design reference and export sizes

Use a 390 x 844 logical-pixel reference frame. Export raster artwork at 3x the intended display size. These are suggested starting sizes, not a requirement for identical screen dimensions on every phone. Keep key controls inside device safe areas; reserve at least 16 logical pixels from safe-area edges. Interactive controls should be at least 48 x 48 logical pixels, including any invisible hit area.

| Purpose | Filename | Display size (logical px) | Export size (px) | Priority |
| --- | --- | --- | --- | --- |
| Score panel background | ui-score-panel.png | 160 x 56 | 480 x 168 | Current |
| Score icon | ui-score-icon.png | 24 x 24 | 72 x 72 | Current, optional |
| Joystick base | ui-joystick-base.svg | 120 x 120 | 360 x 360 viewBox | Implemented |
| Joystick thumb | ui-joystick-thumb.svg | 48 x 48 | 144 x 144 viewBox | Implemented |
| Start button background | ui-button-start.png | 144 x 48 | 432 x 144 | Current |
| Restart button background | ui-button-restart.png | 144 x 48 | 432 x 144 | Current |
| Result panel background | ui-result-panel.png | 320 x 240 | 960 x 720 | Current, integration pending |
| Timer panel background | ui-timer-panel.png | 128 x 56 | 384 x 168 | Future timer |
| Timer icon | ui-timer-icon.png | 24 x 24 | 72 x 72 | Future timer, optional |

Start and Restart may share one button background if the design is identical. Draw the result panel with room for Game Over, Final score, a live number and a Restart button. Result panel artwork is optional for the current text-only settlement; it will require layout integration when delivered. Do not draw a full-screen background image: the 3D scene provides the background.

The white and gray joystick artwork is already provided as scalable SVG in src/assets/ui/ and connected in src/style.css. No separate joystick artwork delivery is needed. The base is translucent with a pale rim and direction marks; the thumb has a white-to-gray surface. Existing drag behavior is preserved.

The optional timer icon is a small clock illustration beside the time. The timer panel is the background behind that icon and the live time text, such as 00:45. They are decorative assets, not the countdown logic. A plain text time display can work without either asset. Do not bake digits into a timer image.

## Export requirements

- Export separate PNG files with transparency, in sRGB. Keep the editable design source too. SVG is welcome for clean vector artwork; agree on that format before replacing the filenames above.
- Keep each asset on the exact canvas size, with consistent padding. Put the joystick base and thumb at the exact center of their respective canvases. Do not trim transparent margins automatically.
- Do not bake Score, timer values, final scores or button labels into artwork. These stay as live English text so they can change, remain sharp and support later localization. Provide font name, font size, weight and text colors separately. Supply a licensed font file only if the project may redistribute it.
- Optional pressed variants use the same dimensions and the suffix -pressed, for example ui-button-start-pressed.png. Disabled and pressed visuals can initially be handled with CSS.
- For stretchable panels, mark which borders must stay fixed in your design source. Provide corner radius and padding measurements; do not stretch decorative corners indiscriminately.
- No need for dash, combo, level-select or unlock artwork in this delivery. No timer functionality is implemented yet.

## Layout handoff

Provide one portrait mockup at 390 x 844 and one landscape mockup at 844 x 390, showing score, future timer placement, joystick, Start and the result overlay. Keep future timer space clear without showing a fake working countdown. Use safe-area guides for a notch and home indicator. Design images describe placement; do not export the entire mockup as the gameplay UI.

Deliver exported files in src/assets/ui/ when ready, or provide a folder/ZIP for integration. The directory need not exist until assets arrive. Generated www/ is never the source location. The current build copies src/assets/ to www/assets/.

## Integration checklist

Map panel artwork to the HUD and button CSS. Replace the joystick base background and knob background without changing pointer handling. Keep score updates in renderScore(snapshot) in src/app.js and preserve the scoring callbacks. Add the result artwork to the existing settlement state, and verify text fits large scores. Check portrait, landscape, safe areas, touch targets, pointer cancellation and no page scrolling. Run npm ci, npm test and npm run build after integration.

## Fullscreen scope

The web canvas fills the browser's content viewport. Browser address bars and the operating system status/navigation bars are outside this CSS layout. True Android immersive fullscreen requires separate native configuration and device validation; it is not claimed by this web layout change.

## Updated PNG artwork and menus

The November 5 artwork is packaged under src/assets/ui with original PNG transparency preserved. New result panels are normalized to ui-result-panel-cleared.png and ui-result-panel-timeout.png. The supplied unnamed PAUSED board is ui-pause-panel.png. Start, Restart, Replay, Resume, Home, Pause, Retry and HUD panels use the supplied artwork; the paw decoration is packaged for reuse. No additional corner masks apply to these PNGs. The existing SWAT art and joystick remain.

Pause freezes the deadline, body stepping, character animation, input and score notifications. Resume reanchors the remaining fractional time. Restart resets the round; Home restores the scene and returns to the logo/Start screen. Result artwork selects cleared versus timeout. Retry reloads a failed scene load. The provided triangular pause icon is used unchanged with an accessible Pause label. Browser checks verified Start, Pause, Resume and Home on a narrow viewport. Timer tests verify that paused time is excluded. No commit or push is performed.

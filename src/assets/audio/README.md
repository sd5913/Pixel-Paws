# Bundled sound effects

Add legally licensed short MP3 samples under `impacts/<audioMaterial>/<surfaceMaterial>/<level>/<variant>.mp3`.
Levels are exactly `light`, `medium`, `heavy`. Materials: plastic, paper, metal, ceramic, glass, wood.
Example: `impacts/ceramic/wood/medium/hit-01.mp3`. Any filename is a variant; use lowercase kebab-case.
UI samples: `ui/<soundId>/<variant>.mp3` (or a single `ui/<soundId>.mp3`).
`movement/` is reserved for future movement sounds. WAV, OGG and M4A are also discovered; codec support depends on the target WebView.

Empty directories are intentional. No audio is supplied. `npm run build` discovers samples, copies them into `www/assets/audio/`, and generates `catalog.json`. Rebuild after adding files. Do not edit the generated catalog.
See `docs/collision-feedback.md` for integration, tuning and Capacitor instructions.

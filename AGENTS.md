# Team Signal app

Use Node 24. Run `npm ci`, `npm test`, and `npm run build` after changes. The
web source is in `src/`; `www/` is generated. For Android run `npm run
android:sync` before Gradle. Do not commit secrets, signing keys or generated
build output. Keep changes small and tell reviewers how to try them.

For 3D asset generation, material/scale changes, GLB validation, or asset handoff,
read `.agents/skills/cozy-lowpoly-assets/SKILL.md` first. Follow `docs/assets/`
for style, scale, scene design and manifest conventions. The approved mug is the
reference: preserve its bytes, native scale and appearance unless a change is
explicitly requested. Run `npm run assets:validate`, `npm run assets:reproduce:mug`,
`npm test` and `npm run build`; preview with `npm run assets:preview`.
Keep asset work independent of gameplay, physics, touch controls and scoring.

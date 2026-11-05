# Reference asset foundation: validation results

Reviewed 2026-11-04 (Asia/Hong_Kong), on top of feature commit
`e54440eab49690b0cc655c684f426612f4db9d70` from
`feat(assets)-add-mug-GLB-model`.

## Preservation

- `mug.glb` moved to `src/assets/models/mug.glb`, byte-identical.
- SHA-256: `e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e`.
- `asset-spec.json` moved to `src/assets/asset-spec.json`, byte-identical.
- Generator moved under `src/assets/generators/`; only output paths and usage
  comment changed. Geometry, materials, colors, normals and proportions retained.
- Actual W/H/D: **0.11909234523773193 × 0.09600000083446503 ×
  0.08799999952316284 m**. No rescaling/recentering. Native body-base origin and
  +Z front documented as approved exceptions.
- No new 3D assets or scene instances. Existing gameplay, physics, controls,
  scoring and Android source remain unchanged.

## Checks

| Check | Result |
| --- | --- |
| Node | 24.19.0 |
| `npm ci --offline` | Passed using cached locked packages; existing uuid deprecation warning |
| Khronos GLB validation | Zero errors, zero warnings; two informational unused UV attributes |
| `npm run assets:validate` | Passed: two assets, one scene, one existing instance |
| Measured bounds vs manifest/spec | Exact spec dimensions; manifest within 1e-6 m tolerance |
| `npm run assets:reproduce:mug` | Two isolated r180 runs match approved GLB bytes and spec exactly |
| `npm test` | 19 passed, zero failures |
| `npm run build` | Passed; models/manifest packaged, authoring sources excluded |
| `npm run android:sync` | Passed |
| Native Gradle tests/build | Not verified: wrapper distribution not cached; download failed with UnknownHostException for services.gradle.org |
| Browser preview | Chromium: 390×844 and 360×800 canvases, 65°/70°/75°, collider and desk-scale views; zero browser errors |
| Diff checks | Clean; protected gameplay and native source unchanged |

The portrait preview was visually checked for clipping, the rim/inner bowl,
handle, raised paw, facets and asymmetric collider alignment. The full-size desk
guide makes the preserved mug's smaller height apparent. This is a preview of the
already approved design, not a redesigned replacement. No cat exists in this
change; animated front-paw visibility remains a future acceptance check.

The skill application dry run successfully found the correct dimensions, physical
fields, native-origin exception, isolated r180 reproduction and camera checks.
Independent code review found no critical/important issues. Its two minor findings
(missing external-resource test coverage and preview canvas aspect ratio) were
addressed and checks rerun.

# Team Pixel Paws

Pixel Paws is a small game about a cat clearing objects off a desk. Move with
the on-screen joystick or keyboard, swat objects, score points, and collect
achievements. Best scores and achievements are saved on the current device.
The game has no account, leaderboard, or in-game currency. It uses Three.js
and is playable on the web, with an iOS version in preparation.

## Run and change

Install Node 24, then from the repository root:

```bash
npm ci
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/` for the project homepage, then choose **Play**
to start a round. Move the joystick to push mugs; drag beyond its inner pad for
continuous Dash. Change `src/` and rerun the checks. A
teammate can branch, commit, push and open a PR with a description and test
instructions. Actions uploads the `web` folder and an Android **debug APK**;
download an artifact from the run and test it. The APK is not a signed store
release.

For GLB placement, validation, and the physics handoff contract, see
[`docs/asset-pipeline.md`](docs/asset-pipeline.md).

For the first tabletop scoring system, test instructions and the
physics integration API, see [`docs/scoring.md`](docs/scoring.md). The current
scene connects eight desktop props to shared physical topple/fall events: toppling earns
10 points and falling completes each target to 20 points. Rounds end when all targets fall or after 45 seconds. See
[`docs/physics-integration.md`](docs/physics-integration.md) for detector limits.
Use `play.html?debugScoring=1` to explicitly enable simulated scoring controls.

Choose **Look** on the title screen to try the three illustrated lighting
presets. **Achievements** opens the seven-badge collection. New badges appear on
the results screen and are saved on the current device. See
[`docs/achievements.md`](docs/achievements.md) for rules and verification.
The collision feedback pipeline loads local samples when available. See
[`docs/collision-feedback.md`](docs/collision-feedback.md) for the sample paths.

For mobile UI artwork filenames, export sizes and layout handoff requirements,
see [`docs/ui-assets.md`](docs/ui-assets.md).

## Shared 3D Asset Viewer

Run `npm run viewer:serve` after `npm ci`, then open
http://localhost:4175/asset-viewer/ to inspect manifest assets, visualize bounds
and colliders, or compare illustrated rendering presets. This viewer is separate
from the game. See [`tools/asset-viewer/README.md`](tools/asset-viewer/README.md)
for controls, offline export, validation, and Pages packaging without deployment.

## Publish a versioned release

When your team is ready to share a tested build, push a version tag:

```bash
git switch main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

The tag must use `vMAJOR.MINOR.PATCH` (for example, `v1.0.0`). Actions runs the
web checks and Android build first; only if both pass does it create a GitHub
Release with `web.zip` and `android-debug.apk`. Find them under your repository's
**Releases**. The APK uses Android's debug signing key and is for testing, not
a Play Store release; use proper signing and store credentials for distribution.
Run the workflow manually to download a `release-preview` artifact without
publishing a release. A new release needs a new tag. Keep GitHub Actions enabled and allow the
workflow's `GITHUB_TOKEN` contents-write permission. A tag creates a public
release in a public repository; do not push one until you are ready to publish.

## Codex cloud environment

Connect GitHub, create a new task and choose **Work in → Cloud → Select
environment → Create environment**, then choose your new repository. Ask Codex
to run `.codex/setup.sh` with Node 24; review setup output and changes, save and
**Publish**. Start a new task: “Change the message after a second tap and run
the tests.” Review its diff, run the app, and ask a teammate to review the PR.
The setup script configures the coding workspace. GitHub Actions uses separate
fresh runners. See [Codex environments](https://learn.chatgpt.com/docs/environments/cloud-environments).

## Android and iOS

For Android install JDK 21 and Android SDK, set `ANDROID_HOME`, then:

```bash
npm run android:sync
cd android && ./gradlew assembleDebug
```

The APK is in `android/app/build/outputs/apk/debug/`. GitHub Actions prepares
its own Android runner and uploads it without store credentials. A Play release
needs its own signing and store setup. iOS requires a Mac, Xcode, an Apple
developer account for distribution and a separately added iOS platform; see
[Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).
Electron desktop packaging is a separate wrapper; see
[Tetrilaunch's desktop workflow](https://github.com/venetanji/tetrilaunch/blob/main/.github/workflows/desktop.yml).

## Deploy with GitHub Pages

The **Deploy web to GitHub Pages** Actions workflow builds and publishes `www/`
from the `main` branch. It enables GitHub Pages for the repository if needed
and also supports a manual **Run workflow** deployment. The homepage introduces
the game; select **Play** to open the game at `/play.html`.

Push to `main` or run **Deploy web to GitHub Pages** manually. Open the
deployment URL printed in the `github-pages` environment or from the workflow's
deployment step:

`https://<owner>.github.io/<repository>/`

The build uses relative asset paths, so it works at that project subpath. Pull
requests do not deploy to Pages.

### Privacy Policy for iOS TestFlight

The intended public URL is `https://sd5913.github.io/Pixel-Paws/privacy/`.
The policy source is `src/privacy/index.html`. Edit that file when the app's
data practices change, review the wording against the current iOS build, and
update its effective or last updated date as appropriate. `scripts/build.mjs`
copies the `src/privacy/` directory into `www/privacy/`; the existing Pages
workflow publishes that directory alongside the game homepage. Do not edit
the generated `www/` copy directly. To publish this PR before merging, run
the existing **Deploy web to GitHub Pages** workflow manually with this branch
selected, if the `github-pages` environment permits it; that workflow does not
run the iOS upload. A later merge to `main`
also publishes the page through the normal Pages deployment. After a
successful deployment, check the public URL, then enter it in **App Store
Connect → Pixel Paws → App Information → Privacy Policy URL** and in any
TestFlight beta information field that asks for a privacy policy link.

Before submitting the URL, the app owner should verify the shipped iOS build
and bundled dependencies still have no analytics, ads, tracking, account flow,
or server upload of gameplay data; confirm the App Store Connect app privacy
answers and any required privacy manifests match the release. The current
source saves best scores and achievements locally; appearance choices are
handled on-device for the current session rather than persisted. Apple may
separately process diagnostics and feedback for TestFlight testers.

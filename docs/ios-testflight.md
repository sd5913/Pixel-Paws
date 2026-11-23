# Pixel Paws on iOS

The iOS target and shared scheme are `PixelPaws`. Its proposed explicit bundle
ID is `org.sd5913.pixelpaws`, which the owner must confirm is available on the
intended Apple team. If Apple rejects the identifier, update both Xcode build
configurations, `.github/scripts/ios-testflight.sh`, and
`.github/scripts/ios-upload.mjs` together before creating
the App Store Connect record. The top-level Capacitor ID still serves the
existing Android project. The iOS target gets its distribution ID from Xcode.

## Build and test without Apple credentials

Use Node 24 and a Mac with Xcode 26 or later and the iOS Simulator runtime.
The project uses Swift Package Manager and targets iOS 15 and up. Apple currently
requires Xcode 26 or later with the iOS 26 SDK or newer for App Store Connect uploads.

```sh
npm ci
npm test
npm run build
npx cap sync ios
npx cap open ios
```

Select the PixelPaws scheme and an iPhone simulator, then Run. The separate
**iOS build check** workflow compiles an unsigned simulator build and verifies
that it contains the packaged web entry point. It has no Apple credentials.
Commit native project files, and leave the synced web bundle and generated
Capacitor config out of Git.

On a real iPhone, check launch with airplane mode enabled, portrait and landscape
safe areas, two-thumb movement and swat, sound after the first gesture, recovery
after backgrounding, level navigation, and score persistence after relaunch.
Check the oldest supported iOS version available to the team. The app currently
uses the Capacitor template icon and launch artwork. Review those and the
app/dependency privacy manifest requirements before distributing a build.

[Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup) ·
[Apple upload requirements](https://developer.apple.com/news/upcoming-requirements/)

## One-time owner setup for automatic TestFlight uploads

Complete these steps on your trusted device. Use an Apple Account with two-factor
authentication (2FA) enabled and verify the sign-in on the trusted device.
Keep the Apple Account password and 2FA codes out of GitHub. Leave the
workflow disabled until all protections, credentials, and tests are in place.

### 1. Prepare Apple signing and the app record

1. In **Apple Developer → Account → Membership details**, confirm the intended
   paid Developer Program team and record its Team ID. In **Certificates,
   Identifiers & Profiles → Identifiers → +**, register the explicit iOS App ID
   `org.sd5913.pixelpaws`. Enable only capabilities the app uses.
2. Have the Account Holder or Admin use **Certificates → + → Apple
   Distribution** with a certificate signing request generated on an
   owner-controlled machine. Export the issued certificate and its private key
   as a password-protected `.p12` from Keychain Access. This distribution
   identity is **team-scoped**. The certificate is dedicated operationally to
   this workflow, but it can sign for other apps if used with their profiles.
   Keep the private key under owner control.
3. In **Profiles → + → Distribution → App Store Connect**, select the explicit
   Pixel Paws App ID and the exact Apple Distribution certificate exported above.
   Download the app-specific `.mobileprovision`. Reissue it when the
   certificate changes or the profile expires.
4. After the Account Holder accepts current agreements, create the record under
   **App Store Connect → Apps → + → New App**. Choose iOS, the Pixel Paws bundle
   ID, a dedicated SKU such as `pixel-paws-ios`, and Limited Access. Account
   Holder, Admin, or App Manager can create the app record.

[Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id/) ·
[Create a distribution profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/) ·
[Create an app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/) ·
[Apple accounts and roles](https://developer.apple.com/help/app-store-connect/get-started/overview-of-accounts-and-roles/)

### 2. Use an individual, app-restricted upload key

1. Under **App Store Connect → Users and Access → People**, configure a dedicated
   uploader who can see **only Pixel Paws** under **Apps**. Use **Developer**,
   the minimum upload role. Choose **App Manager** only for someone who also
   needs to manage this app. Leave **Access to Certificates, Identifiers &
   Profiles**, reporting access, and broader roles off. Grant **Generate
   Individual API Keys** to the uploader if the user settings require it.
   Student app access can be scoped to Pixel Paws independently of signing and
   GitHub administration. Individual keys inherit their user's access.
2. After the uploader signs in with their own Apple Account and 2FA, open the
   username menu, then **Edit Profile → Individual API Key → Generate Key**.
   Record the Key ID and download the `.p8` once. Keep it in secure storage.
   The automation uses the individual JWT subject `user`. It requires no
   Issuer ID and has no team-key fallback.
3. In that account, verify **Apps** lists only Pixel Paws. To check the key
   itself using only a read request, run this from a locally reviewed checkout
   on your trusted device with Node 24. Replace the file path and the Key ID.

   ```sh
   ASC_KEY="$(base64 < /private/path/to/AuthKey.p8 | tr -d '\n')" \
     ASC_KEY_ID=YOUR_KEY_ID node .github/scripts/ios-upload.mjs check-access
   ```

   The command lists the key's accessible apps and reports only a pass or
   failure and the Pixel Paws app ID on success. Avoid shell tracing, terminal
   recordings, and shared machines. The automatic upload repeats this
   unfiltered access check before creating any build upload reservation.
   If limited app access or individual API keys are unavailable for your team
   or account type, keep this workflow disabled.

[Individual API keys](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/) ·
[Individual JWT claims](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests) ·
[Build Upload API](https://developer.apple.com/videos/play/wwdc2025/324/) ·
[Upload roles](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)

### 3. Enforce the GitHub trust boundary

- In **Settings → Rules → Rulesets** or **Settings → Branches**, enforce
  protection of `main`: require pull requests, trusted Code Owner review,
  dismissal of stale approvals, and required checks including the unsigned
  iOS check. Disable force pushes and restrict bypass, including for admins.
  The owner should set up and verify CODEOWNERS with trusted reviewers for
  the entire tree. In particular, cover CODEOWNERS itself, workflows, Xcode
  projects, dependency manifests and lockfiles, build scripts, and app source
  executed in release builds. Separate reviewers from contributors who need
  ordinary write access.
- In **Settings → Environments**, create `pixel-paws-testflight`. Set
  **Deployment branches and tags → Selected branches and tags**. Remove the
  `main` branch rule and add only the tag rule `v[0-9]*`; do not add any branch
  rules or a wildcard `*` tag rule. GitHub's environment patterns are globs,
  not regular expressions, so this is only a coarse filter. The separate
  validation job enforces the exact `vMAJOR.MINOR.PATCH` syntax and verifies
  the tag's commit is reachable from `main` before the upload job, which is the
  only job that names this environment, can start or read its secrets.
- Add a repository **tag ruleset** targeting `v*`. Restrict creation,
  updates, and deletion to the owner or trusted release administrators. Do
  not grant bypass to ordinary contributors or `GITHUB_TOKEN`. This makes
  published version tags immutable and prevents deletion followed by reuse.
  The workflow also checks that the remote tag still points to the triggering
  commit, including on retries.
- Leave **Required reviewers** off for this environment. An environment
  reviewer would pause each run. The enforced PR/Code Owner review is the
  human approval of the release code; the tag ruleset, exact workflow
  validation, and deployment tag restriction control which ref can use
  credentials.
- If students have repository administration, or the required boundaries
  cannot be enforced, use an **owner-controlled GitHub release repository**.
  Keep the credentials and protected release workflow there. Have the owner
  configure a trusted sync of reviewed source SHAs into that repository's
  protected release branch, then run the automatic build on those pushes.
  Keep release workflow files under sole release-repo control, avoid
  importing contributor-supplied workflows or running source before review,
  and adapt the hard-coded repository/ref guard only in the release repo.
  Reserve one active pipeline per app and keep build numbers above any
  existing uploads when migrating. Do not place release credentials in the
  student-administered repo.

[GitHub environment branch restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) ·
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) ·
[GitHub Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

### 4. Add environment configuration and enable

Store all entries below on **pixel-paws-testflight**, with the enable
variable added last. Never put personal or team-wide Apple keys or signing
material into repository-wide or organization-wide secrets or share them
with students.

| Environment entry | Kind | Source |
| --- | --- | --- |
| `PIXEL_PAWS_APPLE_TEAM_ID` | Variable | Apple Developer Membership details |
| `PIXEL_PAWS_ASC_INDIVIDUAL_KEY_ID` | Variable | App Store Connect uploader's Edit Profile, Individual API Key |
| `PIXEL_PAWS_DISTRIBUTION_P12_BASE64` | Secret | Base64 of the Apple Distribution identity exported from Keychain Access |
| `PIXEL_PAWS_DISTRIBUTION_P12_PASSWORD` | Secret | Password set when exporting the identity |
| `PIXEL_PAWS_PROVISIONING_PROFILE_BASE64` | Secret | Base64 of the app-specific App Store Connect `.mobileprovision` |
| `PIXEL_PAWS_ASC_INDIVIDUAL_KEY_BASE64` | Secret | Base64 of the uploader's individual App Store Connect `.p8` |
| `PIXEL_PAWS_TESTFLIGHT_ENABLED` | Variable | Set to `true` only when ready for automatic upload |

For each file, use `base64 < /private/path/to/file | tr -d '\n' | pbcopy`
on a trusted Mac and clear the clipboard afterward. Keep the signing
identity out of the uploader account. The workflow builds the web assets and
resolves pinned dependencies before loading Apple credentials. The signing
step uses a temporary keychain and profile, exports a local IPA, then removes
signing material. The upload step receives only the individual key and deletes
the export at job completion. No signed artifact is attached to the run.

### 5. Publish a version from the GitHub website

The iOS marketing version comes from the tag: `v1.1.0` produces
`CFBundleShortVersionString` `1.1.0`. The Xcode project still has a development
default of `1.0`; the release workflow overrides it from the validated tag.
`CFBundleVersion` is generated from the GitHub Actions run number and attempt,
so a workflow retry gets a new Apple-compatible build number rather than
reusing the previous attempt's number. The same tag and commit are required on
every attempt.

The existing App Store Connect history uses version `1.0`. Before the first
automated release, inspect **App Store Connect → Apps → Pixel Paws →
TestFlight → Builds** and select an unused, higher marketing version; use
`v1.1.0` if it is available. Do not start with `v1.0.0` or another version
that Apple has already received. For every later release, choose a new,
unused, higher version and never move or reuse a tag.

1. Make sure the release changes have been merged to protected `main` through
   the required review and checks. Confirm the desired commit is on `main`
   and the version tag does not already exist.
2. Open the repository's **Releases** page and choose **Draft a new release**.
3. In **Choose a tag**, enter the exact tag, for example `v1.1.0`, and choose
   **Create new tag on publish**. Set **Target** to `main` (or to the reviewed
   commit on `main` that should be released). Do not use a branch or commit
   that is not reachable from protected `main`.
4. Enter a release title, add release notes, and choose **Publish release**.
   Publishing creates the tag and starts the tag-based Web/Android and
   TestFlight workflows. The Web/Android workflow reuses the release created
   by the website and uploads/replaces its generated package assets; it does
   not fail by trying to create a duplicate release.
5. In **Actions**, check the tag's **Check and build** and **Upload Pixel Paws
   to TestFlight** runs. The TestFlight workflow first checks the exact tag
   format, the remote tag target, and reachability from `main`. Those checks
   run before the job that selects `pixel-paws-testflight`; malformed tags or
   tags on unreviewed branches cannot reach its credentials. If
   `PIXEL_PAWS_TESTFLIGHT_ENABLED` is not `true`, no signed build or upload is
   performed.
6. When enabled, note the generated build number in the run and inspect the
   matching marketing version and build under **App Store Connect → Apps →
   Pixel Paws → TestFlight → Builds**. Wait for Apple's processing to finish.

If a run fails, check **App Store Connect** before retrying: each retry has a
new build number, so an upload accepted by Apple but reported ambiguously may
otherwise result in an additional build. Retry only the same tag and commit;
the workflow rechecks the remote tag before signing and refuses a moved tag.
Use a new version tag for a new release, not a retry.

### 6. TestFlight testers

The export configuration does not restrict a build to internal testing, so
the uploaded build can be considered for future external testing. Uploading
does not automatically submit a build for Beta App Review or distribute it
to testers.

In **TestFlight → Internal Testing**, create a group and add eligible App
Store Connect users who have access to Pixel Paws. Enable automatic
distribution for a group if you want it to receive each eligible build, or
use **Add Builds** to assign a build. Complete any required export compliance
questions. Testers accept in the TestFlight app, and internal testing does
not require external beta review. This workflow only uploads a build. It never
assigns testers, starts external review, submits for public App Review, or
releases on the App Store. Finish by running the real iPhone checks above.

For external testing, use **TestFlight → External Testing** in App Store
Connect after processing. Complete Apple's beta app information and export
compliance questions, create an external group, add the processed build, and
submit it for Beta App Review. External distribution begins only after Apple
approves it and you enable distribution for the group.

[Internal TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/) ·
[External TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/) ·
[Apple build statuses](https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses/)

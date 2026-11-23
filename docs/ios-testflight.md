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

Once the workflow has reached protected `main` and the enable variable is
set, the next reviewed push starts **Upload Pixel Paws to TestFlight**.
Changes to docs count too. Watch the **Actions** run for that SHA and note
the build number and upload ID from the upload step. Check **App Store
Connect → Apps → Pixel Paws → TestFlight → Builds** for that version and build
number, then wait for Apple processing. The Actions result confirms the
upload was committed for processing. Confirm the processed build in App Store
Connect. The export allows both internal and external TestFlight testing;
the upload does not assign the build to either group.

GitHub queues release runs, with a queue limit of 100 pending runs. Each run
and retry attempt has a distinct numeric build number. If delivery status is
uncertain, check App Store Connect before retrying. If Apple already accepted
the build, let it process. Otherwise, rerun the latest applicable main run
after correcting the failure. Retries of superseded commits stop before
signing. For an existing TestFlight history, make sure the first automated
build number exceeds prior uploads for that marketing version. Bump the
marketing version or migrate the numbering before enabling if needed.

### 5. Internal testers

In **TestFlight → Internal Testing**, create a group and add eligible App
Store Connect users who have access to Pixel Paws. Enable automatic
distribution for a group if you want it to receive each eligible build, or
use **Add Builds** to assign a build. Complete any required export compliance
questions. Testers accept in the TestFlight app, and internal testing does
not require external beta review. Finish by running the real iPhone checks above.

For external testing, use **TestFlight → External Testing** in App Store
Connect after processing. Complete Apple's beta app information and export
compliance questions, create an external group, add the processed build, and
submit it for Beta App Review. External distribution begins only after Apple
approves it and you enable distribution for the group.

[Internal TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/) ·
[External TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/) ·
[Apple build statuses](https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses/)

### 6. External testers

After Apple processes the build, complete any export compliance questions in
App Store Connect. In **TestFlight → External Testing**, create a group and
select the build. Provide the required beta test information, including what
to test, a feedback contact, and any sign-in or review instructions Apple
requests. Submit the build for **TestFlight App Review** and wait for Apple's
approval before inviting external testers by email or public link. Apple may
review later builds too. This workflow only uploads the IPA; an authorized
App Store Connect user must manage the external group, review submission,
and invitations. Beta approval does not publish the app on the App Store.

[External TestFlight testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/) ·
[TestFlight App Review](https://developer.apple.com/help/app-store-connect/test-a-beta-version/submit-a-build-for-beta-app-review/) ·
[Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/determine-and-upload-app-encryption-documentation/)

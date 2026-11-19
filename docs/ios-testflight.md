# Pixel Paws on iOS

The iOS target and shared scheme are `PixelPaws`. Its proposed explicit bundle
ID is `org.sd5913.pixelpaws`, which the owner must confirm is available on the
intended Apple team. If Apple rejects the identifier, update both Xcode build
configurations and `.github/scripts/ios-testflight.sh` together before creating
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

## Owner setup

1. In Apple Developer **Certificates, Identifiers & Profiles → Identifiers**,
   register an explicit iOS App ID for `org.sd5913.pixelpaws`. Enable capabilities
   only when the project needs them. Find the Apple Team ID under **Membership details**.
2. In **Certificates**, have the Account Holder or Admin create an Apple Distribution
   certificate for this workflow using a CSR generated on an owner-controlled Mac.
   Install the issued certificate alongside its private key and export that
   identity as a password-protected `.p12` from Keychain Access. The profile is
   app-specific. The distribution certificate itself is team-scoped.
3. In **Profiles**, create an **App Store Connect** distribution profile for the
   explicit Pixel Paws ID and the selected certificate. Download the
   `.mobileprovision`. Reissue the profile if the certificate changes.
4. In **App Store Connect → Apps → New App**, create an iOS record for Pixel Paws
   using that bundle ID and a dedicated SKU such as `pixel-paws-ios`. The Account
   Holder must accept Apple's current agreements. Account Holder, Admin or App
   Manager can create the record.
5. In **App Store Connect → Users and Access → Integrations → App Store Connect
   API → Team Keys**, have an Admin create a dedicated key with the **Developer**
   role, Apple's lowest role for build upload. Record the Key ID and Issuer ID
   and download the `.p8` once. This workflow uses the Xcode team-key
   authentication path. A team key has its role across all apps on the Apple
   team. If that scope is unacceptable, use the owner-controlled Mac option
   below with an app-limited Developer account where available.

[Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id/) ·
[Create a distribution profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/) ·
[Create an app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/) ·
[App Store Connect API keys](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api)

### Protect the GitHub environment first

This repository was public when checked. GitHub documents required reviewers
and deployment branch policies for public repositories on current plans. An
administrator must verify that both controls are available and enforced in the
actual repository before storing credentials.

- Create **Settings → Environments → pixel-paws-testflight**. Set **Required
  reviewers** to the repository owner or designated release owner. Restrict
  **Deployment branches and tags** to **Selected branches and tags**, with a
  branch rule for `main` only and no tag rules. Disable administrator bypass
  where supported. If another trusted maintainer will dispatch, enable
  **Prevent self-review**. If there is only one trusted person, use the local
  upload option when independent review is required.
- Protect `main` with a ruleset requiring PRs and trusted maintainer review,
  with direct pushes and bypass limited or disabled. Set CODEOWNERS and require
  code-owner approval for `.github/`, `ios/`, package manifests and lockfiles,
  and build scripts. Review the whole release SHA, including any other code
  executed by the build. A contributor with write access can propose workflow
  changes on a branch. Restrict who can modify the protected branch, change
  these protections, or administer the environment to trusted release maintainers.
- Add the following **environment-only** entries after protection is in place.
  Never put a personal Apple key or any signing material in repository-wide or
  organization-wide secrets, and never share the keys or passwords with students.
  A dispatch using an implicitly created environment has no credentials and
  cannot proceed with the default configuration.

| Environment entry | Kind | Source |
| --- | --- | --- |
| `PIXEL_PAWS_TESTFLIGHT_ENABLED` | Variable | Set to `true` only after verifying protections and setup |
| `PIXEL_PAWS_APPLE_TEAM_ID` | Variable | Apple Developer Membership details |
| `PIXEL_PAWS_ASC_KEY_ID` | Variable | App Store Connect Team Keys, Key ID |
| `PIXEL_PAWS_ASC_ISSUER_ID` | Variable | App Store Connect Team Keys, Issuer ID |
| `PIXEL_PAWS_DISTRIBUTION_P12_BASE64` | Secret | Base64 of the Apple Distribution identity exported from Keychain Access |
| `PIXEL_PAWS_DISTRIBUTION_P12_PASSWORD` | Secret | Password set when exporting the identity from Keychain Access |
| `PIXEL_PAWS_PROVISIONING_PROFILE_BASE64` | Secret | Base64 of the Apple Developer App Store Connect `.mobileprovision` |
| `PIXEL_PAWS_ASC_KEY_BASE64` | Secret | Base64 of the dedicated App Store Connect Team Key `.p8` |

On the owner Mac use `base64 -i /path/to/file | tr -d '\n' | pbcopy` for each
base64 value. Clear the clipboard afterward. If reviewer or branch restrictions
are unavailable, leave the workflow disabled and use an owner-controlled Mac.
Build the reviewed `main` commit there, select the Pixel Paws team and signing
profile locally in Xcode, choose **Product → Archive**, then upload using the
Organizer's **TestFlight Internal Only** distribution option. Keep signing
material in the Mac's keychain and managed credential storage.

[GitHub environment protection and plan availability](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) ·
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

### Upload and invite internal testers

After the reviewed workflow reaches protected `main`, open **Actions → Upload
Pixel Paws to TestFlight → Run workflow**, select `main`, and supply an unused
positive integer build number. Use a larger number for each upload of the same
marketing version, including retries after an accepted upload. The release owner
checks the run's commit SHA before approving the environment. The workflow
checks out that exact commit and uploads an internal-only build. It does not
publish to the App Store or attach signed artifacts to the workflow run.

Wait until Apple finishes processing. In **App Store Connect → Apps → Pixel
Paws → TestFlight**, complete any required export compliance questions and
create an **Internal Testing** group with automatic distribution disabled.
Invite eligible App Store Connect users with access to Pixel Paws, then use
**Add Builds** to assign the processed build. Testers accept the invitation in
TestFlight on their iPhone. Rotate or revoke credentials in the respective
Apple portals if they are exposed or the release owner changes.

[Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/) ·
[Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

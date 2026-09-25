# BASIRA Agent Operating Contract

Read `docs/WORK_STATE.md` and `docs/work-state.json` before changing BASIRA.
Treat them as the current handoff and update both after every verified milestone.

## Work mode

- Continue through diagnosis, implementation, verification, build, and handoff without asking for routine confirmations.
- Keep user updates silent or very short while work is running. Report only a result, a real blocker, or a required user device test.
- Never claim a device-only behavior works until it is tested on a physical Android device.
- Preserve the Android package name `com.basira.spiritportal`.
- Never commit passwords, keystores, service-account files, tokens, or private keys.
- Do not replace a working Firebase configuration with an older downloaded copy.

## Required Android build order

1. Read the work-state files.
2. Verify Firebase Android package and OAuth clients with `npm run verify:android`.
3. Run `npm run check`.
4. Run `npx cap sync android`.
5. Run `npm run verify:android` again.
6. Build with Java 21 and Android SDK 36.
7. Sign with the existing BASIRA key.
8. Verify the APK package, SHA-1, SHA-256, and embedded web assets.
9. Ask for one physical-device test only after all previous gates pass.
10. Record the result in both work-state files.

## Google sign-in invariants

- Use native `@capacitor-firebase/authentication` on Android.
- Try Google Credential Manager first and retry automatically with `useCredentialManager: false` if it fails.
- Do not map every native exception without an error code to a SHA/Firebase configuration error.
- `google-services.json` must contain:
  - the Android client for `com.basira.spiritportal`;
  - an Android OAuth client with the active signing certificate;
  - a Web OAuth client used as `default_web_client_id`.
- The active BASIRA debug signing certificate is recorded in `docs/work-state.json`.

## Rewarded ad invariants

- Never grant a reward from a timer or from an ad-open event.
- Grant it only from the rewarded callback.
- Handle reward, dismiss, failure, and timeout paths so the UI cannot hang.

## Palm-reading invariants

- Any image containing a genuine visible human palm is valid, even when fine lines are faint or lighting is uneven.
- Reject only when no palm is visible or the image is unusable.
- Never restore `ERROR_PALM_LINES_UNREADABLE` as a user-facing rejection.
- When detail is limited, complete a smaller reading from visible contours, proportions, mounts, or major lines without inventing marks.
- Keep the regression test for `PALM_READING_GUARD` passing.

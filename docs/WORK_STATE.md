# BASIRA Current Work State

Updated: 2026-09-26, Europe/Amsterdam

## Read this first

This is the canonical handoff for future ChatGPT/Codex/Work sessions. Continue from this state. Do not restart the Firebase, Google Sign-In, AdMob, or palm-image diagnosis from the beginning.

## Canonical code baseline

- Repository: `amirhamrouni/basira`
- Branch: `main`
- Reconciliation merge: `8f0e82fdc1dff53ed984df3fd679bd039342b56c`
- Reconciliation PR: `#15`
- Baseline composition:
  - last verified Work state: `8505afdf27387ca97a83c11f3006046ec6ca79f3`
  - visible-palm hotfix: `e0ede8b39fcb1ff633f3554fee3f5793e7bccbe0`
- PR `#14` was an experimental AdMob reimplementation and is closed without merge. Do not revive it.
- Android package: `com.basira.spiritportal`
- Version currently built: `1.0 (1)`

## Palm reading invariant

The visible-palm regression is fixed and must stay fixed.

- Any genuine visible human palm is a valid input even if fine lines are faint, cropped, dim, or unevenly lit.
- `ERROR_PALM_LINES_UNREADABLE` is not an accepted user rejection path.
- When fine detail is limited, complete a limited reading using genuinely visible major lines, contours, proportions, mounts, branches, or intersections.
- If an older/model response emits the removed unreadable-lines sentinel, retry automatically as a limited reading instead of rejecting the palm.
- Never invent marks that are not visible.
- The selected palm image preview stays unfiltered; do not restore a dark opacity/blend overlay.
- Regression test is present and passing.

## Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Android app exists for `com.basira.spiritportal`.
- Active signing SHA-1 registered in Firebase:
  `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Active signing SHA-256 registered in Firebase:
  `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- `google-services.json` contains a matching Android OAuth signing client and a Web OAuth client.
- Native sign-in first tries Google Credential Manager.
- If Credential Manager fails, it retries automatically with `useCredentialManager: false`.
- Native errors without a recognized Firebase configuration code retain their real error instead of being falsely mapped to a missing-SHA message.
- `scripts/verify-android.mjs` verifies Android OAuth and Web OAuth prerequisites before build.
- Physical-device Google Sign-In result is still recorded as pending until explicitly verified on the current install.

## AdMob

AdMob was already created/configured in the Google console by the previous Work session and is integrated in the Android app. Do not recreate it.

- Capacitor plugin: `@capacitor-community/admob` `8.1.0`
- Google Mobile Ads SDK present in the known-good APK: `25.4.0`
- UMP: `4.0.0`
- AdMob App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded Ad Unit ID: `ca-app-pub-1233451496176046/5417205489`
- The simulated `setTimeout` reward implementation is removed from the canonical source.
- Reward is granted only after the native `Rewarded` event.
- Dismissed, failed-to-show, and 90-second timeout paths are handled.
- Listener cleanup is implemented after the reward attempt.
- Physical-device rewarded-ad test is still pending until explicitly recorded.

## Latest known-good installable APK

- Filename: `BASIRA-palm-hotfix.apk`
- SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`
- Size: `10,661,767 bytes`
- Signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Contains the real AdMob integration.
- Contains the visible-palm hotfix.

## CI verification after reconciliation

PR `#15` / head `5bcd9e3c5d7df2d601ada9acf59034928e350241` passed:

- TypeScript: PASS
- Automated tests: `15/15` PASS
- Vite production build: PASS
- Production smoke: PASS
- Capacitor Android sync: PASS
- Android OAuth/Web OAuth prebuild gate: PASS
- AdMob plugin discovered during Capacitor sync: PASS
- Gradle `assembleDebug`: PASS
- Gradle tasks: `216` executed
- Generated CI APK SHA-256: `c6a511917496e9573a965859ee6aa0d91ac648d7a085771f5fc80733ff1946c5`
- APK v2 signature verification: PASS

GitHub Actions does not currently have `BASIRA_DEBUG_KEYSTORE_BASE64`, so its generated APK uses the runner's Android debug certificate and must not be treated as an update over the existing signed BASIRA install. Restore the original signing secret before using CI artifacts as upgrade-compatible builds.

## Play Console and subscription

This is the remaining monetization work. Do not pretend it is already completed.

- Rewarded AdMob unit exists and is integrated.
- Google Play Billing subscription implementation is not complete.
- No verified subscription Product ID exists yet.
- No verified base-plan ID exists yet.
- Server-side Google Play purchase verification is not implemented/verified yet.
- Current Premium UI still contains the old free-beta fallback and must not be treated as a paid subscription.
- Do not invent Product IDs in code. Create the real subscription/base plan in Play Console first, then wire those exact IDs.
- A real purchase must be verified server-side before granting `vipStatus`/premium entitlement.

## Next execution sequence

1. Keep `main` at or after reconciliation merge `8f0e82f`; never restore the simulated rewarded-ad timer or the old palm rejection path.
2. Create the real subscription product and base plan in Google Play Console.
3. Implement Google Play Billing using the exact Console IDs and server-side purchase verification.
4. Restore `BASIRA_DEBUG_KEYSTORE_BASE64` in GitHub Actions so CI can preserve signing-certificate continuity.
5. On a physical Android device verify, in order: Google Sign-In → rewarded ad after the free-reading allowance → real subscription purchase/restore.
6. Only after all three device gates pass, build the release AAB and proceed with Play Console release checks.

## Operational rules

- Required JDK: 21
- Gradle wrapper: 8.14.3
- compileSdk/targetSdk: 36
- minSdk: 24
- Never publish or rotate the existing signing key during troubleshooting.
- Do not commit keystores, private service-account credentials, or other secrets to Git.
- Treat this file and `docs/work-state.json` as the source of truth for future sessions.

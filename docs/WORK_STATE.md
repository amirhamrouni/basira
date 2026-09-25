# BASIRA Current Work State

Updated: 2026-09-25, Europe/Amsterdam

## Read this first

This file is the handoff for future ChatGPT/Codex sessions. Continue from this state. Do not restart the Firebase or AdMob diagnosis from the beginning.

## Current branch and code state

- Repository: `amirhamrouni/basira`
- Working branch: `feat/basira-context-engine`
- Latest remote fix: `35a6458dedb8ca861d4ce68d863e1c8690951251`
- Android package: `com.basira.spiritportal`
- Version currently built: `1.0 (1)`
- Physical-device validation of the newest Google sign-in fallback: **pending**

## Google sign-in: last verified state

- Firebase project: `gen-lang-client-0217548336`
- Firebase account used for the project: `hamrouniamir79@gmail.com`
- Android app exists in Firebase for `com.basira.spiritportal`.
- Active signing SHA-1 is registered in Firebase:
  `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Active signing SHA-256 is registered in Firebase:
  `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- The refreshed local `google-services.json` contains the matching Android OAuth client and a Web OAuth client.
- The built APK contains `default_web_client_id` generated from the Web OAuth client.

### Root cause found on 2026-09-25

`AuthProvider.tsx` converted every native exception without a code into the Arabic “Google is not configured / add SHA-1” message. That message was therefore not proof of a missing SHA certificate.

### Fix applied

- Native sign-in tries Google Credential Manager.
- If that call fails, it retries automatically through the plugin's legacy Google flow with `useCredentialManager: false`.
- Errors without a recognized Firebase configuration code keep their real message.
- `scripts/verify-android.mjs` now rejects builds lacking an Android OAuth signing client or Web OAuth client.

### Latest verified APK

- Filename: `BASIRA-google-auth-fixed-v2.apk`
- File SHA-256: `2f80cfb2ae8b22d3307804c85e9bf379634fc27f5c5560e0e71aa6e257fbddbe`
- Size: `10,661,767 bytes`
- APK signature verification: PASS using v2 and v3.
- Embedded fallback check: PASS (`useCredentialManager:false` found in bundled web assets).
- Remaining gate: install this exact APK on the phone and complete Google sign-in.

## AdMob: last verified state

- Native AdMob plugin is wired into Android.
- Simulated reward timer was removed.
- Reward is granted only by the native rewarded event.
- Dismiss, failure-to-show, and timeout paths are handled.
- TypeScript, 14 tests, Vite build, Capacitor sync, and Android debug build passed.
- Production ad delivery may still depend on AdMob app/payment review.

## Play Console and payments: last known state

- Rewarded AdMob unit was created and native integration is present.
- Merchant/public address requested by the user: `Maagdenburgstraat 2, 7421 ZB Deventer`.
- Support email requested by the user: `hamrouniamir79@gmail.com`.
- Saving the merchant profile was not verified; revisit Play Console and confirm the visible saved values.
- Google Play Billing subscription and server-side purchase verification are still incomplete.
- Do not mark Stage 5/6 complete until a real rewarded ad and a real subscription test pass on device.

## Repair timeline

- `11b5d9a`: replaced the simulated reward timer with a native rewarded-ad event.
- `4a33df4`: synchronized generated Android AdMob plugin files.
- `8f05e58`: added rewarded, dismissed, failed-to-show, and timeout handling.
- `5909e2a`: made CI signing behavior explicit when the signing secret is missing.
- `d65bb3b`: added the native Google sign-in fallback and removed false generic SHA classification.
- `35a6458`: added Android OAuth and Web OAuth build validation.
- `edd82d0`: linked this persistent handoff from the repository README.
- `e0ede8b`: hotfix merged into `main`; visible palms are accepted even when fine lines are faint, the API retries a limited reading, and the dark preview filter was removed.

## Verified build results

- TypeScript: PASS
- Automated tests: 15/15 PASS
- Vite production build: PASS
- Capacitor Android sync: PASS
- Android auth prebuild gate: PASS
- Gradle `assembleDebug`: PASS with Java 21
- APK signature and certificate check: PASS

## Next action

1. Install `BASIRA-google-auth-fixed-v2.apk` over the existing app.
2. Tap Google sign-in.
3. If it succeeds, record `google_sign_in_device: pass` in `docs/work-state.json`.
4. If it fails, capture the new on-screen error. The build now exposes the actual error instead of the false SHA message.
5. After login passes, test rewarded ads after the three free readings, then continue the subscription and Play Console release work.

## Palm regression resolved on 2026-09-25

- Cause: later commit `a5d5bfb` restored `ERROR_PALM_LINES_UNREADABLE`, undoing the earlier visible-palm acceptance fix.
- Production fix: merged to `main` as `e0ede8b39fcb1ff633f3554fee3f5793e7bccbe0`.
- Production verification: `https://basira-1-2fwh.onrender.com/api/health` returned healthy with Gemini ready; the served palm UI contains the new unfiltered preview asset.
- Rule: a visible palm must receive a limited grounded reading; faint fine lines alone cannot reject it.
- APK: `BASIRA-palm-hotfix.apk`
- APK SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`

## Known operational details

- Android SDK path used in the build environment: `/workspace/android-sdk`
- Required JDK: 21
- Gradle wrapper: 8.14.3
- Build tools: 35.0.0 and 36.0.0 are available.
- Never publish or rotate the existing signing key during troubleshooting.
- The refreshed Firebase file is used locally for the verified APK. Do not place credentials, keystores, or private service-account data in Git.

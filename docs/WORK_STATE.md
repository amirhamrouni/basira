# BASIRA Current Work State

Updated: 2026-09-25 15:05, Europe/Amsterdam

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
- Google Play Billing client and server-side verification are implemented locally.
- Product ID: `basira_oracle_monthly`; Android base plan ID: `monthly`; intended price: €4.99/month.
- `@capgo/native-purchases` 8.8.1 is synced into Android and the billing permission is explicit.
- The old local 7-day beta grant was removed. The client cannot grant `vipStatus`.
- `/api/purchases/google/verify` verifies the Firebase ID token, Google Play subscription token, product, account binding, state, and expiry before the server writes `vipStatus: oracle`.
- Restore-purchases and localized store-price loading are present.
- Play Console login was verified on developer account `7101587915626451499`, app `4976344417830805219`.
- Current Play Console blocker: no Google Payments merchant profile exists. Until it is created, subscriptions cannot be created in Play Console.
- Production backend still needs secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (JSON or base64 JSON) for a service account authorized for both Firebase Admin and Android Publisher API.
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

## Billing implementation verification on 2026-09-25

- TypeScript: PASS
- Automated tests: 16/16 PASS, including active/expired/wrong-product subscription cases
- Vite production build: PASS
- Capacitor Android sync: PASS; native purchases plugin detected
- Android auth prebuild gate after sync: PASS
- New APK build: BLOCKED BY SESSION ENVIRONMENT, not by code. This session has Java 17 only, while BASIRA requires Java 21, and the Gradle 8.14.3 distribution is not cached; outbound download is blocked.

## Next action

1. Install `BASIRA-google-auth-fixed-v2.apk` over the existing app.
2. Tap Google sign-in.
3. If it succeeds, record `google_sign_in_device: pass` in `docs/work-state.json`.
4. If it fails, capture the new on-screen error. The build now exposes the actual error instead of the false SHA message.
5. Create the Google Payments merchant profile in Play Console (requires explicit confirmation because it creates a financial profile).
6. Create subscription `basira_oracle_monthly` with base plan `monthly` at €4.99/month.
7. Configure the Android Publisher service account secret on the production backend.
8. Build with Java 21, upload to internal testing, install from Google Play, and test purchase + restore on a physical device.

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

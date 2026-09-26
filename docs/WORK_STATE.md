# BASIRA Current Work State

Updated: 2026-09-26, Europe/Amsterdam

## Read this first

This is the canonical handoff for future ChatGPT/Codex/Work sessions. Continue from this state. Do not restart the Firebase, Google Sign-In, AdMob, palm-image, or Play Billing implementation diagnosis from the beginning.

## Canonical code baseline

- Repository: `amirhamrouni/basira`
- Canonical branch after merge: `main`
- Billing implementation PR: `#17`
- Last fully verified Billing code head: `574a5b22251ca49c342ba4a39d557bcec0b57ee9`
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

## Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Android app: `com.basira.spiritportal`
- Active signing SHA-1 registered in Firebase: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Active signing SHA-256 registered in Firebase: `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- Native sign-in first tries Google Credential Manager, then automatically retries with the legacy Google flow.
- Physical-device sign-in test remains pending until explicitly recorded.

## AdMob

AdMob was already created/configured in Google Console by the previous Work session and is integrated. Do not recreate it.

- Capacitor plugin: `@capacitor-community/admob` `8.1.0`
- AdMob App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded Ad Unit ID: `ca-app-pub-1233451496176046/5417205489`
- Simulated timer reward is removed.
- Reward is granted only after the native rewarded callback.
- Dismiss, failure, timeout, and listener cleanup paths are handled.
- Physical-device rewarded-ad test remains pending.

## Google Play Billing implementation

The Billing implementation is complete in code and verified, but it is deliberately NOT commercially activated yet because no real Play Console Product/Base Plan has been confirmed.

Implemented:

- Google Play Billing Library `9.1.0` through native `BasiraBillingPlugin`.
- Purchase and restore flows for subscriptions.
- Product/Base Plan IDs are loaded at runtime from `/api/billing/config`; they are not hard-coded into the APK and no placeholder IDs are invented.
- The old local 7-day `Free beta` Premium fallback is removed.
- Purchase uses an `obfuscatedAccountId` derived from the Firebase UID.
- Server verifies the Firebase ID token before accepting a purchase token.
- Server verifies the token with Google Play `subscriptionsv2` for package `com.basira.spiritportal`.
- Server rejects purchases not bound to the signed-in Firebase account.
- Server acknowledges an entitled pending-acknowledgement subscription.
- Server alone writes `vipStatus` and `premium*` entitlement metadata.
- Active, grace-period, and canceled-but-not-yet-expired subscriptions may be entitled; pending, paused, on-hold, and expired subscriptions are not.
- Client enforces server-written `premiumUntil` as a fail-closed expiry guard.
- Premium readings do not consume the free-reading allowance or Energy.
- Raw purchase tokens are not persisted in the billing audit record; only a SHA-256 fingerprint is stored.
- Firestore rules source blocks client changes to `vipStatus`, `premiumUntil`, `premiumProductId`, `premiumBasePlanId`, `premiumState`, and `premiumVerifiedAt`.
- Runtime smoke test starts the real production server entrypoint, verifies `/api/health`, verifies the safe Billing config route, and proves the verification route is mounted before the API 404.

Still required before a real subscription can be called live:

- Create/confirm the real Subscription Product in Play Console.
- Create/confirm and activate its Base Plan and price.
- Put the exact IDs into Render as `PLAY_SUBSCRIPTION_PRODUCT_ID` and `PLAY_SUBSCRIPTION_BASE_PLAN_ID`.
- Configure a Google service account with Android Publisher API access as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- Configure Firestore server-write credentials, or grant the same service account the required Firestore IAM permission.
- Deploy the hardened `firestore.rules` to the Firebase project.
- Run real purchase and restore tests from a Play-distributed build on a physical Android device.

## Verification for Billing code head `574a5b2`

- TypeScript: PASS
- Automated tests: `24/24` PASS across `8` test files
- Vite production build: PASS
- Existing production smoke: PASS
- New production-server runtime/Billing smoke: PASS
- Capacitor Android sync: PASS
- Android OAuth/Web OAuth prebuild gate: PASS
- AdMob plugin discovery during sync: PASS
- Gradle `assembleDebug`: PASS
- Gradle tasks: `216` executed
- Generated CI APK SHA-256: `3b28dd68ee6810a88b999b58e0032775d98eedee60b0a6bf8a681435a70fc855`
- APK v2 signature verification: PASS

GitHub Actions still does not have `BASIRA_DEBUG_KEYSTORE_BASE64`. The CI APK therefore uses a runner Android debug certificate and must NOT be installed as an update over the existing BASIRA build. Restore the original BASIRA signing key secret before treating CI artifacts as upgrade-compatible.

## Latest known-good installable APK before Billing activation

- Filename: `BASIRA-palm-hotfix.apk`
- SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`
- Signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Contains real AdMob and the visible-palm hotfix.
- Does not represent the new Play Billing implementation.

## Production deployment

- Primary Render service: `basira-1`
- Primary URL: `https://basira-1-2fwh.onrender.com`
- Render auto-deploys from `main`.
- Billing code can be deployed safely while unconfigured: `/api/billing/config` returns `configured: false` until real Play IDs are added.
- Do not add invented Product/Base Plan IDs or fake service-account credentials just to make the endpoint appear active.

## Next execution sequence

1. Do not reimplement Billing, AdMob, or the palm hotfix.
2. Create/confirm the actual subscription and Base Plan in Play Console.
3. Configure the exact Play IDs and server credentials on Render.
4. Deploy the hardened Firestore rules.
5. Restore `BASIRA_DEBUG_KEYSTORE_BASE64` so Android CI preserves signing-certificate continuity.
6. On a physical Android device verify: Google Sign-In → rewarded ad after free allowance → real subscription purchase → restore purchase → Premium expiry behavior.
7. Only after those device gates pass, build the release AAB and proceed with Play Console release checks.

## Operational rules

- Required JDK: 21
- Gradle wrapper: 8.14.3
- compileSdk/targetSdk: 36
- minSdk: 24
- Never publish or rotate the existing signing key during troubleshooting.
- Never commit keystores, private service-account credentials, purchase tokens, or other secrets to Git.
- Treat this file, `docs/work-state.json`, and `AGENTS.md` as the source of truth for future sessions.

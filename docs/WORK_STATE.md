# BASIRA Current Work State

Updated: 2026-09-26, Europe/Amsterdam

## Read this first

This is the canonical handoff for future ChatGPT/Codex/Work sessions. Continue from this state. Do not restart Firebase, Google Sign-In, AdMob, palm handling, or Play Billing implementation from the beginning.

## Canonical baseline

- Repository: `amirhamrouni/basira`
- Canonical branch: `main`
- Verified runtime baseline before this handoff-only update: `c463bdd568d57becca8abbe1280956f120ff8066`
- Billing implementation PR: `#17`, merged as `69a88a8ff5486ed7a1b54cbc18e2fc4ec4b0cd5a`
- Permanent Billing production-smoke PR: `#18`, merged as `c463bdd568d57becca8abbe1280956f120ff8066`
- PR `#14` was an experimental AdMob reimplementation and is closed without merge. Do not revive it.
- Android package: `com.basira.spiritportal`
- Version currently built: `1.0 (1)`

## Palm reading invariant

- Any genuine visible human palm is valid even if fine lines are faint, cropped, dim, or unevenly lit.
- `ERROR_PALM_LINES_UNREADABLE` is not an accepted user rejection path.
- If detail is limited, complete a limited reading from genuinely visible major lines, contours, proportions, mounts, branches, or intersections.
- If an older/model response emits the removed unreadable-lines sentinel, retry automatically rather than rejecting the palm.
- Never invent marks that are not visible.
- Keep the selected palm preview unfiltered. Do not restore a dark opacity/blend overlay.

## Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Active signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Active signing SHA-256: `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- Native sign-in tries Google Credential Manager first and automatically retries with the legacy Google flow.
- Physical-device sign-in result remains pending until explicitly recorded.

## AdMob

AdMob already exists in Google Console and is integrated. Do not recreate it.

- Plugin: `@capacitor-community/admob` `8.1.0`
- App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded Unit ID: `ca-app-pub-1233451496176046/5417205489`
- The simulated timer reward is removed.
- Reward is granted only after the native rewarded callback.
- Dismiss, failure, timeout, and listener cleanup paths are handled.
- Physical-device rewarded-ad result remains pending.

## Google Play Billing implementation

Billing is complete in code and deployed, but it is deliberately NOT commercially activated because the real Play Console Subscription Product/Base Plan has not been created or verified.

Implemented and verified:

- Google Play Billing Library `9.1.0` through native `BasiraBillingPlugin`.
- Subscription product query, purchase, and restore flows.
- Product/Base Plan IDs are loaded at runtime from `GET /api/billing/config`; no placeholder IDs are hard-coded into the APK.
- The old local 7-day `Free beta` Premium fallback is removed.
- Purchase uses `obfuscatedAccountId` derived from the Firebase UID.
- Server verifies Firebase ID token and Google Play `subscriptionsv2` for package `com.basira.spiritportal`.
- Server rejects a purchase not bound to the signed-in Firebase account.
- Server acknowledges entitled subscriptions that still require acknowledgement.
- Server alone writes `vipStatus` and `premium*` entitlement metadata.
- Active, grace-period, and canceled-but-not-yet-expired subscriptions may be entitled; pending, paused, on-hold, and expired subscriptions are not.
- Client enforces server-written `premiumUntil` as a fail-closed expiry guard.
- Premium readings do not consume the free-reading allowance or Energy.
- Raw purchase tokens are not persisted in the billing audit record; only a SHA-256 fingerprint is stored.
- Firestore rules source prevents clients from changing `vipStatus`, `premiumUntil`, `premiumProductId`, `premiumBasePlanId`, `premiumState`, and `premiumVerifiedAt`.
- Runtime tests start the real production server and verify health, safe Billing config, and authenticated verification-route placement.
- Production smoke permanently checks `/api/billing/config` so future deploys cannot silently lose or partially configure the route.

## Verification

Billing implementation code head `574a5b22251ca49c342ba4a39d557bcec0b57ee9` passed:

- TypeScript: PASS
- Automated tests: `24/24` PASS across `8` files
- Vite production build: PASS
- Production-server runtime/Billing smoke: PASS
- Capacitor Android sync: PASS
- Android OAuth/Web OAuth prebuild gate: PASS
- AdMob plugin discovery: PASS
- Gradle `assembleDebug`: PASS, `216` tasks
- CI APK SHA-256: `3b28dd68ee6810a88b999b58e0032775d98eedee60b0a6bf8a681435a70fc855`
- APK v2 signature verification: PASS

Final production-smoke follow-up `#18` also passed web-quality and Android build/verification. After its merge, both Render services deployed `c463bdd...` and reached `live`. A production smoke run executed after that final deploy and passed. It explicitly reported `Production Billing config: not configured`, which is the expected safe state until real Play IDs are supplied.

GitHub Actions still does not have `BASIRA_DEBUG_KEYSTORE_BASE64`. Its generated APK uses a runner Android debug certificate and must NOT be treated as an update over the existing BASIRA install.

## Latest known-good installable APK before Billing activation

- Filename: `BASIRA-palm-hotfix.apk`
- SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`
- Signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Contains real AdMob and the visible-palm hotfix.
- Does not contain the new Play Billing implementation.

## Production deployment

- Primary Render service: `basira-1` at `https://basira-1-2fwh.onrender.com`
- Secondary Render service: `basira` at `https://basira-qx6d.onrender.com`
- Both auto-deploy from `main`.
- Final runtime commit `c463bdd568d57becca8abbe1280956f120ff8066` is live on both.
- Public Billing route is present and healthy.
- Current Billing activation state: `configured: false`.
- Do not invent Product/Base Plan IDs or fake service-account credentials merely to flip this state.

## Remaining external activation gates

These are not implementation tasks to redo. They require Google/Firebase/signing access that is not available through the current connected tools.

1. Create or confirm the real Google Play Subscription Product.
2. Create or confirm and activate the Base Plan and price.
3. Set exact `PLAY_SUBSCRIPTION_PRODUCT_ID` and `PLAY_SUBSCRIPTION_BASE_PLAN_ID` on Render.
4. Configure `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` with Android Publisher API access.
5. Configure Firestore server-write credentials or equivalent IAM access.
6. Deploy the hardened `firestore.rules` to Firebase.
7. Restore `BASIRA_DEBUG_KEYSTORE_BASE64` in GitHub Actions for signing continuity.
8. From a Play-distributed physical Android build verify: Google Sign-In → rewarded ad after free allowance → real subscription purchase → restore → Premium expiry behavior.
9. Only after those device gates pass, produce the release AAB and continue Play Console release checks.

## Operational rules

- JDK: 21
- Gradle wrapper: 8.14.3
- compileSdk/targetSdk: 36
- minSdk: 24
- Never publish or rotate the existing signing key during troubleshooting.
- Never commit keystores, private service-account credentials, purchase tokens, or other secrets to Git.
- Treat this file, `docs/work-state.json`, and `AGENTS.md` as the source of truth for future sessions.

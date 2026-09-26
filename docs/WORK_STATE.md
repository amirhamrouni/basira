# BASIRA Current Work State

Updated: 2026-09-26, Europe/Amsterdam

## Read this first

This is the canonical handoff for future ChatGPT/Codex/Work sessions. Continue from this state. Do not restart Firebase, Google Sign-In, AdMob, palm handling, Play Billing implementation, or Firestore deployment diagnosis from the beginning.

## Canonical baseline

- Repository: `amirhamrouni/basira`
- Canonical branch: `main`
- Last verified runtime commit: `fe17eaa06d2f741692610dcf8abcb3b40fb672a0`
- Billing implementation PR: `#17`, merged as `69a88a8ff5486ed7a1b54cbc18e2fc4ec4b0cd5a`
- Permanent Billing production-smoke PR: `#18`, merged as `c463bdd568d57becca8abbe1280956f120ff8066`
- Firestore/Play activation-prep PR: `#19`, merged as `fe17eaa06d2f741692610dcf8abcb3b40fb672a0`
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
- Production smoke permanently checks `/api/billing/config`.

## Play subscription UX / policy prep

PR `#19` added pre-purchase and subscription-management safeguards:

- The app displays the real Google Play formatted price and billing period only after Play returns a real offer.
- The purchase CTA stays disabled until that real offer metadata is loaded.
- Auto-renewing offers disclose that renewal continues until cancellation; non-auto-renewing offers disclose that they do not renew automatically.
- The screen explicitly states that BASIRA can also be used without Premium through free readings and rewarded ads.
- A direct Google Play manage/cancel-subscription link is available from the Premium screen.
- Product/Base Plan identifiers are still `TBD` and must never be invented in source code.

## Firestore production rules

BASIRA uses the named Firestore database:

`ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`

PR `#19` fixed the deploy path so `firebase.json` explicitly targets this named database rather than relying on the default database.

- Client initialization already uses `getFirestore(app, firebaseConfig.firestoreDatabaseId)`.
- `scripts/verify-firebase-config.mjs` verifies the project/database target, rules/index files, client DB selection, and protected Premium fields.
- The normal quality gate runs this validator.
- Manual workflow `Deploy BASIRA Firestore Rules` exists and requires typing `DEPLOY`.
- The workflow deploys Firestore rules only and authenticates from GitHub secret `FIREBASE_SERVICE_ACCOUNT_JSON`.
- The hardened rules are **NOT yet recorded as deployed to Firebase production**. Do not mark them deployed until that workflow (or an equivalent verified Firebase deployment) succeeds against the named database.

## Verification

Billing implementation head `574a5b22251ca49c342ba4a39d557bcec0b57ee9` passed 24/24 automated tests, TypeScript, Vite build, runtime Billing smoke, Capacitor sync, Android auth gate, Gradle `assembleDebug`, and APK signature verification.

Activation-prep head `e5a2dd00aea9ae7408572edc1ee3fe2c89cf1b54` passed:

- Firebase named-database validator: PASS
- TypeScript/tests/Vite (`npm run check`): PASS
- Android structure verification: PASS
- Production smoke before merge: PASS
- Android debug build: PASS
- APK signing step: PASS
- APK verification: PASS

After PR `#19` merged as `fe17eaa...`:

- Primary Render service deployed `fe17eaa...`: LIVE
- Secondary Render service deployed `fe17eaa...`: LIVE
- Production smoke executed after the final deploy: PASS
- Billing remains intentionally unconfigured until the real Play catalog exists.

GitHub Actions still does not have the original `BASIRA_DEBUG_KEYSTORE_BASE64`. Do not treat CI APKs as update-compatible with the existing BASIRA installation until signing continuity is restored.

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
- Verified runtime commit `fe17eaa06d2f741692610dcf8abcb3b40fb672a0` is live on both.
- Public Billing route is present and healthy.
- Current Billing activation state remains `configured: false` until exact Play IDs are created and added to Render.

## Next execution sequence

The next step is external Play Console activation, not more Billing implementation.

1. In ChatGPT Work / Cloud Browser, open Play Console for BASIRA.
2. Go to `Monetize with Play → Products → Subscriptions`.
3. Create or confirm the real Premium Subscription Product. Carefully choose the immutable Product ID.
4. Create and activate its Base Plan, including billing period, price, countries/regions, renewal/grace/account-hold/resubscribe settings. Carefully choose the Base Plan ID because it cannot be changed/reused after activation.
5. Record the exact Product ID and Base Plan ID in the canonical work-state files.
6. Configure Android Publisher API/service-account access and store credentials securely, never in Git.
7. Set on both intended Render production services:
   - `PLAY_SUBSCRIPTION_PRODUCT_ID`
   - `PLAY_SUBSCRIPTION_BASE_PLAN_ID`
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
8. Verify production `/api/billing/config` returns `configured: true` with the exact real IDs.
9. Deploy hardened Firestore rules to the named BASIRA database and record the successful deployment.
10. Restore `BASIRA_DEBUG_KEYSTORE_BASE64` for signing continuity.
11. From a Play-distributed physical Android build verify: Google Sign-In → three free readings → rewarded-ad unlock → real subscription purchase → Premium entitlement → restore → expiry/cancellation behavior.
12. Only after those device gates pass, produce the release AAB and continue Play Console release checks.

Use `docs/PLAY_ACTIVATION_RUNBOOK.md` as the exact activation checklist. Do not reimplement Billing, AdMob, sign-in, or palm handling.

## Operational rules

- JDK: 21
- Gradle wrapper: 8.14.3
- compileSdk/targetSdk: 36
- minSdk: 24
- Never publish or rotate the existing signing key during troubleshooting.
- Never commit keystores, private service-account credentials, purchase tokens, or other secrets to Git.
- Treat this file, `docs/work-state.json`, `docs/PLAY_ACTIVATION_RUNBOOK.md`, and `AGENTS.md` as the source of truth for future sessions.

# BASIRA Canonical Session Entry Point

Updated: 2026-09-26, Europe/Amsterdam

## Start every BASIRA session here

This file is the mandatory resume point for every new ChatGPT/Codex/Work session until the commercial activation cycle is complete.

Do **not** restart Firebase, Google Sign-In, AdMob, palm handling, AI, Play Billing implementation, Firestore targeting, R8 fixes, or release-pipeline work from the beginning unless a verified regression proves one of those areas has broken.

## Current phase

**Phase 6 → Google Play commercial activation**

The application code, backend Billing implementation, CI truth gates, debug/release build pipelines, production deployment, and Billing fail-closed readiness contract are already implemented and verified.

Current production Billing state on both Render services:

- `configured=false`
- `catalogConfigured=false`
- `serverVerificationReady=false`

This is the intended safe state until the real Play catalog and server credentials exist.

## Mandatory execution sequence from this point

1. **Authenticated Google Play Console**
   - Open BASIRA (`com.basira.spiritportal`).
   - Create or verify the real Subscription Product.
   - Create or verify the Base Plan.
   - Record the exact Product ID, Base Plan ID, billing period, price, regions, grace/account-hold/renewal settings.
   - Never invent IDs or prices.

2. **Google Play server verification access**
   - Configure a Google service account with Android Publisher access.
   - Supply it securely as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
   - Never commit or print the credential.

3. **Firebase/Firestore server access**
   - Configure `FIREBASE_SERVICE_ACCOUNT_JSON` where required for Firestore writes/rules deployment.
   - Keep the named database `ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`.

4. **Render production configuration**
   - Set the exact real `PLAY_SUBSCRIPTION_PRODUCT_ID` and `PLAY_SUBSCRIPTION_BASE_PLAN_ID`.
   - Configure the server credentials.
   - Verify `/api/billing/config` becomes `configured=true` only when both catalog and server verification readiness are true.

5. **Firestore Rules production deploy**
   - Run the existing `Deploy BASIRA Firestore Rules` workflow against the named database.
   - Mark rules deployed only after the production deployment succeeds.

6. **Play App Signing / upload key**
   - Inspect the actual BASIRA App Signing and upload-key state in Play Console first.
   - Restore the correct release/upload keystore.
   - Populate the four `BASIRA_RELEASE_*` GitHub Actions secrets.
   - Do not create or rotate a key blindly.

7. **Signed release bundle**
   - Run the existing Android Release AAB workflow.
   - Require signed artifact verification before calling it publishable.

8. **Play testing track + physical Android test**
   - Google Sign-In.
   - Three free readings.
   - Rewarded-ad path.
   - Real subscription purchase.
   - Premium entitlement.
   - Restore subscription.
   - Cancellation/expiry behavior.

9. **Final Play release checks and launch**
   - Only after all device and entitlement gates pass.

## Already completed — do not redo

- Palm visible-hand regression and limited-reading fallback.
- Google Sign-In architecture and OAuth prebuild validation.
- Native rewarded AdMob integration.
- Google Play Billing Library 9.1.0 implementation.
- Server-side Firebase token + Google Play verification.
- UID purchase binding and acknowledgement.
- Premium expiry fail-closed guard.
- Raw purchase-token removal from persistence.
- Billing readiness truth contract.
- Named Firestore DB targeting and validator.
- Release-only R8 fix.
- Debug artifact signing-truth labels.
- Release AAB unsigned/signed truth labels.
- Primary/secondary Render production-role smoke tests.

## Current external blockers

- Authenticated Play Console access for the real subscription catalog.
- Android Publisher service-account credential.
- Firebase service-account credential for rules/server access.
- Real Play upload/release signing material.
- Physical Play-distributed device test.

## Rule for every future session

Read this file first, then `docs/WORK_STATE.md`, `docs/work-state.json`, `docs/PLAY_ACTIVATION_RUNBOOK.md`, and `AGENTS.md`.

Resume from the first unfinished item in the mandatory sequence above. Do not return to earlier phases merely because the conversation changed.
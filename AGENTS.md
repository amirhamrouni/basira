# BASIRA Agent Operating Contract

Read `docs/WORK_STATE.md`, `docs/work-state.json`, and `docs/PLAY_ACTIVATION_RUNBOOK.md` before changing BASIRA.
Treat them as the current handoff and update the work-state files after every verified milestone.

## Work mode

- Continue through diagnosis, implementation, verification, build, deploy, and handoff without asking for routine confirmations.
- Keep user updates silent or very short while work is running. Report only a result, a real blocker, or a required user device test.
- Never claim a device-only behavior works until it is tested on a physical Android device.
- Preserve the Android package name `com.basira.spiritportal`.
- Never commit passwords, keystores, service-account files, tokens, purchase tokens, or private keys.
- Do not replace a working Firebase configuration with an older downloaded copy.

## Required Android build order

1. Read the work-state files.
2. Verify Firebase Android package and OAuth clients with `npm run verify:android`.
3. Run `npm run check`.
4. Run `npx cap sync android`.
5. Run `npm run verify:android` again.
6. Build with Java 21 and Android SDK 36.
7. Sign with the existing BASIRA key when the correct key is actually available.
8. Verify package/bundle structure, hash, signing state, and embedded web assets.
9. Ask for one physical-device test only after all previous gates pass.
10. Record the result in both work-state files.

## Google sign-in invariants

- Use native `@capacitor-firebase/authentication` on Android.
- Try Google Credential Manager first and retry automatically with `useCredentialManager: false` if it fails.
- Do not map every native exception without an error code to a SHA/Firebase configuration error.
- `google-services.json` must contain the Android client for `com.basira.spiritportal`, an Android OAuth client with the intended signing certificate, and a Web OAuth client used as `default_web_client_id`.
- BASIRA config enables the Google provider only. Do not add the Facebook SDK merely to satisfy R8; the release build intentionally ignores unreachable optional `com.facebook.**` references from the auth plugin.

## Firebase / Firestore invariants

- BASIRA uses the named Firestore database `ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`, not the default Firestore database.
- Client initialization must continue to use `getFirestore(app, firebaseConfig.firestoreDatabaseId)`.
- `firebase.json` must explicitly target the named BASIRA database.
- Run `node scripts/verify-firebase-config.mjs` before deploying Firestore rules or changing Firebase configuration.
- Firestore client rules must keep all Billing entitlement metadata server-controlled.
- The manual `Deploy BASIRA Firestore Rules` workflow deploys rules only and requires the `FIREBASE_SERVICE_ACCOUNT_JSON` GitHub secret plus explicit `DEPLOY` confirmation.
- A real 2026-09-26 deployment attempt proved `FIREBASE_SERVICE_ACCOUNT_JSON` is currently missing/empty. Do not claim rules are deployed until a later production deployment succeeds.
- Never mark Firestore rules as deployed until a real production deployment to the named BASIRA database succeeds and is recorded in the work-state files.

## Rewarded ad invariants

- Never grant a reward from a timer or from an ad-open event.
- Grant it only from the rewarded callback.
- Handle reward, dismiss, failure, and timeout paths so the UI cannot hang.

## Google Play Billing invariants

- Never grant Premium from the Android client alone. A purchase must be verified server-side against Google Play before `vipStatus` changes.
- Bind purchases to the signed-in Firebase account with `obfuscatedAccountId`; reject a purchase whose Play account identifier does not match the Firebase UID hash.
- Product ID and Base Plan ID come from server runtime configuration at `/api/billing/config`; never invent them and never hard-code placeholder Play IDs into the APK/AAB.
- Record Product ID and Base Plan ID only after they are actually created/verified in Play Console.
- The server is authoritative for `vipStatus`, `premiumUntil`, `premiumProductId`, `premiumBasePlanId`, `premiumState`, and `premiumVerifiedAt`.
- Do not store raw Google Play purchase tokens in Firestore or logs. Store only a one-way fingerprint when an audit identifier is needed.
- Active, grace-period, and canceled-but-not-yet-expired subscriptions may remain entitled. Pending, paused, on-hold, and expired subscriptions must not grant Premium.
- A server-written `premiumUntil` timestamp must be enforced locally as a fail-closed expiry guard.
- The local 7-day free-beta fallback is retired.
- The Premium purchase screen must use real Google Play price/billing metadata and clearly show billing frequency and renewal behavior before purchase.
- Keep the Google Play manage/cancel subscription link available.
- Do not enable the purchase CTA before a real Play offer has loaded.
- Keep non-subscription access accurately disclosed when free readings/rewarded ads remain available.
- Real Play Billing is not considered live until a real Console Product/Base Plan exists, server credentials are configured, Firestore rules are deployed, and purchase + restore pass on a Play-distributed physical Android device.

## Release AAB invariants

- `.github/workflows/android-release.yml` is the canonical release-bundle pipeline.
- Release builds must keep `minifyEnabled true` and `shrinkResources true`; the pipeline must exercise `bundleRelease`, not only debug builds.
- The 2026-09-26 release-only R8 failure caused by optional Facebook Auth SDK references is fixed with targeted `-dontwarn com.facebook.**`. Do not add unused Facebook dependencies as a workaround.
- A successful unsigned AAB proves release build structure only. It is not publishable.
- Never claim a release AAB is signed unless the workflow verifies signing and the intended Play upload/release key is known.
- Current release signing secrets expected by CI are `BASIRA_RELEASE_KEYSTORE_BASE64`, `BASIRA_RELEASE_KEYSTORE_PASSWORD`, `BASIRA_RELEASE_KEY_ALIAS`, and `BASIRA_RELEASE_KEY_PASSWORD`.
- These release signing secrets are currently missing. Before creating or rotating an upload key, inspect the BASIRA Play Console App Signing/upload-key state. Do not invent a replacement key blindly.
- Keep release signing material out of Git and logs.
- After signing credentials are configured, rebuild through the release workflow, verify the AAB signature/hash, then use a Play testing track before production release.

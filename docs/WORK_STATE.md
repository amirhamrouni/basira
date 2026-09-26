# BASIRA Current Work State

Updated: 2026-09-26 04:01 Europe/Amsterdam

## Read this first

This is the canonical handoff. Continue from this state; do not restart Firebase, Google Sign-In, AdMob, palm handling, Play Billing, Firestore targeting, or release-pipeline diagnosis from the beginning.

## Canonical baseline

- Repository: `amirhamrouni/basira`
- Canonical branch: `main`
- Latest verified runtime code merge: `dd8a00605ce1832fe7b7b0e947f5607729df9346`
- PR `#21` hardened Billing readiness and CI truth gates.
- Android package: `com.basira.spiritportal`
- Android version: `1.0 (1)`
- Java 21, Gradle 8.14.3, minSdk 24, compile/target SDK 36.

## Invariants that must not regress

### Palm

Any genuine visible human palm is valid even when fine lines are faint/cropped/dim. `ERROR_PALM_LINES_UNREADABLE` is not an accepted rejection path. When detail is limited, complete a limited reading from only genuinely visible features. Never invent marks. Keep the palm preview unfiltered.

### Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Known-good BASIRA signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Known-good SHA-256: `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- Credential Manager first, legacy Google fallback second.
- Physical-device Google sign-in test is still pending.

### AdMob

- `@capacitor-community/admob` `8.1.0`
- App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded ID: `ca-app-pub-1233451496176046/5417205489`
- Reward only from the native rewarded callback; no timer reward.
- Physical-device rewarded-ad test is still pending.

## Play Billing truth gate

Billing code is implemented and deployed but remains commercially inactive.

PR `#21` fixed a readiness bug: `/api/billing/config` must no longer report the system configured merely because Product ID and Base Plan ID exist. The public config now exposes safe booleans:

- `catalogConfigured`
- `serverVerificationReady`
- `configured = catalogConfigured && serverVerificationReady`

`serverVerificationReady` requires parseable service-account private-key material for Play verification and Firestore writes. One Google Play service account may be reused for Firestore only when it is actually valid and has the required IAM permissions. No credential contents are exposed by the public endpoint.

The Android client refuses to load/purchase/restore a Play subscription unless the real catalog exists and server verification is ready. The server verify endpoint also fails closed with `PLAY_SUBSCRIPTION_NOT_READY` until full readiness exists.

Current production observation after PR `#21` rollout on both services:

- `configured=false`
- `catalogConfigured=false`
- `serverVerificationReady=false`

This is expected because the real Play subscription catalog and service credentials are not configured yet.

Still TBD and must never be invented:

- Subscription Product ID
- Base Plan ID
- Billing period
- Play price/regions/renewal settings

All prior Billing security invariants remain: server-side Play verification, Firebase ID-token verification, UID purchase binding, acknowledgement, server-controlled Premium fields, fail-closed `premiumUntil`, no raw purchase-token persistence, no local free-beta entitlement.

## Firestore

Named database: `ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`.

A real rules-deploy attempt on 2026-09-26 passed target validation but failed before deployment because `FIREBASE_SERVICE_ACCOUNT_JSON` is missing/empty. No rules were published. `firestore_rules_deployed=false` remains canonical.

## CI truth gates

### Debug APK

The debug workflow no longer labels a runner-debug-signed APK as continuity-verified.

Latest verified debug run for PR `#21`:

- Run: `36209949622`
- Job: `108314212142`
- Result: PASS
- `BASIRA_DEBUG_KEYSTORE_BASE64` is still missing.
- Continuity-verified upload: SKIPPED.
- Actual artifact: `basira-debug-apk-runner-signed-unverified`
- Artifact ID: `10895266431`
- Artifact ZIP digest: `sha256:e07d28888b541ba69afdcdfdde5fe4f60694e12fba673c2fa7368c0572341b45`
- This artifact is **not** update-compatible with the known installed BASIRA APK unless the correct signing key is restored and verified.

### Release AAB

Latest verified release run for PR `#21`:

- Run: `36209949635`
- Job: `108314212201`
- TypeScript/tests/Vite: PASS (`28/28` tests across 8 files)
- Capacitor sync / Android OAuth gate: PASS
- `bundleRelease`: PASS
- R8/minify/resource shrink: PASS
- Gradle: `BUILD SUCCESSFUL`, 255 tasks
- AAB structure verification: PASS
- AAB size: about 7.3 MB
- AAB SHA-256: `93dd5008210e4a812c2010249ccd49a82b34cca21ce5f91ac94ed0f4d0b541f8`
- Signing verification: `SIGNED_RELEASE_AAB=false`
- Signed artifact upload: SKIPPED
- Actual artifact: `basira-release-aab-unsigned-candidate`
- Artifact ID: `10895167635`
- Artifact ZIP digest: `sha256:8e5675309bdaed1ff351cadf4817f6831fa6a25d7e5395d314ecaef35b9fbbb4`
- Expires: `2026-10-03T01:57:46Z`

The four `BASIRA_RELEASE_*` signing secrets are still absent/incomplete. The unsigned AAB is validation-only, not publishable.

## Production verification after PR #21

PR `#21` merged as `dd8a00605ce1832fe7b7b0e947f5607729df9346`.

A post-merge production smoke rerun completed successfully:

- Primary `https://basira-1-2fwh.onrender.com`: health `ok`, `aiReady=true`, Billing extended schema present and all readiness flags false.
- Secondary `https://basira-qx6d.onrender.com`: health `ok`, Billing extended schema present and all readiness flags false; `aiReady=false` because this service currently has no AI provider configured.
- Treat the primary as the AI-serving production target. Treat the secondary as deployment/Billing parity unless its AI credentials are explicitly configured later.
- Live Tarot, follow-up context, and memory smoke on primary: PASS.

## Latest known-good update-compatible APK

Still `BASIRA-palm-hotfix.apk`:

- SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`
- Signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Contains real AdMob + palm hotfix.
- Does not contain the new Play Billing implementation.

## Remaining external blockers only

1. In authenticated Play Console, create/verify the real BASIRA Subscription Product and Base Plan and record exact immutable IDs, period, price, regions and renewal settings.
2. Configure `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` with Android Publisher permission.
3. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` where required for Firestore server/rules access.
4. Put the exact Play IDs + valid credentials on the intended production service(s) and verify `/api/billing/config` becomes `configured=true` only when all readiness checks pass.
5. Deploy the hardened Firestore rules successfully to the named database.
6. Inspect Play App Signing/upload-key state, then restore the real release/upload keystore and the four `BASIRA_RELEASE_*` CI secrets. Do not invent or rotate keys blindly.
7. Restore `BASIRA_DEBUG_KEYSTORE_BASE64` only if an update-compatible debug build is still needed.
8. Use a Play testing track and verify on a physical Android device: Google Sign-In → three free readings → rewarded ad → purchase → Premium entitlement → restore → cancellation/expiry.
9. Only after those gates pass, build the signed publishable AAB and continue Play release checks.

Use `docs/PLAY_ACTIVATION_RUNBOOK.md` for activation. Do not reimplement Billing, AdMob, Google sign-in, palm handling, Firestore targeting, or the release pipeline.

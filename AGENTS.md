# BASIRA Agent Operating Contract

## Mandatory session resume point

**Every new BASIRA session MUST begin by reading `docs/SESSION_ENTRYPOINT.md` first.** Then read `docs/WORK_STATE.md`, `docs/work-state.json`, and `docs/PLAY_ACTIVATION_RUNBOOK.md`.

Until the activation sequence in `docs/SESSION_ENTRYPOINT.md` is completed, resume from its first unfinished item. Do not restart phases 1–5 or reimplement Firebase, Google Sign-In, AdMob, palm handling, AI, Billing, Firestore targeting, R8 fixes, or release pipelines unless a verified regression proves something is broken.

Current canonical phase: **Phase 6 — Google Play commercial activation**.

Treat the listed handoff files as the source of truth and update the work-state files after every verified milestone.

## Work mode

- Continue diagnosis → implementation → tests → build → deploy → production verification → handoff without routine confirmation prompts.
- Never claim physical-device behavior works until it is tested on a physical Android device.
- Preserve package `com.basira.spiritportal`.
- Never commit passwords, keystores, service-account files, tokens, purchase tokens, or private keys.
- Do not replace a working Firebase configuration with an older downloaded copy.

## Android build order

1. Read the work-state files.
2. `npm run verify:android`.
3. `npm run check`.
4. `npx cap sync android`.
5. `npm run verify:android` again.
6. Build with Java 21 / SDK 36.
7. Use the actual BASIRA signing key only when it is genuinely available.
8. Verify package/bundle structure, hash, and signing state.
9. Record whether certificate continuity is verified or unverified. Never infer it from a successful Gradle build.
10. Device-test only after prior gates pass.

## Google Sign-In

- Use native `@capacitor-firebase/authentication` on Android.
- Credential Manager first; retry with `useCredentialManager:false` when needed.
- `google-services.json` must keep the package client, Android OAuth signing certificate, and Web OAuth client.
- BASIRA enables Google only. Do not add Facebook SDK merely to satisfy R8; release intentionally ignores unreachable optional `com.facebook.**` references.

## Firebase / Firestore

- BASIRA uses named database `ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`, not the default DB.
- Keep `getFirestore(app, firebaseConfig.firestoreDatabaseId)` and explicit `firebase.json` DB targeting.
- Run `scripts/verify-firebase-config.mjs` before Firebase deployment changes.
- Billing entitlement fields stay server-controlled.
- `Deploy BASIRA Firestore Rules` requires real `FIREBASE_SERVICE_ACCOUNT_JSON` plus explicit `DEPLOY` confirmation.
- The 2026-09-26 real deploy attempt proved that secret is currently missing/empty. Rules are NOT deployed until a later verified production deployment succeeds.

## Rewarded ads

- Never reward from a timer or ad-open event.
- Reward only from the native rewarded callback.
- Handle reward/dismiss/failure/timeout/listener cleanup.

## Play Billing

- Never grant Premium from Android/client state alone.
- Verify purchases server-side against Google Play and bind them to the Firebase UID via obfuscated account ID.
- Product ID/Base Plan ID are external Play catalog identifiers. Never invent or hard-code fake values.
- Raw purchase tokens must not be persisted/logged; use one-way fingerprints when needed.
- Active/grace/canceled-before-expiry may be entitled. Pending/paused/on-hold/expired must not be.
- Enforce server-written `premiumUntil` fail-closed.
- Never restore the local 7-day Premium beta.
- Show real Play price/billing metadata and renewal behavior before purchase; keep manage/cancel link available.

### Billing readiness contract

PR `#21` established the canonical readiness contract for `/api/billing/config`:

- `catalogConfigured`: true only when the real Product ID and Base Plan ID are both present.
- `serverVerificationReady`: true only when usable service-account private-key material exists for Play verification and Firestore writes.
- `configured`: MUST equal `catalogConfigured && serverVerificationReady`.
- The client must refuse offer/purchase/restore when full readiness is false.
- The server verify endpoint must fail closed with `PLAY_SUBSCRIPTION_NOT_READY` when full readiness is false.
- Never expose credential contents through the public config endpoint.
- Current production is intentionally `configured=false`, `catalogConfigured=false`, `serverVerificationReady=false`.

Real Billing is not live until the real Play catalog exists, credentials/permissions are configured, Firestore rules are deployed, and purchase+restore pass on a Play-distributed physical device.

## CI signing truth

### Debug

- `assembleDebug` produces a valid runner-debug-signed APK even when the BASIRA debug keystore secret is absent. Do not call that APK unsigned.
- Only artifact name `basira-debug-apk-continuity-verified` may imply certificate continuity, and only after the known BASIRA SHA-1 is explicitly verified.
- When `BASIRA_DEBUG_KEYSTORE_BASE64` is missing, use `basira-debug-apk-runner-signed-unverified` and state clearly that update compatibility with the known installed BASIRA app is unverified/false.

### Release AAB

- `.github/workflows/android-release.yml` is the canonical bundle pipeline.
- Keep `minifyEnabled true`, `shrinkResources true`, and exercise `bundleRelease`.
- A successful unsigned AAB proves release structure only and is not publishable.
- Signed artifact must be named `basira-release-aab-signed` only after signing verification passes.
- Without all release-key secrets, artifact must be named `basira-release-aab-unsigned-candidate`.
- Before creating/rotating any upload key, inspect Play Console App Signing/upload-key state. Never invent a replacement key blindly.

## Production roles and smoke

- Primary: `https://basira-1-2fwh.onrender.com`. It must be health `ok`, `aiReady=true`, and pass live AI + Billing smoke.
- Secondary: `https://basira-qx6d.onrender.com`. It must be health `ok` and maintain deployment/Billing contract parity. Do NOT require or claim AI readiness unless AI credentials are later configured there.
- Production smoke must validate the Billing readiness equation on extended schema. Legacy schema compatibility is allowed only during a pre-rollout transition, not as proof that a new rollout reached production.
- After a Billing readiness change is merged, rerun production smoke and confirm both services expose the extended readiness fields before recording deployment complete.

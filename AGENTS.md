# BASIRA Agent Operating Contract

Read `docs/WORK_STATE.md` and `docs/work-state.json` before changing BASIRA.
Treat them as the current handoff and update both after every verified milestone.

## Work mode

- Continue through diagnosis, implementation, verification, build, and handoff without asking for routine confirmations.
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
7. Sign with the existing BASIRA key.
8. Verify the APK package, SHA-1, SHA-256, and embedded web assets.
9. Ask for one physical-device test only after all previous gates pass.
10. Record the result in both work-state files.

## Google sign-in invariants

- Use native `@capacitor-firebase/authentication` on Android.
- Try Google Credential Manager first and retry automatically with `useCredentialManager: false` if it fails.
- Do not map every native exception without an error code to a SHA/Firebase configuration error.
- `google-services.json` must contain:
  - the Android client for `com.basira.spiritportal`;
  - an Android OAuth client with the active signing certificate;
  - a Web OAuth client used as `default_web_client_id`.
- The active BASIRA debug signing certificate is recorded in `docs/work-state.json`.

## Rewarded ad invariants

- Never grant a reward from a timer or from an ad-open event.
- Grant it only from the rewarded callback.
- Handle reward, dismiss, failure, and timeout paths so the UI cannot hang.

## Google Play Billing invariants

- Never grant Premium from the Android client alone. A purchase must be verified server-side against Google Play before `vipStatus` changes.
- Bind purchases to the signed-in Firebase account with `obfuscatedAccountId`; reject a purchase whose Play account identifier does not match the Firebase UID hash.
- Product ID and Base Plan ID come from server runtime configuration at `/api/billing/config`; never invent them and never hard-code placeholder Play IDs into the APK.
- The server is authoritative for `vipStatus`, `premiumUntil`, `premiumProductId`, `premiumBasePlanId`, `premiumState`, and `premiumVerifiedAt`. Firestore clients must not be allowed to modify those fields.
- Do not store raw Google Play purchase tokens in Firestore or logs. Store only a one-way fingerprint when an audit identifier is needed.
- Active, grace-period, and canceled-but-not-yet-expired subscriptions may remain entitled. Pending, paused, on-hold, and expired subscriptions must not grant Premium.
- A server-written `premiumUntil` timestamp must be enforced locally as a fail-closed expiry guard even if a stale `vipStatus` remains cached.
- The local 7-day free-beta fallback is retired. Do not restore it as a substitute for real Billing.
- Real Play Billing is not considered live until a real Console Product/Base Plan exists, server credentials are configured, Firestore rules are deployed, and purchase + restore pass on a physical Android device.

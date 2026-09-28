# BASIRA Current Work State

Updated: 2026-09-28 17:46 Europe/Amsterdam

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

## Current verified release state

- Firestore rules workflow run `36353108328`, job `108726740483`, completed successfully.
- Production Billing readiness was previously verified on primary Render as `configured=true`, `catalogConfigured=true`, `serverVerificationReady=true`.
- Play subscription exists: product `basira_premium_monthly`, base plan `monthly-premium`, EUR 4.99/month.
- Existing BASIRA Upload Key certificate is verified and must not be rotated or replaced.
- Required GitHub Actions signing secret names are present. Secret values were not viewed or recorded.
- Signed CI AAB was built and verified from `main`.

## Signed CI release AAB verified 2026-09-28

- Workflow: `BASIRA Release AAB` on `main`.
- Commit SHA: `411656e04ff30b3e3a594807afada0e2e0764b6d`.
- Workflow run ID: `36445267701`.
- Job ID: `109005847007`.
- Result: SUCCESS.
- Tests: PASS, `28/28` tests across 8 files.
- Android verification: PASS through `npm run verify:android`.
- `bundleRelease`: PASS.
- R8/minify: PASS; log includes `:app:minifyReleaseWithR8` and `BUILD SUCCESSFUL in 3m 14s`.
- Signing verification: PASS; workflow printed `SIGNED_RELEASE_AAB=true`.
- Unsigned candidate upload: SKIPPED.
- Signed artifact name: `basira-release-aab-signed`.
- Artifact ID: `10980462298`.
- Artifact ZIP digest: `sha256:889816b52c8f1f5dd50f529a008b1925591323149ab3295f79e6e0bb12c49887`.
- AAB SHA-256: `7d33033872447dfe825bd5fe49dc55f89957dc2864dc9c5030dcf43e964a7b56`.
- Local certificate verification of the produced AAB with `keytool -printcert -jarfile` matched the existing BASIRA Upload Key exactly:
  - SHA-1: `AE:F9:0F:BC:E5:28:92:1E:04:8D:29:86:DF:4C:40:A8:7C:7E:6E:55`
  - SHA-256: `6F:03:E4:38:61:A3:27:F2:8E:1C:1B:59:21:89:3C:7F:6C:BE:C1:B5:53:4B:DC:E8:A2:54:E6:07:7F:DE:B1:E4`

## Invariants that must not regress

### Palm

Any genuine visible human palm is valid even when fine lines are faint/cropped/dim. `ERROR_PALM_LINES_UNREADABLE` is not an accepted rejection path. When detail is limited, complete a limited reading from only genuinely visible features. Never invent marks. Keep the palm preview unfiltered.

### Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Credential Manager first, legacy Google fallback second.
- Physical-device Google sign-in test is still pending.

### AdMob

- `@capacitor-community/admob` `8.1.0`
- App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded ID: `ca-app-pub-1233451496176046/5417205489`
- Reward only from the native rewarded callback; no timer reward.
- Physical-device rewarded-ad test is still pending.

### Play Billing

- Billing code is implemented and deployed.
- Product ID: `basira_premium_monthly`.
- Base Plan ID: `monthly-premium`.
- Price: EUR 4.99/month.
- Server-side Play verification, Firebase ID-token verification, UID purchase binding, acknowledgement, server-controlled Premium fields, fail-closed `premiumUntil`, no raw purchase-token persistence, and no local free-beta entitlement remain required.

## Already completed — do not redo

- Palm visible-hand regression and limited-reading fallback.
- Google Sign-In architecture and OAuth prebuild validation.
- Native rewarded AdMob integration.
- Google Play Billing Library 9.1.0 implementation.
- Server-side Firebase token + Google Play verification implementation.
- UID purchase binding and acknowledgement.
- Premium expiry fail-closed guard.
- Raw purchase-token removal from persistence.
- Billing readiness truth contract.
- Named Firestore DB targeting and validator.
- Firestore rules production deploy.
- Release-only R8 fix.
- Debug artifact signing-truth labels.
- Release AAB unsigned/signed truth labels.
- Primary/secondary Render production-role smoke tests.
- Upload Key verification.
- Signed CI release AAB generation and certificate verification.

## Next executable release gate

Use Play Internal Testing and a physical Android device:

1. Add/select tester(s) in Internal Testing if still absent.
2. Install the Play-distributed BASIRA build.
3. Verify Google Sign-In.
4. Verify three free readings.
5. Verify rewarded ad callback path.
6. Verify real subscription purchase.
7. Verify Premium entitlement.
8. Verify restore subscription.
9. Verify cancellation/expiry behavior.

Do not redo Firebase, Firestore, Render, Billing catalog, Upload Key setup, or signed CI AAB generation unless a verified regression appears.

# BASIRA Canonical Session Entry Point

Updated: 2026-09-28, Europe/Amsterdam

## Start every BASIRA session here

This file is the mandatory resume point for every new ChatGPT/Codex/Work session until the commercial activation cycle is complete.

Do **not** restart Firebase, Google Sign-In, AdMob, palm handling, AI, Play Billing implementation, Firestore targeting, R8 fixes, or release-pipeline work from the beginning unless a verified regression proves one of those areas has broken.

## Current phase

**Phase 6 → Google Play commercial activation**

The application code, backend Billing implementation, CI truth gates, debug/release build pipelines, production deployment, and Billing fail-closed readiness contract are already implemented and verified.

Current verified continuation state:

- Firestore rules deployment succeeded.
- Production Billing readiness was verified earlier by owner-provided current state as `configured=true`, `catalogConfigured=true`, `serverVerificationReady=true` on primary Render.
- Play subscription exists: `basira_premium_monthly`, base plan `monthly-premium`, EUR 4.99/month.
- Existing BASIRA Upload Key was verified and used for CI signing.
- Signed CI AAB workflow run `36445267701`, job `109005847007`, succeeded on commit `411656e04ff30b3e3a594807afada0e2e0764b6d`.
- Signed artifact `basira-release-aab-signed`, artifact ID `10980462298`, AAB SHA-256 `7d33033872447dfe825bd5fe49dc55f89957dc2864dc9c5030dcf43e964a7b56`.
- Produced AAB certificate matches the existing BASIRA Upload Key SHA-1 `AE:F9:0F:BC:E5:28:92:1E:04:8D:29:86:DF:4C:40:A8:7C:7E:6E:55` and SHA-256 `6F:03:E4:38:61:A3:27:F2:8E:1C:1B:59:21:89:3C:7F:6C:BE:C1:B5:53:4B:DC:E8:A2:54:E6:07:7F:DE:B1:E4`.

## Mandatory execution sequence from this point

1. **Play testing track + physical Android test**
   - Google Sign-In.
   - Three free readings.
   - Rewarded-ad path.
   - Real subscription purchase.
   - Premium entitlement.
   - Restore subscription.
   - Cancellation/expiry behavior.

2. **Final Play release checks and launch**
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

- Internal Testing tester selection if still absent.
- Physical Play-distributed Android device test.
- Final Play release checks after physical gates pass.

## Rule for every future session

Read this file first, then `docs/WORK_STATE.md`, `docs/work-state.json`, `docs/PLAY_ACTIVATION_RUNBOOK.md`, and `AGENTS.md`.

Resume from the first unfinished item in the mandatory sequence above. Do not return to earlier phases merely because the conversation changed.

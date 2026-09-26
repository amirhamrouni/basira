# BASIRA Current Work State

Updated: 2026-09-26, Europe/Amsterdam

## Read this first

This is the canonical handoff for future ChatGPT/Codex/Work sessions. Continue from this state. Do not restart Firebase, Google Sign-In, AdMob, palm handling, Play Billing, Firestore targeting, or release-pipeline diagnosis from the beginning.

## Canonical baseline

- Repository: `amirhamrouni/basira`
- Canonical branch: `main`
- Current verified main/runtime head before this handoff-only commit: `046fa6ea08f98c7fb0fbc7aee218aba0778f1ad1`
- Billing implementation PR: `#17`
- Permanent Billing production-smoke PR: `#18`
- Firestore/Play activation-prep PR: `#19`
- Release AAB pipeline PR: `#20`, merged as `046fa6ea08f98c7fb0fbc7aee218aba0778f1ad1`
- Android package: `com.basira.spiritportal`
- Current Android version in source: `1.0 (1)`

## Invariants that must not regress

### Palm reading

- Any genuine visible human palm is valid even if fine lines are faint, cropped, dim, or unevenly lit.
- `ERROR_PALM_LINES_UNREADABLE` is not an accepted rejection path.
- If detail is limited, complete a limited reading from genuinely visible major lines, contours, proportions, mounts, branches, or intersections.
- Never invent marks that are not visible.
- Keep the palm preview unfiltered.

### Google Sign-In

- Firebase project: `gen-lang-client-0217548336`
- Active known BASIRA signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Active known BASIRA signing SHA-256: `C9:38:2E:C1:7F:B0:35:21:A9:5B:BE:57:5B:AE:02:CB:ED:86:2C:F6:1F:3A:42:7E:11:C7:15:62:F8:C6:93:68`
- Native sign-in tries Credential Manager first, then the legacy Google flow.
- Physical-device sign-in is still pending.

### AdMob

- `@capacitor-community/admob` `8.1.0`
- App ID: `ca-app-pub-1233451496176046~9839666227`
- Rewarded ID: `ca-app-pub-1233451496176046/5417205489`
- Reward only from the native rewarded callback. No timer reward.
- Physical-device rewarded-ad test remains pending.

## Google Play Billing

Billing is implemented and deployed but remains intentionally commercially inactive.

Implemented:

- Google Play Billing Library `9.1.0` via native `BasiraBillingPlugin`.
- Purchase + restore flows.
- Product/Base Plan IDs loaded at runtime from `/api/billing/config`; no fake IDs are baked into the APK/AAB.
- Firebase ID-token verification and Google Play `subscriptionsv2` server verification.
- Purchase bound to Firebase UID via obfuscated account ID.
- Server acknowledgement and server-controlled entitlement fields.
- Client fail-closed expiry through `premiumUntil`.
- Premium does not consume free-reading allowance or Energy.
- Raw purchase tokens are not persisted; only a SHA-256 fingerprint is stored for audit identity.
- Local 7-day Premium fallback is removed.
- Premium screen uses real Play price/billing metadata, discloses renewal behavior, keeps a Google Play manage/cancel link, and disables purchase until a real offer loads.

Still not created/verified in Google Play:

- Subscription Product ID: `TBD`
- Base Plan ID: `TBD`
- Billing period: `TBD`
- Actual Play price: `TBD`

Production Billing state remains `configured: false` until exact real IDs are created and placed on Render.

## Firestore production rules

BASIRA uses the named Firestore database:

`ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`

The client and `firebase.json` explicitly target this database. `scripts/verify-firebase-config.mjs` is enforced in CI.

A real rules-deploy attempt was executed during the 2026-09-26 activation cycle:

- Temporary operations branch: `ops/firestore-deploy-once`
- Deployment run: `36207958916`
- Job: `108308392804`
- Named-database target validator: PASS
- Google Cloud authentication: FAILED before deployment
- Verified cause: GitHub secret `FIREBASE_SERVICE_ACCOUNT_JSON` is missing/empty in the BASIRA repository.
- No rules were deployed and no credential was exposed.
- The temporary workflow on the operations branch was restored to its original manual-only form afterward. Do not merge the operations branch.

Therefore `firestore_rules_deployed = false` remains the canonical state.

## Release AAB pipeline

PR `#20` added `.github/workflows/android-release.yml` and fixed a release-only R8 issue.

The first release attempt exposed missing optional Facebook SDK references from `@capacitor-firebase/authentication`. BASIRA config enables only `google.com`, and Android variables enable Google only. The release fix is a targeted ProGuard/R8 `-dontwarn com.facebook.**`; the unused Facebook SDK was not added.

Verified release run after the fix:

- Head tested: `c4d9dd70b40494fd0f063017c3cb9eaea5bba7f1`
- Release workflow run: `36208238873`
- Release job: `108309243578`
- TypeScript/tests/Vite: PASS (`24/24` tests across `8` files)
- Capacitor sync: PASS
- Android OAuth prebuild gate: PASS
- `bundleRelease`: PASS
- R8/minify/shrink: PASS
- Gradle: `BUILD SUCCESSFUL`, `255` tasks
- AAB structure verification: PASS
- AAB size: about `7.3 MB`
- AAB SHA-256: `c133ae89450d8438663d0f0d35ee3ee0e46f6a5a4746bf706716b3941b606256`
- Release signing state: **UNSIGNED**
- Artifact: `basira-release-aab-candidate`
- Artifact ID: `10894992323`
- Artifact ZIP digest: `sha256:7cebe48ed02d8d80f673172d1966ad083ebe0708c9ec44666813a1264930f661`
- Artifact expires: `2026-10-03T01:26:57Z`

The workflow explicitly verified that all four release signing secrets are absent/incomplete:

- `BASIRA_RELEASE_KEYSTORE_BASE64`
- `BASIRA_RELEASE_KEYSTORE_PASSWORD`
- `BASIRA_RELEASE_KEY_ALIAS`
- `BASIRA_RELEASE_KEY_PASSWORD`

The unsigned candidate is useful for release-build validation only. It must not be uploaded to Play as a publishable release.

The older debug signing secret `BASIRA_DEBUG_KEYSTORE_BASE64` is also still missing, so CI debug APKs do not have verified certificate continuity with the known-good installed BASIRA APK.

## Verification after PR #20 merge

PR `#20` merged as `046fa6ea08f98c7fb0fbc7aee218aba0778f1ad1`.

- Quality gate: PASS
- Production smoke before merge: PASS
- Android debug workflow: PASS
- Release AAB workflow: PASS
- Primary Render `basira-1`: `046fa6e...` LIVE
- Secondary Render `basira`: `046fa6e...` LIVE
- Production smoke re-run after both Render deployments: PASS

Runtime Billing remains safely unconfigured until the real Play catalog is created.

## Latest known-good installed/update-compatible APK

- Filename: `BASIRA-palm-hotfix.apk`
- SHA-256: `1263163097af98a08740cdde27802b731cf24284f1eb65a62dc17a2a4f2e4532`
- Signing SHA-1: `D3:1F:0E:80:0F:45:20:5E:5B:BB:EE:DC:0A:70:12:A4:C6:A8:E6:E3`
- Contains real AdMob + palm hotfix.
- Does not contain the new Play Billing implementation.

## Remaining external blockers only

The implementation/build/deploy work is not the blocker anymore. The remaining gates require authenticated Google/signing material not available in the current connected tools:

1. Open BASIRA in authenticated Google Play Console and create/confirm the real Subscription Product and Base Plan.
2. Record the exact immutable Product ID, Base Plan ID, billing period, price, regions, renewal/grace/account-hold settings.
3. Create/configure a Google service account with Android Publisher access and securely supply `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
4. Supply `FIREBASE_SERVICE_ACCOUNT_JSON` with permissions needed for server Firestore writes and/or rules deployment.
5. Set exact Play IDs + credentials on intended Render production services and verify `/api/billing/config` reports `configured: true`.
6. Re-run `Deploy BASIRA Firestore Rules`; it must succeed against the named database before marking rules deployed.
7. Recover/configure the actual Play upload/release keystore and populate the four `BASIRA_RELEASE_*` secrets. Do not invent or rotate a key without first checking Play Console App Signing state.
8. Restore debug signing continuity if an update-compatible debug/device build is still required.
9. Distribute through Play testing and verify on a physical Android device: Google Sign-In → three free readings → rewarded-ad path → purchase → Premium entitlement → restore → cancellation/expiry.
10. Only then use the release workflow to produce the signed publishable AAB and proceed with Play release checks.

Use `docs/PLAY_ACTIVATION_RUNBOOK.md` for the external activation sequence. Do not reimplement Billing, AdMob, sign-in, palm handling, Firestore targeting, or the release AAB pipeline.

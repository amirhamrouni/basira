# BASIRA Play Monetization Activation Runbook

Status: external activation pending. Billing implementation is already merged and live; do not reimplement it.

## 1. Google Play Console catalog

Path: Play Console → BASIRA → Monetize with Play → Products → Subscriptions.

Create or confirm exactly one Premium subscription for the first release.

Record these values after creation:

- `PLAY_SUBSCRIPTION_PRODUCT_ID`: **TBD — copy the real immutable Product ID from Play Console**
- `PLAY_SUBSCRIPTION_BASE_PLAN_ID`: **TBD — copy the real Base Plan ID from Play Console**
- Billing period / renewal type: **TBD — confirm before activation**
- Price and countries/regions: **TBD — confirm before activation**

Do not put guessed IDs into source code. The app reads these IDs from the backend at runtime.

Before activating a base plan, verify its ID, billing period, grace period, account hold, resubscribe setting, regional availability, and price. Google Play base-plan IDs cannot be changed or reused after activation.

## 2. Google Play Developer API service account

Use a service account for backend verification.

Required flow:

1. Use an existing secure Google Cloud project or create one.
2. Enable the Google Play Developer API (`androidpublisher.googleapis.com`).
3. Create a service account.
4. In Play Console → Users and permissions, invite the service-account email.
5. Grant the Play permissions required for Billing APIs, including viewing financial/order data and managing orders/subscriptions.
6. Create/download credentials only into a secure secret store. Never commit the JSON file.

Server secret name:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

## 3. Render runtime configuration

After the real Play IDs exist, set these environment variables on the BASIRA production backend:

- `PLAY_SUBSCRIPTION_PRODUCT_ID=<real Product ID>`
- `PLAY_SUBSCRIPTION_BASE_PLAN_ID=<real Base Plan ID>`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<secure service-account JSON or supported encoded form>`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<Firestore server-write credential>`

Keep the primary and secondary BASIRA Render services consistent unless one is intentionally retired.

Expected production check after deploy:

`GET /api/billing/config`

must return:

- `configured: true`
- the exact real Product ID
- the exact real Base Plan ID

If it still returns `configured: false`, do not attempt a device purchase yet.

## 4. Firestore security rules

BASIRA uses the named Firestore database:

`ai-studio-6aad922f-e489-4552-a94a-9a140353fa50`

The repository `firebase.json` must target that named database. CI verifies this invariant.

GitHub secret required:

- `FIREBASE_SERVICE_ACCOUNT_JSON`

After the secret has the Firebase Rules permissions required for the BASIRA project, run the manual GitHub workflow:

`Deploy BASIRA Firestore Rules`

and type exactly:

`DEPLOY`

The workflow deploys Firestore rules only; it does not deploy Hosting or application code.

## 5. Android signing continuity

Before producing an upgrade-compatible Android artifact, restore the existing BASIRA signing key to GitHub Actions:

- `BASIRA_DEBUG_KEYSTORE_BASE64`

Do not rotate the signing key while troubleshooting. A runner-generated debug key is not an acceptable replacement for the existing BASIRA install.

## 6. Physical-device activation test

Use a Play-distributed build and test in this order:

1. Google Sign-In.
2. First three free readings.
3. Rewarded ad unlock after the free allowance.
4. Premium purchase through Google Play.
5. Verify backend entitlement and `premiumUntil`.
6. Verify Premium reading does not consume the free allowance or Energy.
7. Restore purchase after reinstall/sign-out flow as appropriate.
8. Verify pending/on-hold/expired states do not grant Premium.
9. Verify canceled-but-not-yet-expired entitlement remains active only until its Play expiry timestamp.

Record each device result in `docs/WORK_STATE.md` and `docs/work-state.json`.

## 7. Release gate

Only after the previous gates pass:

1. Build the release AAB with signing continuity preserved.
2. Upload to the intended Play testing track.
3. Complete Play Console release checks.
4. Re-run BASIRA production smoke.
5. Update the canonical work-state files with the exact Product ID, Base Plan ID, tested version code, and result.

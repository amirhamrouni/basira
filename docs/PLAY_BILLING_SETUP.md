# BASIRA Google Play Billing activation

This file describes the external setup required to activate the native Billing bridge. The app must remain fail-closed until every required Console/server item below exists.

## Already implemented on `feat/play-billing`

- Google Play Billing Library `9.1.0`.
- Native Capacitor plugin `BasiraBilling`.
- Subscription product query through `queryProductDetailsAsync`.
- Base-plan / offer-token / pricing-phase transport to TypeScript.
- Purchase flow through `launchBillingFlow`.
- Explicit `purchased`, `pending`, and `cancelled` outcomes.
- Restore query for current subscriptions.
- Optional obfuscated account ID support.
- The client never writes `vipStatus` and never acknowledges a subscription.

## Required Play Console setup

Create the subscription products in the BASIRA app in Google Play Console before putting any ID in the build environment.

For every paid tier that remains in the UI, record:

- Product ID.
- Base plan ID.
- Billing period.
- Price and countries/regions.
- Whether the base plan is auto-renewing or prepaid.
- Any offer ID and eligibility rules.

Then set the exact Product IDs at Android build time:

```text
VITE_PLAY_ADEPT_PRODUCT_ID=<real Play Console product id>
VITE_PLAY_ORACLE_PRODUCT_ID=<real Play Console product id>
```

If a tier is removed from the product design, leave its ID unset and remove that tier from the UI instead of inventing a placeholder product.

## Required secure backend verification

Do not grant premium from the Android callback alone.

For every completed purchase:

1. Send `purchaseToken`, expected Product ID, and the signed-in Firebase user identity to the BASIRA backend.
2. Authenticate the Firebase user on the backend.
3. Verify the purchase token with Google Play Developer API (`purchases.subscriptionsv2.get`).
4. Verify the returned line item contains the expected whitelisted Product ID.
5. Do not grant entitlement for a pending purchase.
6. Persist the globally unique purchase token so it cannot be reused for another account.
7. Grant the server-controlled BASIRA entitlement (`vipStatus`) only after Google verification succeeds.
8. Acknowledge the initial subscription purchase from the secure backend after entitlement is granted.
9. Handle renewal, cancellation, grace-period, hold, expiry, revoke, and restore events before declaring subscription work production-complete.

## Security invariants

- Never accept a Product ID supplied by the client unless it matches a server-side allowlist.
- Never trust `orderId` as the unique purchase key; use `purchaseToken`.
- Never grant entitlement while purchase state is pending.
- Never let Firestore client rules allow users to set their own `vipStatus`.
- Never acknowledge before verification and entitlement processing.
- Never commit Google service-account credentials or Play Developer API keys to Git.

## Release gate

Play Billing is production-ready only after all of these pass on a physical Android device installed from an eligible Play testing track:

- Product details and localized price load from Google Play.
- Successful initial purchase.
- Pending-purchase path does not grant entitlement.
- Server verification grants the correct tier.
- Purchase is acknowledged after verification.
- Restore recovers the entitlement after reinstall/login.
- Cancellation/expiry removes entitlement according to the product rules.
- Existing AdMob rewarded flow still works for non-premium users after the free-reading allowance.

Until then, PR `#16` must remain draft and must not be merged into the production baseline.

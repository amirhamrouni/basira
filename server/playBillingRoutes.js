import {
  acknowledgeGooglePlaySubscription,
  claimPurchaseToken,
  createGoogleAccessToken,
  getGooglePlaySubscription,
  inspectSubscriptionPurchase,
  parseServiceAccount,
  persistSubscriptionDecision,
  readPurchaseTokenOwner,
  sha256Hex,
  subscriptionTierForProduct,
  verifyFirebaseIdentityToken,
} from './playBillingVerification.js';
import {
  readStoredPurchaseForUser,
  storePurchaseTokenSecret,
} from './playBillingLifecycle.js';

const PACKAGE_NAME = 'com.basira.spiritportal';

function bearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : null;
}

function publicError(error) {
  const code = error instanceof Error ? error.message : 'PLAY_BILLING_VERIFICATION_FAILED';
  if (code === 'FIREBASE_ID_TOKEN_MISSING' || code === 'FIREBASE_ID_TOKEN_INVALID') {
    return { status: 401, code };
  }
  if (code === 'PURCHASE_TOKEN_ALREADY_BOUND' || code === 'ACCOUNT_MISMATCH' || code === 'ACCOUNT_ID_MISSING') {
    return { status: 403, code };
  }
  if (
    code.includes('_MISSING') ||
    code.includes('_INCOMPLETE') ||
    code.includes('GOOGLE_SERVICE_ACCOUNT_TOKEN_FAILED')
  ) {
    return { status: 503, code: 'PLAY_BILLING_SERVER_NOT_CONFIGURED' };
  }
  return { status: 502, code: 'PLAY_BILLING_VERIFICATION_FAILED' };
}

async function authenticatedContext(req, env, fetchImpl) {
  const idToken = bearerToken(req.headers?.authorization);
  if (!idToken) throw new Error('FIREBASE_ID_TOKEN_MISSING');
  const serviceAccount = parseServiceAccount(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  const firebaseApiKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY;
  const user = await verifyFirebaseIdentityToken(idToken, firebaseApiKey, fetchImpl);
  const accessToken = await createGoogleAccessToken(serviceAccount, fetchImpl);
  return {
    user,
    serviceAccount,
    accessToken,
    expectedObfuscatedAccountId: sha256Hex(user.uid),
  };
}

function rejectInspection(res, inspection) {
  if (inspection.reason === 'PRODUCT_MISMATCH') {
    res.status(400).json({ error: 'PLAY_PRODUCT_MISMATCH' });
    return true;
  }
  if (inspection.reason === 'ACCOUNT_MISMATCH' || inspection.reason === 'ACCOUNT_ID_MISSING') {
    res.status(403).json({ error: inspection.reason });
    return true;
  }
  return false;
}

async function persistAndAcknowledge({
  serviceAccount,
  accessToken,
  uid,
  purchaseToken,
  productId,
  tier,
  inspection,
  fetchImpl,
  storeRawToken,
}) {
  const persisted = await persistSubscriptionDecision({
    serviceAccount,
    accessToken,
    uid,
    purchaseToken,
    productId,
    tier,
    inspection,
    fetchImpl,
  });

  if (storeRawToken) {
    await storePurchaseTokenSecret({
      serviceAccount,
      accessToken,
      tokenHash: persisted.tokenHash,
      purchaseToken,
      fetchImpl,
    });
  }

  let acknowledged = !inspection.acknowledgementPending;
  if (inspection.entitled && inspection.acknowledgementPending) {
    await acknowledgeGooglePlaySubscription({
      packageName: PACKAGE_NAME,
      productId,
      purchaseToken,
      accessToken,
      fetchImpl,
    });
    acknowledged = true;
  }

  return { persisted, acknowledged };
}

export function createPlayBillingVerifyHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function verifyGooglePlaySubscription(req, res) {
    try {
      const purchaseToken = safeString(req.body?.purchaseToken, 4096);
      const productId = safeString(req.body?.productId, 256);
      if (!purchaseToken || !productId) {
        return res.status(400).json({ error: 'INVALID_PLAY_PURCHASE_INPUT' });
      }

      const tier = subscriptionTierForProduct(productId, env);
      if (!tier) return res.status(400).json({ error: 'UNKNOWN_PLAY_PRODUCT' });

      const context = await authenticatedContext(req, env, fetchImpl);
      const googlePurchase = await getGooglePlaySubscription({
        packageName: PACKAGE_NAME,
        purchaseToken,
        accessToken: context.accessToken,
        fetchImpl,
      });
      const inspection = inspectSubscriptionPurchase(googlePurchase, productId, {
        expectedObfuscatedAccountId: context.expectedObfuscatedAccountId,
        requireObfuscatedAccountId: true,
      });
      if (rejectInspection(res, inspection)) return;

      let shouldPersist = false;
      if (inspection.entitled || inspection.state === 'SUBSCRIPTION_STATE_PENDING') {
        await claimPurchaseToken({
          serviceAccount: context.serviceAccount,
          accessToken: context.accessToken,
          purchaseToken,
          uid: context.user.uid,
          productId,
          fetchImpl,
        });
        shouldPersist = true;
      } else {
        const owner = await readPurchaseTokenOwner({
          serviceAccount: context.serviceAccount,
          accessToken: context.accessToken,
          purchaseToken,
          fetchImpl,
        });
        if (!owner.existing) {
          return res.status(200).json({
            verified: true,
            entitled: false,
            tier: 'none',
            state: inspection.state || inspection.reason,
            expiryTime: inspection.expiryTime || null,
            acknowledged: !inspection.acknowledgementPending,
          });
        }
        if (owner.uid !== context.user.uid) return res.status(403).json({ error: 'PURCHASE_TOKEN_ALREADY_BOUND' });
        shouldPersist = true;
      }

      const { persisted, acknowledged } = await persistAndAcknowledge({
        serviceAccount: context.serviceAccount,
        accessToken: context.accessToken,
        uid: context.user.uid,
        purchaseToken,
        productId,
        tier,
        inspection,
        fetchImpl,
        storeRawToken: shouldPersist,
      });

      return res.status(200).json({
        verified: true,
        entitled: inspection.entitled,
        tier: inspection.entitled ? tier : 'none',
        state: inspection.state,
        expiryTime: inspection.expiryTime || null,
        acknowledged,
        revokedCurrentEntitlement: Boolean(persisted.revokedCurrentEntitlement),
      });
    } catch (error) {
      console.error('[Play Billing] verification failed', error instanceof Error ? error.message : error);
      const mapped = publicError(error);
      return res.status(mapped.status).json({ error: mapped.code });
    }
  };
}

export function createPlayBillingStatusHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function syncGooglePlaySubscription(req, res) {
    try {
      const context = await authenticatedContext(req, env, fetchImpl);
      const stored = await readStoredPurchaseForUser({
        serviceAccount: context.serviceAccount,
        accessToken: context.accessToken,
        uid: context.user.uid,
        fetchImpl,
      });
      if (!stored) {
        return res.status(200).json({
          verified: true,
          entitled: false,
          tier: 'none',
          state: 'NO_STORED_PLAY_SUBSCRIPTION',
        });
      }

      const tier = subscriptionTierForProduct(stored.productId, env);
      if (!tier) return res.status(503).json({ error: 'PLAY_BILLING_SERVER_NOT_CONFIGURED' });

      const googlePurchase = await getGooglePlaySubscription({
        packageName: PACKAGE_NAME,
        purchaseToken: stored.purchaseToken,
        accessToken: context.accessToken,
        fetchImpl,
      });
      const inspection = inspectSubscriptionPurchase(googlePurchase, stored.productId, {
        expectedObfuscatedAccountId: context.expectedObfuscatedAccountId,
        requireObfuscatedAccountId: true,
      });
      if (rejectInspection(res, inspection)) return;

      const { persisted, acknowledged } = await persistAndAcknowledge({
        serviceAccount: context.serviceAccount,
        accessToken: context.accessToken,
        uid: context.user.uid,
        purchaseToken: stored.purchaseToken,
        productId: stored.productId,
        tier,
        inspection,
        fetchImpl,
        storeRawToken: false,
      });

      return res.status(200).json({
        verified: true,
        entitled: inspection.entitled,
        tier: inspection.entitled ? tier : 'none',
        state: inspection.state,
        expiryTime: inspection.expiryTime || null,
        acknowledged,
        revokedCurrentEntitlement: Boolean(persisted.revokedCurrentEntitlement),
      });
    } catch (error) {
      console.error('[Play Billing] status sync failed', error instanceof Error ? error.message : error);
      const mapped = publicError(error);
      return res.status(mapped.status).json({ error: mapped.code });
    }
  };
}

export function registerPlayBillingRoutes(app, options = {}) {
  app.post('/api/billing/google-play/verify', createPlayBillingVerifyHandler(options));
  app.post('/api/billing/google-play/status', createPlayBillingStatusHandler(options));
}

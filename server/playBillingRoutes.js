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

export function createPlayBillingVerifyHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function verifyGooglePlaySubscription(req, res) {
    try {
      const idToken = bearerToken(req.headers?.authorization);
      if (!idToken) return res.status(401).json({ error: 'FIREBASE_ID_TOKEN_MISSING' });

      const purchaseToken = safeString(req.body?.purchaseToken, 4096);
      const productId = safeString(req.body?.productId, 256);
      if (!purchaseToken || !productId) {
        return res.status(400).json({ error: 'INVALID_PLAY_PURCHASE_INPUT' });
      }

      const tier = subscriptionTierForProduct(productId, env);
      if (!tier) return res.status(400).json({ error: 'UNKNOWN_PLAY_PRODUCT' });

      const serviceAccount = parseServiceAccount(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
      const firebaseApiKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY;
      const user = await verifyFirebaseIdentityToken(idToken, firebaseApiKey, fetchImpl);
      const expectedObfuscatedAccountId = sha256Hex(user.uid);
      const accessToken = await createGoogleAccessToken(serviceAccount, fetchImpl);

      const googlePurchase = await getGooglePlaySubscription({
        packageName: PACKAGE_NAME,
        purchaseToken,
        accessToken,
        fetchImpl,
      });
      const inspection = inspectSubscriptionPurchase(googlePurchase, productId, {
        expectedObfuscatedAccountId,
        requireObfuscatedAccountId: true,
      });

      if (inspection.reason === 'PRODUCT_MISMATCH') {
        return res.status(400).json({ error: 'PLAY_PRODUCT_MISMATCH' });
      }
      if (inspection.reason === 'ACCOUNT_MISMATCH' || inspection.reason === 'ACCOUNT_ID_MISSING') {
        return res.status(403).json({ error: inspection.reason });
      }

      if (inspection.entitled || inspection.state === 'SUBSCRIPTION_STATE_PENDING') {
        await claimPurchaseToken({
          serviceAccount,
          accessToken,
          purchaseToken,
          uid: user.uid,
          productId,
          fetchImpl,
        });
      } else {
        const owner = await readPurchaseTokenOwner({ serviceAccount, accessToken, purchaseToken, fetchImpl });
        if (!owner.existing) {
          return res.status(200).json({
            verified: true,
            entitled: false,
            state: inspection.state || inspection.reason,
            expiryTime: inspection.expiryTime || null,
          });
        }
        if (owner.uid !== user.uid) return res.status(403).json({ error: 'PURCHASE_TOKEN_ALREADY_BOUND' });
      }

      const persisted = await persistSubscriptionDecision({
        serviceAccount,
        accessToken,
        uid: user.uid,
        purchaseToken,
        productId,
        tier,
        inspection,
        fetchImpl,
      });

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

export function registerPlayBillingRoutes(app, options = {}) {
  app.post('/api/billing/google-play/verify', createPlayBillingVerifyHandler(options));
}

import crypto from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function parseServiceAccount(raw) {
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_MISSING');
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_INVALID');
  }
  if (!data?.client_email || !data?.private_key || !data?.project_id) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_INCOMPLETE');
  }
  return data;
}

export async function createGoogleAccessToken(serviceAccount, fetchImpl = fetch) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: `${ANDROID_PUBLISHER_SCOPE} ${FIRESTORE_SCOPE}`,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth-type:jwt-bearer'.replace('oauth-type', 'oauth-grant-type'),
    assertion,
  });
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_TOKEN_FAILED:${response.status}`);
  }
  return data.access_token;
}

export async function verifyFirebaseIdentityToken(idToken, apiKey, fetchImpl = fetch) {
  if (!idToken) throw new Error('FIREBASE_ID_TOKEN_MISSING');
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY_MISSING');
  const response = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  const data = await response.json().catch(() => ({}));
  const user = Array.isArray(data.users) ? data.users[0] : null;
  if (!response.ok || !user?.localId) throw new Error('FIREBASE_ID_TOKEN_INVALID');
  return { uid: user.localId, email: user.email || null };
}

export function subscriptionTierForProduct(productId, env = process.env) {
  const allowlist = new Map();
  if (env.PLAY_ADEPT_PRODUCT_ID) allowlist.set(env.PLAY_ADEPT_PRODUCT_ID, 'adept');
  if (env.PLAY_ORACLE_PRODUCT_ID) allowlist.set(env.PLAY_ORACLE_PRODUCT_ID, 'oracle');
  return allowlist.get(productId) || null;
}

export function inspectSubscriptionPurchase(data, expectedProductId, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  if (!data || typeof data !== 'object') return { entitled: false, reason: 'INVALID_RESPONSE' };
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  const lineItem = lineItems.find(item => item?.productId === expectedProductId);
  if (!lineItem) return { entitled: false, reason: 'PRODUCT_MISMATCH' };

  const state = data.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED';
  const expiryMs = Date.parse(lineItem.expiryTime || '');
  const notExpired = Number.isFinite(expiryMs) && expiryMs > nowMs;
  const statesWithAccess = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    'SUBSCRIPTION_STATE_CANCELED',
  ]);
  const entitled = statesWithAccess.has(state) && notExpired;
  const acknowledgementPending = data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING';

  if (options.expectedObfuscatedAccountId) {
    const external = data.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (external && external !== options.expectedObfuscatedAccountId) {
      return {
        entitled: false,
        reason: 'ACCOUNT_MISMATCH',
        state,
        expiryTime: lineItem.expiryTime || null,
        acknowledgementPending,
      };
    }
  }

  return {
    entitled,
    reason: entitled ? 'ENTITLED' : state,
    state,
    expiryTime: lineItem.expiryTime || null,
    acknowledgementPending,
    productId: lineItem.productId,
    basePlanId: lineItem.offerDetails?.basePlanId || null,
    offerId: lineItem.offerDetails?.offerId || null,
    testPurchase: Boolean(data.testPurchase),
  };
}

export async function getGooglePlaySubscription({ packageName, purchaseToken, accessToken, fetchImpl = fetch }) {
  if (!packageName || !purchaseToken || !accessToken) throw new Error('PLAY_VERIFICATION_INPUT_MISSING');
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PLAY_SUBSCRIPTION_LOOKUP_FAILED:${response.status}`);
  return data;
}

export async function acknowledgeGooglePlaySubscription({ packageName, productId, purchaseToken, accessToken, fetchImpl = fetch }) {
  if (!packageName || !productId || !purchaseToken || !accessToken) throw new Error('PLAY_ACK_INPUT_MISSING');
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error(`PLAY_SUBSCRIPTION_ACK_FAILED:${response.status}`);
}

function firestoreValue(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (value === null || value === undefined) return { nullValue: null };
  return { stringValue: String(value) };
}

async function firestoreRequest({ serviceAccount, accessToken, path, method = 'GET', query = '', body, fetchImpl = fetch }) {
  const projectId = serviceAccount.project_id;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}${query}`;
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function readPurchaseTokenOwner({ serviceAccount, accessToken, purchaseToken, fetchImpl = fetch }) {
  const tokenHash = sha256Hex(purchaseToken);
  const { response, data } = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `playPurchases/${tokenHash}`,
    fetchImpl,
  });
  if (response.status === 404) return { tokenHash, existing: false, uid: null };
  if (!response.ok) throw new Error(`FIRESTORE_PURCHASE_LOOKUP_FAILED:${response.status}`);
  return { tokenHash, existing: true, uid: data.fields?.uid?.stringValue || null };
}

export async function claimPurchaseToken({
  serviceAccount,
  accessToken,
  purchaseToken,
  uid,
  productId,
  fetchImpl = fetch,
}) {
  const tokenHash = sha256Hex(purchaseToken);
  const createdAt = new Date().toISOString();
  const path = 'playPurchases';
  const query = `?documentId=${encodeURIComponent(tokenHash)}`;
  const body = {
    fields: {
      uid: firestoreValue(uid),
      productId: firestoreValue(productId),
      createdAt: { timestampValue: createdAt },
    },
  };
  const created = await firestoreRequest({
    serviceAccount,
    accessToken,
    path,
    method: 'POST',
    query,
    body,
    fetchImpl,
  });
  if (created.response.ok) return { tokenHash, existing: false };
  if (created.response.status !== 409) {
    throw new Error(`FIRESTORE_PURCHASE_CLAIM_FAILED:${created.response.status}`);
  }

  const owner = await readPurchaseTokenOwner({ serviceAccount, accessToken, purchaseToken, fetchImpl });
  if (owner.uid !== uid) throw new Error('PURCHASE_TOKEN_ALREADY_BOUND');
  return { tokenHash, existing: true };
}

async function writePurchaseState({
  serviceAccount,
  accessToken,
  uid,
  purchaseToken,
  productId,
  tier,
  inspection,
  fetchImpl = fetch,
}) {
  const tokenHash = sha256Hex(purchaseToken);
  const updatedAt = new Date().toISOString();
  const purchaseFields = {
    uid: firestoreValue(uid),
    productId: firestoreValue(productId),
    tier: firestoreValue(tier),
    subscriptionState: firestoreValue(inspection.state),
    expiryTime: firestoreValue(inspection.expiryTime),
    updatedAt: { timestampValue: updatedAt },
  };
  const purchaseWrite = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `playPurchases/${tokenHash}`,
    method: 'PATCH',
    body: { fields: purchaseFields },
    fetchImpl,
  });
  if (!purchaseWrite.response.ok) throw new Error(`FIRESTORE_PURCHASE_WRITE_FAILED:${purchaseWrite.response.status}`);
  return { tokenHash, updatedAt };
}

export async function persistSubscriptionDecision({
  serviceAccount,
  accessToken,
  uid,
  purchaseToken,
  productId,
  tier,
  inspection,
  fetchImpl = fetch,
}) {
  const { tokenHash, updatedAt } = await writePurchaseState({
    serviceAccount,
    accessToken,
    uid,
    purchaseToken,
    productId,
    tier,
    inspection,
    fetchImpl,
  });

  const subscriptionFields = {
    productId: firestoreValue(productId),
    purchaseTokenHash: firestoreValue(tokenHash),
    subscriptionState: firestoreValue(inspection.state),
    expiryTime: firestoreValue(inspection.expiryTime),
    basePlanId: firestoreValue(inspection.basePlanId),
    offerId: firestoreValue(inspection.offerId),
    testPurchase: firestoreValue(inspection.testPurchase),
    updatedAt: { timestampValue: updatedAt },
  };

  if (inspection.entitled) {
    const userWrite = await firestoreRequest({
      serviceAccount,
      accessToken,
      path: `users/${encodeURIComponent(uid)}`,
      method: 'PATCH',
      query: '?updateMask.fieldPaths=vipStatus&updateMask.fieldPaths=playSubscription',
      body: {
        fields: {
          vipStatus: firestoreValue(tier),
          playSubscription: { mapValue: { fields: subscriptionFields } },
        },
      },
      fetchImpl,
    });
    if (!userWrite.response.ok) throw new Error(`FIRESTORE_ENTITLEMENT_WRITE_FAILED:${userWrite.response.status}`);
    return { tokenHash, tier, entitled: true, updatedAt };
  }

  const current = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `users/${encodeURIComponent(uid)}`,
    fetchImpl,
  });
  if (!current.response.ok) throw new Error(`FIRESTORE_USER_LOOKUP_FAILED:${current.response.status}`);
  const currentTokenHash = current.data.fields?.playSubscription?.mapValue?.fields?.purchaseTokenHash?.stringValue;
  if (currentTokenHash !== tokenHash) {
    return { tokenHash, entitled: false, revokedCurrentEntitlement: false, updatedAt };
  }

  const revokeWrite = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `users/${encodeURIComponent(uid)}`,
    method: 'PATCH',
    query: '?updateMask.fieldPaths=vipStatus&updateMask.fieldPaths=playSubscription',
    body: {
      fields: {
        vipStatus: firestoreValue('none'),
        playSubscription: { mapValue: { fields: subscriptionFields } },
      },
    },
    fetchImpl,
  });
  if (!revokeWrite.response.ok) throw new Error(`FIRESTORE_ENTITLEMENT_REVOKE_FAILED:${revokeWrite.response.status}`);
  return { tokenHash, entitled: false, revokedCurrentEntitlement: true, updatedAt };
}

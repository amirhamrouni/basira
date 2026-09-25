import crypto from 'crypto';

const PACKAGE_NAME = 'com.basira.spiritportal';
const FIREBASE_PROJECT_ID = 'gen-lang-client-0217548336';
const FIRESTORE_DATABASE_ID = 'ai-studio-6aad922f-e489-4552-a94a-9a140353fa50';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

const accessTokenCache = new Map();
let firebaseCertCache = { expiresAt: 0, certs: null };

function base64Url(input) {
    return Buffer.from(input).toString('base64url');
}

function decodeJwtPart(part) {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function parseServiceAccount(value, name) {
    if (!value) throw new Error(`${name}_MISSING`);
    let text = value.trim();
    if (!text.startsWith('{')) {
        try { text = Buffer.from(text, 'base64').toString('utf8'); } catch {}
    }
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error(`${name}_INVALID_JSON`); }
    if (!parsed.client_email || !parsed.private_key) throw new Error(`${name}_INVALID`);
    return parsed;
}

async function getGoogleAccessToken(serviceAccount, scope) {
    const cacheKey = `${serviceAccount.client_email}:${scope}`;
    const cached = accessTokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    if (serviceAccount.private_key_id) header.kid = serviceAccount.private_key_id;
    const claims = {
        iss: serviceAccount.client_email,
        scope,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
    };
    const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), serviceAccount.private_key).toString('base64url');
    const assertion = `${signingInput}.${signature}`;

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
    accessTokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 });
    return data.access_token;
}

async function getFirebaseCerts() {
    if (firebaseCertCache.certs && firebaseCertCache.expiresAt > Date.now()) return firebaseCertCache.certs;
    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) throw new Error(`FIREBASE_CERT_FETCH_FAILED_${response.status}`);
    const certs = await response.json();
    const cacheControl = response.headers.get('cache-control') || '';
    const match = cacheControl.match(/max-age=(\d+)/i);
    const maxAge = match ? Number(match[1]) : 3600;
    firebaseCertCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
    return certs;
}

export async function verifyFirebaseIdToken(idToken) {
    if (!idToken || typeof idToken !== 'string') throw new Error('FIREBASE_ID_TOKEN_MISSING');
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('FIREBASE_ID_TOKEN_INVALID');
    let header;
    let payload;
    try {
        header = decodeJwtPart(parts[0]);
        payload = decodeJwtPart(parts[1]);
    } catch {
        throw new Error('FIREBASE_ID_TOKEN_INVALID');
    }
    if (header.alg !== 'RS256' || !header.kid) throw new Error('FIREBASE_ID_TOKEN_INVALID_HEADER');
    const certs = await getFirebaseCerts();
    const cert = certs[header.kid];
    if (!cert) throw new Error('FIREBASE_ID_TOKEN_UNKNOWN_KEY');
    const verified = crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        cert,
        Buffer.from(parts[2], 'base64url')
    );
    if (!verified) throw new Error('FIREBASE_ID_TOKEN_BAD_SIGNATURE');

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('FIREBASE_ID_TOKEN_BAD_AUDIENCE');
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error('FIREBASE_ID_TOKEN_BAD_ISSUER');
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new Error('FIREBASE_ID_TOKEN_BAD_SUBJECT');
    if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('FIREBASE_ID_TOKEN_EXPIRED');
    if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('FIREBASE_ID_TOKEN_BAD_IAT');
    return payload;
}

function expectedAccountId(uid) {
    return crypto.createHash('sha256').update(uid).digest('hex');
}

export function evaluateSubscriptionPurchase(purchase, expectedProductId, expectedBasePlanId, nowMs = Date.now()) {
    if (!purchase || typeof purchase !== 'object') return { entitled: false, reason: 'INVALID_PURCHASE' };
    const lineItems = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
    const lineItem = lineItems.find(item => item?.productId === expectedProductId && item?.offerDetails?.basePlanId === expectedBasePlanId);
    if (!lineItem) return { entitled: false, reason: 'PRODUCT_OR_BASE_PLAN_MISMATCH' };

    const expiryTime = lineItem.expiryTime || null;
    const expiryMs = expiryTime ? Date.parse(expiryTime) : NaN;
    const notExpired = Number.isFinite(expiryMs) && expiryMs > nowMs;
    const state = purchase.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED';
    const entitledStates = new Set([
        'SUBSCRIPTION_STATE_ACTIVE',
        'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
        'SUBSCRIPTION_STATE_CANCELED',
    ]);
    const entitled = entitledStates.has(state) && notExpired;
    return {
        entitled,
        reason: entitled ? 'ENTITLED' : state,
        subscriptionState: state,
        acknowledgementState: purchase.acknowledgementState || null,
        expiryTime,
        productId: lineItem.productId,
        basePlanId: lineItem.offerDetails?.basePlanId || null,
    };
}

async function getPlaySubscription(purchaseToken, accessToken) {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`PLAY_SUBSCRIPTION_LOOKUP_FAILED_${response.status}`);
    return data;
}

async function acknowledgePlaySubscription(productId, purchaseToken, accessToken) {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: '{}',
    });
    if (!response.ok) throw new Error(`PLAY_SUBSCRIPTION_ACK_FAILED_${response.status}`);
}

function firestoreField(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    return { stringValue: String(value) };
}

async function patchFirestoreDocument(collection, documentId, values, accessToken) {
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`;
    const params = new URLSearchParams();
    for (const key of Object.keys(values)) params.append('updateMask.fieldPaths', key);
    const fields = {};
    for (const [key, value] of Object.entries(values)) fields[key] = firestoreField(value);
    const response = await fetch(`${base}?${params}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`FIRESTORE_UPDATE_FAILED_${response.status}`);
    return data;
}

function bearerToken(req) {
    const value = req.headers.authorization || '';
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

export function installBillingRoutes(app) {
    app.post('/api/billing/verify-subscription', async (req, res) => {
        try {
            const idToken = bearerToken(req);
            const identity = await verifyFirebaseIdToken(idToken);
            const uid = identity.sub;
            const purchaseToken = typeof req.body?.purchaseToken === 'string' ? req.body.purchaseToken.trim() : '';
            if (!purchaseToken || purchaseToken.length > 4096) return res.status(400).json({ error: 'INVALID_PURCHASE_TOKEN' });

            const productId = (process.env.PLAY_SUBSCRIPTION_PRODUCT_ID || '').trim();
            const basePlanId = (process.env.PLAY_SUBSCRIPTION_BASE_PLAN_ID || '').trim();
            if (!productId || !basePlanId) return res.status(503).json({ error: 'PLAY_SUBSCRIPTION_NOT_CONFIGURED' });

            const playServiceAccount = parseServiceAccount(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
            const firestoreServiceAccount = parseServiceAccount(
                process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '',
                'FIREBASE_SERVICE_ACCOUNT_JSON'
            );
            const playAccessToken = await getGoogleAccessToken(playServiceAccount, PLAY_SCOPE);
            const purchase = await getPlaySubscription(purchaseToken, playAccessToken);

            const linkedAccountId = purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId;
            if (!linkedAccountId || linkedAccountId !== expectedAccountId(uid)) {
                return res.status(403).json({ error: 'PURCHASE_ACCOUNT_MISMATCH' });
            }

            const evaluation = evaluateSubscriptionPurchase(purchase, productId, basePlanId);
            if (evaluation.entitled && evaluation.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
                await acknowledgePlaySubscription(productId, purchaseToken, playAccessToken);
            }

            const firestoreAccessToken = await getGoogleAccessToken(firestoreServiceAccount, FIRESTORE_SCOPE);
            const verifiedAt = new Date().toISOString();
            const vipStatus = evaluation.entitled ? 'oracle' : 'none';

            await patchFirestoreDocument('users', uid, {
                vipStatus,
                premiumUntil: evaluation.expiryTime,
                premiumProductId: evaluation.productId || productId,
                premiumBasePlanId: evaluation.basePlanId || basePlanId,
                premiumState: evaluation.subscriptionState || 'UNKNOWN',
                premiumVerifiedAt: verifiedAt,
            }, firestoreAccessToken);

            await patchFirestoreDocument('billingEntitlements', uid, {
                uid,
                purchaseToken,
                productId,
                basePlanId,
                subscriptionState: evaluation.subscriptionState || 'UNKNOWN',
                expiryTime: evaluation.expiryTime,
                entitled: evaluation.entitled,
                verifiedAt,
            }, firestoreAccessToken);

            return res.json({
                entitled: evaluation.entitled,
                vipStatus,
                subscriptionState: evaluation.subscriptionState,
                expiryTime: evaluation.expiryTime,
                productId,
                basePlanId,
            });
        } catch (error) {
            console.error('[Billing] Verification failed:', error.message);
            const authError = String(error.message || '').startsWith('FIREBASE_ID_TOKEN_');
            return res.status(authError ? 401 : 502).json({ error: error.message || 'SUBSCRIPTION_VERIFICATION_FAILED' });
        }
    });
}

function firestoreUrl(projectId, path, query = '') {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}${query}`;
}

async function firestoreRequest({ serviceAccount, accessToken, path, method = 'GET', query = '', body, fetchImpl = fetch }) {
  const response = await fetchImpl(firestoreUrl(serviceAccount.project_id, path, query), {
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

export async function storePurchaseTokenSecret({
  serviceAccount,
  accessToken,
  tokenHash,
  purchaseToken,
  fetchImpl = fetch,
}) {
  if (!tokenHash || !purchaseToken) throw new Error('PLAY_PURCHASE_TOKEN_STORAGE_INPUT_MISSING');
  const result = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `playPurchases/${encodeURIComponent(tokenHash)}`,
    method: 'PATCH',
    query: '?updateMask.fieldPaths=purchaseToken',
    body: { fields: { purchaseToken: { stringValue: purchaseToken } } },
    fetchImpl,
  });
  if (!result.response.ok) throw new Error(`FIRESTORE_PURCHASE_TOKEN_STORAGE_FAILED:${result.response.status}`);
}

export async function readStoredPurchaseForUser({
  serviceAccount,
  accessToken,
  uid,
  fetchImpl = fetch,
}) {
  const userResult = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `users/${encodeURIComponent(uid)}`,
    fetchImpl,
  });
  if (userResult.response.status === 404) return null;
  if (!userResult.response.ok) throw new Error(`FIRESTORE_USER_LOOKUP_FAILED:${userResult.response.status}`);

  const subscription = userResult.data.fields?.playSubscription?.mapValue?.fields;
  const tokenHash = subscription?.purchaseTokenHash?.stringValue;
  const profileProductId = subscription?.productId?.stringValue;
  if (!tokenHash) return null;

  const purchaseResult = await firestoreRequest({
    serviceAccount,
    accessToken,
    path: `playPurchases/${encodeURIComponent(tokenHash)}`,
    fetchImpl,
  });
  if (purchaseResult.response.status === 404) return null;
  if (!purchaseResult.response.ok) throw new Error(`FIRESTORE_PURCHASE_LOOKUP_FAILED:${purchaseResult.response.status}`);

  const fields = purchaseResult.data.fields || {};
  const ownerUid = fields.uid?.stringValue;
  if (ownerUid !== uid) throw new Error('PURCHASE_TOKEN_ALREADY_BOUND');
  const purchaseToken = fields.purchaseToken?.stringValue;
  const productId = profileProductId || fields.productId?.stringValue;
  if (!purchaseToken || !productId) return null;

  return { tokenHash, purchaseToken, productId };
}

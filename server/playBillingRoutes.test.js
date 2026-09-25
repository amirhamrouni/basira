import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createPlayBillingStatusHandler,
  createPlayBillingVerifyHandler,
} from './playBillingRoutes.js';

function makeResponse() {
  const state = { status: 200, body: null };
  return {
    state,
    status(code) {
      state.status = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
  };
}

describe('Google Play billing verification route', () => {
  it('requires a Firebase bearer token before purchase validation', async () => {
    const handler = createPlayBillingVerifyHandler({ env: {} });
    const res = makeResponse();
    await handler({ headers: {}, body: {} }, res);
    expect(res.state.status).toBe(401);
    expect(res.state.body).toEqual({ error: 'FIREBASE_ID_TOKEN_MISSING' });
  });

  it('requires authentication for lifecycle status sync', async () => {
    const handler = createPlayBillingStatusHandler({ env: {} });
    const res = makeResponse();
    await handler({ headers: {}, body: {} }, res);
    expect(res.state.status).toBe(401);
    expect(res.state.body).toEqual({ error: 'FIREBASE_ID_TOKEN_MISSING' });
  });

  it('rejects product IDs outside the server allowlist before external verification', async () => {
    let called = false;
    const handler = createPlayBillingVerifyHandler({
      env: { PLAY_ADEPT_PRODUCT_ID: 'basira_adept' },
      fetchImpl: async () => {
        called = true;
        throw new Error('should not call external services');
      },
    });
    const res = makeResponse();
    await handler({
      headers: { authorization: 'Bearer firebase-token' },
      body: { productId: 'made_up_product', purchaseToken: 'purchase-token' },
    }, res);
    expect(res.state.status).toBe(400);
    expect(res.state.body).toEqual({ error: 'UNKNOWN_PLAY_PRODUCT' });
    expect(called).toBe(false);
  });

  it('fails closed when secure server credentials are not configured', async () => {
    const handler = createPlayBillingVerifyHandler({
      env: { PLAY_ADEPT_PRODUCT_ID: 'basira_adept' },
    });
    const res = makeResponse();
    await handler({
      headers: { authorization: 'Bearer firebase-token' },
      body: { productId: 'basira_adept', purchaseToken: 'purchase-token' },
    }, res);
    expect(res.state.status).toBe(503);
    expect(res.state.body).toEqual({ error: 'PLAY_BILLING_SERVER_NOT_CONFIGURED' });
  });

  it('keeps billing routes registered before the generic API 404', () => {
    const source = fs.readFileSync('server.js', 'utf8');
    const registration = source.indexOf('registerPlayBillingRoutes(app);');
    const api404 = source.indexOf("app.use('/api', (req, res) => res.status(404)");
    expect(registration).toBeGreaterThan(-1);
    expect(api404).toBeGreaterThan(registration);
  });
});

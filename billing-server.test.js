import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { evaluateSubscriptionPurchase, playBillingReadiness } from './billing-server.js';

const productId = 'basira_premium';
const basePlanId = 'monthly';
const future = '2030-01-01T00:00:00Z';
const past = '2020-01-01T00:00:00Z';

function purchase(state, expiryTime = future, overrides = {}) {
    return {
        subscriptionState: state,
        acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
        lineItems: [{
            productId,
            expiryTime,
            offerDetails: { basePlanId },
        }],
        ...overrides,
    };
}

function testServiceAccount() {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
    return JSON.stringify({
        client_email: 'billing-test@example.iam.gserviceaccount.com',
        private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    });
}

describe('Play Billing readiness', () => {
    it('fails closed when catalog IDs and credentials are missing', () => {
        expect(playBillingReadiness({})).toMatchObject({
            configured: false,
            catalogConfigured: false,
            serverVerificationReady: false,
            productId: '',
            basePlanId: '',
        });
    });

    it('does not report configured when only catalog IDs exist', () => {
        expect(playBillingReadiness({
            PLAY_SUBSCRIPTION_PRODUCT_ID: productId,
            PLAY_SUBSCRIPTION_BASE_PLAN_ID: basePlanId,
        })).toMatchObject({
            configured: false,
            catalogConfigured: true,
            serverVerificationReady: false,
            productId,
            basePlanId,
        });
    });

    it('accepts one valid service account for both Play and Firestore when no separate Firebase account is supplied', () => {
        const serviceAccount = testServiceAccount();
        expect(playBillingReadiness({
            PLAY_SUBSCRIPTION_PRODUCT_ID: productId,
            PLAY_SUBSCRIPTION_BASE_PLAN_ID: basePlanId,
            GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: serviceAccount,
        })).toMatchObject({
            configured: true,
            catalogConfigured: true,
            serverVerificationReady: true,
        });
    });

    it('rejects malformed service-account material even when catalog IDs are present', () => {
        expect(playBillingReadiness({
            PLAY_SUBSCRIPTION_PRODUCT_ID: productId,
            PLAY_SUBSCRIPTION_BASE_PLAN_ID: basePlanId,
            GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'broken@example.com', private_key: 'not-a-private-key' }),
        })).toMatchObject({
            configured: false,
            catalogConfigured: true,
            serverVerificationReady: false,
        });
    });
});

describe('Play subscription entitlement evaluation', () => {
    it('grants active and grace-period subscriptions with future expiry', () => {
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ACTIVE'), productId, basePlanId, Date.parse('2029-01-01'))).toMatchObject({ entitled: true });
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), productId, basePlanId, Date.parse('2029-01-01'))).toMatchObject({ entitled: true });
    });

    it('keeps a canceled subscription entitled only until its expiry', () => {
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_CANCELED'), productId, basePlanId, Date.parse('2029-01-01'))).toMatchObject({ entitled: true });
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_CANCELED', past), productId, basePlanId, Date.parse('2029-01-01'))).toMatchObject({ entitled: false });
    });

    it('does not grant pending, paused, on-hold, or expired subscriptions', () => {
        for (const state of ['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_PAUSED', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_EXPIRED']) {
            expect(evaluateSubscriptionPurchase(purchase(state), productId, basePlanId, Date.parse('2029-01-01')).entitled).toBe(false);
        }
    });

    it('rejects another product or base plan', () => {
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ACTIVE'), 'other_product', basePlanId).entitled).toBe(false);
        expect(evaluateSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ACTIVE'), productId, 'yearly').entitled).toBe(false);
    });
});

import { describe, expect, it } from 'vitest';
import { evaluateSubscriptionPurchase } from './billing-server.js';

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

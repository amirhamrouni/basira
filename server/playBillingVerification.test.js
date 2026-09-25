import { describe, expect, it } from 'vitest';
import {
  inspectSubscriptionPurchase,
  sha256Hex,
  subscriptionTierForProduct,
} from './playBillingVerification.js';

const NOW = Date.parse('2026-09-26T00:00:00Z');
const future = '2026-10-26T00:00:00Z';
const past = '2026-08-26T00:00:00Z';

function purchase(state, expiryTime = future, productId = 'basira_adept') {
  return {
    subscriptionState: state,
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    lineItems: [{ productId, expiryTime, offerDetails: { basePlanId: 'monthly' } }],
  };
}

describe('Google Play subscription verification helpers', () => {
  it('grants only server-allowed active access states with future expiry', () => {
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ACTIVE'), 'basira_adept', { nowMs: NOW }).entitled).toBe(true);
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), 'basira_adept', { nowMs: NOW }).entitled).toBe(true);
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_CANCELED'), 'basira_adept', { nowMs: NOW }).entitled).toBe(true);
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_PENDING'), 'basira_adept', { nowMs: NOW }).entitled).toBe(false);
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ON_HOLD'), 'basira_adept', { nowMs: NOW }).entitled).toBe(false);
    expect(inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_EXPIRED', past), 'basira_adept', { nowMs: NOW }).entitled).toBe(false);
  });

  it('rejects a token whose line item is for another product', () => {
    const result = inspectSubscriptionPurchase(purchase('SUBSCRIPTION_STATE_ACTIVE', future, 'other_product'), 'basira_adept', { nowMs: NOW });
    expect(result).toEqual({ entitled: false, reason: 'PRODUCT_MISMATCH' });
  });

  it('rejects a mismatched obfuscated account when Google returns one', () => {
    const data = purchase('SUBSCRIPTION_STATE_ACTIVE');
    data.externalAccountIdentifiers = { obfuscatedExternalAccountId: 'account-a' };
    const result = inspectSubscriptionPurchase(data, 'basira_adept', {
      nowMs: NOW,
      expectedObfuscatedAccountId: 'account-b',
    });
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe('ACCOUNT_MISMATCH');
  });

  it('maps only configured product IDs to premium tiers', () => {
    const env = {
      PLAY_ADEPT_PRODUCT_ID: 'basira_adept',
      PLAY_ORACLE_PRODUCT_ID: 'basira_oracle',
    };
    expect(subscriptionTierForProduct('basira_adept', env)).toBe('adept');
    expect(subscriptionTierForProduct('basira_oracle', env)).toBe('oracle');
    expect(subscriptionTierForProduct('made_up', env)).toBeNull();
  });

  it('hashes purchase tokens deterministically before persistence', () => {
    expect(sha256Hex('token-123')).toBe(sha256Hex('token-123'));
    expect(sha256Hex('token-123')).not.toBe(sha256Hex('token-456'));
  });
});

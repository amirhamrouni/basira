import { Capacitor, registerPlugin } from '@capacitor/core';
import { getApiUrl } from './api';

export interface PlayPricingPhase {
    formattedPrice: string;
    priceAmountMicros: number;
    priceCurrencyCode: string;
    billingPeriod: string;
    billingCycleCount: number;
    recurrenceMode: number;
}

export interface PlaySubscriptionOffer {
    basePlanId: string;
    offerId?: string;
    offerToken: string;
    offerTags: string[];
    pricingPhases: PlayPricingPhase[];
}

export interface PlaySubscriptionProduct {
    productId: string;
    title: string;
    description: string;
    offers: PlaySubscriptionOffer[];
}

export interface PlayPurchase {
    status?: 'purchased' | 'pending' | 'cancelled' | 'unspecified';
    purchaseToken?: string;
    purchaseTime?: number;
    acknowledged?: boolean;
    purchaseState?: number;
    products?: string[];
}

export interface PlayVerificationResult {
    verified: boolean;
    entitled: boolean;
    tier?: 'adept' | 'oracle' | 'none';
    state?: string;
    expiryTime?: string | null;
    acknowledged?: boolean;
    revokedCurrentEntitlement?: boolean;
    error?: string;
}

interface BasiraBillingPlugin {
    connect(): Promise<{ ready: boolean }>;
    querySubscription(options: { productId: string }): Promise<PlaySubscriptionProduct>;
    purchaseSubscription(options: {
        productId: string;
        offerToken: string;
        obfuscatedAccountId?: string;
    }): Promise<PlayPurchase>;
    restoreSubscriptions(): Promise<{ purchases: PlayPurchase[] }>;
}

const BasiraBilling = registerPlugin<BasiraBillingPlugin>('BasiraBilling');

export function isPlayBillingSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function connectPlayBilling(): Promise<void> {
    if (!isPlayBillingSupported()) throw new Error('PLAY_BILLING_ANDROID_ONLY');
    const result = await BasiraBilling.connect();
    if (!result.ready) throw new Error('PLAY_BILLING_NOT_READY');
}

export async function getPlaySubscription(productId: string): Promise<PlaySubscriptionProduct> {
    const cleanId = productId.trim();
    if (!cleanId) throw new Error('PLAY_PRODUCT_ID_MISSING');
    await connectPlayBilling();
    return BasiraBilling.querySubscription({ productId: cleanId });
}

export async function buyPlaySubscription(
    productId: string,
    offerToken: string,
    obfuscatedAccountId?: string,
): Promise<PlayPurchase> {
    const cleanId = productId.trim();
    const cleanOffer = offerToken.trim();
    if (!cleanId || !cleanOffer) throw new Error('PLAY_PRODUCT_OR_OFFER_MISSING');
    await connectPlayBilling();
    return BasiraBilling.purchaseSubscription({
        productId: cleanId,
        offerToken: cleanOffer,
        ...(obfuscatedAccountId ? { obfuscatedAccountId } : {}),
    });
}

export async function restorePlaySubscriptions(): Promise<PlayPurchase[]> {
    await connectPlayBilling();
    const result = await BasiraBilling.restoreSubscriptions();
    return Array.isArray(result.purchases) ? result.purchases : [];
}

export async function obfuscatedAccountIdForUid(uid: string): Promise<string> {
    const cleanUid = uid.trim();
    if (!cleanUid) throw new Error('PLAY_ACCOUNT_ID_MISSING');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cleanUid));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyPlaySubscription(
    idToken: string,
    productId: string,
    purchaseToken: string,
): Promise<PlayVerificationResult> {
    const response = await fetch(getApiUrl('/api/billing/google-play/verify'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ productId, purchaseToken }),
    });
    const data = await response.json().catch(() => ({})) as PlayVerificationResult;
    if (!response.ok) {
        throw new Error(data.error || `PLAY_VERIFICATION_HTTP_${response.status}`);
    }
    return data;
}

export function preferredSubscriptionOffer(product: PlaySubscriptionProduct): PlaySubscriptionOffer | null {
    if (!Array.isArray(product.offers) || product.offers.length === 0) return null;
    return product.offers.find(offer => !offer.offerId) || product.offers[0];
}

export function recurringDisplayPrice(offer: PlaySubscriptionOffer | null): string | null {
    if (!offer?.pricingPhases?.length) return null;
    const recurring = [...offer.pricingPhases].reverse().find(phase => phase.priceAmountMicros > 0);
    return recurring?.formattedPrice || offer.pricingPhases[offer.pricingPhases.length - 1]?.formattedPrice || null;
}

export function recurringBillingPeriod(offer: PlaySubscriptionOffer | null): string | null {
    if (!offer?.pricingPhases?.length) return null;
    const recurring = [...offer.pricingPhases].reverse().find(phase => phase.priceAmountMicros > 0);
    return recurring?.billingPeriod || offer.pricingPhases[offer.pricingPhases.length - 1]?.billingPeriod || null;
}

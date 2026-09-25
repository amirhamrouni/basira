import { Capacitor, registerPlugin } from '@capacitor/core';
import type { User } from 'firebase/auth';
import { getApiUrl } from './api';

export interface SubscriptionPricingPhase {
    formattedPrice: string;
    priceAmountMicros: number;
    priceCurrencyCode: string;
    billingPeriod: string;
    billingCycleCount: number;
    recurrenceMode: number;
}

export interface SubscriptionOffer {
    productId: string;
    name: string;
    title: string;
    description: string;
    basePlanId: string;
    offerId?: string | null;
    offerToken: string;
    formattedPrice?: string;
    billingPeriod?: string;
    pricingPhases: SubscriptionPricingPhase[];
}

export interface NativePurchase {
    purchaseToken?: string;
    orderId?: string | null;
    purchaseTime?: number;
    purchaseState?: number;
    acknowledged?: boolean;
    autoRenewing?: boolean;
    products?: string[];
    pending?: boolean;
    cancelled?: boolean;
}

interface RestoreResult {
    purchases: NativePurchase[];
}

interface BasiraBillingPlugin {
    getSubscriptionOffer(options: { productId: string; basePlanId: string }): Promise<SubscriptionOffer>;
    purchaseSubscription(options: { productId: string; basePlanId: string; obfuscatedAccountId?: string }): Promise<NativePurchase>;
    restoreSubscriptions(): Promise<RestoreResult>;
}

const NativeBilling = registerPlugin<BasiraBillingPlugin>('BasiraBilling');

export const PLAY_PRODUCT_ID = (import.meta.env.VITE_PLAY_SUBSCRIPTION_PRODUCT_ID as string | undefined)?.trim() || '';
export const PLAY_BASE_PLAN_ID = (import.meta.env.VITE_PLAY_SUBSCRIPTION_BASE_PLAN_ID as string | undefined)?.trim() || '';

export function isPlayBillingConfigured(): boolean {
    return Boolean(PLAY_PRODUCT_ID && PLAY_BASE_PLAN_ID);
}

export function isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function requireBillingConfiguration() {
    if (!isNativeAndroid()) throw new Error('PLAY_BILLING_ANDROID_ONLY');
    if (!isPlayBillingConfigured()) throw new Error('PLAY_BILLING_NOT_CONFIGURED');
}

async function sha256Hex(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadPlaySubscriptionOffer(): Promise<SubscriptionOffer> {
    requireBillingConfiguration();
    return NativeBilling.getSubscriptionOffer({ productId: PLAY_PRODUCT_ID, basePlanId: PLAY_BASE_PLAN_ID });
}

export async function startPlaySubscriptionPurchase(user: User): Promise<NativePurchase> {
    requireBillingConfiguration();
    return NativeBilling.purchaseSubscription({
        productId: PLAY_PRODUCT_ID,
        basePlanId: PLAY_BASE_PLAN_ID,
        obfuscatedAccountId: await sha256Hex(user.uid),
    });
}

export async function restorePlaySubscriptions(): Promise<NativePurchase[]> {
    requireBillingConfiguration();
    const result = await NativeBilling.restoreSubscriptions();
    return Array.isArray(result.purchases) ? result.purchases : [];
}

export interface VerifiedSubscription {
    entitled: boolean;
    vipStatus: 'none' | 'oracle';
    subscriptionState?: string;
    expiryTime?: string | null;
    productId?: string;
    basePlanId?: string;
}

export async function verifyPlaySubscription(user: User, purchaseToken: string): Promise<VerifiedSubscription> {
    if (!purchaseToken) throw new Error('PURCHASE_TOKEN_MISSING');
    const idToken = await user.getIdToken();
    const response = await fetch(getApiUrl('/api/billing/verify-subscription'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ purchaseToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `SUBSCRIPTION_VERIFICATION_FAILED_${response.status}`);
    return data as VerifiedSubscription;
}

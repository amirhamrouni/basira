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

export interface PlayBillingConfig {
    configured: boolean;
    catalogConfigured: boolean;
    serverVerificationReady: boolean;
    productId: string;
    basePlanId: string;
}

const NativeBilling = registerPlugin<BasiraBillingPlugin>('BasiraBilling');
let configCache: { value: PlayBillingConfig; expiresAt: number } | null = null;

export function isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

async function requirePlayBillingConfig(): Promise<PlayBillingConfig> {
    if (!isNativeAndroid()) throw new Error('PLAY_BILLING_ANDROID_ONLY');
    if (configCache && configCache.expiresAt > Date.now()) return configCache.value;

    const response = await fetch(getApiUrl('/api/billing/config'), { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `PLAY_BILLING_CONFIG_FAILED_${response.status}`);

    const productId = typeof data.productId === 'string' ? data.productId.trim() : '';
    const basePlanId = typeof data.basePlanId === 'string' ? data.basePlanId.trim() : '';
    const catalogConfigured = Boolean(data.catalogConfigured && productId && basePlanId);
    const serverVerificationReady = Boolean(data.serverVerificationReady);
    const config: PlayBillingConfig = {
        configured: Boolean(data.configured && catalogConfigured && serverVerificationReady),
        catalogConfigured,
        serverVerificationReady,
        productId,
        basePlanId,
    };

    if (!config.catalogConfigured) throw new Error('PLAY_BILLING_CATALOG_NOT_CONFIGURED');
    if (!config.serverVerificationReady) throw new Error('PLAY_BILLING_SERVER_NOT_READY');
    if (!config.configured) throw new Error('PLAY_BILLING_NOT_CONFIGURED');

    configCache = { value: config, expiresAt: Date.now() + 5 * 60_000 };
    return config;
}

async function sha256Hex(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadPlaySubscriptionOffer(): Promise<SubscriptionOffer> {
    const { productId, basePlanId } = await requirePlayBillingConfig();
    return NativeBilling.getSubscriptionOffer({ productId, basePlanId });
}

export async function startPlaySubscriptionPurchase(user: User): Promise<NativePurchase> {
    const { productId, basePlanId } = await requirePlayBillingConfig();
    return NativeBilling.purchaseSubscription({
        productId,
        basePlanId,
        obfuscatedAccountId: await sha256Hex(user.uid),
    });
}

export async function restorePlaySubscriptions(): Promise<{ purchases: NativePurchase[]; productId: string }> {
    const { productId } = await requirePlayBillingConfig();
    const result = await NativeBilling.restoreSubscriptions();
    return {
        purchases: Array.isArray(result.purchases) ? result.purchases : [],
        productId,
    };
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

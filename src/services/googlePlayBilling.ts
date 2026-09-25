import { Capacitor } from '@capacitor/core';
import {
    NativePurchases,
    PURCHASE_TYPE,
    type Product,
    type Transaction,
} from '@capgo/native-purchases';
import type { User } from 'firebase/auth';

export const ORACLE_PRODUCT_ID = 'basira_oracle_monthly';
export const ORACLE_BASE_PLAN_ID = 'monthly';

function isAndroidNative() {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

async function obfuscatedAccountId(uid: string) {
    const bytes = new TextEncoder().encode(uid);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadOracleProduct(): Promise<Product | null> {
    if (!isAndroidNative()) return null;
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) throw new Error('BILLING_UNAVAILABLE');

    const { products } = await NativePurchases.getProducts({
        productIdentifiers: [ORACLE_PRODUCT_ID],
        productType: PURCHASE_TYPE.SUBS,
    });
    return products.find(product =>
        product.planIdentifier === ORACLE_PRODUCT_ID || product.identifier === ORACLE_PRODUCT_ID
    ) ?? null;
}

async function verifyTransaction(user: User, transaction: Transaction) {
    if (!transaction.purchaseToken) throw new Error('PURCHASE_TOKEN_MISSING');
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/purchases/google/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            productId: ORACLE_PRODUCT_ID,
            purchaseToken: transaction.purchaseToken,
        }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.active !== true) {
        throw new Error(body?.error || 'PURCHASE_NOT_VERIFIED');
    }
    return body;
}

export async function purchaseOracle(user: User) {
    if (!isAndroidNative()) throw new Error('ANDROID_PLAY_REQUIRED');
    const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: ORACLE_PRODUCT_ID,
        planIdentifier: ORACLE_BASE_PLAN_ID,
        productType: PURCHASE_TYPE.SUBS,
        appAccountToken: await obfuscatedAccountId(user.uid),
        autoAcknowledgePurchases: true,
    });
    return verifyTransaction(user, transaction);
}

export async function restoreOracle(user: User) {
    if (!isAndroidNative()) throw new Error('ANDROID_PLAY_REQUIRED');
    await NativePurchases.restorePurchases();
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });
    const transaction = purchases.find(purchase =>
        purchase.productIdentifier === ORACLE_PRODUCT_ID && purchase.purchaseToken
    );
    if (!transaction) throw new Error('NO_PURCHASE_FOUND');
    return verifyTransaction(user, transaction);
}

export function isNativeGooglePlayBilling() {
    return isAndroidNative();
}

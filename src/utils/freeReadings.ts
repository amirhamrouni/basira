import { collection, doc, runTransaction, type Firestore } from 'firebase/firestore';

export type FreeReadingType = 'palmistry' | 'coffee';
export type MeteredReadingType = FreeReadingType | 'tarot' | 'divination';
export const FREE_READINGS_PER_TYPE = 3;

type ReadingProfile = {
    vipStatus?: unknown;
    premiumUntil?: unknown;
    freeReadings?: Record<string, unknown>;
} | null | undefined;

export function isPremiumProfile(profile: ReadingProfile, nowMs = Date.now()): boolean {
    const serverPremium = profile?.vipStatus === 'adept' || profile?.vipStatus === 'oracle';
    if (!serverPremium) return false;

    // Play subscriptions receive a server-written expiry. Never keep a stale
    // entitlement active after that timestamp merely because vipStatus has not
    // yet been refreshed. Legacy/admin premium grants may omit premiumUntil.
    if (typeof profile?.premiumUntil === 'string' && profile.premiumUntil.trim()) {
        const expiryMs = Date.parse(profile.premiumUntil);
        return Number.isFinite(expiryMs) && expiryMs > nowMs;
    }

    return true;
}

export function usedFreeReadings(profile: ReadingProfile, type: FreeReadingType): number {
    const used = profile?.freeReadings?.[type];
    return typeof used === 'number' && Number.isInteger(used) && used >= 0 ? used : 0;
}

export function remainingFreeReadings(profile: ReadingProfile, type: FreeReadingType): number {
    // Reading views use this value as their pre-scan gate. A verified premium
    // profile stays above zero so it never falls into the rewarded-ad/energy path.
    if (isPremiumProfile(profile)) return FREE_READINGS_PER_TYPE;
    return Math.max(0, FREE_READINGS_PER_TYPE - usedFreeReadings(profile, type));
}

// The profile update and reading history entry commit together. The transaction
// checks current server values so concurrent reads cannot use one free slot twice.
// Premium is derived only from server-controlled fields; Firestore rules prevent
// a normal user from changing vipStatus on the client.
export async function saveMeteredReading(db: Firestore, userId: string, type: MeteredReadingType, result: string): Promise<'free' | 'energy' | 'premium'> {
    const userRef = doc(db, 'users', userId);
    const readingRef = doc(collection(db, 'users', userId, 'readings'));
    return runTransaction(db, async transaction => {
        const profile = await transaction.get(userRef);
        if (!profile.exists()) throw new Error('PROFILE_MISSING');
        const data = profile.data();
        const premium = isPremiumProfile(data);
        const isFreeEligible = type === 'palmistry' || type === 'coffee';
        const freeUsed = isFreeEligible ? usedFreeReadings(data, type) : FREE_READINGS_PER_TYPE;
        const payment: 'free' | 'energy' | 'premium' = premium
            ? 'premium'
            : isFreeEligible && freeUsed < FREE_READINGS_PER_TYPE
                ? 'free'
                : 'energy';

        if (payment === 'energy' && (!(typeof data.energy === 'number') || data.energy < 15)) {
            throw new Error('INSUFFICIENT_ENERGY');
        }
        if (payment === 'free') transaction.update(userRef, { [`freeReadings.${type}`]: freeUsed + 1 });
        if (payment === 'energy') transaction.update(userRef, { energy: data.energy - 15 });
        transaction.set(readingRef, { userId, type, result, payment, createdAt: new Date().toISOString() });
        return payment;
    });
}

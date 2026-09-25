import { collection, doc, runTransaction, type Firestore } from 'firebase/firestore';

export type FreeReadingType = 'palmistry' | 'coffee';
export type MeteredReadingType = FreeReadingType | 'tarot' | 'divination';
export type ReadingPayment = 'free' | 'energy' | 'vip' | 'rewarded';
export const FREE_READINGS_PER_TYPE = 3;

export type ReadingMeterProfile = {
    freeReadings?: Record<string, unknown>;
    vipStatus?: string;
    energy?: number;
} | null;

export type MeteredReadingOptions = {
    rewardedUnlock?: boolean;
};

export function hasUnlimitedReadings(profile: ReadingMeterProfile): boolean {
    return profile?.vipStatus === 'adept' || profile?.vipStatus === 'oracle';
}

export function usedFreeReadings(profile: ReadingMeterProfile, type: FreeReadingType): number {
    const used = profile?.freeReadings?.[type];
    return typeof used === 'number' && Number.isInteger(used) && used >= 0 ? used : 0;
}

export function remainingFreeReadings(profile: ReadingMeterProfile, type: FreeReadingType): number {
    if (hasUnlimitedReadings(profile)) return FREE_READINGS_PER_TYPE;
    return Math.max(0, FREE_READINGS_PER_TYPE - usedFreeReadings(profile, type));
}

// The profile update and reading history entry commit together. The transaction
// checks current server values so concurrent reads cannot use one free slot twice.
// Premium entitlement is server-controlled by vipStatus and never spends energy.
// A rewardedUnlock represents one native rewarded-ad completion and unlocks one
// reading without touching the Energy balance.
export async function saveMeteredReading(
    db: Firestore,
    userId: string,
    type: MeteredReadingType,
    result: string,
    options: MeteredReadingOptions = {}
): Promise<ReadingPayment> {
    const userRef = doc(db, 'users', userId);
    const readingRef = doc(collection(db, 'users', userId, 'readings'));
    return runTransaction(db, async transaction => {
        const profile = await transaction.get(userRef);
        if (!profile.exists()) throw new Error('PROFILE_MISSING');
        const data = profile.data();
        const isVip = hasUnlimitedReadings(data);
        const isFreeEligible = type === 'palmistry' || type === 'coffee';
        const freeUsed = isFreeEligible ? usedFreeReadings(data, type) : FREE_READINGS_PER_TYPE;

        let payment: ReadingPayment;
        if (isVip) payment = 'vip';
        else if (isFreeEligible && freeUsed < FREE_READINGS_PER_TYPE) payment = 'free';
        else if (isFreeEligible && options.rewardedUnlock) payment = 'rewarded';
        else payment = 'energy';

        if (payment === 'energy' && (!(typeof data.energy === 'number') || data.energy < 15)) {
            throw new Error('INSUFFICIENT_ENERGY');
        }

        if (payment === 'free') {
            transaction.update(userRef, { [`freeReadings.${type}`]: freeUsed + 1 });
        } else if (payment === 'energy') {
            transaction.update(userRef, { energy: data.energy - 15 });
        }

        transaction.set(readingRef, { userId, type, result, createdAt: new Date().toISOString(), payment });
        return payment;
    });
}

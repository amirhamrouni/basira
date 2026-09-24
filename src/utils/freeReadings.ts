import { collection, doc, runTransaction, type Firestore } from 'firebase/firestore';

export type FreeReadingType = 'palmistry' | 'coffee';
export type MeteredReadingType = FreeReadingType | 'tarot' | 'divination';
export const FREE_READINGS_PER_TYPE = 3;

export function usedFreeReadings(profile: { freeReadings?: Record<string, unknown> } | null, type: FreeReadingType): number {
    const used = profile?.freeReadings?.[type];
    return typeof used === 'number' && Number.isInteger(used) && used >= 0 ? used : 0;
}

export function remainingFreeReadings(profile: { freeReadings?: Record<string, unknown> } | null, type: FreeReadingType): number {
    return Math.max(0, FREE_READINGS_PER_TYPE - usedFreeReadings(profile, type));
}

// The profile update and reading history entry commit together. The transaction
// checks the current server values so concurrent reads cannot use one free slot twice.
export async function saveMeteredReading(db: Firestore, userId: string, type: MeteredReadingType, result: string): Promise<'free' | 'energy'> {
    const userRef = doc(db, 'users', userId);
    const readingRef = doc(collection(db, 'users', userId, 'readings'));
    return runTransaction(db, async transaction => {
        const profile = await transaction.get(userRef);
        if (!profile.exists()) throw new Error('PROFILE_MISSING');
        const data = profile.data();
        const isFreeEligible = type === 'palmistry' || type === 'coffee';
        const freeUsed = isFreeEligible ? usedFreeReadings(data, type) : FREE_READINGS_PER_TYPE;
        const payment = isFreeEligible && freeUsed < FREE_READINGS_PER_TYPE ? 'free' : 'energy';
        if (payment === 'energy' && (!(typeof data.energy === 'number') || data.energy < 15)) {
            throw new Error('INSUFFICIENT_ENERGY');
        }
        transaction.update(userRef, payment === 'free'
            ? { [`freeReadings.${type}`]: freeUsed + 1 }
            : { energy: data.energy - 15 });
        transaction.set(readingRef, { userId, type, result, createdAt: new Date().toISOString() });
        return payment;
    });
}

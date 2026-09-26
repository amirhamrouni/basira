import { describe, expect, it } from 'vitest';
import { isPremiumProfile, remainingFreeReadings, usedFreeReadings } from './freeReadings';

describe('free reading allowance', () => {
    it('gives three readings independently to palm and coffee, then charges', () => {
        expect(remainingFreeReadings(null, 'palmistry')).toBe(3);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 2, coffee: 1 } }, 'palmistry')).toBe(1);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 2, coffee: 1 } }, 'coffee')).toBe(2);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 3 } }, 'palmistry')).toBe(0);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 9 } }, 'palmistry')).toBe(0);
    });

    it('does not trust invalid or negative counters from an older profile', () => {
        expect(usedFreeReadings({ freeReadings: { coffee: -1 } }, 'coffee')).toBe(0);
        expect(usedFreeReadings({ freeReadings: { coffee: '3' } }, 'coffee')).toBe(0);
    });

    it('recognizes only server-controlled premium statuses', () => {
        expect(isPremiumProfile({ vipStatus: 'oracle' })).toBe(true);
        expect(isPremiumProfile({ vipStatus: 'adept' })).toBe(true);
        expect(isPremiumProfile({ vipStatus: 'none' })).toBe(false);
        expect(isPremiumProfile({ vipStatus: 'premium' })).toBe(false);
        expect(isPremiumProfile(null)).toBe(false);
    });

    it('stops Play premium after the server-written expiry timestamp', () => {
        const now = Date.parse('2026-09-26T00:00:00Z');
        expect(isPremiumProfile({ vipStatus: 'oracle', premiumUntil: '2026-10-26T00:00:00Z' }, now)).toBe(true);
        expect(isPremiumProfile({ vipStatus: 'oracle', premiumUntil: '2026-09-25T23:59:59Z' }, now)).toBe(false);
        expect(isPremiumProfile({ vipStatus: 'oracle', premiumUntil: 'not-a-date' }, now)).toBe(false);
    });
});

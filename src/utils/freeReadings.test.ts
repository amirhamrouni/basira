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
});

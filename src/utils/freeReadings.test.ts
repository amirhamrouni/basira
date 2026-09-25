import { describe, expect, it } from 'vitest';
import { FREE_READINGS_PER_TYPE, hasUnlimitedReadings, remainingFreeReadings, usedFreeReadings } from './freeReadings';

describe('reading metering', () => {
    it('allows exactly three free palm and coffee readings for non-premium users', () => {
        expect(FREE_READINGS_PER_TYPE).toBe(3);
        expect(remainingFreeReadings(null, 'palmistry')).toBe(3);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 2, coffee: 1 } }, 'palmistry')).toBe(1);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 2, coffee: 1 } }, 'coffee')).toBe(2);
        expect(remainingFreeReadings({ freeReadings: { palmistry: 3 } }, 'palmistry')).toBe(0);
        expect(remainingFreeReadings({ freeReadings: { coffee: 99 } }, 'coffee')).toBe(0);
    });

    it('does not trust malformed free-reading counters', () => {
        expect(usedFreeReadings({ freeReadings: { palmistry: -1 } }, 'palmistry')).toBe(0);
        expect(usedFreeReadings({ freeReadings: { palmistry: 1.5 } }, 'palmistry')).toBe(0);
        expect(usedFreeReadings({ freeReadings: { palmistry: '3' } }, 'palmistry')).toBe(0);
    });

    it('treats only premium tiers as unlimited', () => {
        expect(hasUnlimitedReadings({ vipStatus: 'adept' })).toBe(true);
        expect(hasUnlimitedReadings({ vipStatus: 'oracle' })).toBe(true);
        expect(hasUnlimitedReadings({ vipStatus: 'none' })).toBe(false);
        expect(hasUnlimitedReadings(null)).toBe(false);
        expect(remainingFreeReadings({ vipStatus: 'oracle', freeReadings: { palmistry: 3 } }, 'palmistry')).toBe(3);
    });
});

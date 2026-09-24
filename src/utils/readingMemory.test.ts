import { afterEach, describe, expect, it } from 'vitest';
import { recentReadings, rememberReading } from './readingMemory';

const entries = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (key: string) => entries.get(key) || null, setItem: (key: string, value: string) => entries.set(key, value) }
});

afterEach(() => entries.clear());

describe('reading memory', () => {
  it('keeps the last readings per user without mixing accounts', () => {
    for (let i = 0; i < 5; i++) rememberReading('one', 'tarot', `[أقوى 3 إشارات]\nإشارة ${i}\n[ما يقترب]\nمسار ${i}`);
    rememberReading('two', 'coffee', '[أقوى 3 إشارات]\nفنجان');
    expect(recentReadings('one').map(r => r.direction)).toEqual(['مسار 2', 'مسار 3', 'مسار 4']);
    expect(recentReadings('two')[0].signals).toBe('فنجان');
  });
});

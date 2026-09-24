import { describe, expect, it } from 'vitest';
import { toFirestoreBasiraContext } from './basiraContext';

describe('Firestore onboarding payload', () => {
  it('saves a valid profile when optional country fields are empty', () => {
    const profile = toFirestoreBasiraContext({
      preferredName: 'Sama', birthDate: '1966-09-24', originCountry: '', residenceCountry: '',
      interests: ['work', 'future'], readingStyle: 'bold', dialect: 'white_arabic',
    }, 'ar');
    expect(profile).toMatchObject({ preferredName: 'Sama', birthDate: '1966-09-24', interests: ['work', 'future'] });
    expect(Object.values(profile)).not.toContain(undefined);
    expect(profile).not.toHaveProperty('originCountry');
    expect(profile).not.toHaveProperty('residenceCountry');
    expect(profile).not.toHaveProperty('birthTime');
  });
});

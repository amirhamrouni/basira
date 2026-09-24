import { describe, expect, it } from 'vitest';
import { DEFAULT_BASIRA_CONTEXT, sanitizeBasiraContext } from './basiraContext';

describe('sanitizeBasiraContext', () => {
  it('falls back to safe Arabic defaults', () => {
    expect(sanitizeBasiraContext(null)).toEqual(DEFAULT_BASIRA_CONTEXT);
  });

  it('normalizes country codes and limits interests', () => {
    const value = sanitizeBasiraContext({
      preferredName: '  Amir  ',
      birthDate: '1988-09-12',
      originCountry: 'tn',
      residenceCountry: 'nl',
      language: 'ar',
      dialect: '',
      readingStyle: 'bold',
      interests: ['love', 'money', 'work', 'travel']
    });

    expect(value.preferredName).toBe('Amir');
    expect(value.birthDate).toBe('1988-09-12');
    expect(value.originCountry).toBe('TN');
    expect(value.residenceCountry).toBe('NL');
    expect(value.dialect).toBe('white_arabic');
    expect(value.interests).toEqual(['love', 'money', 'work']);
  });

  it('rejects malformed profile values', () => {
    const value = sanitizeBasiraContext({
      birthDate: '1988-09-12-extra',
      birthTime: '99:99',
      originCountry: 'tun',
      interests: ['love', 'hacking', 'future'],
      language: 'de',
      readingStyle: 'extreme'
    });

    expect(value.birthDate).toBe('');
    expect(value.birthTime).toBeUndefined();
    expect(value.originCountry).toBeUndefined();
    expect(value.interests).toEqual(['love', 'future']);
    expect(value.language).toBe('ar');
    expect(value.readingStyle).toBe('bold');
  });

  it('rejects impossible calendar dates', () => {
    expect(sanitizeBasiraContext({ birthDate: '2026-02-31' }).birthDate).toBe('');
  });
});

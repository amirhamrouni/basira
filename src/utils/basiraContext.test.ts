import { describe, expect, it } from 'vitest';
import { DEFAULT_BASIRA_CONTEXT, sanitizeBasiraContext } from './basiraContext';

describe('sanitizeBasiraContext', () => {
  it('falls back to safe Arabic defaults', () => {
    expect(sanitizeBasiraContext(null)).toEqual(DEFAULT_BASIRA_CONTEXT);
  });

  it('normalizes country codes and limits interests', () => {
    const value = sanitizeBasiraContext({
      preferredName: '  Amir  ',
      birthDate: '1988-09-12-extra',
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

  it('rejects unsupported language and reading style values', () => {
    const value = sanitizeBasiraContext({ language: 'de', readingStyle: 'extreme' });
    expect(value.language).toBe('ar');
    expect(value.readingStyle).toBe('bold');
  });
});

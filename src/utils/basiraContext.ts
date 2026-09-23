export type ReadingStyle = 'calm' | 'direct' | 'bold';

export interface BasiraContext {
  preferredName: string;
  birthDate: string;
  birthTime?: string;
  birthCity?: string;
  birthCountry?: string;
  originCountry?: string;
  residenceCountry?: string;
  language: 'ar' | 'en' | 'fr';
  dialect: string;
  readingStyle: ReadingStyle;
  interests: string[];
}

export const DEFAULT_BASIRA_CONTEXT: BasiraContext = {
  preferredName: '',
  birthDate: '',
  language: 'ar',
  dialect: 'white_arabic',
  readingStyle: 'bold',
  interests: [],
};

const ALLOWED_INTERESTS = new Set(['love', 'money', 'work', 'family', 'travel', 'future']);
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function sanitizeBasiraContext(value: unknown): BasiraContext {
  const raw = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const text = (key: string, max = 80) => typeof raw[key] === 'string' ? String(raw[key]).trim().slice(0, max) : '';
  const language = raw.language === 'en' || raw.language === 'fr' ? raw.language : 'ar';
  const readingStyle: ReadingStyle = raw.readingStyle === 'calm' || raw.readingStyle === 'direct' ? raw.readingStyle : 'bold';

  const country = (key: string) => {
    const value = text(key, 2).toUpperCase();
    return COUNTRY_CODE_RE.test(value) ? value : undefined;
  };

  const birthDateCandidate = text('birthDate', 10);
  const birthDate = DATE_RE.test(birthDateCandidate) ? birthDateCandidate : '';
  const birthTimeCandidate = text('birthTime', 5);
  const birthTime = TIME_RE.test(birthTimeCandidate) ? birthTimeCandidate : undefined;

  return {
    preferredName: text('preferredName', 50),
    birthDate,
    birthTime,
    birthCity: text('birthCity', 80) || undefined,
    birthCountry: country('birthCountry'),
    originCountry: country('originCountry'),
    residenceCountry: country('residenceCountry'),
    language,
    dialect: text('dialect', 40) || (language === 'ar' ? 'white_arabic' : 'standard'),
    readingStyle,
    interests: Array.isArray(raw.interests)
      ? raw.interests
          .filter((x): x is string => typeof x === 'string' && ALLOWED_INTERESTS.has(x))
          .slice(0, 3)
      : [],
  };
}

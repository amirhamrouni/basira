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

export function sanitizeBasiraContext(value: unknown): BasiraContext {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const text = (key: string, max = 80) => typeof raw[key] === 'string' ? String(raw[key]).trim().slice(0, max) : '';
  const language = raw.language === 'en' || raw.language === 'fr' ? raw.language : 'ar';
  const readingStyle: ReadingStyle = raw.readingStyle === 'calm' || raw.readingStyle === 'direct' ? raw.readingStyle : 'bold';
  return {
    preferredName: text('preferredName'),
    birthDate: text('birthDate', 10),
    birthTime: text('birthTime', 5) || undefined,
    birthCity: text('birthCity') || undefined,
    birthCountry: text('birthCountry', 2).toUpperCase() || undefined,
    originCountry: text('originCountry', 2).toUpperCase() || undefined,
    residenceCountry: text('residenceCountry', 2).toUpperCase() || undefined,
    language,
    dialect: text('dialect', 40) || (language === 'ar' ? 'white_arabic' : 'standard'),
    readingStyle,
    interests: Array.isArray(raw.interests)
      ? raw.interests.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 30)).slice(0, 3)
      : [],
  };
}

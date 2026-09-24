import { describe, expect, it } from 'vitest';
import { cleanText, parseImageDataUrl, safeLanguage, symbolicNamePattern } from './server.js';

describe('API input validation', () => {
    it('accepts only supported languages', () => {
        expect(safeLanguage('fr')).toBe('fr');
        expect(safeLanguage('de')).toBe('ar');
    });

    it('normalizes and limits text input', () => {
        expect(cleanText('  hello  ', 10)).toBe('hello');
        expect(cleanText('123456', 4)).toBe('1234');
        expect(cleanText({})).toBe('');
    });

    it('accepts safe images and rejects malformed payloads', () => {
        expect(parseImageDataUrl('data:image/png;base64,aGVsbG8=')).toEqual({
            mimeType: 'image/png',
            data: 'aGVsbG8='
        });
        expect(parseImageDataUrl('data:text/html;base64,aGVsbG8=')).toBeNull();
        expect(parseImageDataUrl('not-an-image')).toBeNull();
    });

    it('uses a stable Arabic abjad reduction for the same names', () => {
        const result = symbolicNamePattern('أحمد', 'أم');
        expect(result.nameSum).toBe(53);
        expect(result.motherSum).toBe(41);
        expect(result.combinedRoot).toBe(4);
        expect(symbolicNamePattern('احمد', 'ام')).toEqual(result);
    });
});

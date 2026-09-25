import { describe, expect, it } from 'vitest';
import { cleanText, PALM_READING_GUARD, parseImageDataUrl, safeLanguage, symbolicNamePattern, startWithStrongSignals } from './server.js';

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

    it('starts a cup reading at its actual signals when the model adds an introduction', () => {
        const response = 'نعم، تظهر الصورة داخل فنجان قهوة.\n\n[أقوى 3 إشارات]\n1. رواسب في القاع';
        expect(startWithStrongSignals(response)).toBe('[أقوى 3 إشارات]\n1. رواسب في القاع');
        expect(startWithStrongSignals('ERROR_NOT_A_CUP')).toBe('ERROR_NOT_A_CUP');
    });

    it('keeps a visible palm valid when fine lines are faint', () => {
        expect(PALM_READING_GUARD).toContain('Any genuine visible palm is a valid input');
        expect(PALM_READING_GUARD).toContain('Never reject a visible palm merely because fine lines are faint');
        expect(PALM_READING_GUARD).not.toContain('ERROR_PALM_LINES_UNREADABLE');
    });
});

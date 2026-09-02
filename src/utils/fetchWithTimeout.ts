/**
 * fetchWithTimeout — bulletproof fetch wrapper with strict 8-second timeout.
 * Allows enough time for substantial AI readings while still aborting hangs.
 */

const TIMEOUT_MS = 60000;

export class FetchTimeoutError extends Error {
    constructor(url: string) {
        super(`Request to ${url} timed out after ${TIMEOUT_MS}ms`);
        this.name = 'FetchTimeoutError';
    }
}

export async function fetchWithTimeout(
    input: RequestInfo,
    init?: RequestInit
): Promise<Response> {
    const controller = new AbortController();
    const url = typeof input === 'string' ? input : input.url;

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        const response = await Promise.race([
            fetch(input, { ...init, signal: controller.signal }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new FetchTimeoutError(url)), TIMEOUT_MS)
            ),
        ]);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
            throw new FetchTimeoutError(url);
        }
        throw error;
    }
}

/** Arabic fallback message shown when any API fails */
export const FALLBACK_AR =
    'الأثير مزدحم بالترددات في هذه اللحظة، يرجى المحاولة بعد قليل لضمان دقة القراءة.';

/** English fallback message */
export const FALLBACK_EN =
    'The cosmic frequencies are busy right now. Please try again in a moment for an accurate reading.';

/** French fallback message */
export const FALLBACK_FR =
    'Les fréquences cosmiques sont saturées en ce moment. Réessayez dans un instant.';

export function getFallback(lang: 'ar' | 'en' | 'fr'): string {
    if (lang === 'en') return FALLBACK_EN;
    if (lang === 'fr') return FALLBACK_FR;
    return FALLBACK_AR;
}

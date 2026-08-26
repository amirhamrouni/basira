/**
 * AppStateManager — Centralized, bulletproof localStorage manager for BASIRA.
 * Handles all user preferences with schema validation, auto-repair, and versioning.
 */

const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'basira_state_v2';

export interface AppState {
    schemaVersion: number;
    zodiacId: string | null;
    userName: string;
    lang: 'ar' | 'en' | 'fr';
    onboardingComplete: boolean;
    lastVisit: number; // Unix timestamp
    favoriteZodiacId: string | null;
    dailyCache: Record<string, { text: string; fetchedAt: number }>;
    readingCount: number;
}

const DEFAULT_STATE: AppState = {
    schemaVersion: SCHEMA_VERSION,
    zodiacId: null,
    userName: '',
    lang: 'ar',
    onboardingComplete: false,
    lastVisit: Date.now(),
    favoriteZodiacId: null,
    dailyCache: {},
    readingCount: 0,
};

const VALID_LANGS = ['ar', 'en', 'fr'] as const;
const VALID_ZODIACS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', null
];

/**
 * Validates that a loaded state object is structurally correct.
 * Returns true if the state is valid, false if repair is needed.
 */
function isStateValid(state: unknown): state is AppState {
    if (!state || typeof state !== 'object') return false;
    const s = state as Record<string, unknown>;

    if (s.schemaVersion !== SCHEMA_VERSION) return false;
    if (typeof s.onboardingComplete !== 'boolean') return false;
    if (typeof s.readingCount !== 'number' || isNaN(s.readingCount as number)) return false;
    if (typeof s.lastVisit !== 'number' || isNaN(s.lastVisit as number)) return false;
    if (!VALID_LANGS.includes(s.lang as 'ar' | 'en' | 'fr')) return false;
    if (!VALID_ZODIACS.includes(s.zodiacId as string | null)) return false;
    if (typeof s.dailyCache !== 'object' || Array.isArray(s.dailyCache)) return false;

    return true;
}

class _AppStateManager {
    private state: AppState;

    constructor() {
        this.state = this._load();
    }

    private _load(): AppState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return this._init();

            const parsed = JSON.parse(raw);

            if (!isStateValid(parsed)) {
                console.warn('[AppStateManager] Corrupted or outdated state detected. Auto-repairing...');
                this._wipeAndReset();
                return { ...DEFAULT_STATE };
            }

            // Update lastVisit on every load
            parsed.lastVisit = Date.now();
            return parsed as AppState;
        } catch (e) {
            console.error('[AppStateManager] Failed to parse localStorage. Resetting to defaults.', e);
            this._wipeAndReset();
            return { ...DEFAULT_STATE };
        }
    }

    private _init(): AppState {
        // Try to migrate from old legacy keys
        const legacyLang = localStorage.getItem('babil_lang') as 'ar' | 'en' | 'fr' | null;
        const legacyZodiac = localStorage.getItem('userZodiac') || localStorage.getItem('babil_fav_zodiac');

        const migratedState: AppState = {
            ...DEFAULT_STATE,
            lang: VALID_LANGS.includes(legacyLang as 'ar' | 'en' | 'fr') ? (legacyLang as 'ar' | 'en' | 'fr') : 'ar',
            zodiacId: VALID_ZODIACS.includes(legacyZodiac) ? legacyZodiac : null,
            favoriteZodiacId: VALID_ZODIACS.includes(legacyZodiac) ? legacyZodiac : null,
        };

        this._persist(migratedState);
        return migratedState;
    }

    private _wipeAndReset(): void {
        try {
            // Remove all basira-related keys
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('basira_') || key.startsWith('babil_') || key.startsWith('daily_horoscope_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.error('[AppStateManager] Failed to wipe localStorage.', e);
        }
    }

    private _persist(state: AppState): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            // QuotaExceededError — clear cache and retry
            console.warn('[AppStateManager] localStorage quota exceeded. Clearing daily cache...');
            state.dailyCache = {};
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e2) {
                console.error('[AppStateManager] Still cannot write to localStorage.', e2);
            }
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    get<K extends keyof AppState>(key: K): AppState[K] {
        return this.state[key];
    }

    set<K extends keyof AppState>(key: K, value: AppState[K]): void {
        this.state[key] = value;
        this._persist(this.state);
    }

    /** Cache a daily horoscope reading. Cache expires after 24 hours. */
    setCachedDaily(cacheKey: string, text: string): void {
        this.state.dailyCache[cacheKey] = { text, fetchedAt: Date.now() };
        // Prune old entries (keep max 50)
        const entries = Object.entries(this.state.dailyCache);
        if (entries.length > 50) {
            const sorted = entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
            this.state.dailyCache = Object.fromEntries(sorted.slice(-50));
        }
        this._persist(this.state);
    }

    /** Get a cached daily horoscope. Returns null if missing or expired (>24h). */
    getCachedDaily(cacheKey: string): string | null {
        const entry = this.state.dailyCache[cacheKey];
        if (!entry) return null;
        const AGE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - entry.fetchedAt > AGE_LIMIT_MS) {
            delete this.state.dailyCache[cacheKey];
            this._persist(this.state);
            return null;
        }
        return entry.text;
    }

    incrementReadingCount(): void {
        this.state.readingCount = (this.state.readingCount || 0) + 1;
        this._persist(this.state);
    }

    getAll(): Readonly<AppState> {
        return Object.freeze({ ...this.state });
    }
}

// Singleton export
export const AppStateManager = new _AppStateManager();

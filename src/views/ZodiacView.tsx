import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, RefreshCw, AlertCircle } from 'lucide-react';
import { horoscopeData } from '../data/horoscopeData';
import { shareReading } from '../utils/shareResult';
import ZodiacWheel from '../components/ZodiacWheel';
import { getApiUrl } from '../utils/api';
import { AppStateManager } from '../utils/AppStateManager';
import { fetchWithTimeout, getFallback } from '../utils/fetchWithTimeout';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FR_NAMES: Record<string, string> = {
    aries: 'Bélier', taurus: 'Taureau', gemini: 'Gémeaux', cancer: 'Cancer',
    leo: 'Lion', virgo: 'Vierge', libra: 'Balance', scorpio: 'Scorpion',
    sagittarius: 'Sagittaire', capricorn: 'Capricorne', aquarius: 'Verseau', pisces: 'Poissons'
};
const FR_DATES: Record<string, string> = {
    aries: '21 Mar - 19 Avr', taurus: '20 Avr - 20 Mai', gemini: '21 Mai - 20 Jun',
    cancer: '21 Jun - 22 Jul', leo: '23 Jul - 22 Aoû', virgo: '23 Aoû - 22 Sep',
    libra: '23 Sep - 22 Oct', scorpio: '23 Oct - 21 Nov', sagittarius: '22 Nov - 21 Déc',
    capricorn: '22 Déc - 19 Jan', aquarius: '20 Jan - 18 Fév', pisces: '19 Fév - 20 Mar'
};
const FR_ELEMENTS: Record<string, string> = { 'نار': 'Feu', 'تراب': 'Terre', 'هواء': 'Air', 'ماء': 'Eau' };
const FR_PLANETS: Record<string, string> = {
    'المريخ': 'Mars', 'الزهرة': 'Vénus', 'عطارد': 'Mercure', 'القمر': 'Lune',
    'الشمس': 'Soleil', 'بلوتو': 'Pluton', 'المشتري': 'Jupiter', 'زحل': 'Saturne',
    'أورانوس': 'Uranus', 'نبتون': 'Neptune'
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZodiacView({ t, lang }: { t: any; lang: 'ar' | 'en' | 'fr' }) {
    const [selectedZodiacId, setSelectedZodiacId] = useState<string | null>(() =>
        AppStateManager.get('favoriteZodiacId')
    );
    const [favoriteZodiacId, setFavoriteZodiacId] = useState<string | null>(() =>
        AppStateManager.get('favoriteZodiacId')
    );
    const [dynamicDaily, setDynamicDaily] = useState<string | null>(null);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);
    const [dailyError, setDailyError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const selectedZodiac = horoscopeData.find(z => z.id === selectedZodiacId);

    // ── Toggle favorite ──
    const toggleFavorite = (e?: React.MouseEvent, id?: string) => {
        if (e) e.stopPropagation();
        const targetId = id || selectedZodiacId;
        if (!targetId) return;

        if (favoriteZodiacId === targetId) {
            setFavoriteZodiacId(null);
            AppStateManager.set('favoriteZodiacId', null);
        } else {
            setFavoriteZodiacId(targetId);
            AppStateManager.set('favoriteZodiacId', targetId);
        }
    };

    // ── Fetch daily horoscope (hybrid: real API + Gemini) ──
    const fetchDailyReading = useCallback(async (zodiacId: string, forceRefresh = false) => {
        const todayDateStr = new Date().toLocaleDateString('en-US');
        const cacheKey = `daily_${zodiacId}_${todayDateStr}_${lang}`;

        setDailyError(false);
        setDynamicDaily(null);
        setIsLoadingDaily(true);

        // Check cache first (24h expiry managed by AppStateManager)
        if (!forceRefresh) {
            const cached = AppStateManager.getCachedDaily(cacheKey);
            if (cached) {
                setDynamicDaily(cached);
                setIsLoadingDaily(false);
                return;
            }
        }

        try {
            const res = await fetchWithTimeout(getApiUrl('/api/daily-horoscope'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zodiac: zodiacId, lang, date: todayDateStr }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const reply = data.reply;
            if (!reply || reply.trim() === '') throw new Error('Empty reply from server');

            // Cache the result
            AppStateManager.setCachedDaily(cacheKey, reply);
            setDynamicDaily(reply);
        } catch (err) {
            console.error('[ZodiacView] Daily horoscope fetch failed:', err);
            setDailyError(true);
            setDynamicDaily(getFallback(lang));
        } finally {
            setIsLoadingDaily(false);
        }
    }, [lang]);

    // ── Effect: fetch on sign change ──
    useEffect(() => {
        if (selectedZodiacId && selectedZodiac) {
            fetchDailyReading(selectedZodiacId);
        }
    }, [selectedZodiacId, lang, fetchDailyReading, selectedZodiac]);

    // ── i18n translator ──
    const translate = (key: string, valAr: string, valEn: string, id: string): string => {
        if (lang === 'ar') return valAr;
        if (lang === 'en') return valEn || valAr;
        if (key === 'name') return FR_NAMES[id] || valEn;
        if (key === 'dates') return FR_DATES[id] || valEn;
        if (key === 'element') return FR_ELEMENTS[valAr] || valEn;
        if (key === 'planet') return FR_PLANETS[valAr] || valEn;
        return valEn || valAr;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // DETAIL VIEW — Selected Zodiac
    // ─────────────────────────────────────────────────────────────────────────
    if (selectedZodiac) {
        const sz: any = selectedZodiac;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6 w-full pb-10"
            >
                {/* ── Header ── */}
                <div className="flex items-center gap-4 bg-white/80 p-6 rounded-2xl border border-stella-gold/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-stella-gold/5 rounded-full blur-3xl" />

                    <button
                        onClick={() => setSelectedZodiacId(null)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-stella-gold transition-colors z-20"
                        aria-label="Back"
                    >
                        <ArrowRight className="w-6 h-6 transform rtl:rotate-180" />
                    </button>

                    <button
                        onClick={(e) => toggleFavorite(e, selectedZodiac.id)}
                        className={`absolute top-4 left-4 p-2 transition-colors z-20 ${favoriteZodiacId === selectedZodiac.id ? 'text-stella-gold' : 'text-gray-400 hover:text-stella-gold'}`}
                        aria-label="Toggle favorite"
                    >
                        <Star className="w-7 h-7" fill={favoriteZodiacId === selectedZodiac.id ? 'currentColor' : 'none'} strokeWidth={1} />
                    </button>

                    <div className="text-6xl md:text-7xl drop-shadow-sm z-10 mr-12 text-gray-800">
                        {selectedZodiac.symbol}
                    </div>
                    <div className="flex flex-col z-10 w-full">
                        <h2 className="text-3xl md:text-4xl font-bold text-stella-gold font-amiri">
                            {translate('name', selectedZodiac.nameAr, selectedZodiac.nameEn, selectedZodiac.id)}
                        </h2>
                        <p className="text-sm md:text-base text-gray-500 font-tajawal mt-1">
                            {translate('dates', selectedZodiac.dates, sz.datesEn || selectedZodiac.dates, selectedZodiac.id)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3 text-[11px] md:text-xs font-tajawal text-gray-600">
                            <span className="bg-stella-gold/5 px-2.5 py-1.5 rounded-md border border-stella-gold/10">
                                {t.element}: {translate('element', selectedZodiac.element, sz.elementEn || selectedZodiac.element, selectedZodiac.id)}
                            </span>
                            <span className="bg-stella-gold/5 px-2.5 py-1.5 rounded-md border border-stella-gold/10">
                                {t.planet}: {translate('planet', selectedZodiac.planet, sz.planetEn || selectedZodiac.planet, selectedZodiac.id)}
                            </span>
                            <span className="bg-stella-gold/5 px-2.5 py-1.5 rounded-md border border-stella-gold/10 flex items-center gap-1.5">
                                {t.color}:
                                <span className="w-2.5 h-2.5 rounded-full inline-block ml-1" style={{ backgroundColor: selectedZodiac.color }} />
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Zodiac Wheel ── */}
                <ZodiacWheel zodiacId={selectedZodiac.id} />

                {/* ── Reading Cards ── */}
                <div className="flex flex-col gap-4">

                    {/* Daily — Hybrid AI-powered */}
                    <motion.div
                        id="daily-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-2xl border border-gray-100 relative shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-stella-gold/5 rounded-bl-full blur-2xl" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🌟</span>
                                <h3 className="text-stella-gold font-bold font-amiri text-lg">{t.zodiacTitles.daily}</h3>
                            </div>
                            {/* Retry button — shown on error */}
                            {dailyError && !isLoadingDaily && (
                                <button
                                    onClick={() => {
                                        setRetryCount(c => c + 1);
                                        fetchDailyReading(selectedZodiacId!, true);
                                    }}
                                    className="flex items-center gap-1.5 text-xs text-stella-gold hover:text-stella-amber transition-colors font-tajawal"
                                    aria-label="Retry"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {lang === 'ar' ? 'إعادة' : lang === 'fr' ? 'Réessayer' : 'Retry'}
                                </button>
                            )}
                        </div>

                        <div className="relative z-10 min-h-[60px]">
                            <AnimatePresence mode="wait">
                                {isLoadingDaily ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="flex gap-1.5">
                                            {[0, 150, 300].map(delay => (
                                                <div
                                                    key={delay}
                                                    className="w-2 h-2 bg-stella-gold rounded-full animate-bounce"
                                                    style={{ animationDelay: `${delay}ms` }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-stella-gold font-tajawal text-sm">
                                            {lang === 'ar' ? 'النجوم تتكلم...' : lang === 'fr' ? 'Les étoiles parlent...' : 'The stars are speaking...'}
                                        </span>
                                    </motion.div>
                                ) : (
                                    <motion.div key="content" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                                        {dailyError && (
                                            <div className="flex items-center gap-2 mb-2 text-amber-600">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-xs font-tajawal">
                                                    {lang === 'ar' ? 'نسخة احتياطية' : 'Fallback reading'}
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-gray-700 font-tajawal leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                                            {dynamicDaily}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Love */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl">❤️</span>
                            <h3 className="text-stella-gold font-bold font-amiri text-lg">{t.zodiacTitles.love}</h3>
                        </div>
                        <p className="text-gray-700 font-tajawal leading-relaxed text-sm md:text-base">
                            {lang === 'ar' ? selectedZodiac.love : sz.loveEn || selectedZodiac.love}
                        </p>
                    </motion.div>

                    {/* Money */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl">💰</span>
                            <h3 className="text-stella-gold font-bold font-amiri text-lg">{t.zodiacTitles.money}</h3>
                        </div>
                        <p className="text-gray-700 font-tajawal leading-relaxed text-sm md:text-base">
                            {lang === 'ar' ? selectedZodiac.money : sz.moneyEn || selectedZodiac.money}
                        </p>
                    </motion.div>

                    {/* Health */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl">💚</span>
                            <h3 className="text-stella-gold font-bold font-amiri text-lg">{t.zodiacTitles.health}</h3>
                        </div>
                        <p className="text-gray-700 font-tajawal leading-relaxed text-sm md:text-base">
                            {lang === 'ar' ? selectedZodiac.health : sz.healthEn || selectedZodiac.health}
                        </p>
                    </motion.div>

                    {/* Weekly Advice */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl">💡</span>
                            <h3 className="text-stella-gold font-bold font-amiri text-lg">{t.zodiacTitles.advice}</h3>
                        </div>
                        <p className="text-gray-700 font-tajawal leading-relaxed text-sm md:text-base">
                            {lang === 'ar' ? selectedZodiac.weeklyTip : sz.weeklyTipEn || selectedZodiac.weeklyTip}
                        </p>
                    </motion.div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => shareReading(
                                lang === 'ar' ? selectedZodiac.nameAr : selectedZodiac.nameEn,
                                dynamicDaily || selectedZodiac.daily
                            )}
                            className="flex-1 bg-stella-gold hover:bg-stella-amber text-white font-cairo font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            <span className="text-xl">📤</span>
                            {t.actions.share}
                        </button>
                        <button
                            onClick={() => fetchDailyReading(selectedZodiacId!, true)}
                            disabled={isLoadingDaily}
                            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-50"
                            aria-label="Refresh reading"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoadingDaily ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GRID VIEW — Sign Selection
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 w-full pb-10 min-h-screen"
        >
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1532968961962-810cb25f1eb6?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10 px-4 text-center">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 font-amiri drop-shadow-sm tracking-wide">
                        {t.zodiacHeaderTitle}
                    </h2>
                    <p className="text-gray-700 font-tajawal text-sm mt-1 leading-relaxed">
                        {t.zodiacHeaderDesc}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4 px-1">
                {horoscopeData.map((zodiac, i) => (
                    <motion.div
                        key={zodiac.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedZodiacId(zodiac.id)}
                        className={`bg-white cursor-pointer hover:bg-gray-50 hover:border-stella-gold/50 hover:-translate-y-1 transition-all duration-300 border ${favoriteZodiacId === zodiac.id ? 'border-stella-gold shadow-md' : 'border-gray-100'} rounded-2xl p-4 md:p-5 flex flex-col items-center text-center shadow-sm group relative overflow-hidden`}
                    >
                        <button
                            onClick={(e) => toggleFavorite(e, zodiac.id)}
                            className={`absolute top-2 left-2 z-20 p-1 ${favoriteZodiacId === zodiac.id ? 'text-stella-gold' : 'text-gray-300 hover:text-stella-gold'}`}
                            aria-label={`Favorite ${zodiac.nameEn}`}
                        >
                            <Star className="w-5 h-5" fill={favoriteZodiacId === zodiac.id ? 'currentColor' : 'none'} strokeWidth={1} />
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-b from-stella-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-3xl md:text-4xl mb-2 md:mb-3 group-hover:scale-110 transition-transform mt-2">
                            {zodiac.symbol}
                        </span>
                        <h3 className="text-stella-gold font-bold text-sm md:text-base font-amiri mb-1 z-10">
                            {translate('name', zodiac.nameAr, zodiac.nameEn, zodiac.id)}
                        </h3>
                        <span className="text-[9px] md:text-xs text-gray-500 font-tajawal z-10">
                            {translate('dates', zodiac.dates, (zodiac as any).datesEn || zodiac.dates, zodiac.id)}
                        </span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

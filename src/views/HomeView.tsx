import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Moon, Star, Quote } from 'lucide-react';
import { horoscopeData } from '../data/horoscopeData';
import { requestPermission, scheduleDaily } from '../utils/notifications';
import { getApiUrl } from '../utils/api';
import { AppStateManager } from '../utils/AppStateManager';
import { fetchWithTimeout, getFallback } from '../utils/fetchWithTimeout';
import { Body, Illumination, MoonPhase } from 'astronomy-engine';

export default function HomeView({ t, onNavigate, lang }: { t: any; onNavigate: (view: any) => void; lang: 'ar' | 'en' | 'fr' }) {
    const [randomWisdoms, setRandomWisdoms] = useState<string[]>([]);
    const [savedZodiacId, setSavedZodiacId] = useState<string | null>(() =>
        AppStateManager.get('favoriteZodiacId')
    );
    const [hasPermission, setHasPermission] = useState(() => 
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false
    );

    const dayIndex = new Date().getDay();
    const phaseIndex = Math.floor(Date.now() / 86400000) % 8;
    const moonAngle = MoonPhase(new Date());
    const moonLight = Math.round(Illumination(Body.Moon, new Date()).phase_fraction * 100);

    const daysList = [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat];
    const phasesList = [
        { ...t.moonPhase.new, icon: "🌑" },
        { ...t.moonPhase.waxingCrescent, icon: "🌒" },
        { ...t.moonPhase.firstQuarter, icon: "🌓" },
        { ...t.moonPhase.waxingGibbous, icon: "🌔" },
        { ...t.moonPhase.full, icon: "🌕" },
        { ...t.moonPhase.waningGibbous, icon: "🌖" },
        { ...t.moonPhase.lastQuarter, icon: "🌗" },
        { ...t.moonPhase.waningCrescent, icon: "🌘" }
    ];

    const todayStarMessage = `${daysList[dayIndex].title}: ${daysList[dayIndex].desc}`;
    const todayMoonPhase = phasesList[phaseIndex];

    useEffect(() => {
        const checkPerms = async () => {
            const granted = await requestPermission();
            setHasPermission(granted);
            if (granted) scheduleDaily();
        };
        checkPerms();

        const shuffled = [...t.wisdoms].sort(() => 0.5 - Math.random());
        setRandomWisdoms(shuffled.slice(0, 3));

        // Load zodiac from AppStateManager
        const storedZodiac = AppStateManager.get('favoriteZodiacId');
        if (storedZodiac) setSavedZodiacId(storedZodiac);
    }, [t.wisdoms]);

    const handleSelectZodiac = (id: string) => {
        setSavedZodiacId(id);
        AppStateManager.set('favoriteZodiacId', id);
        AppStateManager.set('zodiacId', id);
    };

    const selectedZodiacData = horoscopeData.find(z => z.id === savedZodiacId);

    // Dynamic daily horoscope state
    const [dynamicDaily, setDynamicDaily] = useState<string | null>(null);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);
    const [, setDailyError] = useState(false);

    useEffect(() => {
        if (!savedZodiacId) return;

        const todayDateStr = new Date().toLocaleDateString('en-US');
        const cacheKey = `daily_${savedZodiacId}_${todayDateStr}_${lang}`;

        // Try cache first
        const cached = AppStateManager.getCachedDaily(cacheKey);
        if (cached) {
            setDynamicDaily(cached);
            return;
        }

        const fetchDynamicDaily = async () => {
            setIsLoadingDaily(true);
            setDailyError(false);
            try {
                const res = await fetchWithTimeout(getApiUrl('/api/daily-horoscope'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zodiac: savedZodiacId, lang, date: todayDateStr })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.reply) {
                    AppStateManager.setCachedDaily(cacheKey, data.reply);
                    setDynamicDaily(data.reply);
                } else {
                    throw new Error('No reply in response');
                }
            } catch (e) {
                console.error('[HomeView] Daily horoscope failed:', e);
                setDailyError(true);
                setDynamicDaily(getFallback(lang));
            } finally {
                setIsLoadingDaily(false);
            }
        };

        fetchDynamicDaily();
    }, [savedZodiacId, lang]);

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-6 w-full">

            <section className="oracle-frame rounded-[28px] p-6 text-white min-h-[430px]">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-stella-gold/20 blur-3xl" />
                <div className="absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rounded-full border border-[#d7ad58]/30 opacity-70">
                    <div className="absolute inset-4 rounded-full border border-[#d7ad58]/15" />
                    {['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map((sign, i) => <span key={sign} className="absolute left-1/2 top-1/2 text-xs text-[#d7ad58]/70" style={{ transform: `translate(-50%,-50%) rotate(${i * 30}deg) translateY(-102px) rotate(${-i * 30}deg)` }}>{sign}</span>)}
                </div>
                <div className="absolute left-1/2 top-[7.4rem] h-36 w-36 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff4c9_0%,#e6c276_34%,#8d6834_68%,#2a1933_100%)] shadow-[0_0_60px_rgba(215,173,88,.28)]" />
                <div className="relative z-10">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-xl">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">BASIRA AI ONLINE</span>
                        </div>
                        <Sparkles className="h-6 w-6 text-stella-gold" />
                    </div>
                    <h2 className="oracle-title mt-56 text-center font-amiri text-4xl font-bold leading-tight">
                        {lang === 'ar' ? 'بين النجوم تبدأ بصيرتك' : lang === 'fr' ? 'Votre vision naît parmi les étoiles' : 'Your insight begins among the stars'}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-6 text-white/65">
                        {lang === 'ar' ? 'اختر بوابتك ودع الذكاء الاصطناعي يصنع قراءة خاصة بك.' : 'Choose a gateway for a personalized AI reflection.'}
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {[
                            { id: 'palmistry', icon: '🖐️', ar: 'الكف', en: 'Palm' },
                            { id: 'tarot', icon: '🃏', ar: 'التاروت', en: 'Tarot' },
                            { id: 'dream', icon: '🌙', ar: 'الأحلام', en: 'Dreams' }
                        ].map(item => (
                            <button key={item.id} onClick={() => onNavigate(item.id)} className="rounded-xl border border-[#d7ad58]/25 bg-black/25 px-2 py-3 text-center backdrop-blur-lg transition hover:-translate-y-1 hover:border-[#d7ad58]/60">
                                <span className="block text-2xl">{item.icon}</span>
                                <span className="mt-1 block text-[11px] font-bold">{lang === 'ar' ? item.ar : item.en}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#d7ad58]/20 bg-black/20 px-4 py-3 text-xs text-white/65">
                        <span>{lang === 'ar' ? 'إضاءة القمر الحقيقية' : 'Live moon illumination'}</span>
                        <span className="font-mono font-bold text-stella-gold">{moonLight}% · {Math.round(moonAngle)}°</span>
                    </div>
                </div>
            </section>

            {!hasPermission && (
                <button
                    onClick={async () => {
                        const granted = await requestPermission();
                        setHasPermission(granted);
                        if (granted) scheduleDaily();
                    }}
                    className="bg-stella-gold/10 hover:bg-stella-gold/20 text-stella-gold border border-stella-gold/30 py-3 px-4 rounded-xl font-cairo font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    🔔 {t.enableNotifBtn}
                </button>
            )}

            {/* 1. رسالة النجوم اليوم */}
            <div className="p-6 relative overflow-hidden shadow-lg rounded-[32px] group min-h-[160px] flex flex-col justify-end bg-white border border-gray-100">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-90"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-white/10 z-10 transition-opacity duration-700"></div>
                <div className="absolute top-4 right-4 z-20">
                    <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center border border-stella-gold/20 shadow-sm">
                        <Star className="w-5 h-5 text-stella-gold" strokeWidth={1.5} /> 
                    </div>
                </div>
                <div className="relative z-20 flex flex-col pt-10">
                    <h3 className="text-stella-amber font-bold text-xl mb-1 flex items-center gap-2 font-amiri tracking-wide">
                        {lang === 'ar' ? 'إشراقة اليوم' : "Today's Light"}
                    </h3>
                    <p className="text-gray-700 text-sm md:text-[15px] leading-relaxed font-tajawal border-l-2 rtl:border-r-2 rtl:border-l-0 border-stella-gold/50 pl-3 rtl:pr-3">{todayStarMessage}</p>
                </div>
            </div>

            {/* 2. طاقة القمر */}
            <div className="p-6 relative overflow-hidden shadow-lg rounded-[32px] group min-h-[140px] flex flex-col justify-end mt-2 bg-white border border-gray-100">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-transparent z-10"></div>
                
                <h3 className="text-gray-800 font-bold text-lg mb-2 flex items-center gap-2 font-amiri relative z-20 tracking-wide">
                    <Moon className="w-5 h-5 text-stella-amber" />
                    {lang === 'ar' ? 'طاقة اليوم' : 'Daily Energy'}
                </h3>
                <div className="flex items-center gap-5 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-gray-200 relative z-20 shadow-sm">
                    <span className="text-5xl">{todayMoonPhase.icon}</span>
                    <div>
                        <h4 className="text-stella-gold text-lg font-amiri mb-1">{todayMoonPhase.title}</h4>
                        <p className="text-xs text-gray-600 font-tajawal leading-relaxed">{todayMoonPhase.desc}</p>
                    </div>
                </div>
            </div>

            {/* 3. اختر برجك */}
            <div className="mt-4">
                <h2 className="text-2xl font-bold text-stella-gold mb-1 px-1 drop-shadow-sm font-amiri">{t.zodiacSelectTitle}</h2>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x mt-3 -mx-2 px-2">
                    {horoscopeData.map((z) => (
                        <button 
                            key={z.id}
                            onClick={() => handleSelectZodiac(z.id)}
                            className={`flex flex-col items-center justify-center min-w-[75px] h-[90px] rounded-[24px] border transition-all duration-300 snap-center relative overflow-hidden group ${savedZodiacId === z.id ? 'border-stella-gold shadow-md scale-105 z-10' : 'border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-300'}`}
                        >
                            <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-[4s] group-hover:scale-110 ${savedZodiacId === z.id ? "bg-[url('https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=400&auto=format&fit=crop')] opacity-20" : "bg-white"}`}></div>
                            <div className={`absolute inset-0 max-w-full max-h-full ${savedZodiacId === z.id ? 'bg-gradient-to-t from-white via-white/80 to-transparent' : 'bg-white'}`}></div>
                            <span className="text-2xl mb-1 relative z-10">{z.symbol}</span>
                            <span className={`text-[11px] font-tajawal relative z-10 ${savedZodiacId === z.id ? 'font-bold text-stella-gold' : 'text-gray-500'}`}>
                                {lang === 'ar' ? z.nameAr : (lang === 'fr' ? ({'aries':'Bélier', 'taurus':'Taureau', 'gemini':'Gémeaux', 'cancer':'Cancer', 'leo':'Lion', 'virgo':'Vierge', 'libra':'Balance', 'scorpio':'Scorpion', 'sagittarius':'Sagittaire', 'capricorn':'Capricorne', 'aquarius':'Verseau', 'pisces':'Poissons'} as any)[z.id] || z.nameEn : z.nameEn)}
                            </span>
                        </button>
                    ))}
                </div>

                {selectedZodiacData && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 mt-2 shadow-lg rounded-[32px] relative overflow-hidden group min-h-[120px] bg-white border border-gray-100">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/60 z-10"></div>
                        
                        <div className="flex flex-col gap-2 relative z-20">
                            <h3 className="text-stella-gold font-bold font-amiri text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-stella-gold" /> 
                                {t.todayZodiacPred} {lang === 'ar' ? selectedZodiacData.nameAr : (lang === 'fr' ? ({'aries':'Bélier', 'taurus':'Taureau', 'gemini':'Gémeaux', 'cancer':'Cancer', 'leo':'Lion', 'virgo':'Vierge', 'libra':'Balance', 'scorpio':'Scorpion', 'sagittarius':'Sagittaire', 'capricorn':'Capricorne', 'aquarius':'Verseau', 'pisces':'Poissons'} as any)[selectedZodiacData.id] || selectedZodiacData.nameEn : selectedZodiacData.nameEn)}
                            </h3>
                            <div className="min-h-[40px]">
                                {isLoadingDaily ? (
                                    <div className="flex items-center gap-2 text-stella-gold pt-2">
                                        <div className="w-1.5 h-1.5 bg-stella-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-stella-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-stella-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                ) : (
                                    <p className="text-[13px] md:text-sm text-gray-700 leading-relaxed font-tajawal">
                                        {dynamicDaily}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 4. حكمة بابل */}
            <div className="p-6 relative overflow-hidden shadow-lg rounded-[32px] group mt-4 bg-white border border-gray-100">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545205597-3d9d02c2959f?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-white/60 z-10"></div>
                
                <h3 className="text-stella-amber font-bold text-xl mb-4 flex items-center gap-2 font-amiri border-b border-stella-amber/20 pb-3 relative z-20">
                    <Quote className="w-5 h-5 text-stella-amber" />
                    {lang === 'ar' ? 'حكمة اليوم' : 'Daily Wisdom'}
                </h3>
                <div className="flex flex-col gap-3 relative z-20">
                    {randomWisdoms.map((wisdom, i) => (
                        <div key={i} className="flex gap-3 items-start bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-200 hover:bg-white transition-colors shadow-sm">
                            <span className="text-stella-gold mt-0.5 text-sm">✦</span>
                            <p className="text-sm text-gray-700 font-tajawal leading-relaxed italic">{wisdom}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions (Banners) */}
            <div className="grid gap-6 mt-4">
                <motion.div 
                    initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="overflow-hidden cursor-pointer group flex relative min-h-[150px] rounded-[32px] transform transition-transform hover:scale-[1.02] duration-500 shadow-md border border-gray-100 bg-white"
                    onClick={() => onNavigate('divination')}
                >
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-80"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent z-10 transition-all duration-700"></div>
                    
                    <div className="relative z-20 p-7 flex flex-col justify-center w-full">
                        <h3 className="text-stella-gold font-bold text-2xl font-amiri mb-2 flex items-center justify-between tracking-wide">
                            {t.divination} <span className="transform group-hover:translate-x-3 transition-transform duration-500 rtl:group-hover:-translate-x-3 text-stella-gold/70">←</span>
                        </h3>
                        <p className="text-sm text-gray-700 w-3/4 leading-relaxed font-tajawal border-l-2 rtl:border-r-2 rtl:border-l-0 border-stella-gold/50 pl-3 rtl:pr-3">{t.features.divination}</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                    className="overflow-hidden cursor-pointer group flex relative min-h-[150px] rounded-[32px] transform transition-transform hover:scale-[1.02] duration-500 shadow-md border border-gray-100 bg-white"
                    onClick={() => onNavigate('tarot')}
                >
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1577937927133-66ef06acdf18?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-80"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent z-10 transition-all duration-700"></div>
                    
                    <div className="relative z-20 p-7 flex flex-col justify-center w-full">
                        <h3 className="text-purple-600 font-bold text-2xl font-amiri mb-2 flex items-center justify-between tracking-wide">
                            {t.tarot} <span className="transform group-hover:translate-x-3 transition-transform duration-500 rtl:group-hover:-translate-x-3 text-purple-600/70">←</span>
                        </h3>
                        <p className="text-sm text-gray-700 w-3/4 leading-relaxed font-tajawal border-l-2 rtl:border-r-2 rtl:border-l-0 border-purple-400 pl-3 rtl:pr-3">{t.features.tarot}</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                    className="overflow-hidden cursor-pointer group flex relative min-h-[150px] rounded-[32px] transform transition-transform hover:scale-[1.02] duration-500 shadow-md border border-gray-100 bg-white"
                    onClick={() => onNavigate('coffee')}
                >
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-80"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent z-10 transition-all duration-700"></div>
                    
                    <div className="relative z-20 p-7 flex flex-col justify-center w-full">
                        <h3 className="text-amber-800 font-bold text-2xl font-amiri mb-2 flex items-center justify-between tracking-wide">
                            {t.coffeeTitle} <span className="transform group-hover:translate-x-3 transition-transform duration-500 rtl:group-hover:-translate-x-3 text-amber-800/70">←</span>
                        </h3>
                        <p className="text-sm text-gray-700 w-3/4 leading-relaxed font-tajawal border-l-2 rtl:border-r-2 rtl:border-l-0 border-amber-800/50 pl-3 rtl:pr-3">{t.features.coffeeDesc}</p>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
                    className="overflow-hidden cursor-pointer group flex relative min-h-[160px] rounded-[32px] transform transition-transform hover:scale-[1.02] duration-500 mt-2 shadow-lg border border-stella-gold bg-white"
                    onClick={() => onNavigate('premium')}
                >
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105 opacity-60"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent z-10"></div>
                    
                    <div className="relative z-20 p-8 flex flex-col justify-center w-full items-center text-center">
                        <h3 className="text-stella-gold font-bold text-3xl font-amiri mb-3 tracking-wide">
                            {t.vipTitle}
                        </h3>
                        <p className="text-sm text-gray-700 w-full leading-relaxed font-tajawal">{t.vipDesc}</p>
                        <div className="mt-4 px-6 py-2 rounded-full border border-stella-gold bg-stella-gold/10 text-stella-gold text-xs font-bold tracking-widest uppercase shadow-sm group-hover:bg-stella-gold group-hover:text-white transition-colors">
                            {lang === 'ar' ? 'رحلة الارتقاء' : 'Elevate Journey'}
                        </div>
                    </div>
                </motion.div>
            </div>

        </motion.div>
    );
}

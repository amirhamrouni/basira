import { useState, useEffect, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BottomNav from './components/BottomNav';
import { LANGUAGE_PACK } from './lang';
import { Bell, AlertCircle, X } from 'lucide-react';
import { useAuth } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { cn } from './utils/cn';
import { AppStateManager } from './utils/AppStateManager';

type ViewId = 'home' | 'palmistry' | 'face' | 'tarot' | 'divination' | 'coffee' | 'notifications' | 'admin' | 'dashboard' | 'premium' | 'zodiac' | 'other' | 'history' | 'dream' | 'privacy' | 'methodology' | 'moon' | 'dream-journal' | 'rituals';

const RESTORABLE_VIEWS = new Set<ViewId>([
    'home', 'palmistry', 'face', 'tarot', 'divination', 'coffee', 'notifications',
    'dashboard', 'premium', 'zodiac', 'other', 'history', 'dream', 'privacy',
    'methodology', 'moon', 'dream-journal', 'rituals'
]);

const HomeView = lazy(() => import('./views/HomeView'));
const PalmistryView = lazy(() => import('./views/PalmistryView'));
const TarotView = lazy(() => import('./views/TarotView'));
const DivinationView = lazy(() => import('./views/DivinationView'));
const NotificationsView = lazy(() => import('./views/NotificationsView'));
const AdminView = lazy(() => import('./views/AdminView'));
const CoffeeView = lazy(() => import('./views/CoffeeView'));
const PremiumView = lazy(() => import('./views/PremiumView'));
const ZodiacView = lazy(() => import('./views/ZodiacView'));
const FaceView = lazy(() => import('./views/FaceView'));
const OtherView = lazy(() => import('./views/OtherView'));
const HistoryView = lazy(() => import('./views/HistoryView'));
const DreamView = lazy(() => import('./views/DreamView'));
const UserDashboardView = lazy(() => import('./views/UserDashboardView'));
const PrivacyView = lazy(() => import('./views/PrivacyView'));
const MethodologyView = lazy(() => import('./views/MethodologyView'));
const MoonView = lazy(() => import('./views/MoonView'));
const DreamJournalView = lazy(() => import('./views/DreamJournalView'));
const RitualsView = lazy(() => import('./views/RitualsView'));

export default function App() {
    const { user, profile, login, logout, loading: authLoading, authError, isAdmin } = useAuth();
    const [showAuthError, setShowAuthError] = useState(false);

    useEffect(() => {
        if (authError) setShowAuthError(true);
    }, [authError]);
    const [lang, setLang] = useState<'ar'|'en'|'fr'>(() => {
        const saved = AppStateManager.get('lang');
        if (saved) return saved;
        const browserLang = navigator.language || (navigator as any).userLanguage || '';
        if (browserLang.startsWith('fr')) return 'fr';
        return browserLang.startsWith('ar') ? 'ar' : 'en';
    });
    const [activeView, setActiveView] = useState<ViewId>(() => {
        const saved = AppStateManager.get('lastView') as ViewId;
        return RESTORABLE_VIEWS.has(saved) ? saved : 'home';
    });
    const adminPrompt = LANGUAGE_PACK.ar.defaultPrompt;
    const [showLangMenu, setShowLangMenu] = useState(false);
    
    // Persistent app states
    const [palmState, setPalmState] = useState({ imagePreview: null as string|null, reading: null as string|null, isScanning: false, error: null as string|null });
    const [faceState, setFaceState] = useState({ imagePreview: null as string|null, reading: null as string|null, isScanning: false, error: null as string|null });
    const [tarotState, setTarotState] = useState({ drawnCards: [] as number[], reading: null as string|null, isLoading: false, sessionCards: [] as string[], lastDrawTime: null as number|null });
    const [divState, setDivState] = useState({ name: '', motherName: '', reading: null as string|null, isLoading: false });
    const [coffeeState, setCoffeeState] = useState({ imagePreview: null as string|null, reading: null as string|null, isScanning: false, error: null as string|null });

    const t = LANGUAGE_PACK[lang];
    useEffect(() => {
        if (activeView === 'admin' && !isAdmin) setActiveView('home');
    }, [activeView, isAdmin]);

    useEffect(() => {
        AppStateManager.set('lastView', activeView === 'admin' ? 'home' : activeView);
    }, [activeView]);

    useEffect(() => {
        AppStateManager.set('lang', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    // Show full-screen loader while Firebase resolves auth state
    if (authLoading) {
        return (
            <div className="oracle-app max-w-md mx-auto w-full min-h-screen flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-[3px] border-stella-gold border-t-transparent animate-spin" />
                    <p className="text-stella-gold font-amiri text-lg">
                        {lang === 'ar' ? 'بصيرة...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="oracle-app max-w-md mx-auto w-full min-h-screen pb-[calc(110px+env(safe-area-inset-bottom,0px))] relative font-tajawal shadow-2xl overflow-x-hidden selection:bg-stella-gold/30 ring-1 ring-[#d7ad58]/10">
            
            {/* Auth Error Banner */}
            <AnimatePresence>
                {showAuthError && authError && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-0 inset-x-0 max-w-md mx-auto z-[100] p-3"
                    >
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-red-700 text-sm font-tajawal flex-1 leading-relaxed">{authError}</p>
                            <button
                                onClick={() => setShowAuthError(false)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex justify-between items-center p-5 pt-[calc(1.75rem+env(safe-area-inset-top,0px))] relative z-20 bg-[#090610]/85 backdrop-blur-2xl border-b border-[#d7ad58]/20 sticky top-0 shadow-[0_12px_35px_rgba(0,0,0,.35)]">
                <div 
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => {
                        if (user) {
                            if (window.confirm(lang === 'ar' ? 'هل تريد تسجيل الخروج؟' : 'Do you want to log out?')) {
                                logout();
                            }
                        } else {
                            login();
                        }
                    }}
                >
                    {user ? (
                        <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-stella-gold via-stella-amber to-purple-600 shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-shadow">
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#0B0B0E]">
                                {user.photoURL ? <img src={user.photoURL} alt="User avatar" className="w-full h-full object-cover" /> : <span className="text-xl flex items-center justify-center h-full">✨</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-full p-[2px] bg-stella-border group-hover:bg-stella-gold/30 transition-colors shadow-sm">
                            <div className="w-full h-full rounded-full bg-[#130d20] flex items-center justify-center">
                                <span className="text-xl opacity-50">👤</span>
                            </div>
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-stella-gold font-amiri tracking-wide drop-shadow-sm group-hover:text-stella-amber transition-colors">
                            {user ? user.displayName || user.email?.split('@')[0] : (lang === 'ar' ? 'رحلة النور' : 'Journey of Light')}
                        </h1>
                        <p className="text-xs font-tajawal text-[#aaa0b2] font-medium tracking-wider mt-0.5">
                            {user ? (lang === 'ar' ? `المستوى (${profile?.level || 1})` : `Level ${profile?.level || 1}`) : (lang === 'ar' ? 'انقر للبدء' : 'Click to begin')}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setActiveView('notifications')}
                        className={`relative p-2 transition-all duration-300 ${activeView === 'notifications' ? 'text-stella-gold' : 'text-gray-500 hover:text-stella-gold hover:scale-110'}`}
                    >
                        <Bell size={22} strokeWidth={1.5} />
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white shadow-sm"></span>
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="glass-surface px-2.5 py-1 text-[11px] font-bold text-stella-gold hover:bg-stella-gold/10 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                        >
                            <span>🌐 {lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'Français'}</span>
                        </button>
                        {showLangMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowLangMenu(false)} />
                                <div className="absolute right-0 mt-2 w-32 bg-[#120c1d] border border-[#d7ad58]/25 rounded-2xl shadow-lg z-40 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {([
                                        { code: 'ar', label: 'العربية' },
                                        { code: 'en', label: 'English' },
                                        { code: 'fr', label: 'Français' }
                                    ] as const).map((l) => (
                                        <button
                                            key={l.code}
                                            onClick={() => {
                                                setLang(l.code);
                                                setShowLangMenu(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-xs font-bold hover:bg-stella-gold/10 transition-colors",
                                                lang === l.code ? "text-stella-gold bg-stella-gold/5 font-bold" : "text-gray-600",
                                                l.code === 'ar' ? "text-right" : "text-left"
                                            )}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="p-4 relative z-10 min-h-[calc(100vh-160px)]">
                <ErrorBoundary>
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[50vh]">
                            <div className="w-8 h-8 rounded-full border-2 border-stella-gold border-t-transparent animate-spin"></div>
                        </div>
                    }>
                        <AnimatePresence mode="wait">
                            {activeView === 'home' && <HomeView key="home" t={t} onNavigate={setActiveView} lang={lang} />}
                            {activeView === 'zodiac' && <ZodiacView key="zodiac" t={t} lang={lang} />}
                            {activeView === 'palmistry' && <PalmistryView key="palm" t={t} adminPrompt={adminPrompt} lang={lang} state={palmState} setState={setPalmState} />}
                            {activeView === 'face' && <FaceView key="face" t={t} adminPrompt={adminPrompt} lang={lang} state={faceState} setState={setFaceState} />}
                            {activeView === 'tarot' && <TarotView key="tarot" t={t} adminPrompt={adminPrompt} lang={lang} state={tarotState} setState={setTarotState} />}
                            {activeView === 'divination' && <DivinationView key="divination" t={t} adminPrompt={adminPrompt} lang={lang} state={divState} setState={setDivState} />}
                            {activeView === 'coffee' && <CoffeeView key="coffee" t={t} lang={lang} state={coffeeState} setState={setCoffeeState} />}
                            {activeView === 'premium' && <PremiumView key="premium" t={t} lang={lang} />}
                            {activeView === 'notifications' && <NotificationsView key="notifications" t={t} lang={lang} />}
                            {activeView === 'other' && <OtherView key="other" t={t} lang={lang} onNavigate={setActiveView} />}
                            {activeView === 'history' && <HistoryView key="history" t={t} lang={lang} onNavigate={setActiveView} />}
                            {activeView === 'dream' && <DreamView key="dream" lang={lang} />}
                            {activeView === 'dashboard' && <UserDashboardView key="dashboard" lang={lang} onNavigate={setActiveView} />}
                            {activeView === 'privacy' && <PrivacyView key="privacy" lang={lang} />}
                            {activeView === 'methodology' && <MethodologyView key="methodology" lang={lang} />}
                            {activeView === 'moon' && <MoonView key="moon" lang={lang} />}
                            {activeView === 'dream-journal' && <DreamJournalView key="dream-journal" lang={lang} />}
                            {activeView === 'rituals' && <RitualsView key="rituals" lang={lang} />}
                            {activeView === 'admin' && isAdmin && <AdminView key="admin" />}
                        </AnimatePresence>
                    </Suspense>
                </ErrorBoundary>
            </main>

            <BottomNav active={activeView} onChange={setActiveView} t={t} />
        </div>
    );
}

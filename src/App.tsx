import { useState, useEffect, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BottomNav from './components/BottomNav';
import { LANGUAGE_PACK } from './lang';
import { Bell, AlertCircle, X } from 'lucide-react';
import { useAuth } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { cn } from './utils/cn';
import { AppStateManager } from './utils/AppStateManager';

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

export default function App() {
    const { user, profile, login, logout, loading: authLoading, authError } = useAuth();
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
    const [activeView, setActiveView] = useState<'home' | 'palmistry' | 'face' | 'tarot' | 'divination' | 'coffee' | 'notifications' | 'admin' | 'premium' | 'zodiac' | 'other' | 'history'>('home');
    const [adminPrompt, setAdminPrompt] = useState(LANGUAGE_PACK.ar.defaultPrompt);
    const [showLangMenu, setShowLangMenu] = useState(false);
    
    // Persistent app states
    const [palmState, setPalmState] = useState({ imagePreview: null as string|null, reading: null as string|null, isScanning: false });
    const [tarotState, setTarotState] = useState({ drawnCards: [] as number[], reading: null as string|null, isLoading: false, sessionCards: [] as string[], lastDrawTime: null as number|null });
    const [divState, setDivState] = useState({ name: '', motherName: '', reading: null as string|null, isLoading: false });
    const [coffeeState, setCoffeeState] = useState({ imagePreview: null as string|null, reading: null as string|null, isScanning: false });

    const t = LANGUAGE_PACK[lang];
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        if (activeView === 'admin' && !isAdmin) setActiveView('home');
    }, [activeView, isAdmin]);

    useEffect(() => {
        AppStateManager.set('lang', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    // Show full-screen loader while Firebase resolves auth state
    if (authLoading) {
        return (
            <div className="max-w-md mx-auto w-full min-h-screen flex flex-col items-center justify-center bg-stella-bg">
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
        <div className="max-w-md mx-auto w-full min-h-screen pb-[calc(110px+env(safe-area-inset-bottom,0px))] relative bg-stella-bg font-tajawal shadow-2xl overflow-x-hidden selection:bg-stella-gold/30 ring-1 ring-black/5 text-gray-800">
            <div className="fixed inset-0 bg-stella-bg -z-30"></div>
            <div className="fixed inset-0 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-5 -z-20 pointer-events-none"></div>
            <div className="fixed inset-0 bg-gradient-to-b from-stella-bg/80 via-stella-bg/95 to-stella-bg -z-10 pointer-events-none"></div>
            
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

            <header className="flex justify-between items-center p-5 pt-[calc(1.75rem+env(safe-area-inset-top,0px))] relative z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200 sticky top-0 shadow-sm">
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
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                <span className="text-xl opacity-50">👤</span>
                            </div>
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-stella-gold font-amiri tracking-wide drop-shadow-sm group-hover:text-stella-amber transition-colors">
                            {user ? user.displayName || user.email?.split('@')[0] : (lang === 'ar' ? 'رحلة النور' : 'Journey of Light')}
                        </h1>
                        <p className="text-[11px] font-tajawal text-gray-500 font-medium tracking-wider mt-0.5">
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
                                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-150 rounded-2xl shadow-lg z-40 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                            {activeView === 'face' && <FaceView key="face" t={t} adminPrompt={adminPrompt} lang={lang} />}
                            {activeView === 'tarot' && <TarotView key="tarot" t={t} adminPrompt={adminPrompt} lang={lang} state={tarotState} setState={setTarotState} />}
                            {activeView === 'divination' && <DivinationView key="divination" t={t} adminPrompt={adminPrompt} lang={lang} state={divState} setState={setDivState} />}
                            {activeView === 'coffee' && <CoffeeView key="coffee" t={t} lang={lang} state={coffeeState} setState={setCoffeeState} />}
                            {activeView === 'premium' && <PremiumView key="premium" t={t} lang={lang} />}
                            {activeView === 'notifications' && <NotificationsView key="notifications" t={t} lang={lang} />}
                            {activeView === 'other' && <OtherView key="other" t={t} lang={lang} onNavigate={setActiveView} />}
                            {activeView === 'history' && <HistoryView key="history" t={t} lang={lang} onNavigate={setActiveView} />}
                            {activeView === 'admin' && isAdmin && (
                                <AdminView 
                                    key="admin" 
                                    t={t} 
                                    adminPrompt={adminPrompt} 
                                    setAdminPrompt={setAdminPrompt} 
                                />
                            )}
                        </AnimatePresence>
                    </Suspense>
                </ErrorBoundary>
            </main>

            <BottomNav active={activeView} onChange={setActiveView} t={t} />
        </div>
    );
}

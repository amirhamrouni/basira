import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, X, Lock, Eye, Star, Compass } from 'lucide-react';

type RewardState = 'idle' | 'communing' | 'revealing' | 'rewarded';

interface CosmicRewardProps {
    isOpen: boolean;
    onClose: () => void;
    onRewardComplete: () => void | Promise<void>;
    title: string;
    description: string;
    rewardType: 'insight' | 'vip' | 'destiny';
    lang?: 'ar' | 'en';
}

export default function CosmicRewardModal({ 
    isOpen, 
    onClose, 
    onRewardComplete, 
    title, 
    description, 
    rewardType = 'insight',
    lang = 'en'
}: CosmicRewardProps) {
    const [state, setState] = useState<RewardState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setState('idle');
            setError(null);
            setClaiming(false);
        }
    }, [isOpen]);

    const handleOfferEnergy = async () => {
        if (state !== 'idle') return;
        setError(null);
        setState('communing');
        try {
            if (!Capacitor.isNativePlatform()) {
                throw new Error('Rewarded ads require the Android app.');
            }
            await AdMob.initialize();
            const adId = 'ca-app-pub-1233451496176046/5417205489';
            await AdMob.prepareRewardVideoAd({ adId });
            let settled = false;
            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            let handles: Array<{ remove: () => Promise<void> }> = [];
            const eventResult = new Promise<void>(async (resolve, reject) => {
                const finish = (callback: () => void) => {
                    if (settled) return;
                    settled = true;
                    callback();
                };
                handles = await Promise.all([
                    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => finish(resolve)),
                    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(() => reject(new Error('Rewarded ad dismissed before reward.')))),
                    AdMob.addListener(RewardAdPluginEvents.FailedToShow, (nativeError) => finish(() => reject(new Error(nativeError?.message || 'Rewarded ad failed to show.')))),
                ]);
                timeoutId = setTimeout(() => finish(() => reject(new Error('Rewarded ad timed out.'))), 90000);
            });
            try {
                await Promise.race([
                    AdMob.showRewardVideoAd({ adId }),
                    eventResult,
                ]);
                await eventResult;
            } finally {
                settled = true;
                if (timeoutId) clearTimeout(timeoutId);
                await Promise.all(handles.map((handle) => handle.remove()));
            }
            setState('rewarded');
        } catch (cause) {
            console.error('Rewarded ad failed', cause);
            setError(lang === 'ar'
                ? 'الإعلان غير متاح الآن أو لم يكتمل. لم تُضف طاقة؛ حاول لاحقاً.'
                : 'The ad is unavailable or was not completed. No energy was added.');
            setState('idle');
        }
    };

    const handleClaim = async () => {
        if (state !== 'rewarded' || claiming) return;
        setClaiming(true);
        try {
            await onRewardComplete();
            onClose();
        } catch (cause) {
            console.error('Reward delivery failed', cause);
            setError(lang === 'ar' ? 'تعذّر إضافة المكافأة؛ حاول مرة أخرى.' : 'Could not deliver reward. Try again.');
        } finally {
            setClaiming(false);
        }
    };

    const getIcon = () => {
        switch (rewardType) {
            case 'insight': return <Eye className="w-8 h-8 text-purple-400" />;
            case 'vip': return <Star className="w-8 h-8 text-stella-gold" />;
            case 'destiny': return <Compass className="w-8 h-8 text-blue-400" />;
            default: return <Sparkles className="w-8 h-8 text-stella-gold" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl"
                    >
                        {/* Dynamic Backgrounds based on state */}
                        <div className="absolute inset-0 bg-[#0B0B0E]" />
                        
                        {/* Starfield simulation - Idle state */}
                        <AnimatePresence>
                            {(state === 'idle' || state === 'communing') && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stella-gold/10 via-black to-black"
                                />
                            )}
                        </AnimatePresence>
                        
                        {/* Energy Vortex - Communing state */}
                        <AnimatePresence>
                            {state === 'communing' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                                    animate={{ opacity: 0.5, scale: 1.5, rotate: 360 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                                    className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(0,0,0,0)_0%,rgba(212,175,55,0.2)_50%,rgba(0,0,0,0)_100%)] mix-blend-screen"
                                />
                            )}
                        </AnimatePresence>

                        {/* Flash / Cinematic Reveal */}
                        <AnimatePresence>
                            {state === 'revealing' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: [0, 1, 0.4], scale: [0.8, 1.2, 1] }}
                                    transition={{ duration: 2.5, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-white"
                                />
                            )}
                        </AnimatePresence>

                        {/* Main Content Area */}
                        <div className="relative p-6 z-10 min-h-[400px] flex flex-col items-center justify-center text-center">
                            
                            {state === 'idle' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center relative bg-black/40 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                                        <Lock className="w-8 h-8 text-stella-gold/50" />
                                        <motion.div 
                                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} 
                                            transition={{ duration: 3, repeat: Infinity }} 
                                            className="absolute inset-0 rounded-full border border-stella-gold/30" 
                                        />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-100 font-amiri mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                            {title}
                                        </h3>
                                        <p className="text-sm text-gray-400 font-tajawal max-w-[250px] leading-relaxed">
                                            {description}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={handleOfferEnergy}
                                        className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-br from-stella-gold/90 to-stella-amber/90 p-[1px] mt-2 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                        <div className="bg-black/40 backdrop-blur-xl px-6 py-4 rounded-2xl flex items-center justify-center gap-3 w-full">
                                            <Play className="w-4 h-4 text-stella-gold group-hover:text-white transition-colors fill-stella-gold group-hover:fill-white" />
                                            <span className="font-bold text-sm text-stella-gold group-hover:text-white transition-colors uppercase tracking-wider">
                                                {lang === 'ar' ? 'تقديم الطاقة (مشاهدة الرؤية)' : 'Offer Energy (View Vision)'}
                                            </span>
                                        </div>
                                    </button>
                                    
                                    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                                    <button onClick={onClose} className="text-[11px] text-gray-500 hover:text-gray-300 font-bold tracking-widest uppercase mt-2 transition-colors">
                                        {lang === 'ar' ? 'ربما لاحقاً' : 'Perhaps Later'}
                                    </button>
                                </motion.div>
                            )}

                            {state === 'communing' && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-stella-gold border-b-stella-gold animate-spin" />
                                        <Sparkles className="w-6 h-6 text-stella-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <p className="text-stella-gold font-bold font-tajawal animate-pulse text-lg tracking-widest">
                                        {lang === 'ar' ? 'نتواصل مع الكون...' : 'Communing with the cosmos...'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {lang === 'ar' ? 'يجري تحميل الإعلان...' : 'Loading rewarded ad...'}
                                    </p>
                                </motion.div>
                            )}

                            {state === 'revealing' && (
                                <motion.div 
                                    className="flex flex-col items-center justify-center w-full h-full"
                                >
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: [0, 1.5, 1], rotate: 0 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    >
                                        {getIcon()}
                                    </motion.div>
                                </motion.div>
                            )}

                            {state === 'rewarded' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-stella-gold/20 to-purple-500/20 flex items-center justify-center border border-stella-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                                        {getIcon()}
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-2xl font-bold text-stella-gold font-amiri mb-2">
                                            {lang === 'ar' ? 'تم كشف المستور' : 'The Veil is Lifted'}
                                        </h3>
                                        <p className="text-sm text-gray-300 font-tajawal">
                                            {lang === 'ar' ? 'لقد قبل الكون طاقتك، المعرفة أصبحت لك الآن.' : 'The cosmos accepted your energy. The knowledge is now yours.'}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={() => void handleClaim()}
                                        disabled={claiming}
                                        className="w-full bg-stella-gold text-black px-6 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all shadow-[0_5px_20px_rgba(212,175,55,0.3)]"
                                    >
                                        {claiming ? (lang === 'ar' ? 'جارٍ إضافة المكافأة...' : 'Delivering reward...') : (lang === 'ar' ? 'استلم المعرفة' : 'Embrace Knowledge')}
                                    </button>
                                    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                                </motion.div>
                            )}
                        </div>

                        {/* Close button (only visible in idle) */}
                        {state === 'idle' && (
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-gray-500 hover:text-white transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

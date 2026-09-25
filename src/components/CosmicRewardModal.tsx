import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Compass, Eye, Lock, Play, Sparkles, Star, X } from 'lucide-react';
import { isRewardedAdsSupported, showBasiraRewardedAd } from '../utils/rewardedAds';

type RewardState = 'idle' | 'communing' | 'revealing' | 'rewarded' | 'delivery-error' | 'ad-error';

interface CosmicRewardProps {
    isOpen: boolean;
    onClose: () => void;
    onRewardComplete: () => void | Promise<void>;
    title: string;
    description: string;
    rewardType: 'insight' | 'vip' | 'destiny';
    lang?: 'ar' | 'en' | 'fr';
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
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setState('idle');
            setErrorMessage('');
        }
    }, [isOpen]);

    const text = (ar: string, en: string, fr: string = en) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;

    const deliverReward = async () => {
        try {
            await onRewardComplete();
            setState('revealing');
            window.setTimeout(() => setState('rewarded'), 700);
        } catch (error) {
            console.error('Reward delivery failed', error);
            setErrorMessage(text(
                'شاهدت الإعلان، لكن تعذّر إضافة الطاقة الآن. أعد محاولة استلام المكافأة بدون مشاهدة إعلان جديد.',
                'The ad was completed, but the reward could not be added. Retry the reward without watching another ad.',
                'La publicité est terminée, mais la récompense n’a pas pu être ajoutée. Réessayez sans regarder une autre publicité.'
            ));
            setState('delivery-error');
        }
    };

    const handleWatchAd = async () => {
        if (!isRewardedAdsSupported()) {
            setErrorMessage(text(
                'الإعلانات المكافِئة متاحة داخل تطبيق أندرويد فقط.',
                'Rewarded ads are available in the Android app only.',
                'Les publicités récompensées sont disponibles uniquement dans l’application Android.'
            ));
            setState('ad-error');
            return;
        }

        setErrorMessage('');
        setState('communing');
        try {
            await showBasiraRewardedAd();
            await deliverReward();
        } catch (error) {
            console.error('Rewarded ad failed', error);
            setErrorMessage(text(
                'لم يكتمل الإعلان أو لم تتوفر إعلانات الآن. لم تُضف أي مكافأة. حاول مرة أخرى.',
                'The ad did not complete or no ad is available right now. No reward was added. Try again.',
                'La publicité n’a pas été terminée ou aucune publicité n’est disponible. Aucune récompense n’a été ajoutée.'
            ));
            setState('ad-error');
        }
    };

    const getIcon = () => {
        switch (rewardType) {
            case 'vip': return <Star className="w-8 h-8 text-stella-gold" />;
            case 'destiny': return <Compass className="w-8 h-8 text-blue-400" />;
            default: return <Eye className="w-8 h-8 text-purple-400" />;
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
                        <div className="absolute inset-0 bg-[#0B0B0E]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stella-gold/10 via-black to-black" />

                        <div className="relative p-6 z-10 min-h-[400px] flex flex-col items-center justify-center text-center">
                            {state === 'idle' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 w-full">
                                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center relative bg-black/40 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                                        <Lock className="w-8 h-8 text-stella-gold/50" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-100 font-amiri mb-2">{title}</h3>
                                        <p className="text-sm text-gray-400 font-tajawal max-w-[260px] leading-relaxed">{description}</p>
                                    </div>
                                    <button onClick={() => void handleWatchAd()} className="w-full rounded-2xl border border-stella-gold/30 bg-stella-gold/10 px-6 py-4 flex items-center justify-center gap-3 text-stella-gold font-bold text-sm">
                                        <Play className="w-4 h-4 fill-stella-gold" />
                                        {text('شاهد إعلاناً وافتح القراءة', 'Watch an ad to unlock', 'Regarder une publicité pour débloquer')}
                                    </button>
                                    <button onClick={onClose} className="text-[11px] text-gray-500 hover:text-gray-300 font-bold tracking-widest uppercase transition-colors">
                                        {text('ليس الآن', 'Not now', 'Pas maintenant')}
                                    </button>
                                </motion.div>
                            )}

                            {state === 'communing' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-stella-gold border-b-stella-gold animate-spin" />
                                        <Sparkles className="w-6 h-6 text-stella-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <p className="text-stella-gold font-bold font-tajawal text-base">
                                        {text('يتم تحميل الإعلان المكافِئ...', 'Loading rewarded ad...', 'Chargement de la publicité récompensée...')}
                                    </p>
                                    <p className="text-xs text-gray-500 max-w-[250px]">
                                        {text('تُضاف المكافأة فقط بعد إكمال الإعلان.', 'The reward is granted only after the ad is completed.', 'La récompense est accordée uniquement après la fin de la publicité.')}
                                    </p>
                                </motion.div>
                            )}

                            {state === 'revealing' && (
                                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 rounded-full bg-stella-gold/10 flex items-center justify-center border border-stella-gold/30">{getIcon()}</div>
                                    <p className="text-stella-gold font-bold">{text('تم استحقاق المكافأة', 'Reward earned', 'Récompense obtenue')}</p>
                                </motion.div>
                            )}

                            {state === 'rewarded' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 w-full">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-stella-gold/20 to-purple-500/20 flex items-center justify-center border border-stella-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.25)]">{getIcon()}</div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-stella-gold font-amiri mb-2">{text('تمت إضافة الطاقة', 'Energy restored', 'Énergie restaurée')}</h3>
                                        <p className="text-sm text-gray-300 font-tajawal">{text('يمكنك متابعة القراءة الآن.', 'You can continue your reading now.', 'Vous pouvez continuer votre lecture.')}</p>
                                    </div>
                                    <button onClick={onClose} className="w-full bg-stella-gold text-black px-6 py-4 rounded-2xl font-bold text-sm">
                                        {text('متابعة', 'Continue', 'Continuer')}
                                    </button>
                                </motion.div>
                            )}

                            {(state === 'ad-error' || state === 'delivery-error') && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 w-full">
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-400/30 flex items-center justify-center"><AlertCircle className="w-7 h-7 text-red-300" /></div>
                                    <p className="text-sm leading-6 text-gray-300">{errorMessage}</p>
                                    <button
                                        onClick={() => state === 'delivery-error' ? void deliverReward() : void handleWatchAd()}
                                        className="w-full rounded-2xl border border-stella-gold/30 bg-stella-gold/10 px-6 py-4 text-stella-gold font-bold text-sm"
                                    >
                                        {state === 'delivery-error'
                                            ? text('إعادة استلام المكافأة', 'Retry reward delivery', 'Réessayer la récompense')
                                            : text('إعادة المحاولة', 'Try again', 'Réessayer')}
                                    </button>
                                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">{text('إغلاق', 'Close', 'Fermer')}</button>
                                </motion.div>
                            )}
                        </div>

                        {(state === 'idle' || state === 'ad-error') && (
                            <button onClick={onClose} className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-gray-500 hover:text-white transition-colors z-20">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

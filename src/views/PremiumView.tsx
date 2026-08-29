import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, Zap, Crown, Flame, Gem, ArrowRight, Play, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';
import CosmicRewardModal from '../components/CosmicRewardModal';
import { useAuth } from '../components/AuthProvider';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, analytics, remoteConfig, getValue } from '../firebase';
import { logEvent } from 'firebase/analytics';

const tiers = [
    {
        id: 'adept',
        name: { en: 'The Adept', ar: 'المتخصص' },
        price: { en: '$4.99/mo', ar: '$4.99/شهر' },
        features: {
            en: ['Ad-free experience', 'Unlimited basic readings', 'Monthly 50 Stardust'],
            ar: ['تجربة بدون إعلانات', 'قراءات أساسية لا محدودة', '50 غبار نجمي شهرياً']
        },
        color: 'from-blue-600/20 to-purple-600/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-500'
    },
    {
        id: 'oracle',
        name: { en: 'The Oracle', ar: 'العراف' },
        price: { en: '$12.99/mo', ar: '$12.99/شهر' },
        features: {
            en: ['Everything in Adept', 'Deep psychological analysis', 'Unlimited Cosmic Energy', 'Priority AI processing'],
            ar: ['كل ميزات المتخصص', 'تحليل نفسي عميق', 'طاقة كونية لا محدودة', 'أولوية في معالجة الذكاء الاصطناعي']
        },
        color: 'from-stella-gold/20 to-amber-600/20',
        borderColor: 'border-stella-gold/50',
        iconColor: 'text-stella-gold',
        popular: true
    }
];

export default function PremiumView({ lang }: any) {
    const isAr = lang === 'ar';
    const [selectedTier, setSelectedTier] = useState('oracle');
    const [showAdModal, setShowAdModal] = useState(false);
    const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
    const { user, profile, login } = useAuth();
    
    const xp = profile?.xp || 0;
    const level = profile?.level || 1;
    const nextLevelXp = level * 1000;
    
    const rewardAmount = remoteConfig ? getValue(remoteConfig, 'ad_reward_energy').asNumber() : 10;

    const handleCheckout = () => {
        if (!user) {
            login();
            return;
        }
        const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL as string | undefined;
        if (!checkoutUrl) {
            setCheckoutMessage(isAr
                ? 'الاشتراكات غير متاحة للدفع حالياً. لن يتم خصم أي مبلغ.'
                : 'Payments are not available yet. You will not be charged.');
            return;
        }
        const url = new URL(checkoutUrl);
        url.searchParams.set('plan', selectedTier);
        url.searchParams.set('uid', user.uid);
        window.location.assign(url.toString());
    };
    
    const handleRewardComplete = async () => {
        if (!user) {
            login();
            return;
        }
        
        if (analytics) {
            logEvent(analytics, 'ad_reward_claim', { type: 'energy', amount: rewardAmount });
        }
        
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                energy: increment(rewardAmount)
            });
        } catch (error) {
            console.error("Reward sync failed", error);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 w-full pb-10 min-h-screen">
            
            {/* Header: Cosmic Wallet & Stats */}
            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="glass-card p-5 border-stella-border relative overflow-hidden group hover:border-stella-gold/30 transition-all bg-white">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-stella-gold/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <Gem className="w-4 h-4 text-stella-gold" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isAr ? 'غبار نجمي' : 'Stardust'}</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-800 font-mono">{profile?.stardust || 0}</span>
                        <span className="text-xs text-stella-gold/70 font-amiri">✨</span>
                    </div>
                </div>

                <div className="glass-card p-5 border-stella-border relative overflow-hidden group hover:border-stella-gold/30 transition-all bg-white">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-stella-amber/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <Zap className="w-4 h-4 text-stella-amber" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isAr ? 'الطاقة' : 'Energy'}</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-800 font-mono">{profile?.energy || 0}</span>
                        <span className="text-xs text-gray-400 font-mono">/{profile?.maxEnergy || 50}</span>
                    </div>
                </div>
            </div>

            {/* Progression: Soul Level & Streak */}
            <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-stella-gold" />
                            {isAr ? 'مستوى الروح' : 'Soul Rank'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{isAr ? 'يتم فتح رؤى جديدة في المستوى 5' : 'New insights unlock at Level 5'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-stella-amber/10 border border-stella-amber/20 px-2 py-1 rounded-lg">
                            <Flame className="w-3.5 h-3.5 text-stella-amber" />
                            <span className="text-xs font-bold text-stella-amber">{profile?.streak || 1} {isAr ? 'أيام' : 'Days'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-stella-gold/40 flex items-center justify-center bg-stella-gold/10 shrink-0">
                        <span className="text-lg font-bold text-stella-gold font-mono">{level}</span>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 font-mono">
                            <span>{xp} XP</span>
                            <span>{nextLevelXp} XP</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((xp / nextLevelXp) * 100, 100)}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="bg-gradient-to-r from-stella-amber to-stella-gold h-full rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Engage for Rewards (Rewarded Ad Hook) */}
            <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowAdModal(true)}
                className="relative overflow-hidden rounded-2xl p-[1px] cursor-pointer group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-stella-gold/30 via-stella-amber/30 to-stella-gold/30 animate-[spin_4s_linear_infinite]" />
                <div className="relative bg-white p-5 rounded-2xl flex items-center justify-between z-10 border border-stella-gold/20 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-stella-gold/10 flex items-center justify-center border border-stella-gold/30">
                            <Play className="w-4 h-4 fill-stella-gold text-stella-gold" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-stella-gold font-amiri">
                                {isAr ? 'استعادة الطاقة' : 'Restore Energy'}
                            </h4>
                            <p className="text-xs text-gray-500 font-tajawal mt-0.5">
                                {isAr ? `تأمل للحظات لاستعادة +${rewardAmount} طاقة` : `Meditate briefly to restore +${rewardAmount} Energy`}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className={cn("w-5 h-5 text-stella-gold/50 group-hover:text-stella-gold group-hover:translate-x-1 transition-all", isAr && "rotate-180 group-hover:-translate-x-1")} />
                </div>
            </motion.div>

            {/* VIP Tiers Offer */}
            <div className="mt-4">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 font-amiri mb-2">
                        {isAr ? 'ارتقِ بروحك' : 'Ascend Your Spirit'}
                    </h2>
                    <p className="text-xs text-gray-500 font-tajawal px-4">
                        {isAr ? 'افتح المعرفة القديمة والحماية الروحية اللامحدودة' : 'Unlock ancient knowledge and limitless spiritual protection'}
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    {tiers.map((tier) => (
                        <div 
                            key={tier.id}
                            onClick={() => setSelectedTier(tier.id)}
                            className={cn(
                                "relative overflow-hidden rounded-3xl p-5 border cursor-pointer transition-all duration-300",
                                selectedTier === tier.id 
                                    ? `bg-white ${tier.borderColor} shadow-lg ring-1 ring-stella-gold/30 border-stella-gold` 
                                    : "bg-white/80 border-gray-200 hover:border-gray-300 opacity-90 hover:opacity-100 shadow-sm"
                            )}
                        >
                            {/* Background Glow */}
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 pointer-events-none", tier.color)} />
                            
                            {/* Popular Badge */}
                            {tier.popular && (
                                <div className="absolute top-0 right-0 bg-stella-gold text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20">
                                    {isAr ? 'الأكثر طلباً' : 'MOST POPULAR'}
                                </div>
                            )}

                            <div className="relative z-10 flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl border bg-white shadow-sm", tier.borderColor)}>
                                        {tier.id === 'oracle' ? <Crown className={cn("w-5 h-5", tier.iconColor)} /> : <Eye className={cn("w-5 h-5", tier.iconColor)} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 font-amiri">{tier.name[lang as 'en' | 'ar']}</h3>
                                        <span className={cn("text-xs font-bold", tier.iconColor)}>{tier.price[lang as 'en' | 'ar']}</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    selectedTier === tier.id ? tier.borderColor + " bg-white" : "border-gray-300 bg-transparent"
                                )}>
                                    {selectedTier === tier.id && <div className={cn("w-2.5 h-2.5 rounded-full", tier.id === 'oracle' ? 'bg-stella-gold' : 'bg-blue-400')} />}
                                </div>
                            </div>

                            <ul className="relative z-10 space-y-2.5 mb-5 pl-1">
                                {tier.features[lang as 'en' | 'ar'].map((feat, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 font-tajawal">
                                        <Sparkles className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", tier.iconColor)} />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <AnimatePresence>
                                {selectedTier === tier.id && (
                                    <motion.button
                                        type="button"
                                        onClick={handleCheckout}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={cn(
                                            "w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-md border relative z-10",
                                            tier.id === 'oracle' 
                                                ? "bg-stella-gold/10 text-stella-gold border-stella-gold/30 hover:bg-stella-gold hover:text-white"
                                                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                                        )}
                                    >
                                        {isAr ? 'تأكيد الارتقاء' : 'Confirm Ascension'}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {checkoutMessage && (
                <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
                    {checkoutMessage}
                </div>
            )}

            <CosmicRewardModal 
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onRewardComplete={handleRewardComplete}
                lang={lang}
                rewardType="insight"
                title={isAr ? 'نبع الطاقة' : 'Energy Nexus'}
                description={isAr ? `تأمل للحظات (مجازاً لفتح إعلان) لاستعادة ${rewardAmount} من الطاقة الكونية` : `Meditate briefly to restore ${rewardAmount} Cosmic Energy to continue your journey`}
            />
        </motion.div>
    );
}

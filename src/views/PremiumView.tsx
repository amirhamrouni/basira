import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Crown, Flame, Gem, ArrowRight, Play, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import CosmicRewardModal from '../components/CosmicRewardModal';
import { useAuth } from '../components/AuthProvider';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, analytics, remoteConfig, getValue } from '../firebase';
import { logEvent } from 'firebase/analytics';
import { isPremiumProfile } from '../utils/freeReadings';
import {
    isNativeAndroid,
    loadPlaySubscriptionOffer,
    restorePlaySubscriptions,
    startPlaySubscriptionPurchase,
    verifyPlaySubscription,
    type SubscriptionOffer,
} from '../utils/playBilling';

export default function PremiumView({ lang }: any) {
    const isAr = lang === 'ar';
    const [showAdModal, setShowAdModal] = useState(false);
    const [offer, setOffer] = useState<SubscriptionOffer | null>(null);
    const [billingBusy, setBillingBusy] = useState(false);
    const [billingMessage, setBillingMessage] = useState<string | null>(null);
    const [billingError, setBillingError] = useState<string | null>(null);
    const { user, profile, login } = useAuth();

    const xp = profile?.xp || 0;
    const level = profile?.level || 1;
    const nextLevelXp = level * 1000;
    const isPremium = isPremiumProfile(profile);
    const rewardAmount = remoteConfig ? getValue(remoteConfig, 'ad_reward_energy').asNumber() : 10;

    useEffect(() => {
        let cancelled = false;
        if (!isNativeAndroid()) return;
        loadPlaySubscriptionOffer()
            .then(value => {
                if (cancelled) return;
                setOffer(value);
                setBillingError(null);
            })
            .catch(error => {
                console.warn('Play subscription offer unavailable', error);
                if (cancelled) return;
                const notConfigured = String(error?.message || error).includes('PLAY_BILLING_NOT_CONFIGURED');
                setBillingError(notConfigured
                    ? (isAr ? 'اشتراك Google Play لم يُربط بمنتج فعلي بعد.' : 'The Google Play subscription product is not configured yet.')
                    : (isAr ? 'تعذّر تحميل عرض الاشتراك من Google Play حالياً.' : 'Could not load the Google Play subscription offer.'));
            });
        return () => { cancelled = true; };
    }, [isAr]);

    const handleRewardComplete = async () => {
        if (!user) {
            await login();
            return;
        }
        if (analytics) logEvent(analytics, 'ad_reward_claim', { type: 'energy', amount: rewardAmount });
        await updateDoc(doc(db, 'users', user.uid), { energy: increment(rewardAmount) });
    };

    const requireBillingReady = () => {
        if (!isNativeAndroid()) {
            setBillingError(isAr ? 'الاشتراك متاح داخل تطبيق Android عبر Google Play.' : 'Subscriptions are available in the Android app through Google Play.');
            return false;
        }
        return true;
    };

    const handleSubscribe = async () => {
        setBillingMessage(null);
        setBillingError(null);
        if (!user) {
            await login();
            return;
        }
        if (!requireBillingReady()) return;
        setBillingBusy(true);
        try {
            const purchase = await startPlaySubscriptionPurchase(user);
            if (purchase.cancelled) {
                setBillingMessage(isAr ? 'تم إلغاء عملية الشراء ولم يتم خصم شيء.' : 'Purchase cancelled. Nothing was charged.');
                return;
            }
            if (purchase.pending) {
                setBillingMessage(isAr ? 'الدفع مازال معلّقاً في Google Play. لن يتفعّل Premium حتى يصبح الدفع مكتملًا.' : 'Payment is pending in Google Play. Premium will activate only after payment completes.');
                return;
            }
            if (!purchase.purchaseToken) throw new Error('PURCHASE_TOKEN_MISSING');
            const verified = await verifyPlaySubscription(user, purchase.purchaseToken);
            if (!verified.entitled) {
                setBillingMessage(isAr ? 'تم استلام العملية لكن Google Play لم تعتبر الاشتراك نشطاً بعد.' : 'The purchase was received, but Google Play does not report an active entitlement yet.');
                return;
            }
            if (analytics) logEvent(analytics, 'subscription_verified', { product_id: verified.productId || 'play_subscription' });
            setBillingMessage(isAr ? 'تم التحقق من الاشتراك وتفعيل BASIRA Premium.' : 'Subscription verified. BASIRA Premium is active.');
        } catch (error) {
            console.error('Subscription purchase failed', error);
            const notConfigured = String((error as Error)?.message || error).includes('PLAY_BILLING_NOT_CONFIGURED');
            setBillingError(notConfigured
                ? (isAr ? 'اشتراك Google Play لم يُربط بمنتج فعلي بعد.' : 'The Google Play subscription product is not configured yet.')
                : (isAr ? 'تعذّر إكمال الاشتراك أو التحقق منه. لم يتم منح Premium بدون تحقق Google Play.' : 'Could not complete or verify the subscription. Premium was not granted without Google Play verification.'));
        } finally {
            setBillingBusy(false);
        }
    };

    const handleRestore = async () => {
        setBillingMessage(null);
        setBillingError(null);
        if (!user) {
            await login();
            return;
        }
        if (!requireBillingReady()) return;
        setBillingBusy(true);
        try {
            const { purchases, productId } = await restorePlaySubscriptions();
            const candidates = purchases.filter(purchase => purchase.purchaseToken && purchase.products?.includes(productId));
            if (!candidates.length) {
                setBillingMessage(isAr ? 'لم نجد اشتراكاً نشطاً لهذا الحساب في Google Play.' : 'No subscription for this account was found in Google Play.');
                return;
            }
            for (const purchase of candidates) {
                const verified = await verifyPlaySubscription(user, purchase.purchaseToken!);
                if (verified.entitled) {
                    setBillingMessage(isAr ? 'تم استرجاع الاشتراك وتفعيل Premium.' : 'Subscription restored and Premium activated.');
                    return;
                }
            }
            setBillingMessage(isAr ? 'وجدنا عملية سابقة، لكنها ليست اشتراكاً مستحقاً حالياً.' : 'A previous purchase was found, but it is not currently entitled.');
        } catch (error) {
            console.error('Subscription restore failed', error);
            const notConfigured = String((error as Error)?.message || error).includes('PLAY_BILLING_NOT_CONFIGURED');
            setBillingError(notConfigured
                ? (isAr ? 'اشتراك Google Play لم يُربط بمنتج فعلي بعد.' : 'The Google Play subscription product is not configured yet.')
                : (isAr ? 'تعذّر استرجاع الاشتراك من Google Play.' : 'Could not restore the Google Play subscription.'));
        } finally {
            setBillingBusy(false);
        }
    };

    const displayPrice = offer?.formattedPrice || (isAr ? 'السعر من Google Play' : 'Price from Google Play');
    const formatBillingPeriod = (period?: string) => {
        const labels: Record<string, [string, string]> = {
            P1W: ['أسبوعياً', 'weekly'],
            P4W: ['كل 4 أسابيع', 'every 4 weeks'],
            P1M: ['شهرياً', 'monthly'],
            P2M: ['كل شهرين', 'every 2 months'],
            P3M: ['كل 3 أشهر', 'every 3 months'],
            P4M: ['كل 4 أشهر', 'every 4 months'],
            P6M: ['كل 6 أشهر', 'every 6 months'],
            P8M: ['كل 8 أشهر', 'every 8 months'],
            P1Y: ['سنوياً', 'yearly'],
        };
        if (!period) return isAr ? 'حسب دورة الفوترة المعروضة في Google Play' : 'per the billing period shown by Google Play';
        const label = labels[period];
        return label ? (isAr ? label[0] : label[1]) : period;
    };
    const billingPeriodLabel = formatBillingPeriod(offer?.billingPeriod);
    const autoRenews = Boolean(offer?.pricingPhases?.some(phase => phase.recurrenceMode === 1));
    const manageSubscriptionsUrl = offer?.productId
        ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(offer.productId)}&package=com.basira.spiritportal`
        : 'https://play.google.com/store/account/subscriptions';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 w-full pb-10 min-h-screen">
            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="glass-card p-5 border-stella-border relative overflow-hidden bg-white">
                    <div className="flex items-center gap-2 mb-2"><Gem className="w-4 h-4 text-stella-gold" /><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isAr ? 'غبار نجمي' : 'Stardust'}</span></div>
                    <div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-gray-800 font-mono">{profile?.stardust || 0}</span><span className="text-xs text-stella-gold/70">✨</span></div>
                </div>
                <div className="glass-card p-5 border-stella-border relative overflow-hidden bg-white">
                    <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-stella-amber" /><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isAr ? 'الطاقة' : 'Energy'}</span></div>
                    <div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-gray-800 font-mono">{profile?.energy || 0}</span><span className="text-xs text-gray-400 font-mono">/{profile?.maxEnergy || 50}</span></div>
                </div>
            </div>

            <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div><h3 className="text-gray-800 font-bold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-stella-gold" />{isAr ? 'مستوى الروح' : 'Soul Rank'}</h3><p className="text-xs text-gray-500 mt-1">{isAr ? 'تقدّمك محفوظ مع حسابك' : 'Your progress is saved to your account'}</p></div>
                    <div className="flex items-center gap-1.5 bg-stella-amber/10 border border-stella-amber/20 px-2 py-1 rounded-lg"><Flame className="w-3.5 h-3.5 text-stella-amber" /><span className="text-xs font-bold text-stella-amber">{profile?.streak || 1} {isAr ? 'أيام' : 'Days'}</span></div>
                </div>
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full border-2 border-stella-gold/40 flex items-center justify-center bg-stella-gold/10 shrink-0"><span className="text-lg font-bold text-stella-gold font-mono">{level}</span></div><div className="flex-1"><div className="flex justify-between text-[10px] text-gray-500 mb-1.5 font-mono"><span>{xp} XP</span><span>{nextLevelXp} XP</span></div><div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((xp / nextLevelXp) * 100, 100)}%` }} className="bg-gradient-to-r from-stella-amber to-stella-gold h-full rounded-full" /></div></div></div>
            </div>

            {!isPremium && (
                <motion.button type="button" whileHover={{ scale: 1.01 }} onClick={() => setShowAdModal(true)} className="relative bg-white p-5 rounded-2xl flex items-center justify-between border border-stella-gold/20 shadow-sm text-left">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-stella-gold/10 flex items-center justify-center border border-stella-gold/30"><Play className="w-4 h-4 fill-stella-gold text-stella-gold" /></div><div><h4 className="text-sm font-bold text-stella-gold font-amiri">{isAr ? 'استعادة الطاقة بالإعلان' : 'Restore Energy with an Ad'}</h4><p className="text-xs text-gray-500 mt-0.5">{isAr ? `شاهد الإعلان الكامل لاستعادة +${rewardAmount} طاقة` : `Complete the rewarded ad to restore +${rewardAmount} Energy`}</p></div></div><ArrowRight className={`w-5 h-5 text-stella-gold/50 ${isAr ? 'rotate-180' : ''}`} />
                </motion.button>
            )}

            <div className={`relative overflow-hidden rounded-3xl p-6 border shadow-lg ${isPremium ? 'border-green-300 bg-green-50' : 'border-stella-gold/40 bg-white'}`}>
                <div className="flex items-start gap-4 mb-5"><div className="p-3 rounded-2xl bg-stella-gold/10 border border-stella-gold/30"><Crown className="w-7 h-7 text-stella-gold" /></div><div className="flex-1"><div className="flex items-center gap-2"><h2 className="text-xl font-bold text-gray-800 font-amiri">BASIRA Premium</h2>{isPremium && <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">{isAr ? 'نشط' : 'ACTIVE'}</span>}</div><p className="text-sm font-bold text-stella-gold mt-1">{isPremium ? (isAr ? 'اشتراكك موثّق' : 'Verified subscription') : displayPrice}</p>{offer?.billingPeriod && !isPremium && <p className="text-[11px] text-gray-400 mt-1">{billingPeriodLabel}</p>}</div></div>

                <ul className="space-y-3 text-sm text-gray-600 mb-6">
                    <li className="flex gap-2"><Sparkles className="w-4 h-4 text-stella-gold shrink-0 mt-0.5" />{isAr ? 'قراءات الكف والفنجان بلا استهلاك للقراءات المجانية أو الطاقة' : 'Palm and coffee readings without consuming free slots or Energy'}</li>
                    <li className="flex gap-2"><Sparkles className="w-4 h-4 text-stella-gold shrink-0 mt-0.5" />{isAr ? 'لا تحتاج إعلاناً لفتح القراءة أثناء الاشتراك' : 'No rewarded ad needed to unlock readings while subscribed'}</li>
                    <li className="flex gap-2"><Sparkles className="w-4 h-4 text-stella-gold shrink-0 mt-0.5" />{isAr ? 'الاشتراك والتحقق والاسترجاع عبر Google Play' : 'Purchase, verification and restore through Google Play'}</li>
                </ul>

                {offer && (
                    <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-600">
                        <p className="font-semibold text-gray-700">
                            {autoRenews
                                ? (isAr
                                    ? `${displayPrice}، ${billingPeriodLabel}. يتجدد الاشتراك تلقائياً حتى تقوم بإلغائه.`
                                    : `${displayPrice}, ${billingPeriodLabel}. The subscription renews automatically until you cancel.`)
                                : (isAr
                                    ? `${displayPrice}، ${billingPeriodLabel}. لا يتم التجديد تلقائياً حسب الخطة المعروضة من Google Play.`
                                    : `${displayPrice}, ${billingPeriodLabel}. This plan does not auto-renew according to the Google Play offer.`)}
                        </p>
                        <p className="mt-2">
                            {isAr
                                ? 'BASIRA تعمل أيضاً بدون اشتراك عبر القراءات المجانية وإعلانات المكافأة. يمكنك إدارة أو إلغاء اشتراكك في Google Play.'
                                : 'BASIRA also works without a subscription through free readings and rewarded ads. You can manage or cancel your subscription in Google Play.'}
                        </p>
                    </div>
                )}

                {!isPremium && <button type="button" disabled={billingBusy || !offer} onClick={() => void handleSubscribe()} className="w-full rounded-2xl bg-stella-gold py-4 font-bold text-white shadow-md disabled:opacity-50">{billingBusy ? (isAr ? 'جارٍ التحقق...' : 'Checking...') : !offer ? (isAr ? 'جارٍ تحميل عرض Google Play...' : 'Loading Google Play offer...') : (isAr ? `اشترك عبر Google Play · ${displayPrice}` : `Subscribe with Google Play · ${displayPrice}`)}</button>}
                <button type="button" disabled={billingBusy} onClick={() => void handleRestore()} className="mt-3 w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" />{isAr ? 'استرجاع الاشتراك' : 'Restore subscription'}</button>
                <a href={manageSubscriptionsUrl} target="_blank" rel="noreferrer" className="mt-3 w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-600 flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {isAr ? 'إدارة أو إلغاء الاشتراك في Google Play' : 'Manage or cancel subscription in Google Play'}
                </a>
            </div>

            {billingMessage && <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">{billingMessage}</div>}
            {billingError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{billingError}</div>}

            <CosmicRewardModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onRewardComplete={handleRewardComplete} lang={lang} rewardType="insight" title={isAr ? 'استعادة الطاقة' : 'Restore Energy'} description={isAr ? `شاهد إعلان المكافأة كاملاً لاستعادة ${rewardAmount} طاقة.` : `Complete the rewarded ad to restore ${rewardAmount} Energy.`} />
        </motion.div>
    );
}

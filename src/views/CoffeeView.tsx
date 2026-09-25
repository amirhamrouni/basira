import { recentReadings, rememberReading } from '../utils/readingMemory';
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Coffee, CheckCircle2, Share2, Save } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { getApiUrl } from '../utils/api';
import { Capacitor } from '@capacitor/core';
import { pickNativeReadingImage } from '../utils/readingImagePicker';
import { hasUnlimitedReadings, remainingFreeReadings, saveMeteredReading } from '../utils/freeReadings';
import { compressReadingImage } from '../utils/imageCompression';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import BasiraReadingText from '../components/BasiraReadingText';
import { shareReading } from '../utils/shareResult';
import CosmicRewardModal from '../components/CosmicRewardModal';

export default function CoffeeView({ t, lang, state, setState, basiraContext }: any) {
    const { isScanning, imagePreview, reading, error } = state;
    const fileRef = useRef<HTMLInputElement>(null);
    const { user, profile, login } = useAuth();
    const [showRewardModal, setShowRewardModal] = React.useState(false);
    const [rewardedUnlock, setRewardedUnlock] = React.useState(false);
    const isPremium = hasUnlimitedReadings(profile);
    const freeLeft = remainingFreeReadings(profile, 'coffee');

    const pickPhoto = async (source: 'camera' | 'gallery') => {
        try {
            const image = await pickNativeReadingImage('coffee', source);
            if (image) setState((current: any) => ({ ...current, imagePreview: image, reading: null, error: null, isScanning: false }));
        } catch (cause) {
            console.error('Coffee photo selection failed', cause);
            setState((current: any) => ({ ...current, error: lang === 'ar' ? 'تعذّر فتح صورة الفنجان. حاول بصورة أخرى.' : 'Could not open this cup photo.', isScanning: false }));
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const image = await compressReadingImage(file, 1100, 0.72);
                setState((current: any) => ({ ...current, imagePreview: image, reading: null, error: null, isScanning: false }));
            } catch {
                setState((current: any) => ({ ...current, imagePreview: null, reading: null, error: lang === 'ar' ? 'تعذّر تجهيز الصورة. اختر صورة JPG أو PNG واضحة وحاول مجدداً.' : 'Could not prepare this image. Choose a clear JPG or PNG image.', isScanning: false }));
            } finally {
                e.target.value = '';
            }
        }
    };

    const triggerScan = async () => {
        if (!imagePreview) return;
        if (!user || !profile) { login(); return; }

        const needsRewardedUnlock = !isPremium && freeLeft === 0;
        if (needsRewardedUnlock && !rewardedUnlock) { setShowRewardModal(true); return; }
        const useRewardedUnlock = needsRewardedUnlock && rewardedUnlock;

        setState((current: any) => ({ ...current, isScanning: true, reading: null, error: null }));

        try {
            const res = await fetchWithTimeout(getApiUrl('/api/coffee'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imagePreview,
                    lang,
                    readingId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
                    basiraContext,
                    recentReadings: recentReadings(user.uid)
                })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (data.error === 'NOT_A_CUP' || data.error === 'WRONG_IMAGE_TYPE') {
                    setState((current: any) => ({
                        ...current,
                        reading: null,
                        error: data.reply || (lang === 'ar'
                            ? 'الصورة ليست لداخل فنجان قهوة واضح. صوّر القعر والرواسب بإضاءة جيدة.'
                            : 'This is not a clear view inside a coffee cup with visible grounds.'),
                        isScanning: false
                    }));
                    return;
                }
                throw new Error(data.reply || data.error || `HTTP ${res.status}`);
            }

            if (data.reply && data.reply.trim().startsWith('ERROR_NOT_A_CUP')) {
                setState((current: any) => ({ ...current, reading: null, error: lang === 'ar' ? 'الصورة ليست لداخل فنجان قهوة واضح. صوّر القعر والرواسب بإضاءة جيدة.' : 'This is not a clear view inside a coffee cup with visible grounds.', isScanning: false }));
                return;
            }

            const generatedReading = typeof data.reply === 'string' ? data.reply.trim() : '';
            if (!generatedReading) throw new Error('Empty coffee reading');
            await saveMeteredReading(db, user.uid, 'coffee', generatedReading, { rewardedUnlock: useRewardedUnlock });
            if (useRewardedUnlock) setRewardedUnlock(false);
            setState((current: any) => ({ ...current, reading: generatedReading, error: null, isScanning: false }));
            rememberReading(user.uid, 'coffee', generatedReading);
        } catch (err) {
            console.error('Coffee reading failed', err);
            const message = lang === 'ar' ? 'تعذّر تحليل الفنجان الآن. لم تُحفظ قراءة ولم تُستهلك فتحة الإعلان؛ حاول بنفس الصورة مجدداً.' : 'The cup could not be analyzed. Nothing was saved and the ad unlock was not consumed; please retry.';
            setState((current: any) => ({ ...current, reading: null, error: message, isScanning: false }));
        }
    };

    const handleShare = () => shareReading(lang === 'ar' ? 'قراءتي من بصيرة' : 'My Basira Reading', reading);
    const accessLabel = isPremium
        ? (lang === 'ar' ? 'اشتراك مفتوح' : 'Premium')
        : freeLeft > 0
            ? (lang === 'ar' ? `باقي ${freeLeft} قراءات مجانية من 3` : `${freeLeft} of 3 free readings left`)
            : rewardedUnlock
                ? (lang === 'ar' ? 'القراءة مفتوحة بالإعلان' : 'Ad unlock ready')
                : (lang === 'ar' ? 'القراءة التالية: إعلان أو اشتراك' : 'Next reading: ad or subscription');

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-6 w-full pb-10">
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10"><h2 className="text-4xl font-bold text-amber-500 mb-2 text-center drop-shadow-sm font-amiri tracking-wide">{t.coffeeTitle}</h2></div>
            </div>

            {error && !isScanning && <div role="alert" className="mx-4 rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-center text-sm leading-7 text-red-200">{error}</div>}

            {imagePreview && error && !isScanning && <button type="button" onClick={triggerScan} className="mx-4 rounded-2xl bg-stella-gold px-5 py-4 font-bold text-white shadow-md transition hover:brightness-110">{lang === 'ar' ? 'إعادة المحاولة بنفس الصورة' : 'Retry with this image'}</button>}

            <div className="text-center px-4"><p className="text-gray-600 font-tajawal text-sm mt-3 px-4 max-w-sm mx-auto leading-relaxed">{lang === 'ar' ? 'اشرب القهوة، اقلب الفنجان لثوانٍ، ثم صوّر داخله بوضوح حتى تظهر الرواسب.' : 'Drink your coffee, turn the cup upside down briefly, then take a clear photo of the inside and visible grounds.'}</p></div>

            <div className="bg-white rounded-3xl overflow-hidden mt-2 border border-gray-100 shadow-sm mx-4">
                {!Capacitor.isNativePlatform() && <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleUpload} />}
                {imagePreview ? (
                    <div className="relative w-full aspect-square">
                        <img src={imagePreview} alt="Coffee Cup" className="w-full h-full object-cover" />
                        {!reading && !isScanning && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={triggerScan} className="bg-stella-gold hover:bg-stella-amber text-white font-bold py-3.5 px-8 flex items-center gap-2 rounded-full shadow-md transition-all font-tajawal"><CheckCircle2 className="w-5 h-5" />{t.scanBtn}</motion.button></div>}
                        {isScanning && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md"><motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 border-[5px] border-stella-gold/20 border-t-stella-gold rounded-full mb-6 shadow-sm" /><span className="text-stella-gold font-bold font-amiri text-2xl animate-pulse-slow tracking-widest">{t.readingLoading}</span></div>}
                    </div>
                ) : (
                    <motion.div whileHover={{ scale: 1.05 }} className="text-center p-8 flex flex-col items-center bg-gray-50 border-2 border-dashed border-gray-200 m-4 rounded-2xl">
                        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-5 border-[3px] border-stella-gold/20 cursor-pointer shadow-sm" onClick={() => Capacitor.isNativePlatform() ? void pickPhoto('gallery') : fileRef.current?.click()}><Coffee className="text-stella-gold w-10 h-10" /></motion.div>
                        <span className="text-stella-gold font-bold text-lg">{t.coffeeUpload}</span>
                    </motion.div>
                )}
            </div>

            {Capacitor.isNativePlatform() && <div className="mx-4 flex gap-3"><button type="button" onClick={() => void pickPhoto('gallery')} className="flex-1 rounded-2xl border border-stella-gold/30 py-3 text-stella-gold font-bold">{lang === 'ar' ? 'اختيار صورة' : 'Choose photo'}</button><button type="button" onClick={() => void pickPhoto('camera')} className="flex-1 rounded-2xl border border-stella-gold/30 py-3 text-stella-gold font-bold">{lang === 'ar' ? 'تصوير الفنجان' : 'Take photo'}</button></div>}
            <p className="mx-4 text-center text-xs text-stella-gold">{accessLabel}</p>

            {reading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 border border-gray-100 shadow-sm rounded-3xl mx-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                        <h3 className="text-stella-gold font-bold font-amiri text-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />{lang === 'ar' ? 'ما تكشفه الرواسب' : 'What the cup reveals'}</h3>
                        {user && <div className="flex gap-2 text-stella-amber/60 text-xs items-center"><Save size={14} />{lang === 'ar' ? 'محفوظة' : 'Saved'}</div>}
                    </div>
                    <div className="mb-6"><BasiraReadingText text={reading} /></div>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleShare} className="w-full bg-stella-gold text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-stella-amber transition-colors shadow-sm"><Share2 className="w-5 h-5" />{lang === 'ar' ? 'مشاركة القراءة' : 'Share Reading'}</button>
                        <button onClick={() => setState({ imagePreview: null, reading: null, isScanning: false, error: null })} className="w-full border border-gray-200 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 hover:text-stella-gold transition-colors">{lang === 'ar' ? 'فنجان جديد' : 'Read New Cup'}</button>
                        {imagePreview && <button onClick={() => setState((current: any) => ({ ...current, reading: null, error: null, isScanning: false }))} className="w-full border border-amber-300 text-amber-700 font-bold py-3 rounded-xl hover:bg-amber-50 transition-colors">{lang === 'ar' ? 'إعادة تحليل نفس الصورة' : 'Retry this image'}</button>}
                    </div>
                </motion.div>
            )}
            <CosmicRewardModal
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                onRewardComplete={() => setRewardedUnlock(true)}
                lang={lang}
                rewardType="insight"
                title={lang === 'ar' ? 'انتهت القراءات المجانية' : 'Free readings used'}
                description={lang === 'ar' ? 'شاهد إعلاناً مكافِئاً لفتح قراءة فنجان واحدة، أو استخدم اشتراكاً مفتوحاً.' : 'Watch one rewarded ad to unlock one coffee reading, or use an active subscription.'}
            />
        </motion.div>
    );
}

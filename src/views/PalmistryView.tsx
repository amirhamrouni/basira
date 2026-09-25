import { recentReadings, rememberReading } from '../utils/readingMemory';
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, Share2, Save } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db, analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';
import CosmicRewardModal from '../components/CosmicRewardModal';
import BasiraReadingText from '../components/BasiraReadingText';
import { shareReading } from '../utils/shareResult';
import { getApiUrl } from '../utils/api';
import { compressReadingImage } from '../utils/imageCompression';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { hasUnlimitedReadings, remainingFreeReadings, saveMeteredReading } from '../utils/freeReadings';
import { Capacitor } from '@capacitor/core';
import { pickNativeReadingImage } from '../utils/readingImagePicker';

export default function PalmistryView({ t, adminPrompt, lang, state, setState, basiraContext }: any) {
    const { isScanning, imagePreview, reading, error } = state;
    const fileRef = useRef<HTMLInputElement>(null);
    const { user, profile, login } = useAuth();
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [rewardedUnlock, setRewardedUnlock] = useState(false);
    const isPremium = hasUnlimitedReadings(profile);
    const freeLeft = remainingFreeReadings(profile, 'palmistry');

    const pickPhoto = async (source: 'camera' | 'gallery') => {
        try {
            const image = await pickNativeReadingImage('palmistry', source);
            if (image) setState((current: any) => ({ ...current, imagePreview: image, reading: null, error: null, isScanning: false }));
        } catch (cause) {
            console.error('Palm photo selection failed', cause);
            setState((current: any) => ({ ...current, error: lang === 'ar' ? 'تعذّر فتح الصورة. حاول بصورة أخرى.' : 'Could not open this photo.', isScanning: false }));
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const image = await compressReadingImage(file);
                setState((current: any) => ({ ...current, imagePreview: image, reading: null, error: null, isScanning: false }));
            } catch {
                setState((current: any) => ({ ...current, error: lang === 'ar' ? 'تعذّر تجهيز الصورة. اختر صورة أخرى.' : 'Could not prepare this image.', isScanning: false }));
            } finally {
                e.target.value = '';
            }
        }
    };

    const triggerScan = async () => {
        if (!imagePreview) return;
        if (!user || !profile) {
            login();
            return;
        }

        const needsRewardedUnlock = !isPremium && freeLeft === 0;
        if (needsRewardedUnlock && !rewardedUnlock) {
            setShowRewardModal(true);
            return;
        }
        const useRewardedUnlock = needsRewardedUnlock && rewardedUnlock;

        setState((current: any) => ({ ...current, isScanning: true, reading: null, error: null }));

        try {
            if (analytics) logEvent(analytics, 'ai_reading_started', { type: 'palmistry' });

            const promptInstruction = `First identify whether the image contains a human palm. A clearly visible palm is valid even when some fine lines are faint, cropped or in uneven light. Reject with ERROR_NOT_A_PALM only when no palm is visible or the image is unusable. If valid, produce a BASIRA V2 palm reading in ${lang === 'ar' ? 'clear Modern Standard Arabic' : lang === 'fr' ? 'natural French' : 'natural English'}. Identify only lines, branches, intersections, mounts or proportions that are genuinely visible. Start with up to three strongest actual signals; never invent signals to fill a quota. If details are faint, use only visible cues and state which marks need a clearer photo instead of guessing. Use short bracketed sections: [أقوى 3 إشارات], [ما الذي يقترب], [الحب والعلاقات] when supported, [العمل والمال] when supported, [تنبيه بصيرة], [التوقيت] when appropriate, [سؤال بصيرة]. Separate visible observation from traditional symbolic interpretation without turning the answer into disclaimers. Never claim certainty.`;

            const res = await fetchWithTimeout(getApiUrl('/api/palmistry'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: adminPrompt,
                    prompt: promptInstruction,
                    imageBuffer: imagePreview,
                    lang,
                    readingId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
                    basiraContext,
                    recentReadings: recentReadings(user.uid)
                })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (data.error === 'WRONG_IMAGE_TYPE' || data.reply?.trim() === 'ERROR_NOT_A_PALM') {
                    setState((current: any) => ({ ...current, reading: null, error: data.reply || (lang === 'ar' ? 'هذه ليست صورة واضحة لراحة اليد.' : 'This is not a clear palm photo.'), isScanning: false }));
                    return;
                }
                throw new Error(data.error || `Reading failed (${res.status})`);
            }

            const generatedReading = typeof data.reply === 'string' ? data.reply.trim() : '';
            if (!generatedReading || generatedReading === 'ERROR_NOT_A_PALM') {
                setState((current: any) => ({ ...current, reading: null, error: lang === 'ar' ? 'الصورة غير كافية لقراءة خطوط الكف. التقط صورة أوضح ومباشرة.' : 'The palm lines are not clear enough. Please take a clearer photo.', isScanning: false }));
                return;
            }

            await saveMeteredReading(db, user.uid, 'palmistry', generatedReading, { rewardedUnlock: useRewardedUnlock });
            if (useRewardedUnlock) setRewardedUnlock(false);
            setState((current: any) => ({ ...current, reading: generatedReading, error: null, isScanning: false }));
            rememberReading(user.uid, 'palm', generatedReading);
            if (analytics) logEvent(analytics, 'ai_reading_completed', { type: 'palmistry' });
        } catch (err) {
            console.error('Palmistry reading failed', err);
            setState((current: any) => ({ ...current, reading: null, error: lang === 'ar' ? 'تعذّر إكمال قراءة الكف الآن. لم تُحفظ قراءة ولم تُستهلك فتحة الإعلان؛ حاول بنفس الصورة مجدداً.' : 'The palm reading could not be completed. Nothing was saved and the ad unlock was not consumed; please retry.', isScanning: false }));
            if (analytics) logEvent(analytics, 'ai_reading_failed', { type: 'palmistry' });
        }
    };

    const handleShare = () => shareReading(lang === 'ar' ? 'قراءتي من بصيرة' : 'My Basira Palm Reading', reading);
    const accessLabel = isPremium
        ? (lang === 'ar' ? 'اشتراك مفتوح' : 'Premium')
        : freeLeft > 0
            ? (lang === 'ar' ? `مجانية ${freeLeft}/3` : `Free ${freeLeft}/3`)
            : rewardedUnlock
                ? (lang === 'ar' ? 'مفتوحة بالإعلان' : 'Ad unlock ready')
                : (lang === 'ar' ? 'إعلان أو اشتراك' : 'Ad or subscription');

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center w-full">
            <div className="w-full h-48 -mt-4 mb-6 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wider">{t.palmistry}</h2>
                    <p className="text-gray-700 text-sm text-center w-5/6 leading-relaxed font-tajawal">{lang === 'ar' ? 'صوّر راحة يدك بوضوح. بصيرة تقرأ الخطوط الظاهرة وتربطها برموز قراءة الكف التقليدية.' : 'Photograph your palm clearly. Basira reads visible lines through traditional palmistry symbolism.'}</p>
                </div>
            </div>

            <div className={`w-full max-w-[340px] h-80 rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-700 shadow-md ${imagePreview ? 'border-2 border-stella-gold bg-white' : 'border-[3px] border-dashed border-stella-gold/30 bg-gray-50 hover:bg-stella-gold/5'}`} onClick={() => !isScanning && (Capacitor.isNativePlatform() ? void pickPhoto('gallery') : fileRef.current?.click())}>
                {imagePreview ? (
                    <>
                        <img src={imagePreview} alt="Palm" className="absolute inset-0 w-full h-full object-cover" />
                        {isScanning && <motion.div className="absolute left-0 w-full h-[4px] bg-stella-gold shadow-[0_0_20px_5px_#D4AF37]" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }} />}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    </>
                ) : (
                    <motion.div whileHover={{ scale: 1.05 }} className="text-center p-6 flex flex-col items-center">
                        <motion.div animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 15px rgba(212,175,55,0.1)', '0 0 25px rgba(212,175,55,0.2)', '0 0 15px rgba(212,175,55,0.1)'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-5 border-[3px] border-stella-gold/20 shadow-sm"><Fingerprint className="text-stella-gold w-12 h-12" /></motion.div>
                        <span className="text-stella-gold font-bold text-lg">{t.uploadPalm}</span>
                        <span className="text-[11px] text-gray-500 mt-2 font-tajawal">{lang === 'ar' ? 'اضغط لفتح الكاميرا أو المعرض' : 'Tap to open camera or gallery'}</span>
                    </motion.div>
                )}
                {!Capacitor.isNativePlatform() && <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />}
            </div>

            {Capacitor.isNativePlatform() && <button type="button" onClick={() => void pickPhoto('camera')} className="mt-3 w-full max-w-[340px] rounded-2xl border border-stella-gold/30 py-3 text-stella-gold font-bold">{lang === 'ar' ? 'التقاط صورة للكف' : 'Take a palm photo'}</button>}

            {isScanning && <div className="mt-8 text-stella-gold text-sm font-bold animate-pulse tracking-wider drop-shadow-sm">{t.readingLoading}</div>}
            {error && !isScanning && <div role="alert" className="mt-6 w-full max-w-[340px] rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-center text-sm leading-7 text-red-200">{error}</div>}

            {imagePreview && !reading && !isScanning && <button onClick={triggerScan} className="w-full max-w-[340px] mt-8 bg-stella-gold text-white font-extrabold py-4 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-lg">{t.scanBtn} <span className="text-xs ml-2 opacity-90">{accessLabel}</span></button>}

            {reading && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full mt-8 mb-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3"><CheckCircle2 className="text-green-500 w-6 h-6 shadow-sm rounded-full" /><h3 className="text-stella-gold font-bold text-lg font-amiri drop-shadow-sm">{lang === 'ar' ? 'ما تقوله الخطوط' : 'What the lines reveal'}</h3></div>
                        {user && <div className="flex gap-2 text-green-600 text-xs items-center font-bold"><Save size={16} />{lang === 'ar' ? 'محفوظة' : 'Saved'}</div>}
                    </div>
                    <div className="p-5 bg-white border border-gray-100 shadow-sm relative overflow-hidden mb-8 rounded-[30px]"><div className="absolute top-0 right-0 w-40 h-40 bg-stella-gold/5 rounded-full blur-3xl animate-pulse-slow"></div><div className="relative z-10"><BasiraReadingText text={reading} /></div></div>
                    <div className="w-full mx-auto flex flex-col gap-4">
                        <button onClick={handleShare} className="w-full bg-stella-gold text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-stella-amber transition-all shadow-sm text-lg font-amiri tracking-wide"><Share2 className="w-6 h-6" />{lang === 'ar' ? 'مشاركة القراءة' : 'Share Reading'}</button>
                        <button onClick={() => setState({ imagePreview: null, reading: null, isScanning: false, error: null })} className="w-full text-center border-2 border-stella-gold/30 text-stella-gold bg-transparent font-bold py-4 rounded-xl hover:bg-stella-gold/5 transition-colors text-lg font-amiri tracking-wide">{lang === 'ar' ? 'قراءة كف جديدة' : 'New Palm Reading'}</button>
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
                description={lang === 'ar' ? 'شاهد إعلاناً مكافِئاً لفتح قراءة كف واحدة، أو استخدم اشتراكاً مفتوحاً.' : 'Watch one rewarded ad to unlock one palm reading, or use an active subscription.'}
            />
        </motion.div>
    );
}

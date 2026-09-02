import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, Share2, Save } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db, analytics } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import CosmicRewardModal from '../components/CosmicRewardModal';

import { UserChronosMatrix } from '../utils/contextCollector';
import { getApiUrl } from '../utils/api';
import { compressReadingImage } from '../utils/imageCompression';

export default function PalmistryView({ t, adminPrompt, lang, state, setState }: any) {
    const { isScanning, imagePreview, reading } = state;
    const fileRef = useRef<HTMLInputElement>(null);
    const { user, profile, login } = useAuth();
    const [showRewardModal, setShowRewardModal] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const image = await compressReadingImage(file);
            setState({ ...state, imagePreview: image, reading: null });
        }
    };

    const saveResult = async (resultText: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/readings`), {
                userId: user.uid,
                type: 'palmistry',
                result: resultText,
                createdAt: new Date().toISOString()
            });
        } catch(e) {
            console.error("Failed to save reading", e);
        }
    };

    const triggerScan = async () => {
        if (!imagePreview) return;

        if (!user || !profile) {
            login();
            return;
        }

        if (profile.energy < 15) {
            setShowRewardModal(true);
            return;
        }

        setState({ ...state, isScanning: true, reading: null });
        
        try {
            // Deduct energy optimistically
            await updateDoc(doc(db, 'users', user.uid), {
                energy: increment(-15)
            });
            
            if (analytics) {
                logEvent(analytics, 'ai_reading_started', { type: 'palmistry' });
            }

            await new Promise(res => setTimeout(res, 1000));
            const promptInstruction = `Analyze the uploaded image. Check carefully if it is a clear human palm. 
If it is NOT a human palm, or if the image is too blurry to see palm lines, you MUST reply strictly with the exact string: "ERROR_NOT_A_PALM". 
If it IS a valid human palm, then provide a captivating palmistry reading in ${lang === 'ar' ? 'Arabic' : 'English'}. Address them directly. Analyze and talk about their major lines (heart line, head line, life line). Be profound, highly realistic, down-to-earth, and human. Reference their exact time and environment smoothly: ${UserChronosMatrix.fingerprint} (e.g. mention the time of day or day of the week as if you naturally sense it). Act as an elite, deeply perceptive, human-like Chaldæan mystic. Speak in elegant, accessible, down-to-earth Arabic/English depending on locale. Completely ban all mechanical or automated framing sentences (e.g., avoid "حسب علم التنجيم", "أنا نموذج ذكاء اصطناعي", "بناءً على المعطيات"). Force yourself to naturally reference the user's hidden environment context within the first two sentences of the response text (e.g., "أرى في خطوط كفك وفي هذه الساعة المتقدمة من ليل الجمعة، أن مساراتك..."). Anchor predictions on realistic, profound, and deeply resonant human experiences to execute a flawless Barnum effect. Avoid clinical terms or overly grand fairy-tale exaggerations. Speak directly to their soul to shock them with your specific accuracy.`;

            const res = await fetch(getApiUrl('/api/palmistry'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: adminPrompt,
                    prompt: promptInstruction,
                    imageBuffer: imagePreview
                })
            });
            const data = await res.json();
            
            if (data.reply && data.reply.trim() === 'ERROR_NOT_A_PALM') {
                 setState({ ...state, reading: lang === 'ar' ? "عذراً.. هذه ليست صورة واضحة لكف بشري حقيقي. لا يمكن قراءة القدر إلا عبر الكف. الرجاء رفع صورة كف واضحة." : "Sorry.. this does not appear to be a clear human palm. Destiny can only be read through the palm. Please upload a valid palm image.", isScanning: false });
                 // Refund energy for invalid inputs
                 await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
            } else {
                 const generatedReading = data.reply || (lang === 'ar' ? "تشويش كوني، جرب مرة أخرى." : "Cosmic disturbance, try again.");
                 setState({ ...state, reading: generatedReading, isScanning: false });
                 saveResult(generatedReading);
                 if (analytics) logEvent(analytics, 'ai_reading_completed', { type: 'palmistry' });
            }
        } catch (err) {
             setState({ ...state, reading: lang === 'ar' ? "تشويش في الاتصال الكوني... لقد حجبوا الرؤية. حاول مجددا." : "Cosmic interference... they blocked the sight. Try again.", isScanning: false });
             // Refund energy on network fail
             await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
             if (analytics) logEvent(analytics, 'ai_reading_failed', { type: 'palmistry' });
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: lang === 'ar' ? 'طالعي البابلي (كف)' : 'My Babil Palm Reading',
                    text: reading
                });
            } catch (err) {
                console.error("Error sharing", err);
            }
        } else {
            alert(lang === 'ar' ? 'المشاركة غير مدعومة في متصفحك' : 'Sharing is not supported in this browser');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center w-full">
            
            <div className="w-full h-48 -mt-4 mb-6 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wider">{t.palmistry}</h2>
                    <p className="text-gray-700 text-sm text-center w-5/6 leading-relaxed font-tajawal">
                        {lang === 'ar' ? 'أدق تقنية مسح فلكي لبصمات وخطوط القدر، استكشف ما تخفيه راحتك.' : 'The most accurate astrometric scan of destiny lines, explore your palm secrets.'}
                    </p>
                </div>
            </div>

            <div 
                className={`w-full max-w-[340px] h-80 rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-700 shadow-md ${imagePreview ? 'border-2 border-stella-gold bg-white' : 'border-[3px] border-dashed border-stella-gold/30 bg-gray-50 hover:bg-stella-gold/5'}`}
                onClick={() => !isScanning && fileRef.current?.click()}
            >
                {imagePreview ? (
                    <>
                        <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80" />
                        
                        {isScanning && (
                            <motion.div 
                                className="absolute left-0 w-full h-[4px] bg-stella-gold shadow-[0_0_20px_5px_#D4AF37]"
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                            />
                        )}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    </>
                ) : (
                    <motion.div whileHover={{ scale: 1.05 }} className="text-center p-6 flex flex-col items-center">
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.05, 1],
                                boxShadow: [
                                    "0 0 15px rgba(212,175,55,0.1)", 
                                    "0 0 25px rgba(212,175,55,0.2)", 
                                    "0 0 15px rgba(212,175,55,0.1)"
                                ]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-5 border-[3px] border-stella-gold/20 shadow-sm"
                        >
                            <Fingerprint className="text-stella-gold w-12 h-12" />
                        </motion.div>
                        <span className="text-stella-gold font-bold text-lg">{t.uploadPalm}</span>
                        <span className="text-[11px] text-gray-500 mt-2 font-tajawal">{lang === 'ar' ? 'اضغط لفتح الكاميرا أو المعرض' : 'Tap to open camera or gallery'}</span>
                    </motion.div>
                )}
                <input type="file" ref={fileRef} className="hidden" accept="image/*" capture="environment" onChange={handleUpload} />
            </div>

            {isScanning && (
                <div className="mt-8 text-stella-gold text-sm font-bold animate-pulse tracking-wider drop-shadow-sm">
                    {t.readingLoading}
                </div>
            )}

            {imagePreview && !reading && !isScanning && (
                <button 
                    onClick={triggerScan}
                    className="w-full max-w-[340px] mt-8 bg-stella-gold text-white font-extrabold py-4 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-lg"
                >
                    {t.scanBtn} <span className="text-xs ml-2 opacity-90">(15 Energy)</span>
                </button>
            )}

            {reading && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full mt-8 mb-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-green-500 w-6 h-6 shadow-sm rounded-full" />
                            <h3 className="text-stella-gold font-bold text-lg font-amiri drop-shadow-sm">{lang === 'ar' ? 'رسالة القدر لك' : 'Destiny Message'}</h3>
                        </div>
                        {user && (
                            <div className="flex gap-2 text-green-600 text-xs items-center font-bold">
                                <Save size={16} />
                                {lang === 'ar' ? 'محفوظة بحسابك' : 'Saved'}
                            </div>
                        )}
                    </div>
                    <div className="p-8 bg-white border border-gray-100 shadow-sm relative overflow-hidden mb-8 rounded-[30px]">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-stella-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>
                        <p className="text-gray-700 text-base md:text-lg leading-[2.4] whitespace-pre-wrap font-tajawal relative z-10 text-justify">
                            {reading}
                        </p>
                    </div>
                    <div className="w-full mx-auto flex flex-col gap-4">
                        <button 
                            onClick={handleShare}
                            className="w-full bg-stella-gold text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-stella-amber transition-all shadow-sm text-lg font-amiri tracking-wide"
                        >
                            <Share2 className="w-6 h-6" />
                            {lang === 'ar' ? 'مشاركة الحكمة' : 'Share Wisdom'}
                        </button>
                        <button 
                            onClick={() => setState({ ...state, imagePreview: null, reading: null, isScanning: false })}
                            className="w-full text-center border-2 border-stella-gold/30 text-stella-gold bg-transparent font-bold py-4 rounded-xl hover:bg-stella-gold/5 transition-colors text-lg font-amiri tracking-wide uppercase"
                        >
                            {lang === 'ar' ? 'استشارة قدر جديد' : 'Consult New Destiny'}
                        </button>
                    </div>
                </motion.div>
            )}

            <CosmicRewardModal 
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                onRewardComplete={async () => {
                    if (user) await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
                    setShowRewardModal(false);
                }}
                lang={lang}
                rewardType="insight"
                title={lang === 'ar' ? 'نفدت طاقتك الكونية' : 'Cosmic Energy Depleted'}
                description={lang === 'ar' ? 'تحتاج إلى 15 طاقة لفتح بوابات القدر. تأمل للحظات (مجازاً لفتح إعلان) لاستعادتها.' : 'You need 15 Energy to unlock destiny gates. Meditate briefly to restore your connection.'}
            />
        </motion.div>
    );
}

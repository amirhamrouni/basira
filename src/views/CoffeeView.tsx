import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Coffee, CheckCircle2, Share2, Save } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { UserChronosMatrix } from '../utils/contextCollector';
import { getApiUrl } from '../utils/api';
import { compressReadingImage } from '../utils/imageCompression';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export default function CoffeeView({ t, lang, state, setState }: any) {
    const { isScanning, imagePreview, reading } = state;
    const fileRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const image = await compressReadingImage(file, 1100, 0.72);
                setState({ ...state, imagePreview: image, reading: null, isScanning: false });
            } catch {
                setState({ ...state, imagePreview: null, reading: lang === 'ar' ? 'تعذّر تجهيز الصورة. اختر صورة JPG أو PNG واضحة وحاول مجدداً.' : 'Could not prepare this image. Choose a clear JPG or PNG image.', isScanning: false });
            } finally {
                e.target.value = '';
            }
        }
    };

    const saveResult = async (resultText: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/readings`), {
                userId: user.uid,
                type: 'coffee',
                result: resultText,
                createdAt: new Date().toISOString()
            });
        } catch(e) {
            console.error("Failed to save reading", e);
        }
    };

    const triggerScan = async () => {
        if (!imagePreview) return;
        setState({ ...state, isScanning: true, reading: null });
        
        try {
            const res = await fetchWithTimeout(getApiUrl('/api/coffee'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imagePreview,
                    lang,
                    deviceData: UserChronosMatrix.fingerprint,
                    readingId: crypto.randomUUID()
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.reply || data.error || `HTTP ${res.status}`);
            }
            
            if (data.reply && data.reply.trim() === 'ERROR_NOT_A_CUP') {
                 setState({ ...state, reading: lang === 'ar' ? "عذراً.. هذه الصورة لا تبدو كفنجان قهوة من الداخل. لا يمكن قراءة الطالع إلا بصورة واضحة لقعر الفنجان." : "Sorry.. this does not appear to be the inside of a coffee cup. The reading requires a clear picture of coffee grounds.", isScanning: false });
            } else {
                 const generatedReading = data.reply || (lang === 'ar' ? "تشويش كوني، جرب مرة أخرى." : "Cosmic disturbance, try again.");
                 setState({ ...state, reading: generatedReading, isScanning: false });
                 saveResult(generatedReading);
            }
        } catch (err) {
             const reason = err instanceof Error ? err.message : '';
             const message = reason && !reason.startsWith('HTTP')
                ? reason
                : (lang === 'ar' ? 'تعذّر تحليل الفنجان الآن. تحقق من الاتصال ثم اضغط إعادة المحاولة.' : 'The cup could not be analyzed. Check your connection and retry.');
             setState({ ...state, reading: message, isScanning: false });
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: lang === 'ar' ? 'طالعي في أبراج بابل' : 'My Babil Astrology Reading',
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
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-6 w-full pb-10">
            
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10">
                    <h2 className="text-4xl font-bold text-amber-500 mb-2 text-center drop-shadow-sm font-amiri tracking-wide">
                        {t.coffeeTitle}
                    </h2>
                </div>
            </div>

            <div className="text-center px-4">
                <p className="text-gray-600 font-tajawal text-sm mt-3 px-4 max-w-sm mx-auto leading-relaxed">
                    {lang === 'ar' ? 'قم بشرب فنجان القهوة، اقلبه لثوانٍ، ثم التقط صورة واضحة ومشرقة لداخله لتكشف الأسرار.' : 'Drink your coffee, turn the cup upside down for a few seconds, then take a clear picture of the inside to reveal its secrets.'}
                </p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden mt-2 border border-gray-100 shadow-sm mx-4">
                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    ref={fileRef}
                    onChange={handleUpload}
                />
                
                {imagePreview ? (
                    <div className="relative w-full aspect-square">
                        <img src={imagePreview} alt="Coffee Cup" className="w-full h-full object-cover" />
                        {!reading && !isScanning && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={triggerScan}
                                    className="bg-stella-gold hover:bg-stella-amber text-white font-bold py-3.5 px-8 flex items-center gap-2 rounded-full shadow-md transition-all font-tajawal"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t.scanBtn}
                                </motion.button>
                            </div>
                        )}
                        {isScanning && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="w-20 h-20 border-[5px] border-stella-gold/20 border-t-stella-gold rounded-full mb-6 shadow-sm"
                                />
                                <span className="text-stella-gold font-bold font-amiri text-2xl animate-pulse-slow tracking-widest">{t.readingLoading}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <motion.div whileHover={{ scale: 1.05 }} className="text-center p-8 flex flex-col items-center bg-gray-50 border-2 border-dashed border-gray-200 m-4 rounded-2xl">
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.05, 1],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-5 border-[3px] border-stella-gold/20 cursor-pointer shadow-sm"
                            onClick={() => fileRef.current?.click()}
                        >
                            <Coffee className="text-stella-gold w-10 h-10" />
                        </motion.div>
                        <span className="text-stella-gold font-bold text-lg">{t.coffeeUpload}</span>
                    </motion.div>
                )}
            </div>

            {reading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 border border-gray-100 shadow-sm rounded-3xl mx-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                        <h3 className="text-stella-gold font-bold font-amiri text-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {lang === 'ar' ? 'أسرار الفنجان تكشف لك:' : 'The cup secrets reveal:'}
                        </h3>
                        {user && (
                            <div className="flex gap-2 text-stella-amber/60 text-xs items-center">
                                <Save size={14} />
                                {lang === 'ar' ? 'تم الحفظ التلقائي' : 'Saved to profile'}
                            </div>
                        )}
                    </div>
                    <div className="text-gray-700 leading-relaxed font-tajawal text-sm md:text-base whitespace-pre-wrap mb-6">
                        {reading}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleShare}
                            className="w-full bg-stella-gold text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-stella-amber transition-colors shadow-sm"
                        >
                            <Share2 className="w-5 h-5" />
                            {lang === 'ar' ? 'مشاركة الحكمة' : 'Share Wisdom'}
                        </button>
                        <button 
                            onClick={() => setState({ ...state, imagePreview: null, reading: null, isScanning: false })}
                            className="w-full border border-gray-200 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 hover:text-stella-gold transition-colors"
                        >
                            {lang === 'ar' ? 'قراءة فنجان جديد' : 'Read New Cup'}
                        </button>
                        {imagePreview && <button onClick={() => setState({ ...state, reading: null, isScanning: false })} className="w-full border border-amber-300 text-amber-700 font-bold py-3 rounded-xl hover:bg-amber-50 transition-colors">{lang === 'ar' ? 'إعادة تحليل نفس الصورة' : 'Retry this image'}</button>}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, Sparkles, Loader } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getApiUrl } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { compressReadingImage } from '../utils/imageCompression';

export default function FaceView({ t, adminPrompt, lang, state, setState }: any) {
    const { imagePreview, reading, isScanning, error } = state;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const image = await compressReadingImage(file);
                setState((current: any) => ({ ...current, imagePreview: image, reading: null, error: null }));
                await analyzeFace(image);
            } catch {
                setState((current: any) => ({ ...current, isScanning: false, error: lang === 'ar' ? 'تعذّر تجهيز الصورة. اختر صورة أخرى.' : 'Could not prepare this image.' }));
            } finally {
                e.target.value = '';
            }
        }
    };

    const { user } = useAuth();

    const saveResult = async (resultText: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/readings`), {
                userId: user.uid,
                type: 'face',
                result: resultText,
                createdAt: new Date().toISOString()
            });
        } catch(e) {
            console.error("Failed to save reading", e);
        }
    };

    const analyzeFace = async (image: string) => {
        setState((current: any) => ({ ...current, imagePreview: image, isScanning: true, reading: null, error: null }));
        try {
            const response = await fetchWithTimeout(getApiUrl('/api/face'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    prompt: adminPrompt,
                    lang,
                    readingId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
                })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data.error === 'WRONG_IMAGE_TYPE') {
                    setState((current: any) => ({ ...current, isScanning: false, reading: null, error: data.reply || (lang === 'ar' ? 'هذه ليست صورة وجه واضحة.' : 'This is not a clear face photo.') }));
                    return;
                }
                throw new Error(data.error || `Reading failed (${response.status})`);
            }
            if (!data.reply) throw new Error('Reading failed');
            const result = data.reply as string;
            setState((current: any) => ({ ...current, isScanning: false, reading: result, error: null }));
            await saveResult(result);
        } catch (cause) {
            console.error('Face reading failed', cause);
            setState((current: any) => ({ ...current, isScanning: false, reading: null, error: lang === 'ar' ? 'تعذّر تحليل الصورة الآن. لم تُحفظ قراءة ولم يُخصم شيء؛ حاول مجدداً.' : lang === 'fr' ? "L’analyse a échoué. Rien n’a été enregistré; réessayez." : 'The analysis failed. Nothing was saved; please retry.' }));
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-6 w-full pb-8">
            
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618032773229-8738df59f3fc?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-85"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wide">
                        {t.faceTitle}
                    </h2>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 text-center">
                    {error}
                </div>
            )}

            <div className="glass-surface p-8 border-stella-border bg-white shadow-sm relative overflow-hidden rounded-[30px] mx-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stella-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>
                {!imagePreview ? (
                    <div className="w-full flex flex-col items-center gap-6 py-6 relative z-10">
                        <div className="w-28 h-28 rounded-full bg-gray-50 border-2 border-stella-border flex items-center justify-center shadow-sm">
                            <span className="text-5xl">🎭</span>
                        </div>
                        <p className="text-sm font-tajawal text-gray-600 px-4 text-center leading-relaxed">
                            {t.faceDesc}
                        </p>

                        <div className="flex gap-4 w-full mt-4">
                            <label className="flex-1 bg-stella-gold/10 border border-stella-gold/30 py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-stella-gold/20 transition-colors shadow-sm">
                                <Camera className="w-5 h-5 text-stella-gold" /> <span className="font-cairo font-bold text-stella-gold tracking-wide">{t.capture}</span>
                                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleImageUpload} />
                            </label>
                            
                            <label className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                <ImageIcon className="w-5 h-5" /> <span className="font-cairo font-bold tracking-wide">{t.gallery}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="w-full relative z-10 flex flex-col items-center py-4">
                        <div className="relative">
                            <img src={imagePreview} alt="User Face" className="w-[200px] h-[200px] object-cover rounded-full border-[3px] border-stella-gold/50 shadow-md" />
                            {isScanning && (
                                <div className="absolute inset-0 bg-white/95 rounded-full flex flex-col items-center justify-center w-full h-full border-2 border-stella-gold/50 backdrop-blur-sm">
                                    <Loader className="w-10 h-10 text-stella-gold animate-spin mb-3" />
                                    <span className="text-sm text-stella-gold font-tajawal animate-pulse tracking-widest">{t.faceScan}</span>
                                </div>
                            )}
                        </div>
                        <button 
                            type="button"
                            onClick={() => setState({ imagePreview: null, reading: null, isScanning: false, error: null })}
                            className="mt-6 text-sm text-stella-gold/70 font-tajawal hover:text-stella-gold transition-colors font-bold tracking-wide"
                        >
                            {t.retake}
                        </button>
                    </div>
                )}
            </div>

            {reading && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="glass-card p-8 bg-white border border-gray-100 shadow-sm rounded-[30px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-stella-amber/5 rounded-full blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-5 relative z-10">
                        <Sparkles className="w-6 h-6 text-stella-gold" />
                        <h3 className="font-bold text-stella-gold font-amiri text-lg tracking-wide">{t.faceResultTitle}</h3>
                    </div>
                    <p className="text-gray-700 font-tajawal leading-[2.4] text-base md:text-lg relative z-10 text-justify">
                        {reading}
                    </p>
                </motion.div>
            )}

            {imagePreview && error && !isScanning && (
                <button
                    type="button"
                    onClick={() => analyzeFace(imagePreview)}
                    className="w-full rounded-2xl bg-stella-gold px-5 py-4 font-bold text-white shadow-md transition hover:brightness-110"
                >
                    {lang === 'ar' ? 'إعادة المحاولة بنفس الصورة' : lang === 'fr' ? 'Réessayer avec cette image' : 'Retry with this image'}
                </button>
            )}
        </motion.div>
    );
}

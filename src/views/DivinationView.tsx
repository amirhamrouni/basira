import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Scroll } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';
import CosmicRewardModal from '../components/CosmicRewardModal';
import { UserChronosMatrix } from '../utils/contextCollector';
import { getApiUrl } from '../utils/api';

export default function DivinationView({ t, adminPrompt, lang, state, setState }: any) {
    const { name, motherName, reading, isLoading } = state;
    const { user, profile, login } = useAuth();
    const [showRewardModal, setShowRewardModal] = React.useState(false);

    const generateReading = async () => {
        if (!user || !profile) {
            login();
            return;
        }

        if (profile.energy < 15) {
            setShowRewardModal(true);
            return;
        }

        if (!name.trim() || !motherName.trim()) {
            alert(lang === 'ar' ? 'يرجى إدخال اسمك واسم الوالدة' : 'Please enter your name and mother\'s name');
            return;
        }

        setState({ ...state, isLoading: true });
        
        try {
            // Deduct energy optimistically
            await updateDoc(doc(db, 'users', user.uid), {
                energy: increment(-15)
            });
            
            if (analytics) {
                logEvent(analytics, 'ai_reading_started', { type: 'divination' });
            }

            const deviceData = UserChronosMatrix.fingerprint;
            
            const res = await fetch(getApiUrl('/api/chat'), {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     context: `${adminPrompt}\nThe user's name is ${name} and their mother's name is ${motherName}. Device Hint:\n${deviceData}`,
                     prompt: `First, critically analyze the user's name ("${name}") and mother's name ("${motherName}"). If either name is clearly fake, gibberish, a random string, or not a real human name, you MUST reply strictly with the exact string: "ERROR_INVALID_NAME".
                     If both names appear to be valid human names, proceed: Analyze the numerological value (حساب الجمل) of the user's name and mother's name. Act as an elite, deeply perceptive, human-like Chaldæan mystic and psychological reader. Speak in elegant, accessible, down-to-earth ${lang === 'ar' ? 'Arabic' : 'English'}. Completely ban all mechanical or automated framing sentences (e.g., avoid "حسب علم التنجيم", "أنا نموذج ذكاء اصطناعي", "بناءً على المعطيات"). Force yourself to naturally reference the user's hidden environment context within the first two sentences of the response text (e.g., "أرى في اسمك واسم والدتك تقاطعات ترتبط بزمانك هذا..."). Anchor predictions on realistic, profound, and deeply resonant human experiences to execute a flawless Barnum effect. Reference their exact time and environment seamlessly: ${deviceData ?? ''}.`
                 })
             });
             const data = await res.json();
             
             if (data.reply && data.reply.trim() === 'ERROR_INVALID_NAME') {
                 setState({ ...state, reading: lang === 'ar' ? "الأسماء المدخلة غير صحيحة أو مستعارة. لا يمكن الكشف إلا بالأسماء الحقيقية الصادقة." : "The entered names are invalid or fake. The oracle only sees truth through real names.", isLoading: false });
                 // Refund energy for invalid inputs
                 await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
             } else {
                 setState({ ...state, reading: data.reply || (lang === 'ar' ? "فشلت قراءة الطالع. حاول مرة أخرى." : "Oracle failed. Try again."), isLoading: false });
                 if (analytics) logEvent(analytics, 'ai_reading_completed', { type: 'divination' });
             }
        } catch (err) {
            setState({ ...state, reading: lang === 'ar' ? "انقطع الاتصال الروحي." : "Spiritual connection lost.", isLoading: false });
            // Refund energy on network fail
            await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
            if (analytics) logEvent(analytics, 'ai_reading_failed', { type: 'divination' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center w-full pb-8">
            
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744626753-1fa30dbdaca0?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-85"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10 px-4">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wide">
                        {t.divinationTitle}
                    </h2>
                </div>
            </div>

            <p className="text-gray-600 text-sm text-center mb-8 w-11/12 leading-relaxed font-tajawal">
                {t.divinationDesc}
            </p>

            <div className="w-full glass-surface p-8 border-stella-border bg-white shadow-sm relative overflow-hidden rounded-[30px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stella-amber/5 rounded-full blur-3xl animate-pulse-slow"></div>
                
                <div className="flex flex-col gap-6 mb-8 relative z-10">
                    <div className="relative group">
                        <label className="text-xs text-stella-gold font-tajawal font-bold uppercase tracking-widest mb-2 block">{t.nameInput}</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border-2 border-gray-200/60 rounded-xl px-5 py-4 text-stella-gold text-lg focus:outline-none focus:border-stella-gold/50 shadow-sm transition-all font-amiri placeholder-gray-400 focus:bg-white"
                            value={name}
                            onChange={(e) => setState({ ...state, name: e.target.value })}
                            placeholder={lang === 'ar' ? 'أدخل اسمك هنا...' : 'Enter your name...'}
                        />
                    </div>
                    
                    <div className="relative group">
                        <label className="text-xs text-stella-gold font-tajawal font-bold uppercase tracking-widest mb-2 block">{t.motherNameInput}</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border-2 border-gray-200/60 rounded-xl px-5 py-4 text-stella-gold text-lg focus:outline-none focus:border-stella-gold/50 shadow-sm transition-all font-amiri placeholder-gray-400 focus:bg-white"
                            value={motherName}
                            onChange={(e) => setState({ ...state, motherName: e.target.value })}
                            placeholder={lang === 'ar' ? 'اسم الوالدة...' : 'Mother\'s name...'}
                        />
                    </div>
                </div>

                {!reading && !isLoading && (
                    <button 
                        onClick={generateReading}
                        className="w-full flex items-center justify-center gap-3 bg-stella-gold text-white font-bold py-5 rounded-xl shadow-md hover:bg-stella-amber hover:scale-[1.02] transition-all text-lg font-amiri tracking-wide"
                    >
                        <Eye className="w-6 h-6 text-white" />
                        {t.divineBtn} <span className="text-xs ml-2 opacity-70">(15 Energy)</span>
                    </button>
                )}

                {isLoading && (
                    <div className="text-center py-6">
                        <div className="text-stella-amber font-bold text-lg font-amiri animate-pulse-slow tracking-wider">
                            {t.readingLoading}
                        </div>
                    </div>
                )}
            </div>

            {reading && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full mt-8">
                    <div className="flex items-center gap-3 mb-4 px-2 justify-center">
                        <Scroll className="text-stella-gold w-6 h-6" />
                        <h3 className="text-stella-gold font-bold text-lg font-amiri">{lang === 'ar' ? 'صك الطالع والحكم الكوني' : 'The Cosmic Decree'}</h3>
                    </div>
                    <div className="glass-card p-8 bg-white border border-gray-100 shadow-sm relative overflow-hidden rounded-[30px]">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-stella-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-stella-amber/5 rounded-full blur-3xl"></div>
                        <p className="text-gray-700 text-base md:text-lg leading-[2.4] whitespace-pre-wrap font-tajawal relative z-10 text-justify">
                            {reading}
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => { setState({ name: '', motherName: '', reading: null, isLoading: false }); }}
                        className="w-full mt-8 border-2 border-stella-gold/30 text-stella-gold font-bold py-4 rounded-xl hover:bg-stella-gold/5 transition-all text-lg font-amiri tracking-wide"
                    >
                        {lang === 'ar' ? 'استشارة روح أخرى' : 'Consult Another Spirit'}
                    </button>
                </motion.div>
            )}

            <CosmicRewardModal 
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                onRewardComplete={async () => {
                    if (user) {
                        await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) });
                    }
                    setShowRewardModal(false);
                }}
                lang={lang}
                rewardType="insight"
                title={lang === 'ar' ? 'نفدت طاقتك الكونية' : 'Cosmic Energy Depleted'}
                description={lang === 'ar' ? 'تحتاج إلى 15 طاقة. تأمل للحظات (مجازاً لفتح إعلان) لاستعادتها.' : 'You need 15 Energy. Meditate briefly to restore your connection.'}
            />
        </motion.div>
    );
}

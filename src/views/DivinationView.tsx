import { recentReadings, rememberReading } from '../utils/readingMemory';
import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Scroll, Send } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';
import CosmicRewardModal from '../components/CosmicRewardModal';
import BasiraReadingText from '../components/BasiraReadingText';
import { getApiUrl } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export default function DivinationView({ t, adminPrompt, lang, state, setState }: any) {
    const { name, motherName, reading, isLoading } = state;
    const { user, profile, login } = useAuth();
    const [showRewardModal, setShowRewardModal] = React.useState(false);
    const [followUp, setFollowUp] = React.useState('');
    const [followUpReply, setFollowUpReply] = React.useState('');
    const [followUpLoading, setFollowUpLoading] = React.useState(false);

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

        setState({ ...state, isLoading: true, reading: null });
        setFollowUp('');
        setFollowUpReply('');

        try {
            if (analytics) logEvent(analytics, 'ai_reading_started', { type: 'divination' });

            const basiraContext = profile?.basiraContext || null;
            const contextJson = basiraContext ? JSON.stringify(basiraContext) : 'none';

            const res = await fetchWithTimeout(getApiUrl('/api/divination'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    motherName,
                    lang,
                    basiraContext,
                    recentReadings: recentReadings(user.uid),
                    context: `${adminPrompt}\nPROFILE CONTEXT: ${contextJson}`,
                    prompt: `Validate that both values look like plausible human names. If either is clearly gibberish, reply exactly ERROR_INVALID_NAME. Otherwise create a BASIRA V2 symbolic name/numerology reading. Use حساب الجمل / traditional name symbolism only as symbolic entertainment, not as scientific fact. Start with the strongest pattern from the two names, then use short sections: [أقوى 3 إشارات], [ما الذي يقترب], [الحب والعلاقات] when relevant, [العمل والمال] when relevant, [تنبيه بصيرة], [التوقيت] when appropriate, [سؤال بصيرة]. Tie claims to the actual names or supplied profile context. Do not invent hidden facts, do not claim certainty, and do not repeat disclaimers inside the reading. Write in ${lang === 'ar' ? 'clear Modern Standard Arabic' : lang === 'fr' ? 'natural French' : 'natural English'}.`
                })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok && data.error !== 'INVALID_NAME') throw new Error(data.error || `HTTP ${res.status}`);

            if (data.error === 'INVALID_NAME' || (data.reply && data.reply.trim() === 'ERROR_INVALID_NAME')) {
                setState({ ...state, reading: lang === 'ar' ? 'الأسماء المدخلة غير واضحة كأسماء حقيقية. راجعها وحاول من جديد.' : 'The entered names do not look like valid human names. Please check them and try again.', isLoading: false });
            } else {
                if (!data.reply || typeof data.reply !== 'string') throw new Error('Empty divination reading');
                await updateDoc(doc(db, 'users', user.uid), { energy: increment(-15) });
                rememberReading(user.uid, 'divination', data.reply.trim());
                setState({ ...state, reading: data.reply.trim(), isLoading: false });
                if (analytics) logEvent(analytics, 'ai_reading_completed', { type: 'divination' });
            }
        } catch (err) {
            setState({ ...state, reading: lang === 'ar' ? 'انقطع الاتصال أثناء القراءة.' : 'Connection lost during the reading.', isLoading: false });
            if (analytics) logEvent(analytics, 'ai_reading_failed', { type: 'divination' });
        }
    };

    const submitFollowUp = async () => {
        if (!reading || !followUp.trim() || followUpLoading) return;
        setFollowUpLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lang,
                    basiraContext: profile?.basiraContext || null,
                    previousReading: reading,
                    followUp: followUp.trim(),
                    recentReadings: recentReadings(user?.uid),
                    prompt: `Previous BASIRA reading:\n${reading}\n\nUser follow-up answer/question:\n${followUp.trim()}\n\nGive a deeper second-layer reading. Do not repeat the first reading. Resolve the user's answer against the strongest earlier signals, add one new concrete symbolic interpretation, one caution, and end with one sharper question. Keep it concise and readable.`,
                    context: `PROFILE CONTEXT: ${profile?.basiraContext ? JSON.stringify(profile.basiraContext) : 'none'}`
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setFollowUpReply(data.reply || (lang === 'ar' ? 'تعذّر تعميق القراءة الآن.' : 'Could not deepen the reading right now.'));
        } catch {
            setFollowUpReply(lang === 'ar' ? 'تعذّر تعميق القراءة الآن.' : 'Could not deepen the reading right now.');
        } finally {
            setFollowUpLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center w-full pb-8">
            <div className="w-full h-48 -mt-4 mb-2 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744626753-1fa30dbdaca0?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-85"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10 px-4">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wide">{t.divinationTitle}</h2>
                </div>
            </div>

            <p className="text-gray-600 text-sm text-center mb-8 w-11/12 leading-relaxed font-tajawal">{t.divinationDesc}</p>

            <div className="w-full glass-surface p-8 border-stella-border bg-white shadow-sm relative overflow-hidden rounded-[30px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stella-amber/5 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="flex flex-col gap-6 mb-8 relative z-10">
                    <div className="relative group">
                        <label className="text-xs text-stella-gold font-tajawal font-bold uppercase tracking-widest mb-2 block">{t.nameInput}</label>
                        <input type="text" className="w-full bg-gray-50 border-2 border-gray-200/60 rounded-xl px-5 py-4 text-stella-gold text-lg focus:outline-none focus:border-stella-gold/50 shadow-sm transition-all font-amiri placeholder-gray-400 focus:bg-white" value={name} onChange={(e) => setState({ ...state, name: e.target.value })} placeholder={lang === 'ar' ? 'أدخل اسمك هنا...' : 'Enter your name...'} />
                    </div>
                    <div className="relative group">
                        <label className="text-xs text-stella-gold font-tajawal font-bold uppercase tracking-widest mb-2 block">{t.motherNameInput}</label>
                        <input type="text" className="w-full bg-gray-50 border-2 border-gray-200/60 rounded-xl px-5 py-4 text-stella-gold text-lg focus:outline-none focus:border-stella-gold/50 shadow-sm transition-all font-amiri placeholder-gray-400 focus:bg-white" value={motherName} onChange={(e) => setState({ ...state, motherName: e.target.value })} placeholder={lang === 'ar' ? 'اسم الوالدة...' : 'Mother\'s name...'} />
                    </div>
                </div>

                {!reading && !isLoading && (
                    <button onClick={generateReading} className="w-full flex items-center justify-center gap-3 bg-stella-gold text-white font-bold py-5 rounded-xl shadow-md hover:bg-stella-amber hover:scale-[1.02] transition-all text-lg font-amiri tracking-wide">
                        <Eye className="w-6 h-6 text-white" />{t.divineBtn} <span className="text-xs ml-2 opacity-70">(15 Energy)</span>
                    </button>
                )}

                {isLoading && <div className="text-center py-6"><div className="text-stella-amber font-bold text-lg font-amiri animate-pulse-slow tracking-wider">{t.readingLoading}</div></div>}
            </div>

            {reading && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full mt-8">
                    <div className="flex items-center gap-3 mb-4 px-2 justify-center">
                        <Scroll className="text-stella-gold w-6 h-6" />
                        <h3 className="text-stella-gold font-bold text-lg font-amiri">{lang === 'ar' ? 'قراءة بصيرة' : 'Basira Reading'}</h3>
                    </div>
                    <div className="glass-card p-4 bg-white border border-gray-100 shadow-sm relative overflow-hidden rounded-[30px]">
                        <BasiraReadingText text={reading} />
                    </div>

                    <div className="mt-5 rounded-3xl border border-stella-gold/20 bg-white p-5 shadow-sm">
                        <h4 className="font-amiri text-lg font-bold text-stella-gold mb-3">{lang === 'ar' ? 'عمّق القراءة' : 'Deepen the reading'}</h4>
                        <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={3} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-700 outline-none focus:border-stella-gold/50" placeholder={lang === 'ar' ? 'أجب عن سؤال بصيرة أو اكتب ما تريد فهمه أكثر...' : 'Answer Basira’s question or ask what you want to explore further...'} />
                        <button onClick={submitFollowUp} disabled={!followUp.trim() || followUpLoading} className="mt-3 w-full rounded-xl bg-stella-gold py-3.5 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                            <Send size={18} />{followUpLoading ? '...' : (lang === 'ar' ? 'قراءة أعمق' : 'Go deeper')}
                        </button>
                        {followUpReply && <div className="mt-4"><BasiraReadingText text={followUpReply} /></div>}
                    </div>

                    <button onClick={() => { setState({ name: '', motherName: '', reading: null, isLoading: false }); setFollowUp(''); setFollowUpReply(''); }} className="w-full mt-8 border-2 border-stella-gold/30 text-stella-gold font-bold py-4 rounded-xl hover:bg-stella-gold/5 transition-all text-lg font-amiri tracking-wide">
                        {lang === 'ar' ? 'قراءة جديدة' : 'New Reading'}
                    </button>
                </motion.div>
            )}

            <CosmicRewardModal isOpen={showRewardModal} onClose={() => setShowRewardModal(false)} onRewardComplete={async () => { if (user) await updateDoc(doc(db, 'users', user.uid), { energy: increment(15) }); setShowRewardModal(false); }} lang={lang} rewardType="insight" title={lang === 'ar' ? 'نفدت طاقتك الكونية' : 'Cosmic Energy Depleted'} description={lang === 'ar' ? 'تحتاج إلى 15 طاقة. أكمل خطوة الاستعادة للمتابعة.' : 'You need 15 Energy. Complete the recovery step to continue.'} />
        </motion.div>
    );
}

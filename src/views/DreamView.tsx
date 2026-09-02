import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, MoonStar, Send, Sparkles } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export default function DreamView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const [dream, setDream] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const analyze = async () => {
        if (dream.trim().length < 15) return;
        setLoading(true);
        setResult(null);
        try {
            const response = await fetchWithTimeout(getApiUrl('/api/dream'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: dream, lang })
            });
            const data = await response.json();
            if (!data.reply) throw new Error('Empty dream analysis');
            setResult(data.reply);
        } catch {
            setResult(lang === 'ar'
                ? 'تعذّر التحليل الآن. احتفظ بوصف الحلم وحاول مجدداً.'
                : 'Analysis is temporarily unavailable. Save the dream and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
            <section className="oracle-frame rounded-[28px] p-7 text-white min-h-[300px]">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
                <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full border border-[#d7ad58]/25">
                    <div className="absolute inset-5 rounded-full border border-[#d7ad58]/10" />
                    <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff3c2,#d2a64f_45%,#4b315a_72%)] shadow-[0_0_45px_rgba(215,173,88,.24)]" />
                </div>
                <MoonStar className="mb-5 h-10 w-10 text-stella-gold" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">DREAM LAB</p>
                <h2 className="oracle-title mt-32 font-amiri text-4xl font-bold">{lang === 'ar' ? 'تفسير الأحلام' : 'Dream Interpretation'}</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-white/70">
                    {lang === 'ar' ? 'تحليل مستنير بأبحاث النوم يربط محتوى الحلم بالذاكرة والانفعال وتجارب اليقظة، دون قاموس رموز ثابت.' : 'An evidence-informed analysis connecting dream content with memory, emotion, and waking experience.'}
                </p>
            </section>

            <section className="oracle-frame rounded-[24px] p-5">
                <label className="mb-3 flex items-center gap-2 text-sm font-bold text-[#f3d994]">
                    <Brain className="h-4 w-4" />
                    {lang === 'ar' ? 'اكتب حلمك بتفاصيله ومشاعرك داخله' : 'Describe your dream and how it felt'}
                </label>
                <textarea
                    value={dream}
                    onChange={event => setDream(event.target.value.slice(0, 3000))}
                    rows={7}
                    placeholder={lang === 'ar' ? 'مثال: رأيت أنني أمشي قرب البحر ثم بدأت أطير، وكنت أشعر بالراحة...' : 'Describe the place, people, events, and emotions...'}
                    className="w-full resize-none rounded-2xl border border-purple-100 bg-[#faf8fc] p-4 text-sm leading-7 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                />
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{dream.length}/3000</span>
                    <span>{lang === 'ar' ? 'لا يعتبر تشخيصاً أو تنبؤاً' : 'Not diagnosis or prediction'}</span>
                </div>
                <button onClick={analyze} disabled={loading || dream.trim().length < 15} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4e3269] to-[#9c6875] py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">
                    {loading ? <Sparkles className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                    {loading ? (lang === 'ar' ? 'نحلّل الرموز والمشاعر...' : 'Analyzing...') : (lang === 'ar' ? 'حلّل الحلم' : 'Analyze dream')}
                </button>
            </section>

            {result && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="oracle-frame rounded-[26px] p-6">
                    <div className="mb-4 flex items-center gap-2 text-stella-gold"><Sparkles className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{lang === 'ar' ? 'قراءة الحلم' : 'Dream reflection'}</h3></div>
                    <p className="whitespace-pre-line text-[15px] leading-8 text-[#e8dfeb]">{result}</p>
                </motion.section>
            )}
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3079906/" target="_blank" rel="noreferrer" className="block rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-xs leading-6 text-purple-800 underline">{lang === 'ar' ? 'المرجع العلمي: Memory, Sleep and Dreaming — NIH/PMC' : 'Research source: Memory, Sleep and Dreaming — NIH/PMC'}</a>
        </motion.div>
    );
}

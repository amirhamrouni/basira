import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, RotateCcw, Timer, Trophy } from 'lucide-react';
import { tarotDeck } from '../data/tarotDeck';

const PATTERNS = [{ id: 'calm', ar: 'هدوء 4–4–6', en: 'Calm 4–4–6', times: [4, 4, 6] }, { id: 'box', ar: 'توازن 4–4–4', en: 'Balance 4–4–4', times: [4, 4, 4] }];

export default function RitualsView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const isAr = lang === 'ar';
    const [pattern, setPattern] = useState(PATTERNS[0]);
    const [running, setRunning] = useState(false);
    const [stage, setStage] = useState(0);
    const [seconds, setSeconds] = useState(pattern.times[0]);
    const [score, setScore] = useState(0);
    const [answer, setAnswer] = useState<string | null>(null);
    const challenge = useMemo(() => {
        const major = tarotDeck.filter(card => card.arcana === 'major');
        const card = major[Math.floor(Math.random() * major.length)];
        const decoys = major.filter(item => item.id !== card.id).sort(() => Math.random() - .5).slice(0, 2);
        return { card, options: [card, ...decoys].sort(() => Math.random() - .5) };
    }, [score]);

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setSeconds(value => {
            if (value > 1) return value - 1;
            const next = (stage + 1) % 3;
            setStage(next);
            return pattern.times[next];
        }), 1000);
        return () => window.clearInterval(timer);
    }, [running, stage, pattern]);

    const stages = isAr ? ['شهيق', 'ثبات', 'زفير'] : ['Inhale', 'Hold', 'Exhale'];
    return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
        <section className="oracle-frame rounded-[28px] p-7"><p className="text-[10px] font-bold tracking-[.25em] text-[#d9b96e]">BREATHE • PLAY • REFLECT</p><h2 className="mt-3 font-amiri text-4xl font-bold text-[#f3d994]">{isAr ? 'مراسم و ألعاب' : 'Rituals & Games'}</h2><p className="mt-3 text-sm leading-7 text-white/60">{isAr ? 'جلسات قصيرة تعمل دون اتصال ودون استهلاك رصيد الذكاء الاصطناعي.' : 'Short offline sessions with no AI-token usage.'}</p></section>
        <section className="oracle-frame rounded-[24px] p-5 text-center">
            <div className="mb-4 flex items-center gap-2 text-[#f3d994]"><Timer className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{isAr ? 'دائرة التنفّس' : 'Breathing circle'}</h3></div>
            <div className="mb-5 flex gap-2">{PATTERNS.map(item => <button key={item.id} onClick={() => { setRunning(false); setPattern(item); setStage(0); setSeconds(item.times[0]); }} className={`flex-1 rounded-xl border px-3 py-2 text-xs ${pattern.id === item.id ? 'border-[#d9b96e] bg-[#d9b96e]/15 text-[#f3d994]' : 'border-white/10 text-white/50'}`}>{isAr ? item.ar : item.en}</button>)}</div>
            <motion.div animate={{ scale: running ? (stage === 0 ? 1.22 : stage === 2 ? .82 : 1.22) : 1 }} transition={{ duration: pattern.times[stage], ease: 'easeInOut' }} className="mx-auto grid h-36 w-36 place-items-center rounded-full border border-[#d9b96e]/50 bg-[radial-gradient(circle,rgba(215,173,88,.22),rgba(70,42,91,.18))] shadow-[0_0_40px_rgba(215,173,88,.16)]"><div><strong className="block font-amiri text-2xl text-[#f3d994]">{stages[stage]}</strong><span className="text-3xl font-light text-white/70">{seconds}</span></div></motion.div>
            <button onClick={() => setRunning(value => !value)} className="mt-6 w-full rounded-xl bg-[#d9b96e] py-3 font-bold text-[#171022]">{running ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'ابدأ الجلسة' : 'Start session')}</button>
        </section>
        <section className="oracle-frame rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-[#f3d994]"><Brain className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{isAr ? 'تحدّي رموز التاروت' : 'Tarot symbol challenge'}</h3></div><span className="flex items-center gap-1 text-xs text-[#d9b96e]"><Trophy className="h-4 w-4" />{score}</span></div>
            <p className="mb-4 text-sm text-white/65">{isAr ? `أي بطاقة ترتبط بموضوع «${challenge.card.theme}»؟` : `Which card matches “${challenge.card.theme}”?`}</p>
            <div className="grid grid-cols-3 gap-2">{challenge.options.map(card => <button key={card.id} disabled={answer !== null} onClick={() => { setAnswer(card.id); if (card.id === challenge.card.id) setScore(value => value + 1); }} className={`rounded-xl border p-3 text-xs leading-5 transition ${answer === card.id ? (card.id === challenge.card.id ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-red-400 bg-red-400/10 text-red-300') : 'border-white/10 bg-white/5 text-white/65'}`}>{isAr ? card.nameAr : card.name}</button>)}</div>
            {answer && <button onClick={() => setAnswer(null)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9b96e]/30 py-3 text-sm font-bold text-[#d9b96e]"><RotateCcw className="h-4 w-4" />{isAr ? 'تحدٍ جديد' : 'Next challenge'}</button>}
        </section>
    </motion.div>;
}

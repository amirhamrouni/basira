import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CalendarCheck, Flame, RotateCcw, Send, Sparkles } from 'lucide-react';
import { tarotDeck, TarotCard } from '../data/tarotDeck';
import { getApiUrl } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export default function TarotView({ lang, state, setState }: any) {
    const { drawnCards, reading, isLoading, sessionCards } = state;
    const [question, setQuestion] = useState('');
    const [spreadId, setSpreadId] = useState('past-present-direction');
    const isAr = lang === 'ar';
    const illustratedDeck = useMemo(() => tarotDeck.filter(card => card.arcana === 'major'), []);
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyCard = useMemo(() => {
        const seed = todayKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return illustratedDeck[seed % illustratedDeck.length];
    }, [illustratedDeck, todayKey]);
    const [dailyProgress, setDailyProgress] = useState<{ last: string; streak: number }>(() => {
        try { return JSON.parse(localStorage.getItem('basira_tarot_daily_v1') || '{"last":"","streak":0}'); } catch { return { last: '', streak: 0 }; }
    });
    const spreads = isAr ? [
        { id: 'past-present-direction', name: 'الماضي • الحاضر • الاتجاه', positions: ['الماضي المؤثر', 'ما يجري الآن', 'الاتجاه القادم'] },
        { id: 'problem-cause-solution', name: 'المشكلة • السبب • المفتاح', positions: ['العقدة الظاهرة', 'السبب الخفي', 'مفتاح الحل'] },
        { id: 'relationship-mirror', name: 'مرآة العلاقة', positions: ['طاقتك في العلاقة', 'طاقة الطرف الآخر المحتملة', 'مسار العلاقة'] },
    ] : [
        { id: 'past-present-direction', name: 'Past • Present • Direction', positions: ['Influential past', 'What is unfolding', 'Likely direction'] },
        { id: 'problem-cause-solution', name: 'Problem • Cause • Key', positions: ['Visible knot', 'Hidden cause', 'Key to resolution'] },
        { id: 'relationship-mirror', name: 'Relationship Mirror', positions: ['Your energy', 'Their possible energy', 'Relationship path'] },
    ];
    const activeSpread = spreads.find(spread => spread.id === spreadId) || spreads[0];

    useEffect(() => {
        if (!sessionCards?.length) {
            const shuffled = [...illustratedDeck].sort(() => Math.random() - 0.5).slice(0, 3).map(card => card.id);
            setState({ ...state, sessionCards: shuffled, drawnCards: [], reading: null });
        }
    }, []);

    const cards = useMemo(() => sessionCards.map((id: string) => tarotDeck.find(card => card.id === id)).filter(Boolean) as TarotCard[], [sessionCards]);

    const draw = async () => {
        if (drawnCards.length < 2) {
            setState({ ...state, drawnCards: [...drawnCards, drawnCards.length] });
            return;
        }
        const allDrawn = [0, 1, 2];
        setState({ ...state, drawnCards: allDrawn, isLoading: true, reading: null });
        const selected = cards.map((card, index) => ({ position: activeSpread.positions[index], name: card.name, nameAr: card.nameAr, theme: card.theme, reflection: card.reflection }));
        try {
            const response = await fetchWithTimeout(getApiUrl('/api/tarot'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cards: selected,
                    question,
                    lang,
                    spreadName: activeSpread.name,
                    positions: activeSpread.positions,
                    readingId: crypto.randomUUID()
                })
            });
            const data = await response.json();
            setState({ ...state, drawnCards: allDrawn, isLoading: false, reading: data.reply || buildLocalReading(cards, question, isAr) });
        } catch {
            setState({ ...state, drawnCards: allDrawn, isLoading: false, reading: buildLocalReading(cards, question, isAr) });
        }
    };

    const reset = () => {
        const shuffled = [...illustratedDeck].sort(() => Math.random() - 0.5).slice(0, 3).map(card => card.id);
        setState({ ...state, sessionCards: shuffled, drawnCards: [], reading: null });
    };

    const claimDaily = () => {
        if (dailyProgress.last === todayKey) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const next = { last: todayKey, streak: dailyProgress.last === yesterday ? dailyProgress.streak + 1 : 1 };
        localStorage.setItem('basira_tarot_daily_v1', JSON.stringify(next));
        setDailyProgress(next);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            <section className="oracle-frame rounded-[28px] p-7 text-white">
                <div className="absolute right-6 top-5 text-6xl text-[#d9b96e]/10">✦</div>
                <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#d9b96e]">RIDER–WAITE–SMITH • MAJOR ARCANA</p>
                <h2 className="oracle-title mt-3 font-amiri text-4xl font-bold">{isAr ? 'أسرار التاروت' : 'Tarot Secrets'}</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-white/65">{isAr ? 'قراءة رمزية للسؤال والماضي والحاضر والاتجاه القادم—ليست حكماً على المستقبل.' : 'A symbolic past, present and direction reading grounded in your real question.'}</p>
            </section>

            <section className="oracle-frame rounded-[24px] p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-[#f3d994]"><CalendarCheck className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{isAr ? 'بطاقة اليوم' : 'Card of the day'}</h3></div><span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-3 py-1 text-xs text-orange-300"><Flame className="h-4 w-4" />{dailyProgress.streak}</span></div>
                <div className="flex items-center gap-4 rounded-2xl border border-[#d9b96e]/20 bg-black/20 p-4">{dailyCard.imageUrl ? <img src={dailyCard.imageUrl} alt={isAr ? dailyCard.nameAr : dailyCard.name} className="h-28 w-20 rounded-lg object-cover shadow-lg" /> : <div className="grid h-28 w-20 place-items-center rounded-lg bg-purple-900 text-3xl">{dailyCard.symbol}</div>}<div className="min-w-0"><strong className="font-amiri text-xl text-[#f3d994]">{isAr ? dailyCard.nameAr : dailyCard.name}</strong><p className="mt-2 text-xs leading-6 text-white/60">{dailyCard.reflection}</p></div></div>
                <button onClick={claimDaily} disabled={dailyProgress.last === todayKey} className="mt-4 w-full rounded-xl bg-[#d9b96e] py-3 text-sm font-bold text-[#171022] disabled:bg-white/10 disabled:text-white/40">{dailyProgress.last === todayKey ? (isAr ? 'تمّ إنجاز تأمل اليوم' : 'Today completed') : (isAr ? 'ابدأ سلسلة اليوم' : 'Complete today')}</button>
            </section>

            <section className="oracle-frame rounded-[24px] p-5">
                <label className="mb-3 block text-sm font-bold text-[#f3d994]">{isAr ? 'ما السر الذي تريد كشفه؟' : 'What do you want to uncover?'}</label>
                <div className="flex gap-2">
                    <input value={question} onChange={event => setQuestion(event.target.value.slice(0, 300))} placeholder={isAr ? 'العلاقة، العمل، قرار يشغلك...' : 'A relationship, work, or a decision...'} className="min-w-0 flex-1 rounded-2xl border border-purple-100 bg-[#fbf9fc] px-4 py-3 text-sm outline-none focus:border-purple-300" />
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#291d3a] text-[#d9b96e]"><Send className="h-4 w-4" /></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={isAr ? 'اختر نوع القراءة' : 'Choose a spread'}>
                    {spreads.map(spread => (
                        <button key={spread.id} type="button" role="radio" aria-checked={spreadId === spread.id} onClick={() => { setSpreadId(spread.id); if (drawnCards.length || reading) reset(); }} className={`min-h-14 rounded-xl border px-2 py-2 text-xs leading-5 transition ${spreadId === spread.id ? 'border-[#d9b96e] bg-[#d9b96e]/15 text-[#f3d994]' : 'border-[#d9b96e]/20 bg-black/20 text-white/60 hover:border-[#d9b96e]/50'}`}>
                            {spread.name}
                        </button>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-3 gap-3 px-1">
                {cards.map((card, index) => {
                    const revealed = drawnCards.includes(index);
                    return (
                        <motion.button key={card.id} onClick={() => index === drawnCards.length && !isLoading && draw()} animate={{ y: revealed ? 0 : [0, -6, 0] }} transition={{ y: { repeat: Infinity, duration: 3, delay: index * .25 } }} className="relative aspect-[.62] [perspective:900px]">
                            <motion.div animate={{ rotateY: revealed ? 180 : 0 }} transition={{ duration: .8 }} className="relative h-full w-full [transform-style:preserve-3d]">
                                <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-[18px] border border-[#d9b96e]/50 bg-[radial-gradient(circle,#654c7e,#171020_68%)] shadow-xl [backface-visibility:hidden]">
                                    <div className="absolute inset-2 rounded-[13px] border border-[#d9b96e]/25" />
                                    <span className="text-4xl text-[#d9b96e]">✦</span>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-between rounded-[18px] border-2 border-[#d9b96e] bg-gradient-to-b from-[#fff8e8] to-[#ead9b8] p-3 text-center shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                    <span className="relative z-10 rounded bg-[#fff8e8]/90 px-1.5 py-0.5 text-[10px] font-bold text-[#6d5731]">{activeSpread.positions[index]}</span>
                                    {card.imageUrl ? <img src={card.imageUrl} alt={isAr ? card.nameAr : card.name} className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] rounded-[14px] object-cover" /> : <span className="text-5xl text-[#382747]">{card.symbol}</span>}
                                    <div className="absolute inset-x-1 bottom-1 rounded-b-[13px] bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 text-white">
                                        <strong className="block font-amiri text-xs">{isAr ? card.nameAr : card.name}</strong>
                                        <span className="block text-[8px] text-white/75">{card.theme}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.button>
                    );
                })}
            </div>

            {!reading && <button onClick={draw} disabled={isLoading || cards.length < 3} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2a1c3b] to-[#78546f] py-4 font-bold text-white shadow-lg disabled:opacity-50"><Sparkles className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />{isLoading ? (isAr ? 'تُنسج القراءة...' : 'Weaving the reading...') : (isAr ? `اكشف البطاقة ${Math.min(drawnCards.length + 1, 3)}` : `Reveal card ${Math.min(drawnCards.length + 1, 3)}`)}</button>}

            {reading && <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="oracle-frame rounded-[26px] p-6"><div className="mb-4 flex items-center gap-2 text-[#f3d994]"><Sparkles className="h-5 w-5" /><h3 className="font-amiri text-2xl font-bold">{isAr ? 'ما تكشفه البطاقات' : 'What the cards reveal'}</h3></div><p className="whitespace-pre-line text-[15px] leading-8 text-[#e8dfeb]">{reading}</p><button onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9b96e]/30 py-3 text-sm font-bold text-[#d9b96e]"><RotateCcw className="h-4 w-4" />{isAr ? 'قراءة جديدة' : 'New reading'}</button></motion.section>}

            <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-[11px] leading-5 text-gray-500"><BookOpen className="mt-0.5 h-4 w-4 shrink-0" /><p>{isAr ? 'صور Rider–Waite–Smith الأصلية (Pamela Colman Smith، 1910) من Wikimedia Commons. المعاني مستندة إلى The Pictorial Key to the Tarot وتُستخدم للتأمل، لا للتنبؤ.' : 'Original Rider–Waite–Smith art (Pamela Colman Smith, 1910) via Wikimedia Commons. Meanings reference The Pictorial Key and are for reflection, not prediction.'} <a className="font-bold text-purple-700 underline" href="https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck" target="_blank" rel="noreferrer">{isAr ? 'المصدر' : 'Source'}</a></p></div>
        </motion.div>
    );
}

function buildLocalReading(cards: TarotCard[], question: string, isAr: boolean) {
    if (!isAr) return cards.map((card, i) => `${['Past','Present','Direction'][i]} — ${card.name}: ${card.reflection}.`).join('\n\n') + `\n\nReflect on what small action is supported by these themes${question ? ` in relation to “${question}”` : ''}.`;
    return cards.map((card, i) => `${['الماضي','الحاضر','الاتجاه'][i]} — ${card.nameAr}: ${card.reflection}.`).join('\n\n') + `\n\nالخلاصة: لا تخبرك البطاقات بما سيحدث؛ هي تجمع ثلاث زوايا تساعدك على سؤال نفسك: ما الخطوة الصغيرة التي تنسجم مع هذه المعاني${question ? ` في موضوع «${question}»` : ''}؟`;
}

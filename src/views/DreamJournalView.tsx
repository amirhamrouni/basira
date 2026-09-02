import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookHeart, Plus, Search, Trash2 } from 'lucide-react';

type Entry = { id: string; title: string; body: string; mood: string; createdAt: number; tags: string[] };
const KEY = 'basira_dream_journal_v1';
const MOTIFS = ['ماء', 'بيت', 'طريق', 'بحر', 'طيران', 'سقوط', 'باب', 'قمر', 'شخص', 'water', 'home', 'road', 'flying', 'falling', 'door', 'moon'];

function loadEntries(): Entry[] {
    try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}

export default function DreamJournalView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const isAr = lang === 'ar';
    const [entries, setEntries] = useState<Entry[]>(loadEntries);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [mood, setMood] = useState('غامض');
    const [query, setQuery] = useState('');

    const save = (next: Entry[]) => { setEntries(next); localStorage.setItem(KEY, JSON.stringify(next)); };
    const add = (event: FormEvent) => {
        event.preventDefault();
        if (body.trim().length < 10) return;
        const normalized = `${title} ${body}`.toLowerCase();
        const tags = MOTIFS.filter(word => normalized.includes(word.toLowerCase())).slice(0, 5);
        save([{ id: crypto.randomUUID(), title: title.trim() || (isAr ? 'حلم بلا عنوان' : 'Untitled dream'), body: body.trim(), mood, createdAt: Date.now(), tags }, ...entries].slice(0, 100));
        setTitle(''); setBody('');
    };
    const visible = useMemo(() => entries.filter(entry => `${entry.title} ${entry.body} ${entry.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);

    return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
        <section className="oracle-frame rounded-[28px] p-7"><p className="text-[10px] font-bold tracking-[.25em] text-[#d9b96e]">PRIVATE • ON DEVICE</p><h2 className="mt-3 font-amiri text-4xl font-bold text-[#f3d994]">{isAr ? 'دفتر الأحلام' : 'Dream Journal'}</h2><p className="mt-3 text-sm leading-7 text-white/60">{isAr ? 'احفظ تفاصيل حلمك فور الاستيقاظ، ثم اكتشف الرموز والموضوعات التي تتكرر مع الوقت.' : 'Capture dreams on waking and notice recurring themes over time.'}</p></section>
        <form onSubmit={add} className="oracle-frame space-y-3 rounded-[24px] p-5">
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder={isAr ? 'عنوان الحلم' : 'Dream title'} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#d9b96e]/60" />
            <textarea value={body} onChange={e => setBody(e.target.value.slice(0, 3000))} placeholder={isAr ? 'ماذا رأيت؟ من كان معك؟ ماذا شعرت؟' : 'What did you see and feel?'} rows={6} className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white outline-none focus:border-[#d9b96e]/60" />
            <div className="flex gap-2"><select value={mood} onChange={e => setMood(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171022] px-3 py-3 text-sm text-white"><option>{isAr ? 'غامض' : 'Mysterious'}</option><option>{isAr ? 'هادئ' : 'Calm'}</option><option>{isAr ? 'مبهج' : 'Joyful'}</option><option>{isAr ? 'مقلق' : 'Uneasy'}</option></select><button disabled={body.trim().length < 10} className="flex items-center gap-2 rounded-xl bg-[#d9b96e] px-5 font-bold text-[#171022] disabled:opacity-40"><Plus className="h-4 w-4" />{isAr ? 'حفظ' : 'Save'}</button></div>
        </form>
        <div className="relative"><Search className="absolute top-3.5 right-4 h-4 w-4 text-white/35" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={isAr ? 'ابحث في أحلامك...' : 'Search dreams...'} className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-4 pr-11 text-sm text-white outline-none" /></div>
        <section className="space-y-3">{visible.length ? visible.map(entry => <article key={entry.id} className="oracle-frame rounded-[22px] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-amiri text-xl font-bold text-[#f3d994]">{entry.title}</h3><p className="mt-1 text-[11px] text-white/40">{new Intl.DateTimeFormat(isAr ? 'ar-TN' : 'en-GB', { dateStyle: 'medium' }).format(entry.createdAt)} • {entry.mood}</p></div><button onClick={() => save(entries.filter(item => item.id !== entry.id))} aria-label={isAr ? 'حذف' : 'Delete'} className="p-2 text-white/30 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{entry.body}</p>{entry.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{entry.tags.map(tag => <span key={tag} className="rounded-full bg-[#d9b96e]/10 px-3 py-1 text-[10px] text-[#d9b96e]">#{tag}</span>)}</div>}</article>) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/35"><BookHeart className="mx-auto mb-3 h-8 w-8" />{isAr ? 'لا توجد أحلام محفوظة بعد' : 'No saved dreams yet'}</div>}</section>
    </motion.div>;
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Orbit, Send, Sparkles, Users } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

type Mode = 'natal' | 'transit' | 'compatibility';
type Person = { name: string; birthDate: string; birthTime: string; location: string };
const emptyPerson = (): Person => ({ name: '', birthDate: '', birthTime: '', location: '' });

export default function AstrologyStudio({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const isAr = lang === 'ar';
    const [mode, setMode] = useState<Mode>('natal');
    const [first, setFirst] = useState<Person>(emptyPerson);
    const [second, setSecond] = useState<Person>(emptyPerson);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const modes = [
        { id: 'natal' as const, icon: '☉', ar: 'خريطة الميلاد', en: 'Birth chart' },
        { id: 'transit' as const, icon: '♄', ar: 'عبور اليوم', en: 'Today’s transits' },
        { id: 'compatibility' as const, icon: '☌', ar: 'التوافق', en: 'Compatibility' },
    ];

    const valid = Object.values(first).every(Boolean) && (mode !== 'compatibility' || Object.values(second).every(Boolean));
    const submit = async () => {
        if (!valid) return;
        setLoading(true); setResult(null);
        try {
            const response = await fetchWithTimeout(getApiUrl('/api/astrology'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, first, second: mode === 'compatibility' ? second : undefined, lang })
            });
            const data = await response.json();
            setResult(data.reply || (isAr ? 'تعذرت القراءة الآن.' : 'Reading unavailable.'));
        } catch { setResult(isAr ? 'تعذر الاتصال بالمحرك الفلكي الآن. حاول مجدداً.' : 'Could not reach the astrology engine.'); }
        finally { setLoading(false); }
    };

    return <section className="oracle-frame rounded-[28px] p-5">
        <div className="relative z-10 mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[#d7ad58]/40 bg-[#d7ad58]/10"><Orbit className="h-6 w-6 text-[#f3d994]" /></div>
            <div><p className="oracle-kicker text-xs">ASTROLOGIC</p><h2 className="oracle-title font-amiri text-2xl font-bold">{isAr ? 'مرصدك الفلكي الشخصي' : 'Personal astrology observatory'}</h2></div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-2">
            {modes.map(item => <button key={item.id} onClick={() => { setMode(item.id); setResult(null); }} className={`min-h-20 rounded-xl border px-2 py-2 transition ${mode === item.id ? 'border-[#d7ad58] bg-[#d7ad58]/15 text-[#f3d994]' : 'border-[#d7ad58]/20 bg-black/20 text-white/60'}`}><span className="block text-2xl">{item.icon}</span><span className="mt-1 block text-xs font-bold">{isAr ? item.ar : item.en}</span></button>)}
        </div>
        <PersonForm value={first} onChange={setFirst} title={mode === 'compatibility' ? (isAr ? 'الشخص الأول' : 'First person') : (isAr ? 'بيانات ميلادك' : 'Your birth details')} isAr={isAr} />
        {mode === 'compatibility' && <PersonForm value={second} onChange={setSecond} title={isAr ? 'الشخص الثاني' : 'Second person'} isAr={isAr} />}
        <button onClick={submit} disabled={!valid || loading} className="relative z-10 mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d4828] via-[#d7ad58] to-[#6d4828] py-4 font-bold text-[#0a0710] shadow-[0_0_28px_rgba(215,173,88,.18)] disabled:opacity-40">{loading ? <Sparkles className="h-5 w-5 animate-spin" /> : mode === 'compatibility' ? <Users className="h-5 w-5" /> : <Send className="h-5 w-5" />}{loading ? (isAr ? 'تُرسم الدلالات...' : 'Mapping the sky...') : (isAr ? 'اكشف القراءة الفلكية' : 'Reveal astrology reading')}</button>
        {result && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mt-5 rounded-2xl border border-[#d7ad58]/25 bg-black/25 p-5"><h3 className="mb-3 font-amiri text-xl font-bold text-[#f3d994]">{isAr ? 'القراءة الشخصية' : 'Personal reading'}</h3><p className="whitespace-pre-line text-[15px] leading-8 text-[#e8dfeb]">{result}</p></motion.div>}
        <p className="relative z-10 mt-4 text-xs leading-5 text-white/40">{isAr ? 'ساعة ومكان الولادة ضروريان لتحسين التخصيص. لا تُحفظ هذه البيانات في حسابك.' : 'Birth time and location improve personalization. These details are not saved to your account.'}</p>
    </section>;
}

function PersonForm({ value, onChange, title, isAr }: { value: Person; onChange: (p: Person) => void; title: string; isAr: boolean }) {
    const set = (key: keyof Person, next: string) => onChange({ ...value, [key]: next });
    return <div className="relative z-10 mt-4 rounded-2xl border border-[#d7ad58]/15 bg-black/20 p-4"><h3 className="mb-3 font-amiri text-lg font-bold text-[#d7ad58]">{title}</h3><div className="grid grid-cols-2 gap-3"><input value={value.name} onChange={e => set('name', e.target.value.slice(0, 80))} placeholder={isAr ? 'الاسم الأول' : 'First name'} className="col-span-2 rounded-xl border p-3 text-sm" /><input type="date" value={value.birthDate} onChange={e => set('birthDate', e.target.value)} className="rounded-xl border p-3 text-sm" /><input type="time" value={value.birthTime} onChange={e => set('birthTime', e.target.value)} className="rounded-xl border p-3 text-sm" /><input value={value.location} onChange={e => set('location', e.target.value.slice(0, 120))} placeholder={isAr ? 'مدينة ودولة الولادة' : 'Birth city and country'} className="col-span-2 rounded-xl border p-3 text-sm" /></div></div>;
}

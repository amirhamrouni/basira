import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Body, Illumination, MoonPhase, SearchMoonPhase } from 'astronomy-engine';
import { CalendarDays, Moon, Sparkles } from 'lucide-react';

const PHASES = [
    { angle: 0, ar: 'المحاق', en: 'New moon', icon: '🌑' },
    { angle: 90, ar: 'التربيع الأول', en: 'First quarter', icon: '🌓' },
    { angle: 180, ar: 'البدر', en: 'Full moon', icon: '🌕' },
    { angle: 270, ar: 'التربيع الأخير', en: 'Last quarter', icon: '🌗' },
];

function phaseInfo(angle: number) {
    if (angle < 22.5 || angle >= 337.5) return { ar: 'المحاق', en: 'New moon', icon: '🌑' };
    if (angle < 67.5) return { ar: 'هلال متزايد', en: 'Waxing crescent', icon: '🌒' };
    if (angle < 112.5) return { ar: 'التربيع الأول', en: 'First quarter', icon: '🌓' };
    if (angle < 157.5) return { ar: 'أحدب متزايد', en: 'Waxing gibbous', icon: '🌔' };
    if (angle < 202.5) return { ar: 'البدر', en: 'Full moon', icon: '🌕' };
    if (angle < 247.5) return { ar: 'أحدب متناقص', en: 'Waning gibbous', icon: '🌖' };
    if (angle < 292.5) return { ar: 'التربيع الأخير', en: 'Last quarter', icon: '🌗' };
    return { ar: 'هلال متناقص', en: 'Waning crescent', icon: '🌘' };
}

export default function MoonView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const isAr = lang === 'ar';
    const data = useMemo(() => {
        const now = new Date();
        const angle = MoonPhase(now);
        const lit = Math.round(Illumination(Body.Moon, now).phase_fraction * 100);
        const upcoming = PHASES.map(phase => ({
            ...phase,
            date: SearchMoonPhase(phase.angle, now, 32)?.date ?? null,
        })).filter(item => item.date).sort((a, b) => a.date!.getTime() - b.date!.getTime());
        return { angle, lit, phase: phaseInfo(angle), upcoming };
    }, []);

    const reflection = data.angle < 90
        ? (isAr ? 'وقت مناسب لفتح صفحة جديدة وتحديد نية واحدة قابلة للتنفيذ.' : 'A useful moment to set one practical intention.')
        : data.angle < 180
            ? (isAr ? 'الضوء يتزايد: راجع تقدّمك وركّز طاقتك على ما بدأته.' : 'Light is growing: review progress and focus on what you started.')
            : data.angle < 270
                ? (isAr ? 'مرحلة اكتمال: لاحظ ما نضج، واحتفل بالخطوات الصغيرة.' : 'A completion phase: notice what has matured.')
                : (isAr ? 'مرحلة تهدئة: خفّف الحمل واترك عادة لم تعد تخدمك.' : 'A winding-down phase: release one habit that no longer serves you.');

    return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
        <section className="oracle-frame relative overflow-hidden rounded-[28px] p-7 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(215,173,88,.20),transparent_42%)]" />
            <span className="relative block text-8xl drop-shadow-[0_0_26px_rgba(243,217,148,.32)]">{data.phase.icon}</span>
            <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[.28em] text-[#d9b96e]">ASTRONOMY ENGINE • LIVE CALCULATION</p>
            <h2 className="relative mt-2 font-amiri text-4xl font-bold text-[#f3d994]">{isAr ? data.phase.ar : data.phase.en}</h2>
            <p className="relative mt-2 text-sm text-white/60">{isAr ? `إضاءة القمر الآن ${data.lit}٪` : `${data.lit}% illuminated now`}</p>
        </section>

        <section className="oracle-frame rounded-[24px] p-5">
            <div className="mb-3 flex items-center gap-2 text-[#f3d994]"><Sparkles className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{isAr ? 'طقس اليوم الهادئ' : 'Today’s reflection'}</h3></div>
            <p className="text-sm leading-7 text-white/75">{reflection}</p>
            <div className="mt-4 rounded-2xl border border-[#d9b96e]/20 bg-black/20 p-4 text-sm text-white/60">{isAr ? 'اكتب نيتك بجملة واحدة، ثم اختر خطوة تستغرق أقل من عشر دقائق.' : 'Write one intention, then choose a step that takes under ten minutes.'}</div>
        </section>

        <section className="oracle-frame rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2 text-[#f3d994]"><CalendarDays className="h-5 w-5" /><h3 className="font-amiri text-xl font-bold">{isAr ? 'المحطات القمرية القادمة' : 'Upcoming lunar phases'}</h3></div>
            <div className="space-y-3">{data.upcoming.map(item => <div key={item.angle} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-3"><span className="text-2xl">{item.icon}</span><strong className="text-sm text-white/80">{isAr ? item.ar : item.en}</strong></div><time className="text-xs text-[#d9b96e]">{new Intl.DateTimeFormat(isAr ? 'ar-TN' : 'en-GB', { day: 'numeric', month: 'short' }).format(item.date!)}</time></div>)}</div>
        </section>

        <p className="flex items-start gap-2 rounded-2xl bg-white/5 p-4 text-[11px] leading-5 text-white/45"><Moon className="mt-0.5 h-4 w-4 shrink-0" />{isAr ? 'طور القمر ونسبة الإضاءة حسابات فلكية. النص التأملي اقتراح للعناية بالنفس وليس تنبؤاً علمياً.' : 'Moon phase and illumination are astronomical calculations. Reflections are wellness prompts, not scientific predictions.'}</p>
    </motion.div>;
}

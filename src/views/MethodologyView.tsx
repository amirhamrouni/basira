import { motion } from 'framer-motion';
import { Atom, BookOpen, Brain, Calculator, ExternalLink, Sparkles } from 'lucide-react';

const sources = [
    { title: 'Astronomy Engine', note: 'حساب مواضع الشمس والقمر والكواكب والطول الكسوفي المركزي الأرضي.', url: 'https://github.com/cosinekitty/astronomy', icon: Calculator, level: 'حساب فلكي' },
    { title: 'NASA Space Place', note: 'مرجع يوضح الفرق بين علم الفلك القائم على البيانات والتنجيم الثقافي.', url: 'https://spaceplace.nasa.gov/constellations/en/', icon: Atom, level: 'مرجع علمي' },
    { title: 'NIH / PMC — Sleep & Dreaming', note: 'أبحاث عن علاقة الأحلام بتثبيت الذاكرة ومعالجة الخبرات الانفعالية.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3079906/', icon: Brain, level: 'بحث مُحكّم' },
    { title: 'The Pictorial Key to the Tarot', note: 'النص التاريخي الأصلي لمعاني Rider–Waite–Smith؛ مرجع تراثي وليس بحثاً علمياً.', url: 'https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot', icon: BookOpen, level: 'مصدر تاريخي' },
];

export default function MethodologyView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const ar = lang === 'ar';
    return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
        <section className="oracle-frame rounded-[28px] p-7 text-white">
            <Sparkles className="h-8 w-8 text-[#f3d994]" />
            <p className="mt-4 text-[10px] font-bold tracking-[.25em] text-[#d7ad58]">BASIRA METHODOLOGY</p>
            <h2 className="oracle-title mt-2 font-amiri text-4xl font-bold">{ar ? 'المنهج والمصادر' : 'Method & sources'}</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">{ar ? 'نُظهر ما تم حسابه، وما استند إلى بحث، وما بقي تفسيراً تراثياً. لا نخلط بينها.' : 'We distinguish calculated facts, research-informed analysis, and cultural interpretation.'}</p>
        </section>

        <section className="grid gap-3">
            {sources.map(({ title, note, url, icon: Icon, level }) => <a key={title} href={url} target="_blank" rel="noreferrer" className="oracle-frame block rounded-2xl p-5 transition hover:-translate-y-0.5">
                <div className="relative z-10 flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d7ad58]/30 bg-[#d7ad58]/10"><Icon className="h-5 w-5 text-[#f3d994]" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-[#f3d994]">{title}</h3><ExternalLink className="h-4 w-4 shrink-0 text-white/40" /></div><span className="mt-1 inline-block rounded-full border border-[#d7ad58]/20 px-2 py-0.5 text-[10px] text-[#d7ad58]">{level}</span><p className="mt-2 text-sm leading-7 text-white/65">{note}</p></div></div>
            </a>)}
        </section>

        <section className="rounded-2xl border border-[#d7ad58]/20 bg-[#120c1d] p-5 text-sm leading-7 text-white/70">
            <strong className="block font-amiri text-lg text-[#f3d994]">{ar ? 'كيف تقرأ النتيجة؟' : 'How to read a result'}</strong>
            <p className="mt-2">{ar ? 'الأرقام والمواضع الفلكية قابلة للتحقق. تحليل الحلم فرضيات مستنيرة وليست تشخيصاً. التاروت وقراءة الكف والفنجان تقاليد تفسيرية لا تستطيع إثبات أحداث مستقبلية.' : 'Astronomical positions are verifiable. Dream analysis offers informed hypotheses, not diagnosis. Tarot, palm and coffee readings are interpretive traditions and cannot prove future events.'}</p>
        </section>
    </motion.div>;
}

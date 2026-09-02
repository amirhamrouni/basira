import { motion } from 'framer-motion';
import { BookOpen, Crown, History, Sparkles, UserRound, Zap } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export default function UserDashboardView({ lang, onNavigate }: any) {
    const { user, profile, login } = useAuth();
    const ar = lang === 'ar';
    if (!user) return <div className="rounded-3xl border bg-white p-8 text-center"><UserRound className="mx-auto h-12 w-12 text-stella-gold"/><h2 className="mt-4 font-amiri text-2xl font-bold">{ar ? 'لوحتك الشخصية' : 'Your dashboard'}</h2><p className="mt-2 text-sm text-gray-500">{ar ? 'سجّل بحساب Google لفتح ملفك وسجل قراءاتك.' : 'Sign in with Google to open your profile and readings.'}</p><button onClick={login} className="mt-5 w-full rounded-xl bg-stella-gold py-3 font-bold text-white">Google</button></div>;
    const cards = [
        { icon: History, label: ar ? 'سجل القراءات' : 'Reading history', value: ar ? 'ارجع إلى قراءاتك المحفوظة' : 'Review saved readings', action: () => onNavigate('history') },
        { icon: Crown, label: ar ? 'العضوية' : 'Membership', value: profile?.vipStatus === 'none' ? (ar ? 'المسار المجاني' : 'Free path') : profile?.vipStatus, action: () => onNavigate('premium') },
        { icon: Sparkles, label: ar ? 'قراءة جديدة' : 'New reading', value: ar ? 'تاروت، حلم، كف وفنجان' : 'Tarot, dream, palm and coffee', action: () => onNavigate('home') }
    ];
    return <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="space-y-5 pb-10">
        <section className="rounded-[32px] bg-[radial-gradient(circle_at_top_right,#654c7e,#171020_68%)] p-6 text-white shadow-xl"><p className="text-xs text-[#d9b96e]">BASIRA ID</p><h2 className="mt-2 font-amiri text-3xl font-bold">{ar ? `مرحباً ${user.displayName || ''}` : `Welcome ${user.displayName || ''}`}</h2><p className="mt-2 text-sm text-white/60">{user.email}</p><div className="mt-5 grid grid-cols-3 gap-2"><Stat icon={Zap} value={profile?.energy ?? 50} label={ar?'الطاقة':'Energy'}/><Stat icon={BookOpen} value={profile?.level ?? 1} label={ar?'المستوى':'Level'}/><Stat icon={Sparkles} value={profile?.stardust ?? 0} label={ar?'الغبار':'Stardust'}/></div></section>
        {cards.map(({icon:Icon,label,value,action})=><button key={label} onClick={action} className="flex w-full items-center gap-4 rounded-2xl border border-purple-100 bg-white p-5 text-start shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-50 text-purple-700"><Icon/></span><span><strong className="block font-amiri text-lg">{label}</strong><small className="text-gray-500">{value}</small></span></button>)}
    </motion.div>;
}

function Stat({icon:Icon,value,label}:any){return <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"><Icon className="mx-auto h-4 w-4 text-[#d9b96e]"/><b className="mt-1 block">{value}</b><small className="text-[9px] text-white/50">{label}</small></div>}

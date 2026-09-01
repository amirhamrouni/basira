import { motion } from 'framer-motion';
import { ScanFace, Coffee, Crown, Eye, History, ShieldCheck } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export default function OtherView({ t, lang, onNavigate }: any) {
    const { isAdmin } = useAuth();
    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-6 w-full pb-10 min-h-screen">
            <div className="text-center mb-2 mt-4 px-2">
                <h2 className="text-3xl md:text-4xl font-bold text-stella-gold font-amiri">
                    {lang === 'ar' ? 'بوابات كونية أخرى' : 'Other Cosmic Gates'}
                </h2>
                <p className="text-gray-500 font-tajawal text-sm mt-3 leading-relaxed">
                    {lang === 'ar' ? 'استكشف أسراراً إضافية في هذا الركن الهادئ من الكون.' : 'Explore additional secrets in this quiet cosmic corner.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                {/* Numerology / Divination */}
                {isAdmin && <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('divination')}
                    className="glass-card p-6 border-purple-200 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-purple-50/50 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-purple-100/50 flex items-center justify-center border border-purple-200 group-hover:bg-purple-100 transition-colors">
                        <Eye className="text-purple-600 w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-purple-800 font-amiri">{t.divination}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{t.features.divination}</p>
                    </div>
                </motion.div>}

                {/* Face Reading */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('face')}
                    className="glass-card p-6 border-green-200 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-green-50/50 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-green-100/50 flex items-center justify-center border border-green-200 group-hover:bg-green-100 transition-colors">
                        <ScanFace className="text-green-600 w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-green-800 font-amiri">{t.features.face}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{t.features.faceDesc}</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('privacy')}
                    className="glass-card p-6 border-stella-gold/25 shadow-sm rounded-2xl cursor-pointer flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-stella-gold/10 flex items-center justify-center border border-stella-gold/25">
                        <ShieldCheck className="text-stella-gold w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stella-gold font-amiri">{lang === 'ar' ? 'الخصوصية وحذف الحساب' : 'Privacy & account deletion'}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{lang === 'ar' ? 'بياناتك، الشروط والتحكم الكامل في الحساب' : 'Your data, terms and full account control'}</p>
                    </div>
                </motion.div>

                {/* Coffee Cup */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('coffee')}
                    className="glass-card p-6 border-amber-200 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-amber-50/50 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-amber-100/50 flex items-center justify-center border border-amber-200 group-hover:bg-amber-100 transition-colors">
                        <Coffee className="text-amber-700 w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-850 font-amiri">{t.coffeeTitle}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{t.features.coffeeDesc}</p>
                    </div>
                </motion.div>

                {/* Premium / VIP */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('premium')}
                    className="glass-card p-6 border-yellow-300 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-yellow-50/50 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-yellow-100/50 flex items-center justify-center border border-yellow-200 group-hover:bg-yellow-100 transition-colors">
                        <Crown className="text-yellow-600 w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-yellow-800 font-amiri">{t.vipTitle}</h3>
                        <p className="text-xs text-gray-600 font-tajawal mt-1">{lang === 'ar' ? 'الجلسات الصوتية، تحليل الأحلام وأكثر' : 'Audio sessions, dream analysis & more'}</p>
                    </div>
                </motion.div>

                {/* History List */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('history')}
                    className="glass-card p-6 border-stella-gold/30 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-amber-50/10 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-stella-gold/5 flex items-center justify-center border border-stella-gold/20 group-hover:bg-stella-gold/15 transition-colors">
                        <History className="text-stella-gold w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stella-gold font-amiri">{lang === 'ar' ? 'سجل قراءاتك' : 'Readings History'}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{lang === 'ar' ? 'أرشيف طوالعك وقراءات الفنجان والكف المكتملة' : 'Archive of your completed readings and forecasts'}</p>
                    </div>
                </motion.div>

                {/* System Control / Admin */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate(isAdmin ? 'admin' : 'dashboard')}
                    className="glass-card p-6 border-red-200 shadow-sm rounded-2xl cursor-pointer bg-gradient-to-br from-red-50/50 to-white flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                    <div className="w-14 h-14 rounded-full bg-red-100/50 flex items-center justify-center border border-red-200 group-hover:bg-red-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 w-7 h-7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800 font-amiri">{isAdmin ? (lang === 'ar' ? 'لوحة الإدارة' : 'Admin Ecosystem') : (lang === 'ar' ? 'لوحتي الشخصية' : 'My Dashboard')}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">{isAdmin ? (lang === 'ar' ? 'إدارة النظام والتحكم الذكي' : 'System configuration and control') : (lang === 'ar' ? 'حسابك، طاقتك وسجل قراءاتك' : 'Account, energy and reading history')}</p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Fingerprint, Sun, Eye, ChevronDown, ChevronUp, Calendar, Trash2, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

export default function HistoryView({ lang, onNavigate }: any) {
    const { user, login } = useAuth();
    const [readings, setReadings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchHistory = async () => {
            try {
                const q = query(
                    collection(db, `users/${user.uid}/readings`),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setReadings(list);
            } catch(e) {
                console.error("Error fetching history", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        const confirmMsg = lang === 'ar' ? 'هل أنت متأكد من حذف هذه القراءة؟' : 'Are you sure you want to delete this reading?';
        if (!window.confirm(confirmMsg)) return;

        try {
            await deleteDoc(doc(db, `users/${user.uid}/readings`, id));
            setReadings(readings.filter(r => r.id !== id));
            if (expandedId === id) setExpandedId(null);
        } catch(e) {
            console.error("Error deleting reading", e);
        }
    };

    const handleShare = async (readingText: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: lang === 'ar' ? 'حكمتي من تطبيق بصيرة' : 'My Reading from BASIRA',
                    text: readingText
                });
            } catch (err) {
                console.error("Error sharing", err);
            }
        } else {
            alert(lang === 'ar' ? 'المشاركة غير مدعومة في متصفحك' : 'Sharing is not supported in this browser');
        }
    };

    const getTypeDetails = (type: string) => {
        switch(type) {
            case 'coffee':
                return {
                    icon: Coffee,
                    color: 'text-amber-700 bg-amber-55 border-amber-100',
                    label: lang === 'ar' ? 'وشوشات الفنجان' : lang === 'fr' ? 'Cafédomancie' : 'Coffee Reading'
                };
            case 'palmistry':
                return {
                    icon: Fingerprint,
                    color: 'text-stella-gold bg-stella-gold/5 border-stella-gold/20',
                    label: lang === 'ar' ? 'خفايا الكف' : lang === 'fr' ? 'Chiromancie' : 'Palm Reading'
                };
            case 'tarot':
                return {
                    icon: Sun,
                    color: 'text-orange-600 bg-orange-50 border-orange-100',
                    label: lang === 'ar' ? 'أسرار التاروت' : lang === 'fr' ? 'Tarot' : 'Tarot Reading'
                };
            case 'divination':
                return {
                    icon: Eye,
                    color: 'text-purple-600 bg-purple-50 border-purple-100',
                    label: lang === 'ar' ? 'كيمياء الأسماء' : lang === 'fr' ? 'Grand Oracle' : 'Name Divination'
                };
            case 'face':
                return {
                    icon: Eye,
                    color: 'text-green-600 bg-green-50 border-green-100',
                    label: lang === 'ar' ? 'المرآة الكونية' : lang === 'fr' ? 'Lecture du Visage' : 'Face Reading'
                };
            default:
                return {
                    icon: Sparkles,
                    color: 'text-gray-600 bg-gray-50 border-gray-100',
                    label: lang === 'ar' ? 'قراءة فلكية' : 'Reading'
                };
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch(e) {
            return dateStr;
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} 
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} 
            exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} 
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
            className="flex flex-col gap-6 w-full pb-10 min-h-screen"
        >
            <div className="flex items-center gap-3 px-1 mt-4">
                <button 
                    onClick={() => onNavigate('other')}
                    className="p-2 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-stella-gold transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={lang === 'ar' ? 'rotate-180' : ''}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <h2 className="text-3xl font-bold text-stella-gold font-amiri drop-shadow-sm">
                    {lang === 'ar' ? 'سجل قراءاتك الأثيرية' : 'Your Spiritual History'}
                </h2>
            </div>

            {!user ? (
                <div className="glass-card p-8 text-center mx-1 flex flex-col items-center gap-6 mt-6 bg-white border border-gray-150">
                    <div className="w-16 h-16 rounded-full bg-stella-gold/10 border border-stella-gold/30 flex items-center justify-center text-3xl">🔑</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 font-amiri">{lang === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login Required'}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-2 leading-relaxed">
                            {lang === 'ar' ? 'يرجى تسجيل الدخول بحسابك لمزامنة وحفظ قراءاتك والرجوع إليها في أي وقت.' : 'Please log in to retrieve and sync your past readings across devices.'}
                        </p>
                    </div>
                    <button 
                        onClick={login}
                        className="w-full bg-stella-gold hover:bg-stella-amber text-white font-bold py-3.5 rounded-xl shadow-sm transition-colors text-sm font-tajawal"
                    >
                        {lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Log In / Create Account'}
                    </button>
                </div>
            ) : loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 border-2 border-stella-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : readings.length === 0 ? (
                <div className="glass-card p-8 text-center mx-1 flex flex-col items-center gap-5 mt-6 border-dashed border-stella-gold/30 bg-white">
                    <span className="text-5xl">📜</span>
                    <h3 className="text-base font-bold text-stella-gold font-amiri">{lang === 'ar' ? 'سجلّك الأثيري فارغ' : 'Your scrolls are empty'}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-tajawal">
                        {lang === 'ar' ? 'لم تقم بأي قراءة كف أو فنجان أو تاروت محفوظة بعد. ابدأ رحلتك الآن لتظهر قراءاتك هنا.' : 'No readings saved yet. Consult the oracle to populate your history list.'}
                    </p>
                    <button 
                        onClick={() => onNavigate('home')}
                        className="bg-stella-gold/10 border border-stella-gold/30 text-stella-gold font-bold py-2.5 px-6 rounded-xl hover:bg-stella-gold/20 transition-all text-xs font-tajawal"
                    >
                        {lang === 'ar' ? 'الذهاب للرئيسية' : 'Go Home'}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 px-1">
                    {readings.map(reading => {
                        const typeInfo = getTypeDetails(reading.type);
                        const TypeIcon = typeInfo.icon;
                        const isExpanded = expandedId === reading.id;

                        return (
                            <div 
                                key={reading.id}
                                onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                                className={`glass-card overflow-hidden transition-all duration-300 border cursor-pointer hover:shadow-md ${isExpanded ? 'border-stella-gold/40 shadow-sm bg-white' : 'border-gray-150 bg-white/80'}`}
                            >
                                <div className="p-5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${typeInfo.color}`}>
                                            <TypeIcon className="w-5.5 h-5.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 font-amiri">{typeInfo.label}</h4>
                                            <span className="text-[10px] text-gray-400 font-tajawal flex items-center gap-1.5 mt-1">
                                                <Calendar size={11} />
                                                {formatDate(reading.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => handleDelete(reading.id, e)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <button 
                                            className="p-2 text-gray-400 hover:text-stella-gold rounded-lg"
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-gray-100 bg-gray-50/50"
                                        >
                                            <div className="p-6">
                                                <p className="text-gray-700 leading-[2.2] font-tajawal text-sm whitespace-pre-wrap text-justify border-b border-gray-100 pb-5 mb-5">
                                                    {reading.result}
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={(e) => handleShare(reading.result, e)}
                                                        className="px-4 py-2 bg-stella-gold text-white font-bold text-xs rounded-lg hover:bg-stella-amber transition-colors flex items-center gap-1.5 shadow-sm font-tajawal"
                                                    >
                                                        <Share2 size={12} />
                                                        {lang === 'ar' ? 'مشاركة الحكمة' : 'Share Wisdom'}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

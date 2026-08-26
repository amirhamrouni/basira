import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, MoonStar, Check } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function NotificationsView({ t, lang }: any) {
    const { user } = useAuth();
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, 'users', user.uid)).then(d => {
                if(d.exists()) setEnabled(d.data().notificationsEnabled || false);
            });
        }
    }, [user]);

    const toggleNotifications = async () => {
        if (!user) {
            alert(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
            return;
        }
        
        let newState = !enabled;
        
        if (newState) {
            if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    alert(lang === 'ar' ? 'تم رفض الإذن' : 'Permission denied');
                    return;
                }
            }
        }

        setEnabled(newState);
        try {
            await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: newState });
        } catch(e) {
            console.error("Failed to update preferences", e);
        }
    };

    const notifications = [
        {
            id: 1,
            icon: AlertTriangle,
            text: t.notif1,
            color: 'text-red-500',
            bg: 'bg-red-50',
            border: 'border-red-100'
        },
        {
            id: 2,
            icon: MoonStar,
            text: t.notif2,
            color: 'text-stella-amber',
            bg: 'bg-stella-amber/5',
            border: 'border-stella-border/50'
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-3xl font-bold text-gray-800 font-amiri flex items-center gap-2">
                    <Bell className="text-stella-gold w-6 h-6" />
                    {t.notifTitle}
                </h2>
                {user && (
                    <button 
                        onClick={toggleNotifications}
                        className={`text-xs px-3 py-1.5 rounded-full font-tajawal transition-colors flex items-center gap-1 border ${enabled ? 'border-stella-gold text-stella-gold bg-stella-gold/10' : 'border-gray-300 text-gray-500 bg-gray-50'}`}
                    >
                        {enabled && <Check size={12} />}
                        {lang === 'ar' ? (enabled ? 'الاشعارات مفعلة' : 'تفعيل الاشعارات') : (enabled ? 'Enabled' : 'Enable Setup')}
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
                {notifications.map(n => {
                    const Icon = n.icon;
                    return (
                        <div key={n.id} className={`glass-card p-5 flex items-start gap-4 border ${n.border} ${n.bg} shadow-sm rounded-2xl`}>
                            <div className="mt-0.5">
                                <Icon className={`${n.color} w-5 h-5`} />
                            </div>
                            <p className="text-[14px] text-gray-700 leading-relaxed font-tajawal">
                                {n.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

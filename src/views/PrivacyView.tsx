import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, FileText, LockKeyhole, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { GoogleAuthProvider, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { isPrivacyOptionsRequired, showAdPrivacyOptions } from '../utils/rewardedAds';

export default function PrivacyView({ lang }: { lang: 'ar' | 'en' | 'fr' }) {
    const isAr = lang === 'ar';
    const isFr = lang === 'fr';
    const { user, login } = useAuth();
    const [confirmText, setConfirmText] = useState('');
    const [status, setStatus] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [showAdPrivacy, setShowAdPrivacy] = useState(false);
    const [adPrivacyBusy, setAdPrivacyBusy] = useState(false);
    const [adPrivacyStatus, setAdPrivacyStatus] = useState('');

    useEffect(() => {
        let active = true;
        isPrivacyOptionsRequired()
            .then(required => { if (active) setShowAdPrivacy(required); })
            .catch(error => console.warn('Ad privacy status unavailable', error));
        return () => { active = false; };
    }, []);

    const privacyText = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

    const openAdPrivacy = async () => {
        setAdPrivacyBusy(true);
        setAdPrivacyStatus('');
        try {
            await showAdPrivacyOptions();
            setShowAdPrivacy(await isPrivacyOptionsRequired());
            setAdPrivacyStatus(privacyText(
                'تم تحديث اختيارات خصوصية الإعلانات.',
                'Your ad privacy choices were updated.',
                'Vos choix de confidentialité publicitaire ont été mis à jour.'
            ));
        } catch (error) {
            console.error('Ad privacy options failed', error);
            setAdPrivacyStatus(privacyText(
                'تعذّر فتح خيارات خصوصية الإعلانات الآن.',
                'Ad privacy choices are unavailable right now.',
                'Les choix de confidentialité publicitaire sont indisponibles pour le moment.'
            ));
        } finally {
            setAdPrivacyBusy(false);
        }
    };

    const removeAccount = async () => {
        if (!user || confirmText !== (isAr ? 'حذف' : 'DELETE')) return;
        setDeleting(true); setStatus('');
        try {
            const readings = await getDocs(collection(db, 'users', user.uid, 'readings'));
            for (let start = 0; start < readings.docs.length; start += 450) {
                const batch = writeBatch(db);
                readings.docs.slice(start, start + 450).forEach(item => batch.delete(item.ref));
                await batch.commit();
            }
            await deleteDoc(doc(db, 'users', user.uid));
            try { await deleteUser(user); }
            catch (error: any) {
                if (error?.code !== 'auth/requires-recent-login') throw error;
                await reauthenticateWithPopup(user, new GoogleAuthProvider());
                await deleteUser(auth.currentUser!);
            }
            localStorage.removeItem('basira_beta_trial');
            setStatus(isAr ? 'تم حذف حسابك وبيانات قراءاتك.' : 'Your account and reading data were deleted.');
        } catch { setStatus(isAr ? 'تعذر الحذف. أعد تسجيل الدخول وحاول مجدداً.' : 'Deletion failed. Sign in again and retry.'); }
        finally { setDeleting(false); }
    };

    return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">
        <section className="oracle-frame rounded-[28px] p-6"><div className="relative z-10 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full border border-[#d7ad58]/35 bg-[#d7ad58]/10"><ShieldCheck className="h-6 w-6 text-[#f3d994]" /></div><div><p className="oracle-kicker text-xs">PRIVACY & TERMS</p><h1 className="oracle-title font-amiri text-3xl font-bold">{isAr ? 'الخصوصية وشروط الاستخدام' : 'Privacy & Terms'}</h1></div></div></section>
        <Policy icon={LockKeyhole} title={isAr ? 'البيانات التي نعالجها' : 'Data we process'} body={isAr ? 'نستخدم بيانات تسجيل Google لإنشاء الحساب. صور الوجه والكف والفنجان تُرسل مؤقتاً إلى محرك التحليل لإنتاج القراءة ولا تُضاف إلى ملفك الشخصي. تاريخ الميلاد ومكانه يُستخدمان لتخصيص القراءة الفلكية ولا يُحفظان في حسابك.' : 'Google sign-in data creates your account. Uploaded images are processed temporarily to generate a reading and are not added to your profile. Birth details personalize astrology readings and are not saved to your account.'} />
        <Policy icon={FileText} title={isAr ? 'طبيعة المحتوى' : 'Nature of the content'} body={isAr ? 'القراءات والتاروت والأبراج وتفسير الأحلام محتوى رمزي للترفيه والتأمل، وليست حقائق مؤكدة أو بديلاً عن الرعاية الطبية أو النفسية أو القانونية أو المالية. لا تتخذ قراراً خطيراً اعتماداً عليها وحدها.' : 'Readings, tarot, horoscopes and dream interpretations are symbolic entertainment and reflection, not verified facts or medical, mental-health, legal or financial advice.'} />
        <Policy icon={ShieldCheck} title={isAr ? 'الحفظ والحماية' : 'Storage & protection'} body={isAr ? 'نحفظ ملف الحساب وسجل القراءات الذي تختار حفظه في Firebase. مفاتيح الذكاء الاصطناعي تبقى في الخادم ولا تظهر في التطبيق أو GitHub. تُطبق حدود يومية لمنع إساءة الاستخدام.' : 'Account data and readings you choose to save are stored in Firebase. AI keys remain server-side. Daily limits protect the service from abuse.'} />
        {showAdPrivacy && <section className="oracle-frame rounded-3xl p-5"><div className="relative z-10"><div className="flex items-start gap-3"><Settings2 className="mt-1 h-5 w-5 text-[#d7ad58]" /><div><h2 className="font-amiri text-xl font-bold text-[#f3d994]">{privacyText('خصوصية الإعلانات', 'Ad privacy choices', 'Confidentialité publicitaire')}</h2><p className="mt-2 text-sm leading-7 text-white/55">{privacyText('يمكنك مراجعة أو تغيير اختيارات الموافقة المتعلقة بالإعلانات.', 'Review or change your consent choices for advertising.', 'Consultez ou modifiez vos choix de consentement publicitaire.')}</p></div></div><button onClick={() => void openAdPrivacy()} disabled={adPrivacyBusy} className="mt-4 w-full rounded-xl border border-[#d7ad58]/35 bg-[#d7ad58]/10 py-4 font-bold text-[#f3d994] disabled:opacity-40">{adPrivacyBusy ? privacyText('جارٍ الفتح...', 'Opening...', 'Ouverture...') : privacyText('إدارة خيارات الإعلانات', 'Manage ad privacy choices', 'Gérer les choix publicitaires')}</button>{adPrivacyStatus && <p className="mt-3 text-center text-sm text-[#f3d994]">{adPrivacyStatus}</p>}</div></section>}
        <section className="oracle-frame rounded-3xl p-5"><div className="relative z-10"><div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 text-red-400" /><div><h2 className="font-amiri text-xl font-bold text-red-300">{isAr ? 'حذف الحساب نهائياً' : 'Permanently delete account'}</h2><p className="mt-2 text-sm leading-7 text-white/55">{isAr ? 'يحذف ملفك وسجل قراءاتك وحساب تسجيل الدخول. لا يمكن التراجع عن العملية.' : 'Deletes your profile, reading history and sign-in account. This cannot be undone.'}</p></div></div>{user ? <><input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={isAr ? 'اكتب: حذف' : 'Type: DELETE'} className="mt-4 w-full rounded-xl border p-3" /><button onClick={removeAccount} disabled={deleting || confirmText !== (isAr ? 'حذف' : 'DELETE')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 py-4 font-bold text-red-300 disabled:opacity-35"><Trash2 className="h-5 w-5" />{deleting ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : (isAr ? 'حذف حسابي وبياناتي' : 'Delete my account and data')}</button></> : <button onClick={login} className="mt-4 w-full rounded-xl bg-[#d7ad58] py-4 font-bold text-[#0a0710]">{isAr ? 'سجّل الدخول لإدارة بياناتك' : 'Sign in to manage your data'}</button>}{status && <p className="mt-3 text-center text-sm text-[#f3d994]">{status}</p>}</div></section>
        <p className="px-2 text-center text-xs leading-6 text-white/35">{isAr ? 'استخدام بصيرة يعني قبول هذه الشروط. آخر تحديث: سبتمبر 2026.' : 'Using BASIRA means accepting these terms. Last updated: September 2026.'}</p>
    </motion.div>;
}

function Policy({ icon: Icon, title, body }: { icon: any; title: string; body: string }) { return <section className="oracle-frame rounded-3xl p-5"><div className="relative z-10 flex items-start gap-3"><Icon className="mt-1 h-5 w-5 shrink-0 text-[#d7ad58]" /><div><h2 className="font-amiri text-xl font-bold text-[#f3d994]">{title}</h2><p className="mt-2 text-[15px] leading-8 text-white/60">{body}</p></div></div></section>; }

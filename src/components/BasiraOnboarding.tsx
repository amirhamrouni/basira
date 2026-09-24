import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { BasiraContext, DEFAULT_BASIRA_CONTEXT, toFirestoreBasiraContext } from '../utils/basiraContext';

export default function BasiraOnboarding({ lang }: { lang: 'ar'|'en'|'fr' }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<BasiraContext>({ ...DEFAULT_BASIRA_CONTEXT, language: lang, preferredName: user?.displayName?.split(' ')[0] || '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  if (!user || profile?.onboardingCompleted) return null;

  const labels = lang === 'ar'
    ? { title:'دع بصيرة تتعرّف عليك', subtitle:'معلومات قليلة تجعل قراءاتك أقرب إليك.', name:'بأي اسم تحب أن تناديك بصيرة؟', birth:'تاريخ الميلاد', origin:'بلد الأصل (مثال TN)', residence:'بلد الإقامة (مثال NL)', focus:'ما الذي يشغلك أكثر؟ اختر حتى 3', save:'ابدأ مع بصيرة', note:'تُستخدم هذه المعلومات لتخصيص قراءاتك ويمكن تعديلها لاحقاً. لا نستنتج أصلك من عنوان IP.' }
    : lang === 'fr'
    ? { title:'Laissez Basira vous connaître', subtitle:'Quelques détails pour personnaliser vos lectures.', name:'Comment Basira doit-elle vous appeler ?', birth:'Date de naissance', origin:"Pays d'origine (ex. TN)", residence:'Pays de résidence (ex. NL)', focus:"Qu'est-ce qui compte le plus ? Choisissez jusqu'à 3", save:'Commencer avec Basira', note:"Ces informations personnalisent vos lectures et peuvent être modifiées plus tard. Nous ne déduisons pas votre origine de l'adresse IP." }
    : { title:'Let Basira know you', subtitle:'A few details make your readings more personal.', name:'What should Basira call you?', birth:'Birth date', origin:'Origin country (e.g. TN)', residence:'Residence country (e.g. NL)', focus:'What matters most? Choose up to 3', save:'Start with Basira', note:'Used to personalize your readings and editable later. We do not infer your origin from IP.' };

  const interests = [
    ['love', lang === 'ar' ? 'الحب' : lang === 'fr' ? 'Amour' : 'Love'],
    ['money', lang === 'ar' ? 'المال' : lang === 'fr' ? 'Argent' : 'Money'],
    ['work', lang === 'ar' ? 'العمل' : lang === 'fr' ? 'Travail' : 'Work'],
    ['family', lang === 'ar' ? 'العائلة' : lang === 'fr' ? 'Famille' : 'Family'],
    ['travel', lang === 'ar' ? 'السفر' : lang === 'fr' ? 'Voyage' : 'Travel'],
    ['future', lang === 'ar' ? 'المستقبل' : lang === 'fr' ? 'Avenir' : 'Future'],
  ] as const;

  const toggleInterest = (value:string) => setForm(f => ({
    ...f,
    interests: f.interests.includes(value)
      ? f.interests.filter(x => x !== value)
      : f.interests.length < 3 ? [...f.interests, value] : f.interests
  }));

  const save = async () => {
    if (!form.preferredName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const cleanForm = toFirestoreBasiraContext(form, lang);
      await setDoc(doc(db,'users',user.uid), { basiraContext: cleanForm, onboardingCompleted:true, contextUpdatedAt:serverTimestamp() }, { merge:true });
    } catch (error) {
      console.error('Onboarding save failed', error);
      setSaveError(lang === 'ar' ? 'تعذّر حفظ معلوماتك. تحقق من الاتصال وحاول مجدداً.' : lang === 'fr' ? 'Impossible d’enregistrer vos informations. Vérifiez la connexion et réessayez.' : 'Could not save your information. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[200] bg-[#090610] p-5 overflow-y-auto" dir={lang==='ar'?'rtl':'ltr'}>
    <div className="mx-auto max-w-md pt-10 space-y-5">
      <div>
        <h2 className="font-amiri text-3xl font-bold text-stella-gold">{labels.title}</h2>
        <p className="mt-2 text-sm text-white/55">{labels.subtitle}</p>
      </div>
      <input className="w-full rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white" placeholder={labels.name} value={form.preferredName} maxLength={50} onChange={e=>setForm({...form,preferredName:e.target.value})}/>
      <label className="block text-sm text-white/70">{labels.birth}<input type="date" className="mt-2 w-full rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label>
      <div className="grid grid-cols-2 gap-3">
        <input className="rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white uppercase" placeholder={labels.origin} value={form.originCountry||''} maxLength={2} onChange={e=>setForm({...form,originCountry:e.target.value.replace(/[^a-z]/gi,'').toUpperCase().slice(0,2)})}/>
        <input className="rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white uppercase" placeholder={labels.residence} value={form.residenceCountry||''} maxLength={2} onChange={e=>setForm({...form,residenceCountry:e.target.value.replace(/[^a-z]/gi,'').toUpperCase().slice(0,2)})}/>
      </div>
      <p className="text-sm text-white/70">{labels.focus}</p>
      <div className="grid grid-cols-3 gap-2">{interests.map(([value,label])=><button type="button" key={value} onClick={()=>toggleInterest(value)} className={`rounded-xl border p-3 text-sm transition ${form.interests.includes(value)?'border-stella-gold bg-stella-gold/15 text-stella-gold':'border-white/10 text-white/60'}`}>{label}</button>)}</div>
      {saveError && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{saveError}</div>}
      <button disabled={saving || !form.preferredName.trim() || !form.birthDate} onClick={save} className="w-full rounded-2xl bg-stella-gold p-4 font-bold text-[#171022] disabled:opacity-50">{saving?'...':labels.save}</button>
      <p className="text-[11px] leading-5 text-white/40">{labels.note}</p>
    </div>
  </div>;
}

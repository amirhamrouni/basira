import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { BasiraContext, DEFAULT_BASIRA_CONTEXT } from '../utils/basiraContext';

export default function BasiraOnboarding({ lang }: { lang: 'ar'|'en'|'fr' }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<BasiraContext>({ ...DEFAULT_BASIRA_CONTEXT, language: lang, preferredName: user?.displayName?.split(' ')[0] || '' });
  const [saving, setSaving] = useState(false);
  if (!user || profile?.onboardingCompleted) return null;

  const labels = lang === 'ar'
    ? { title:'خلّيني نتعرّف عليك', name:'كيف تحب بصيرة تناديك؟', birth:'تاريخ الميلاد', origin:'بلد الأصل (مثال TN)', residence:'بلد الإقامة (مثال NL)', focus:'شنو يشغلك أكثر؟', save:'ابدأ مع بصيرة' }
    : { title:'Let Basira know you', name:'What should Basira call you?', birth:'Birth date', origin:'Origin country (e.g. TN)', residence:'Residence country (e.g. NL)', focus:'What matters most?', save:'Start with Basira' };

  const toggleInterest = (value:string) => setForm(f => ({...f, interests: f.interests.includes(value) ? f.interests.filter(x=>x!==value) : [...f.interests,value].slice(-3)}));
  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db,'users',user.uid), { basiraContext: form, onboardingCompleted:true, contextUpdatedAt:serverTimestamp() }, { merge:true });
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[200] bg-[#090610] p-5 overflow-y-auto" dir={lang==='ar'?'rtl':'ltr'}>
    <div className="mx-auto max-w-md pt-10 space-y-5">
      <h2 className="font-amiri text-3xl font-bold text-stella-gold">{labels.title}</h2>
      <input className="w-full rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white" placeholder={labels.name} value={form.preferredName} onChange={e=>setForm({...form,preferredName:e.target.value})}/>
      <label className="block text-sm text-white/70">{labels.birth}<input type="date" className="mt-2 w-full rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label>
      <div className="grid grid-cols-2 gap-3">
        <input className="rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white uppercase" placeholder={labels.origin} value={form.originCountry||''} onChange={e=>setForm({...form,originCountry:e.target.value.toUpperCase().slice(0,2)})}/>
        <input className="rounded-2xl p-4 bg-white/5 border border-stella-gold/20 text-white uppercase" placeholder={labels.residence} value={form.residenceCountry||''} onChange={e=>setForm({...form,residenceCountry:e.target.value.toUpperCase().slice(0,2)})}/>
      </div>
      <p className="text-sm text-white/70">{labels.focus}</p>
      <div className="grid grid-cols-3 gap-2">{['love','money','work','family','travel','future'].map(x=><button type="button" key={x} onClick={()=>toggleInterest(x)} className={`rounded-xl border p-3 text-sm ${form.interests.includes(x)?'border-stella-gold bg-stella-gold/15 text-stella-gold':'border-white/10 text-white/60'}`}>{x}</button>)}</div>
      <button disabled={saving || !form.preferredName.trim()} onClick={save} className="w-full rounded-2xl bg-stella-gold p-4 font-bold text-[#171022] disabled:opacity-50">{saving?'...':labels.save}</button>
      <p className="text-[11px] leading-5 text-white/40">{lang==='ar'?'هذه المعلومات تُستخدم لتخصيص قراءاتك ويمكن تعديلها لاحقاً. لا نستنتج أصلك من عنوان IP.':'Used to personalize readings and editable later. We do not infer your origin from IP.'}</p>
    </div>
  </div>;
}

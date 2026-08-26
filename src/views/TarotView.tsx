import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserChronosMatrix } from '../utils/contextCollector';
import { getApiUrl } from '../utils/api';
import CosmicRewardModal from '../components/CosmicRewardModal';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function TarotView({ t, adminPrompt, lang, state, setState }: any) {
    const { drawnCards, reading, isLoading, sessionCards, lastDrawTime } = state;
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [rewardClaimed, setRewardClaimed] = useState(false);
    const { user } = useAuth();

    const saveResult = async (resultText: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/readings`), {
                userId: user.uid,
                type: 'tarot',
                result: resultText,
                createdAt: new Date().toISOString()
            });
        } catch(e) {
            console.error("Failed to save reading", e);
        }
    };

    // 78 standard tarot cards with a mix of Major and Minor Arcana for visuals
    const cardImagesBase = [
        "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg", 
        "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg"
    ];

    // Maintain stable random cards for this session across view switches
    useEffect(() => {
        if (!sessionCards || sessionCards.length === 0) {
            const shuffled = [...cardImagesBase].sort(() => 0.5 - Math.random());
            setState({ ...state, sessionCards: shuffled.slice(0, 3) });
        }
    }, []);

    const isRateLimited = () => {
        if (lastDrawTime) {
            const hoursPassed = (Date.now() - lastDrawTime) / (1000 * 60 * 60);
            return hoursPassed < 12; // 12 hour cooldown
        }
        return false;
    };

    const drawNext = () => {
        if (drawnCards.length === 0 && isRateLimited()) {
            return;
        }

        if (drawnCards.length < 3) {
            const nextCards = [...drawnCards, drawnCards.length];
            setState({ ...state, drawnCards: nextCards });
            if (nextCards.length === 3) {
                generateReading(nextCards);
            }
        }
    };

    const generateReading = async (nextCards: number[]) => {
        setState({ ...state, drawnCards: nextCards, isLoading: true });
        try {
            const deviceData = UserChronosMatrix.fingerprint;
            const res = await fetch(getApiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: `${adminPrompt}\nDevice: \n${deviceData}`,
                    prompt: `The user focused deeply and drew 3 Tarot cards representing Past, Present, and Future. Provide a highly mystical, powerful, and flowing reading connecting the three in ${lang === 'ar' ? 'Arabic' : 'English'}. Act as an elite, deeply perceptive, human-like Chaldæan mystic. Speak in elegant, accessible, down-to-earth ${lang === 'ar' ? 'Arabic' : 'English'}. Completely ban all mechanical or automated framing sentences (e.g., avoid "حسب علم التنجيم", "أنا نموذج ذكاء اصطناعي", "بناءً على المعطيات"). Force yourself to naturally reference the user's hidden environment context within the first two sentences of the response text (e.g., "أرى في طالعك وفي هذه الساعة المتقدمة من ليل الجمعة، أن..."). Anchor predictions on realistic, profound, and deeply resonant human experiences to execute a flawless Barnum effect. Reference their exact time and environment seamlessly: ${deviceData}.`
                })
            });
            const data = await res.json();
            const generatedReading = data.reply || (lang === 'ar' ? "فشلت قراءة الطالع، يبدو أن الأرواح ترفض التحدث الآن." : "Failed to read fortunes, the spirits refuse to speak now.");
            setState({ ...state, reading: generatedReading, isLoading: false, lastDrawTime: Date.now() });
            saveResult(generatedReading);
        } catch (err) {
            setState({ ...state, reading: lang === 'ar' ? "انقطع الاتصال الكوني." : "Cosmic connection severed.", isLoading: false });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center w-full pb-8">
            
            <div className="w-full h-48 -mt-4 mb-8 relative rounded-b-[40px] overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1633519826330-819777174db2?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-85"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-10">
                    <h2 className="text-4xl font-bold text-stella-gold mb-2 text-center drop-shadow-sm font-amiri tracking-wide">
                        {t.tarot}
                    </h2>
                </div>
            </div>
            
            {drawnCards.length === 0 && isRateLimited() ? (
                <div className="glass-surface p-6 border-red-200 bg-red-50 text-center mb-4 mt-6 rounded-[24px]">
                    <h3 className="text-red-600 font-bold mb-2 font-amiri text-xl tracking-wide">{t.tarotLimitTitle}</h3>
                    <p className="text-gray-600 font-tajawal text-sm leading-relaxed">{t.tarotLimit}</p>
                </div>
            ) : (
                <p className="text-gray-600 text-sm text-center mb-10 w-11/12 leading-relaxed font-tajawal">
                    {t.tarotInstruction}
                </p>
            )}

            {/* Deck Area */}
            <div className={`flex justify-center gap-4 w-full max-w-[380px] mb-12 h-[200px] perspective-[1200px] ${(drawnCards.length === 0 && isRateLimited()) ? 'opacity-50 pointer-events-none' : ''}`}>
                {[0, 1, 2].map((idx) => {
                    const isDrawn = drawnCards.includes(idx);
                    return (
                        <motion.div 
                            key={idx}
                            layout
                            className="relative w-[30%] h-full preserve-3d cursor-pointer"
                            onClick={() => {
                                if (drawnCards.length === idx && drawnCards.length < 3 && !isLoading) drawNext();
                            }}
                            animate={{ 
                                rotateY: isDrawn ? 180 : 0,
                                y: isDrawn ? 0 : [0, -10, 0],
                                scale: isDrawn ? 1.05 : 1
                            }}
                            transition={{ 
                                duration: 1, 
                                y: { repeat: Infinity, duration: 3, delay: idx * 0.4, ease: "easeInOut" }
                            }}
                        >
                            {/* Card Back */}
                            <div className="absolute inset-0 backface-hidden bg-[url('https://images.unsplash.com/photo-1550596334-7bb40a71b6ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80')] bg-cover bg-center rounded-[20px] border-2 border-stella-gold/50 shadow-md overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-stella-gold/20 to-transparent"></div>
                                {drawnCards.length === idx && !isLoading && <div className="absolute inset-0 bg-stella-gold/10 animate-pulse-slow"></div>}
                            </div>
                            
                            {/* Card Front */}
                            <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-[20px] overflow-hidden border-[3px] border-stella-gold shadow-md bg-black">
                                <img src={sessionCards[idx]} className="w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent mix-blend-multiply pointer-events-none"></div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {drawnCards.length < 3 && !isLoading && (
                <button 
                    onClick={drawNext} 
                    className="bg-stella-gold text-white font-bold py-4 px-14 rounded-full shadow-md hover:bg-stella-amber hover:scale-105 transition-all duration-300 text-lg tracking-widest font-amiri uppercase"
                >
                    {t.tarotDrawBtn} <span className="opacity-90 font-sans tracking-normal ml-2">({drawnCards.length}/3)</span>
                </button>
            )}

            {isLoading && (
                <div className="text-stella-gold text-lg font-amiri font-bold animate-pulse tracking-widest mt-4">
                    {t.readingLoading}
                </div>
            )}

            {reading && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="w-full mt-6 mb-6">
                    <div className="glass-card p-8 bg-white border border-gray-100 shadow-sm relative overflow-hidden rounded-[32px]">
                        <div className="absolute -top-10 -left-10 w-48 h-48 bg-stella-gold/5 rounded-full blur-[50px] animate-pulse-slow"></div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-stella-amber/5 rounded-full blur-[40px]"></div>
                        <p className="text-gray-700 text-base md:text-lg leading-[2.4] whitespace-pre-wrap font-tajawal relative z-10 text-justify">
                            {reading}
                        </p>
                        <button 
                            onClick={() => {
                                const shuffled = [...cardImagesBase].sort(() => 0.5 - Math.random());
                                setState({ ...state, drawnCards: [], reading: null, sessionCards: shuffled.slice(0, 3) });
                                setRewardClaimed(false);
                            }}
                            className="w-full mt-6 border border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 hover:text-stella-gold transition-all duration-300 text-sm font-amiri tracking-wide"
                        >
                            {lang === 'ar' ? 'سحب أوراق جديدة' : 'Draw New Cards'}
                        </button>

                        {!rewardClaimed && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setShowRewardModal(true)}
                                className="w-full mt-4 bg-stella-gold/10 border border-stella-gold/30 text-stella-gold py-4 rounded-xl hover:bg-stella-gold/20 hover:shadow-sm transition-all flex items-center justify-center gap-2 group"
                            >
                                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm tracking-widest font-amiri uppercase">
                                    {lang === 'ar' ? 'افتح السر الكوني' : 'Unlock Cosmic Secret'}
                                </span>
                            </motion.button>
                        )}
                        
                        {rewardClaimed && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-6 p-5 rounded-2xl border border-stella-gold/20 bg-stella-gold/5 shadow-sm"
                            >
                                <h4 className="text-stella-gold font-bold font-amiri mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> 
                                    {lang === 'ar' ? 'الرسالة المخفية' : 'The Hidden Message'}
                                </h4>
                                <p className="text-gray-600 text-sm leading-relaxed font-tajawal">
                                    {lang === 'ar' 
                                        ? 'النجوم تهمس بأن هناك طاقة غير مرئية تحميك هذا الأسبوع. ثق بحدسك، فهو بوابتك لفرصة عظيمة قادمة.' 
                                        : 'The stars whisper of an unseen energy protecting you this week. Trust your intuition entirely; it is the gateway to an upcoming grand opportunity.'}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}

            <CosmicRewardModal 
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                onRewardComplete={() => {
                    setRewardClaimed(true);
                }}
                lang={lang}
                rewardType="insight"
                title={lang === 'ar' ? 'السر الكوني' : 'The Cosmic Secret'}
                description={lang === 'ar' ? 'قدم جزءاً من طاقتك لكشف رسالة مصيرية مخفية في قراءتك الحالية.' : 'Offer a fragment of your energy to reveal a hidden destiny message within your current reading.'}
            />
        </motion.div>
    );
}

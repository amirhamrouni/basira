export type TarotCard = {
    id: string;
    name: string;
    nameAr: string;
    arcana: 'major' | 'minor';
    suit?: string;
    symbol: string;
    theme: string;
    reflection: string;
    imageUrl?: string;
};

const major: TarotCard[] = [
    ['fool','The Fool','الأحمق','🜁','بداية وحرية','تجربة جديدة تحتاج فضولاً مع الانتباه للمخاطر'],
    ['magician','The Magician','الساحر','✦','إرادة ومهارة','استخدم ما تملكه الآن بدل انتظار أدوات مثالية'],
    ['high-priestess','The High Priestess','الكاهنة العليا','☾','حدس وصمت','تمهّل واستمع لما لم يُقل بعد'],
    ['empress','The Empress','الإمبراطورة','♀','رعاية ونمو','امنح ما تريد تنميته وقتاً وعناية ملموسة'],
    ['emperor','The Emperor','الإمبراطور','♈','نظام وحدود','وضوح القواعد قد يحمي طاقتك من التشتت'],
    ['hierophant','The Hierophant','الكاهن','⚜','تعلم وتقليد','افهم القاعدة قبل أن تقرر اتباعها أو تجاوزها'],
    ['lovers','The Lovers','العشاق','♡','اختيار وقيم','القرار الحقيقي يكشف ما تعتبره مهماً'],
    ['chariot','The Chariot','العربة','✧','اتجاه وعزم','وحّد دوافعك المتعارضة قبل التقدم'],
    ['strength','Strength','القوة','∞','شجاعة ولطف','القوة الهادئة قد تنجح حيث يفشل الضغط'],
    ['hermit','The Hermit','الناسك','⌁','عزلة وحكمة','مسافة قصيرة عن الضجيج تساعدك على رؤية ما تريد'],
    ['wheel','Wheel of Fortune','عجلة الحظ','◉','دورة وتغيير','تغيّر الظروف لا يلغي قدرتك على اختيار ردك'],
    ['justice','Justice','العدالة','⚖','ميزان ومسؤولية','راجع الوقائع والنتائج قبل إصدار حكم'],
    ['hanged-man','The Hanged Man','المعلّق','▽','توقف ومنظور','ربما تحتاج رؤية المسألة من زاوية معاكسة'],
    ['death','Death','الموت','♇','نهاية وتحول','نهاية مرحلة قد تفتح مساحة لبداية مختلفة وليست نبوءة بالموت'],
    ['temperance','Temperance','الاعتدال','△','توازن ودمج','امزج بين حلّين بدل الوقوف عند طرف واحد'],
    ['devil','The Devil','الشيطان','♑','تعلق وظل','سمِّ العادة أو الخوف الذي يضيّق خياراتك'],
    ['tower','The Tower','البرج','ϟ','انكشاف وتغيير','معلومة مفاجئة قد تهدم افتراضاً لا حياتك كلها'],
    ['star','The Star','النجمة','★','أمل وتجدد','الأمل يصبح أقوى حين يرتبط بخطوة قابلة للتنفيذ'],
    ['moon','The Moon','القمر','☽','غموض وخيال','ميّز بين الإحساس القوي والدليل الواضح'],
    ['sun','The Sun','الشمس','☉','وضوح وحيوية','شارك ما ينجح واسمح لنفسك بالفرح به'],
    ['judgement','Judgement','الحُكم','♬','صحوة ومراجعة','تعلّم من الماضي من غير أن تحبس نفسك داخله'],
    ['world','The World','العالم','⊕','اكتمال واتساع','اعترف بما اكتمل قبل الانتقال للدورة التالية']
].map(([id,name,nameAr,symbol,theme,reflection], index) => {
    const fileNames = ['Fool','Magician','High_Priestess','Empress','Emperor','Hierophant','Lovers','Chariot','Strength','Hermit','Wheel_of_Fortune','Justice','Hanged_Man','Death','Temperance','Devil','Tower','Star','Moon','Sun','Judgement','World'];
    const number = String(index).padStart(2, '0');
    return {
        id, name, nameAr, symbol, theme, reflection, arcana: 'major',
        imageUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/RWS_Tarot_${number}_${fileNames[index]}.jpg?width=420`
    } as TarotCard;
});

const suits = [
    { id: 'wands', name: 'Wands', ar: 'العصي', symbol: '♣', domain: 'العمل والطاقة والمبادرة' },
    { id: 'cups', name: 'Cups', ar: 'الكؤوس', symbol: '◡', domain: 'العاطفة والعلاقات والخيال' },
    { id: 'swords', name: 'Swords', ar: 'السيوف', symbol: '†', domain: 'الفكر والقرار والصراع' },
    { id: 'pentacles', name: 'Pentacles', ar: 'الخماسيات', symbol: '⛤', domain: 'المال والجسد والاستقرار' }
];
const ranks = [
    ['ace','Ace','الآس','بذرة جديدة'],['two','Two','اثنان','اختيار أو توازن'],['three','Three','ثلاثة','تعاون ونمو'],
    ['four','Four','أربعة','ثبات وحدود'],['five','Five','خمسة','احتكاك أو نقص'],['six','Six','ستة','انتقال واستعادة'],
    ['seven','Seven','سبعة','اختبار وتقييم'],['eight','Eight','ثمانية','حركة أو انضباط'],['nine','Nine','تسعة','نضج واقتراب'],
    ['ten','Ten','عشرة','اكتمال دورة'],['page','Page','الرسول','خبر وتعلّم'],['knight','Knight','الفارس','اندفاع وسعي'],
    ['queen','Queen','الملكة','نضج داخلي'],['king','King','الملك','قيادة ومسؤولية']
];

const minor = suits.flatMap(suit => ranks.map(([id,name,ar,theme]) => ({
    id: `${suit.id}-${id}`,
    name: `${name} of ${suit.name}`,
    nameAr: `${ar} ${suit.ar}`,
    arcana: 'minor' as const,
    suit: suit.id,
    symbol: suit.symbol,
    theme: `${theme} في ${suit.domain}`,
    reflection: `انظر إلى ${suit.domain} من زاوية ${theme}، وحدد تصرفاً واحداً يمكنك اختباره عملياً`
})));

export const tarotDeck: TarotCard[] = [...major, ...minor];

export const getSuspiciousReading = (zodiacId: string, baseReading: string): string => {
    // We want the readings to be very suspicious, accurate-sounding, and engaging.
    // They change daily based on the seed.
    const dateSeed = new Date().toDateString();
    const hash = Array.from(dateSeed + zodiacId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const suspiciousIntros = [
        "نجومك تهمس اليوم بشيء مريب...",
        "هناك تفاصيل صغيرة تجاهلتها مؤخراً، واليوم ستعود لتطاردك.",
        "الطاقة المحيطة بك اليوم ثقيلة، شخص ما يحاول التدخل في مسارك.",
        "تم ترتيب هذا اليوم بعناية ليختبر صبرك، انتبه لمن يراقبك عن كثب.",
        "رسالة خفية ستأتيك قبل منتصف الليل، لا تتجاهل الإشارة.",
        "الماضي ينتظر في الظل، وثمة من يحرك الخيوط من خلف ظهرك.",
        "الصدفة التي حدثت مؤخراً لم تكن صدفة أبداً.. الكواكب تكشف المستور.",
        "أحدهم يبتسم لك بنوايا مختلفة تماماً.. كن حذراً في ثقتك اليوم."
    ];

    const specificTwists = [
        "راقب الرسائل أو المكالمات في الساعات القادمة، هناك كلمة تبدو بريئة ولكنها تحمل معنى مزدوجاً سيغير الكثير.",
        "قرار مالي كنت تنوي اتخاذه.. النجوم تطلب منك التوقف الآن، هناك فخ غير مرئي ينتظرك.",
        "شخص من برج مائي أو ناري يخطط لشيء يخصك، قد يكون خيراً أو شراً، لكنه بالتأكيد سيقلب موازينك.",
        "احذر من إعطاء وعود اليوم، طاقة الكواكب تشير إلى أنك قد تندم على كلمة قلتها في لحظة اندفاع.",
        "هناك من يبحث في ماضيك اليوم، زلة لسان قديمة قد تعود للسطح.. حافظ على هدوئك وأنكر ما لا تتأكد منه.",
        "ستجد شيئاً كنت تعتقد أنك فقدته، ظهوره اليوم ليس مجرد صدفة بل تحذير كوني."
    ];

    const intro = suspiciousIntros[hash % suspiciousIntros.length];
    const twist = specificTwists[(hash * 2) % specificTwists.length];

    return `${intro} ${baseReading} \n\nتحذير كوني: ${twist}`;
};

const dailyMessages = [
    "النجوم تناديك اليوم لتكتشف ما يخبئه لك القدر. افتح تطبيق بصيرة بابل لمعرفة المزيد.",
    "طاقة الكون متناغمة اليوم، هل أنت مستعد استقبال رسالتك الفلكية؟",
    "صدفة أم قدر؟ اكتشف ذلك عبر قراءة طالعك اليومي في بصيرة بابل.",
    "رسالة جديدة من النجوم تنتظر من يقرأها. لا تفوت فرصتك اليوم.",
    "هل تتساءل عما إذا كان اليوم هو الوقت المناسب للمبادرة؟ دع الفلك يجيبك.",
    "ضوء القمر ينير لك مسارات مخفية، استكشفها الآن مع قراءاتنا العميقة.",
    "حكمتك البابلية لليوم باتت جاهزة. افتح التطبيق لتستلهم منها."
];

let activeTimeoutId: any = null;
let activeIntervalId: any = null;

export async function requestPermission() {
    if (!('Notification' in window)) {
        return false;
    }
    
    if (Notification.permission === 'granted') {
        return true;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    
    return false;
}

export function sendNotification(title: string, body: string) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

export function scheduleDaily(customMessage?: string) {
    // Clear any previous scheduled timers to prevent duplicates on view mounts or page actions
    if (activeTimeoutId) clearTimeout(activeTimeoutId);
    if (activeIntervalId) clearInterval(activeIntervalId);

    const now = new Date();
    const todayDateStr = now.toLocaleDateString();
    
    // Define daily trigger hour (8:00 AM)
    const targetTimeForToday = new Date();
    targetTimeForToday.setHours(8, 0, 0, 0);
    
    // Check if we should notify immediately (missed morning notification or new sign-up today)
    const lastNotifiedDate = localStorage.getItem('last_notified_date');
    if (now.getTime() >= targetTimeForToday.getTime() && lastNotifiedDate !== todayDateStr) {
        const msg = customMessage || dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
        sendNotification('بصيرة بابل 🌟', msg);
        localStorage.setItem('last_notified_date', todayDateStr);
    }

    // Compute duration to the next occurrence of 8:00 AM
    const nextTargetTime = new Date();
    nextTargetTime.setHours(8, 0, 0, 0);
    if (now.getTime() >= nextTargetTime.getTime()) {
        nextTargetTime.setDate(nextTargetTime.getDate() + 1);
    }

    const timeUntil8AM = nextTargetTime.getTime() - now.getTime();

    activeTimeoutId = setTimeout(() => {
        const msg = customMessage || dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
        sendNotification('بصيرة بابل 🌟', msg);
        localStorage.setItem('last_notified_date', new Date().toLocaleDateString());
        
        activeIntervalId = setInterval(() => {
            const nextMsg = customMessage || dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
            sendNotification('بصيرة بابل 🌟', nextMsg);
            localStorage.setItem('last_notified_date', new Date().toLocaleDateString());
        }, 24 * 60 * 60 * 1000);
        
    }, timeUntil8AM);
}

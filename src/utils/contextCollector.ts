export const UserChronosMatrix = {
    get fingerprint() {
        const date = new Date();
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const currentHour = date.getHours();
        const currentMinute = date.getMinutes();
        const weekday = days[date.getDay()];
        const os = navigator.platform || navigator.userAgent;
        const locale = navigator.language;

        let timeOfDay = 'الصباح';
        if (currentHour >= 12 && currentHour < 18) timeOfDay = 'المساء';
        else if (currentHour >= 18 || currentHour < 4) timeOfDay = 'الليل المتأخر';

        return `[ENVIRONMENTAL CONTEXT - DO NOT MENTION AS SYSTEM DATA]:
        Current Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (${timeOfDay})
        Current Day: ${weekday}
        OS/Device Hint: ${os}
        Locale: ${locale}
        `;
    }
};

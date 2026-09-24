import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export const shareReading = async (title: string, text: string) => {
    try {
        if (Capacitor.isNativePlatform()) {
            await Share.share({ title, text, dialogTitle: title });
        } else if (navigator.share) {
            await navigator.share({ title, text });
        } else {
            await navigator.clipboard.writeText(text);
        }
    } catch (error) {
        // Closing the Android chooser is a normal cancellation.
        if ((error as { name?: string }).name !== 'AbortError') console.error('Could not share reading', error);
    }
};

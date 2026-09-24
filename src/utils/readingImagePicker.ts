import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import { compressReadingImage } from './imageCompression';

export type ReadingImageKind = 'palmistry' | 'face' | 'coffee';
export const PENDING_IMAGE_KEY = 'basira_pending_reading_image';
const NativePhotoPicker = registerPlugin<{ pickPhoto(options: { source: 'camera' | 'gallery' }): Promise<{ uri?: string }> }>('BasiraPhotoPicker');

export async function compressNativeImage(webPath: string): Promise<string> {
    const response = await fetch(webPath);
    if (!response.ok) throw new Error('Could not load selected photo');
    const blob = await response.blob();
    return compressReadingImage(new File([blob], 'reading.jpg', { type: blob.type || 'image/jpeg' }));
}

export async function pickNativeReadingImage(kind: ReadingImageKind, source: 'camera' | 'gallery'): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) throw new Error('Native photo picker unavailable');
    localStorage.setItem(PENDING_IMAGE_KEY, kind);
    try {
        const media = await NativePhotoPicker.pickPhoto({ source });
        if (!media?.uri) return null;
        return await compressNativeImage(Capacitor.convertFileSrc(media.uri));
    } finally {
        localStorage.removeItem(PENDING_IMAGE_KEY);
    }
}

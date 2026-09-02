export async function compressReadingImage(file: File, maxSide = 1152, quality = 0.8): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Unsupported image file');

    let source: CanvasImageSource;
    let width: number;
    let height: number;
    let cleanup = () => {};

    if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
        cleanup = () => bitmap.close();
    } else {
        const objectUrl = URL.createObjectURL(file);
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = objectUrl;
        });
        source = image;
        width = image.naturalWidth;
        height = image.naturalHeight;
        cleanup = () => URL.revokeObjectURL(objectUrl);
    }

    try {
        const ratio = Math.min(1, maxSide / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Image canvas is unavailable');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
    } finally {
        cleanup();
    }
}

export const shareReading = async (title: string, text: string) => {
    if (navigator.share) {
        try {
            await navigator.share({
                title,
                text,
            });
        } catch (err) {
            console.error('Error sharing', err);
        }
    } else {
        alert('المشاركة غير مدعومة في هذا المتصفح');
    }
};

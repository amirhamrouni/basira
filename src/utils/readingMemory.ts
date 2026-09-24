type ReadingRecord = { type: string; signals: string; direction: string; at: number };

const key = (uid: string) => `basira_reading_memory_v1_${uid}`;

export function recentReadings(uid?: string): ReadingRecord[] {
  if (!uid) return [];
  try {
    const records = JSON.parse(localStorage.getItem(key(uid)) || '[]');
    return Array.isArray(records) ? records.slice(-3).filter(r => r && typeof r.type === 'string' && typeof r.signals === 'string') : [];
  } catch { return []; }
}

export function rememberReading(uid: string | undefined, type: string, reading: string) {
  if (!uid || !reading) return;
  try {
    const signals = reading.match(/\[أقوى\s*(?:3|ثلاث)\s*إشارات\]([^[]*)/i)?.[1]?.trim() || reading.slice(0, 280);
    const direction = reading.match(/\[ما\s*(?:الذي\s*)?يقترب\]([^[]*)/i)?.[1]?.trim() || '';
    const previous = recentReadings(uid);
    localStorage.setItem(key(uid), JSON.stringify([...previous, {
      type: type.slice(0, 24), signals: signals.slice(0, 700), direction: direction.slice(0, 160), at: Date.now()
    }].slice(-6)));
  } catch { /* Reading still succeeds if storage is unavailable. */ }
}

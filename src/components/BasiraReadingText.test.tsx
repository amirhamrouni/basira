import { describe, expect, it } from 'vitest';
import { parseBasiraReading } from './BasiraReadingText';

describe('parseBasiraReading', () => {
  it('splits bracketed BASIRA V2 headings into sections', () => {
    const sections = parseBasiraReading('[أقوى 3 إشارات]\nعلامة أولى\n\n[التوقيت]\nخلال أسابيع');
    expect(sections).toEqual([
      { title: 'أقوى 3 إشارات', body: ['علامة أولى', ''] },
      { title: 'التوقيت', body: ['خلال أسابيع'] }
    ]);
  });

  it('keeps plain text as one section', () => {
    expect(parseBasiraReading('قراءة قصيرة')).toEqual([{ body: ['قراءة قصيرة'] }]);
  });
});

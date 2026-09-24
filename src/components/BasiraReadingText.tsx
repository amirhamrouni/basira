const HEADINGS = /(?:أقوى\s*(?:3|ثلاث)\s*إشارات|ما\s*(?:الذي\s*)?يقترب|التوقيت\s*والتنبيه|التوقيت|تنبيه\s*(?:\/\s*فرصة|بصيرة)?|فرصة|سؤال\s*(?:متابعة|بصيرة)|ما\s*تغيّر|السيناريو\s*الأقوى|الحب\s*والعلاقات|العمل\s*والمال|strongest\s*(?:3|three)\s*signals|what\s*approaches|timing|caution|follow.up\s*question)/i;
const HEADING_RE = /^\s*(?:#{1,4}\s*)?(?:\*\*)?(?:[\[【](.+?)[\]】]|([^:：*]{3,40})[:：])(?:\*\*)?\s*[:：]?\s*(.*)$/;

export function parseBasiraReading(text: string) {
  const lines = String(text || '').split(/\r?\n/);
  const sections: { title?: string; body: string[] }[] = [];
  let current: { title?: string; body: string[] } = { body: [] };

  const pushCurrent = () => {
    const body = [...current.body];
    while (body.length && !body[0].trim()) body.shift();
    while (body.length && !body[body.length - 1].trim()) body.pop();
    if (current.title || body.some(line => line.trim())) sections.push({ ...current, body });
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(HEADING_RE);
    const title = heading?.[1] || heading?.[2];
    if (title && HEADINGS.test(title)) {
      pushCurrent();
      current = { title: title.trim(), body: heading[3] ? [heading[3]] : [] };
    } else {
      current.body.push(raw);
    }
  }
  pushCurrent();

  return sections.length ? sections : [{ body: [text] }];
}

export default function BasiraReadingText({ text, dark = false }: { text: string; dark?: boolean }) {
  const sections = parseBasiraReading(text);
  const bodyClass = dark ? 'text-[#e8dfeb]' : 'text-gray-700';
  const sectionClass = dark ? 'border-[#d9b96e]/25 bg-white/[0.045]' : 'border-stella-gold/25 bg-stella-gold/[0.06]';
  const titleClass = dark ? 'text-[#f3d994]' : 'text-stella-gold';

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <section key={`${section.title || 'intro'}-${index}`} className={`rounded-2xl border px-4 py-4 ${sectionClass} ${/أقوى|strongest/i.test(section.title || '') ? 'border-amber-400/60 bg-amber-400/[0.08]' : ''}`}>
          {section.title && <h4 className={`mb-2 font-amiri text-xl font-bold ${titleClass}`}>{section.title}</h4>}
          <div className={`space-y-2 font-tajawal text-[15px] leading-7 ${bodyClass}`}>
            {section.body.join('\n').split(/\n\s*\n|\n(?=\s*(?:[١٢٣123][-.)،]|[•−-]))/).filter(p => p.trim()).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-line">{paragraph.trim()}</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}

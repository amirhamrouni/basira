import React from 'react';

const HEADING_RE = /^\s*[\[【](.+?)[\]】]\s*$/;

export function parseBasiraReading(text: string) {
  const lines = String(text || '').split(/\r?\n/);
  const sections: { title?: string; body: string[] }[] = [];
  let current: { title?: string; body: string[] } = { body: [] };

  const pushCurrent = () => {
    if (current.title || current.body.some(line => line.trim())) sections.push(current);
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(HEADING_RE);
    if (heading) {
      pushCurrent();
      current = { title: heading[1].trim(), body: [] };
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
  const sectionClass = dark ? 'border-[#d9b96e]/15 bg-white/[0.025]' : 'border-stella-gold/10 bg-stella-gold/[0.025]';
  const titleClass = dark ? 'text-[#f3d994]' : 'text-stella-gold';

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div key={`${section.title || 'intro'}-${index}`} className={`rounded-2xl border px-4 py-3 ${sectionClass}`}>
          {section.title && <h4 className={`mb-2 font-amiri text-lg font-bold ${titleClass}`}>{section.title}</h4>}
          <div className={`whitespace-pre-line font-tajawal text-[15px] leading-8 ${bodyClass}`}>
            {section.body.join('\n').trim()}
          </div>
        </div>
      ))}
    </div>
  );
}

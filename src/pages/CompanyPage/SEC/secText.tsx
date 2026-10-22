import React from 'react';

export function isParagraphHeader(p: string): boolean {
  const trimmed = p.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  if (/^\d+$/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar === '.' || lastChar === '?' || lastChar === '!') return false;
  if (
    lower.startsWith('item ') ||
    lower.startsWith('note ') ||
    lower.startsWith('part ') ||
    lower.startsWith('section ') ||
    lower.startsWith('risks related ')
  ) {
    return true;
  }
  const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const words = trimmed.split(/\s+/);
  const isTitleCase = words.every((w) => {
    if (w.length <= 3) return true;
    const firstChar = w[0];
    return firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar);
  });
  return isAllUpper || isTitleCase;
}

export function isNoiseParagraph(p: string): boolean {
  const trimmed = p.trim();
  if (trimmed.length === 0) return true;
  if (/^\d+$/.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (lower === 'table of contents' || lower === 'table of contents.') return true;
  return false;
}

export interface ParagraphEntry {
  key: string;
  text: string;
}

export function toParagraphEntries(paragraphs: readonly string[]): ParagraphEntry[] {
  const occurrences = new Map<string, number>();
  return paragraphs.map((text) => {
    const occurrence = occurrences.get(text) ?? 0;
    occurrences.set(text, occurrence + 1);
    return { key: `${text}-${occurrence}`, text };
  });
}

interface HighlightedTextProps {
  text: string;
  search: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, search }) => {
  if (!search || !search.trim()) return <>{text}</>;
  const cleanSearch = search.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const matcher = new RegExp(`^(${cleanSearch})$`, 'i');
  const parts = text.split(new RegExp(`(${cleanSearch})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        matcher.test(part) ? (
          <mark
            key={`${index}:${part}`}
            className="bg-emerald-500/30 text-emerald-300 rounded px-1 py-0.5 font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${index}:${part}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export const decodeHtmlEntities = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&#8226;|&bull;|&#x2022;|&#183;|&middot;/gi, '•')
    .replace(/&#8239;|&#8201;|&#8194;|&#8195;/gi, ' ')
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&quot;|&#34;|&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&apos;|&#39;|&#8216;|&#8217;|&lsquo;|&rsquo;/gi, "'")
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
};

export const cleanSecContent = (raw: string): string => {
  if (!raw) return '';
  let cleaned = decodeHtmlEntities(raw);
  // Strip XML / HTML tags (e.g. <ix:nonNumeric>, <span>, <div>, etc.)
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  // Remove zero-width spaces and control characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  // Remove markdown or table-of-contents separator artifacts
  cleaned = cleaned.replace(/_{3,}/g, '');
  cleaned = cleaned.replace(/-{3,}/g, '');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Clean up any extra space right before punctuation marks
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
  return cleaned.trim();
};

export const cleanText = (txt: string): string => {
  if (!txt) return '';
  return cleanSecContent(txt);
};

export const parseMoney = (val: string): number | null => {
  if (!val) return null;
  const isNegative = val.trim().startsWith('-') || val.includes('(');
  const cleaned = val.replace(/[$,\(\)\s—\-]/g, '').trim();
  if (!cleaned || isNaN(Number(cleaned))) return null;
  const num = parseFloat(cleaned);
  return isNegative ? -num : num;
};

export const isFootnote = (txt: string): boolean => {
  const cleaned = cleanText(txt);
  if (!cleaned) return false;
  return /^\s*[\*†‡§#]x?\s*$/i.test(cleaned) || /^\s*\(\s*\d+\s*\)(?:\s*\(\s*\d+\s*\))*\s*$/.test(cleaned);
};


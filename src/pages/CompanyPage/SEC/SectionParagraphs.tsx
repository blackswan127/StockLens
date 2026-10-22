import React from 'react';
import {
  HighlightedText,
  isNoiseParagraph,
  isParagraphHeader,
  toParagraphEntries,
} from './secText.js';

interface SectionParagraphsProps {
  paragraphs: readonly string[];
  search: string;
}

export const SectionParagraphs: React.FC<SectionParagraphsProps> = ({ paragraphs, search }) => {
  const entries = React.useMemo(
    () => toParagraphEntries(paragraphs.filter((p) => !isNoiseParagraph(p))),
    [paragraphs]
  );

  return (
    <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-300">
      {entries.map(({ key, text }) =>
        isParagraphHeader(text) ? (
          <h5
            key={key}
            className="font-bold text-slate-100 text-sm mt-6 mb-2 border-t border-slate-800/80 pt-4 first:border-0 first:mt-0 first:pt-0 font-mono"
          >
            {text}
          </h5>
        ) : (
          <p key={key} className="leading-relaxed text-slate-300 text-left">
            <HighlightedText text={text} search={search} />
          </p>
        )
      )}
    </div>
  );
};

import { CompareFinancialsSection } from './CompareFinancialsSection.js';
import { ComparePerformanceSection } from './ComparePerformanceSection.js';
import { CompareRatiosSection } from './CompareRatiosSection.js';
import { CompareScoreRow } from './CompareScoreRow.js';
import { CompareStatsSection } from './CompareStatsSection.js';
import type {
  CollapsedSections,
  CompareColumn,
  CompareSectionsProps,
  SectionKey,
} from './types.js';

interface CompareTableProps {
  selectedSymbols: string[];
  columns: CompareColumn[];
  scores: number[];
  collapsedSections: CollapsedSections;
  onToggleSection: (section: SectionKey) => void;
  highlightHighLow: boolean;
  commonSize: boolean;
}

export function CompareTable({
  selectedSymbols,
  columns,
  scores,
  collapsedSections,
  onToggleSection,
  highlightHighLow,
  commonSize,
}: CompareTableProps) {
  const sectionsProps: CompareSectionsProps = {
    columns,
    collapsedSections,
    onToggleSection,
    highlightHighLow,
    commonSize,
  };

  return (
    <div className="border border-slate-800 rounded-2xl bg-[#0D111A] shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-[#080B11]">
              <th
                scope="col"
                className="py-3 px-4 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider sticky left-0 z-10 bg-[#080B11] border-r border-slate-800 w-[240px]"
              >
                Metrics / Symbol
              </th>
              {selectedSymbols.map((symbol, index) => (
                <th
                  key={`${symbol || 'empty'}-${index}`}
                  scope="col"
                  className="py-3 px-4 text-xs font-mono font-black text-slate-100 text-right min-w-[120px]"
                >
                  {symbol || '—'}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            <CompareStatsSection {...sectionsProps} />
            <ComparePerformanceSection {...sectionsProps} />
            <CompareFinancialsSection {...sectionsProps} />
            <CompareRatiosSection {...sectionsProps} />
            <CompareScoreRow columns={columns} scores={scores} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Scale } from 'lucide-react';
import { CompareProfileSection } from './Compare/CompareProfileSection.js';
import { CompareTable } from './Compare/CompareTable.js';
import { CompareToolbar } from './Compare/CompareToolbar.js';
import { useCompareData } from './Compare/useCompareData.js';
import { useCompareSearch } from './Compare/useCompareSearch.js';
import { useCompareSymbols } from './Compare/useCompareSymbols.js';
import type {
  CollapsedSections,
  CurrencyMode,
  SectionKey,
} from './Compare/types.js';

const INITIAL_COLLAPSED_SECTIONS: CollapsedSections = {
  general: false,
  performance: false,
  income: false,
  balance: false,
  cash: false,
  ratios: false,
  margin: false,
  earnings: false,
  return: false,
};

export const ComparePage = () => {
  const { selectedSymbols, activeSymbols, announcement, setSymbol, removeSymbol } =
    useCompareSymbols();
  const search = useCompareSearch();
  const { columnsData, scores } = useCompareData(selectedSymbols);

  const [highlightHighLow, setHighlightHighLow] = useState(true);
  const [commonSize, setCommonSize] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('USD');
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(
    () => ({ ...INITIAL_COLLAPSED_SECTIONS })
  );

  const toggleSection = (section: SectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectSymbol = (symbol: string, index: number) => {
    setSymbol(index, symbol);
    search.closeSearch();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-400" />
            <h1 className="font-sans text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Cross-Company Benchmarking Matrix
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-400 max-w-2xl">
            Multi-column side-by-side comparisons: valuation multiples, capital
            efficiency, common-size P&L, and cash flows.
          </p>
        </div>

        <CompareToolbar
          highlightHighLow={highlightHighLow}
          onToggleHighlightHighLow={() => setHighlightHighLow((value) => !value)}
          commonSize={commonSize}
          onToggleCommonSize={() => setCommonSize((value) => !value)}
          currencyMode={currencyMode}
          onCurrencyModeChange={setCurrencyMode}
        />
      </div>

      <CompareProfileSection
        selectedSymbols={selectedSymbols}
        columns={columnsData}
        search={search}
        onSelectSymbol={handleSelectSymbol}
        onRemoveSymbol={removeSymbol}
      />

      {activeSymbols.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl bg-[#0D111A] p-12 text-center shadow-xl">
          <Scale className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h2 className="font-sans text-sm font-bold text-slate-200">
            No securities selected for comparison
          </h2>
          <p className="font-mono text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Click "+ Add Stock" in any column slot above to benchmark financial
            statements, returns, and valuation multiples.
          </p>
        </div>
      ) : (
        <CompareTable
          selectedSymbols={selectedSymbols}
          columns={columnsData}
          scores={scores}
          collapsedSections={collapsedSections}
          onToggleSection={toggleSection}
          highlightHighLow={highlightHighLow}
          commonSize={commonSize}
        />
      )}
    </div>
  );
};

export default ComparePage;

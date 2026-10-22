import { Sparkles } from 'lucide-react';
import { CompareSymbolSlot } from './CompareSymbolSlot.js';
import type { CompareColumn } from './types.js';
import type { UseCompareSearchResult } from './useCompareSearch.js';

interface CompareProfileSectionProps {
  selectedSymbols: string[];
  columns: CompareColumn[];
  search: UseCompareSearchResult;
  onSelectSymbol: (symbol: string, index: number) => void;
  onRemoveSymbol: (index: number) => void;
}

export function CompareProfileSection({
  selectedSymbols,
  columns,
  search,
  onSelectSymbol,
  onRemoveSymbol,
}: CompareProfileSectionProps) {
  const {
    activeSearchIndex,
    searchQuery,
    searchResults,
    isSearching,
    searchContainerRef,
    openSearch,
    setSearchQuery,
  } = search;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 border border-slate-800 rounded-2xl bg-[#0D111A]/95 shadow-xl relative z-30">
      <div className="p-4 bg-[#080B11] flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
        <h2 className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Analysis Matrix</span>
        </h2>
        <span className="text-xs font-mono text-slate-500">
          Type ticker symbol in any open slot to benchmark.
        </span>
      </div>

      <div
        className="md:col-span-4 grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800"
        ref={searchContainerRef}
      >
        {selectedSymbols.map((symbol, index) => (
          <CompareSymbolSlot
            key={`${symbol || 'empty'}-${index}`}
            symbol={symbol}
            index={index}
            column={columns[index]}
            isSearchActive={activeSearchIndex === index}
            searchQuery={searchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onOpenSearch={openSearch}
            onSearchQueryChange={setSearchQuery}
            onSelectSymbol={onSelectSymbol}
            onRemoveSymbol={onRemoveSymbol}
          />
        ))}
      </div>
    </div>
  );
}

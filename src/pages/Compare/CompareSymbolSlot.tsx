import { useEffect, useRef } from 'react';
import { Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { formatPrice, formatPercentChange } from '../../utils/formatters.js';
import type { CompareColumn, SearchResult } from './types.js';

interface CompareSymbolSlotProps {
  symbol: string;
  index: number;
  column?: CompareColumn;
  isSearchActive: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  onOpenSearch: (index: number) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectSymbol: (symbol: string, index: number) => void;
  onRemoveSymbol: (index: number) => void;
}

export function CompareSymbolSlot({
  symbol,
  index,
  column,
  isSearchActive,
  searchQuery,
  searchResults,
  isSearching,
  onOpenSearch,
  onSearchQueryChange,
  onSelectSymbol,
  onRemoveSymbol,
}: CompareSymbolSlotProps) {
  const hasStock = !!symbol;
  const item = column?.details;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  return (
    <div
      className={`p-4 flex flex-col justify-between min-h-[115px] relative hover:bg-[#141A26] transition-all group bg-[#0D111A] ${
        isSearchActive ? 'z-50' : 'z-10'
      }`}
    >
      {hasStock ? (
        <div className="flex justify-between items-start w-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-base text-slate-100">{symbol}</span>
              {item && !item.error && (
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-slate-700">
                  {item.profile.exchange}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-0.5 w-[90%]">
              {item && !item.error ? item.profile.name : 'Loading company info...'}
            </p>
          </div>
          <button
            onClick={() => onRemoveSymbol(index)}
            aria-label={`Remove ${symbol} from comparison`}
            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remove column"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col justify-center items-center">
          {isSearchActive ? (
            <div className="relative w-full">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Enter symbol (e.g. AAPL)"
                  aria-label={`Search ticker for column ${index + 1}`}
                  className="w-full rounded-xl border border-emerald-500/80 bg-[#080B11] py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder-slate-500 outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-3 w-3 animate-spin text-emerald-400" />
                )}
              </div>

              {searchQuery.trim() && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[240px] max-h-[260px] overflow-y-auto rounded-xl border border-slate-700 bg-[#0D111A] p-1.5 shadow-2xl shadow-black/80 divide-y divide-slate-800/60 backdrop-blur-2xl">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="p-3 text-center text-xs font-mono text-slate-400">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.symbol}
                        onClick={() => onSelectSymbol(res.symbol, index)}
                        className="w-full flex justify-between items-center px-2.5 py-2 hover:bg-[#141A26] rounded-lg text-left transition-colors font-mono cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100">{res.symbol}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {res.description}
                          </div>
                        </div>
                        <div className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase border border-slate-700">
                          {res.exchange}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenSearch(index)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-700 text-xs font-mono font-bold text-slate-400 bg-slate-800/40 hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Stock</span>
            </button>
          )}
        </div>
      )}

      {hasStock && item && !item.error && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-between items-baseline">
          <span className="font-mono text-sm font-black text-slate-100 tabular-nums">
            {formatPrice(
              item.keyStats.peRatio
                ? item.keyStats.peRatio * (item.keyStats.eps || 0)
                : 100,
              item.profile.exchange,
              item.symbol
            )}
          </span>
          {item.pricePerformance.oneWeek !== null && (
            <span
              className={`text-[10px] font-bold font-mono ${
                item.pricePerformance.oneWeek >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatPercentChange(item.pricePerformance.oneWeek)} (1W)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

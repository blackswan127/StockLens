import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { 
  formatPrice, formatMarketCap, formatPercentChange, formatLargeNumber 
} from '../utils/formatters.js';
import { 
  Plus, X, ChevronDown, ChevronUp, Scale, Search, Loader2, Sparkles, AlertCircle, Trash2 
} from 'lucide-react';

interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange: string;
  country: string;
  isLocal: boolean;
}

interface StockData {
  symbol: string;
  error?: boolean;
  message?: string;
  profile: {
    name: string;
    sector: string;
    industry: string;
    ceo: string;
    exchange: string;
    country: string;
    logo: string;
  };
  keyStats: {
    asOf: string;
    marketCap: number | null;
    enterpriseValue: number | null;
    peRatio: number | null;
    eps: number | null;
    dividendRate: number | null;
    dividendYield: number | null;
  };
  pricePerformance: {
    asOf: string;
    oneWeek: number | null;
    threeMonths: number | null;
    ytd: number | null;
    oneYear: number | null;
  };
  incomeStatement: {
    asOf: string;
    revenue: number | null;
    operatingExpenses: number | null;
    operatingIncome: number | null;
    revenueGrowthYoY: number | null;
    grossProfit: number | null;
  };
  balanceSheet: {
    asOf: string;
    inventory: number | null;
    receivablesTurnover: number | null;
  };
  cashFlow: {
    asOf: string;
    operatingCashFlow: number | null;
    capex: number | null;
    investingCashFlow: number | null;
    freeCashFlow: number | null;
  };
  priceRatios: {
    pe: number | null;
    forwardPe: number | null;
    pFreeCashFlow: number | null;
    pBook: number | null;
    pSales: number | null;
    evEbitda: number | null;
  };
  margin: {
    operatingMargin: number | null;
    grossMargin: number | null;
    profitMargin: number | null;
  };
  earnings: {
    eps: number | null;
    epsGrowthYoY: number | null;
  };
  equityReturn: {
    roe: number | null;
    roa: number | null;
    roic: number | null;
  };
}

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State to hold the symbols in the 4 columns
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['', '', '', '']);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightHighLow, setHighlightHighLow] = useState(true);
  const [commonSize, setCommonSize] = useState(false); // Common size financials toggle
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'LCL'>('USD'); // USD or Local

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync selected symbols from URL search parameters on load
  useEffect(() => {
    const symsParam = searchParams.get('symbols');
    if (symsParam) {
      const parsed = symsParam.split(',').map(s => s.trim().toUpperCase());
      const padded = [...parsed];
      while (padded.length < 4) padded.push('');
      setSelectedSymbols(padded.slice(0, 4));
    }
  }, [searchParams]);

  // Update URL parameters when symbols state changes
  const updateUrlSymbols = (newSymbols: string[]) => {
    const active = newSymbols.filter(Boolean);
    if (active.length > 0) {
      setSearchParams({ symbols: active.join(',') });
    } else {
      setSearchParams({});
    }
  };

  // Autocomplete search debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(resp.data || []);
      } catch (err) {
        console.error('[COMPARE SEARCH ERROR]', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setActiveSearchIndex(null);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch comparison data using TanStack Query
  const fetchSymbols = selectedSymbols.filter(Boolean);
  const { data: compareData, isPending: isLoading } = useQuery<StockData[]>({
    queryKey: ['compareStocksData', fetchSymbols.join(',')],
    queryFn: async () => {
      if (fetchSymbols.length === 0) return [];
      const resp = await apiClient.get<StockData[]>(`/compare?symbols=${encodeURIComponent(fetchSymbols.join(','))}`);
      return resp.data;
    },
    enabled: fetchSymbols.length > 0
  });

  const handleSelectSymbol = (symbol: string, index: number) => {
    const updated = [...selectedSymbols];
    updated[index] = symbol.toUpperCase();
    setSelectedSymbols(updated);
    updateUrlSymbols(updated);
    setActiveSearchIndex(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveSymbol = (index: number) => {
    const updated = [...selectedSymbols];
    updated[index] = '';
    setSelectedSymbols(updated);
    updateUrlSymbols(updated);
  };

  // Section visibility states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false,
    performance: false,
    income: false,
    balance: false,
    cash: false,
    ratios: false,
    margin: false,
    earnings: false,
    return: false
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Columns mapper: align compareData with columns by index
  const columnsData = selectedSymbols.map((symbol) => {
    if (!symbol) return null;
    const details = Array.isArray(compareData)
      ? compareData.find((d: any) => d.symbol.toUpperCase() === symbol.toUpperCase())
      : null;
    return {
      symbol,
      loading: isLoading && !details,
      details
    };
  });

  // Highlight Highs and Lows Logic
  const getCellHighlight = (
    rowValues: (number | null)[], 
    currentValue: number | null, 
    isBetter: 'high' | 'low' = 'high'
  ) => {
    if (!highlightHighLow || currentValue === null || currentValue === undefined) return '';

    const validValues = rowValues.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    if (validValues.length < 2) return '';

    const max = Math.max(...validValues);
    const min = Math.min(...validValues);

    // If max === min, no highlighting
    if (max === min) return '';

    if (currentValue === max) {
      return isBetter === 'high' 
        ? 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-500' 
        : 'bg-rose-50 text-rose-700 font-medium border-l-2 border-rose-500';
    }

    if (currentValue === min) {
      return isBetter === 'high'
        ? 'bg-rose-50 text-rose-700 font-medium border-l-2 border-rose-500'
        : 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-500';
    }

    return '';
  };

  // Calculate scores for all comparable metrics
  const scores = React.useMemo(() => {
    const s = new Array(columnsData.length).fill(0);
    if (columnsData.every(c => !c || c.loading || c.details?.error)) return s;

    const evaluate = (getRawValue: (d: any) => number | null, isBetter: 'high' | 'low') => {
      const rawValues = columnsData.map(col => col?.details && !col.details.error ? getRawValue(col.details) : null);
      const validValues = rawValues.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
      if (validValues.length < 2) return;
      const max = Math.max(...validValues);
      const min = Math.min(...validValues);
      if (max === min) return; // tie for all

      const best = isBetter === 'high' ? max : min;
      rawValues.forEach((val, idx) => {
        if (val === best) s[idx]++;
      });
    };

    // Evaluate metrics
    evaluate(d => d.keyStats.peRatio, 'low');
    evaluate(d => d.pricePerformance.oneWeek, 'high');
    evaluate(d => d.pricePerformance.threeMonths, 'high');
    evaluate(d => d.pricePerformance.ytd, 'high');
    evaluate(d => d.pricePerformance.oneYear, 'high');
    evaluate(d => d.incomeStatement.revenueGrowthYoY, 'high');
    evaluate(d => d.balanceSheet.receivablesTurnover, 'high');
    evaluate(d => d.cashFlow.operatingCashFlow, 'high');
    evaluate(d => d.cashFlow.freeCashFlow, 'high');
    evaluate(d => d.priceRatios.forwardPe, 'low');
    evaluate(d => d.priceRatios.pFreeCashFlow, 'low');
    evaluate(d => d.priceRatios.pBook, 'low');
    evaluate(d => d.priceRatios.pSales, 'low');
    evaluate(d => d.priceRatios.evEbitda, 'low');
    evaluate(d => d.margin.operatingMargin, 'high');
    evaluate(d => d.margin.grossMargin, 'high');
    evaluate(d => d.margin.profitMargin, 'high');
    evaluate(d => d.earnings.epsGrowthYoY, 'high');
    evaluate(d => d.equityReturn.roe, 'high');
    evaluate(d => d.equityReturn.roa, 'high');
    evaluate(d => d.equityReturn.roic, 'high');

    return s;
  }, [columnsData]);

  // Render a specific row
  const renderRow = (
    label: string, 
    getValue: (col: any) => React.ReactNode, 
    getRawValue: (col: any) => number | null,
    isBetter: 'high' | 'low' = 'high'
  ) => {
    const rawValues = columnsData.map(col => col?.details && !col.details.error ? getRawValue(col.details) : null);

    return (
      <tr className="border-b border-slate-800/80 hover:bg-[#141A26] transition-colors">
        <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-400 bg-[#0D111A] w-[240px] sticky left-0 z-10 border-r border-slate-800 backdrop-blur-xs">
          {label}
        </td>
        {columnsData.map((col, idx) => {
          if (!col) {
            return <td key={idx} className="py-3 px-4 text-center text-slate-600 font-mono text-xs">—</td>;
          }
          if (col.loading) {
            return (
              <td key={idx} className="py-3 px-4 text-center">
                <div className="h-4 w-12 bg-slate-800 rounded animate-pulse mx-auto" />
              </td>
            );
          }
          if (col.details?.error) {
            return (
              <td key={idx} className="py-3 px-4 text-center text-rose-400 font-mono text-[11px]">
                Error
              </td>
            );
          }

          const rawVal = col.details ? getRawValue(col.details) : null;
          const highlightClass = getCellHighlight(rawValues, rawVal, isBetter);

          return (
            <td key={idx} className={`py-3 px-4 text-xs font-medium text-slate-200 text-right font-mono transition-all tabular-nums ${highlightClass}`}>
              {col.details ? getValue(col.details) : '—'}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      
      {/* 1. Page Header Title Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-400" />
            <h1 className="font-sans text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Cross-Company Benchmarking Matrix
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-400 max-w-2xl">
            Multi-column side-by-side comparisons: valuation multiples, capital efficiency, common-size P&L, and cash flows.
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Highlight toggle */}
          <label className="inline-flex items-center cursor-pointer bg-[#0D111A] px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <input 
              type="checkbox" 
              checked={highlightHighLow} 
              onChange={() => setHighlightHighLow(!highlightHighLow)} 
              className="sr-only peer" 
            />
            <div className="relative w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
            <span className="ms-2 text-xs font-mono font-bold text-slate-300 select-none">Highlight High/Low</span>
          </label>

          {/* Common Size toggle */}
          <label className="inline-flex items-center cursor-pointer bg-[#0D111A] px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <input 
              type="checkbox" 
              checked={commonSize} 
              onChange={() => setCommonSize(!commonSize)} 
              className="sr-only peer" 
            />
            <div className="relative w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
            <span className="ms-2 text-xs font-mono font-bold text-slate-300 select-none">Common Size %</span>
          </label>

          {/* Currency dropdown */}
          <div className="relative bg-[#0D111A] px-3 py-2 rounded-xl border border-slate-800 shadow-sm flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">Currency:</span>
            <select
              value={currencyMode}
              onChange={(e) => setCurrencyMode(e.target.value as 'USD' | 'LCL')}
              className="text-xs font-bold text-slate-200 outline-none cursor-pointer bg-transparent"
            >
              <option value="USD" className="bg-[#0D111A]">USD ($)</option>
              <option value="LCL" className="bg-[#0D111A]">Reported Currency</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Symbol Add/Remove Column Headers */}
      <div className="grid grid-cols-1 md:grid-cols-5 border border-slate-800 rounded-2xl bg-[#0D111A]/95 shadow-xl relative z-30">
        {/* Row Header Helper Label */}
        <div className="p-4 bg-[#080B11] flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Analysis Matrix</span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Type ticker symbol in any open slot to benchmark.
          </span>
        </div>

        {/* Selected stocks grid */}
        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800" ref={searchContainerRef}>
          {selectedSymbols.map((symbol, idx) => {
            const hasStock = !!symbol;
            const item = columnsData[idx]?.details;
            const isSearchingCurrent = activeSearchIndex === idx;

            return (
              <div 
                key={idx} 
                className={`p-4 flex flex-col justify-between min-h-[115px] relative hover:bg-[#141A26] transition-all group bg-[#0D111A] ${
                  isSearchingCurrent ? 'z-50' : 'z-10'
                }`}
              >
                
                {/* 1. Header with symbol and delete action */}
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
                      onClick={() => handleRemoveSymbol(idx)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove column"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex flex-col justify-center items-center">
                    {activeSearchIndex === idx ? (
                      <div className="relative w-full">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter symbol (e.g. AAPL)"
                            className="w-full rounded-xl border border-emerald-500/80 bg-[#080B11] py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder-slate-500 outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 font-mono"
                            autoFocus
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-2.5 top-2.5 h-3 w-3 animate-spin text-emerald-400" />
                          )}
                        </div>

                        {/* Search Autocomplete Popover Dropdown */}
                        {searchQuery.trim() && (
                          <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[240px] max-h-[260px] overflow-y-auto rounded-xl border border-slate-700 bg-[#0D111A] p-1.5 shadow-2xl shadow-black/80 divide-y divide-slate-800/60 backdrop-blur-2xl">
                            {searchResults.length === 0 && !isSearching ? (
                              <div className="p-3 text-center text-xs font-mono text-slate-400">No results found for "{searchQuery}"</div>
                            ) : (
                              searchResults.map((res) => (
                                <button
                                  key={res.symbol}
                                  onClick={() => handleSelectSymbol(res.symbol, idx)}
                                  className="w-full flex justify-between items-center px-2.5 py-2 hover:bg-[#141A26] rounded-lg text-left transition-colors font-mono cursor-pointer"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-100">{res.symbol}</div>
                                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{res.description}</div>
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
                        onClick={() => {
                          setActiveSearchIndex(idx);
                          setTimeout(() => searchInputRef.current?.focus(), 50);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-700 text-xs font-mono font-bold text-slate-400 bg-slate-800/40 hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Stock</span>
                      </button>
                    )}
                  </div>
                )}
                
                {/* 2. Price quote info at the bottom of headers */}
                {hasStock && item && !item.error && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-between items-baseline">
                    <span className="font-mono text-sm font-black text-slate-100 tabular-nums">
                      {formatPrice(item.keyStats.peRatio ? item.keyStats.peRatio * (item.keyStats.eps || 0) : 100, item.profile.exchange, item.symbol)}
                    </span>
                    {item.pricePerformance.oneWeek !== null && (
                      <span className={`text-[10px] font-bold font-mono ${item.pricePerformance.oneWeek >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatPercentChange(item.pricePerformance.oneWeek)} (1W)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Comparison Categories Table */}
      {fetchSymbols.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl bg-[#0D111A] p-12 text-center shadow-xl">
          <Scale className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="font-sans text-sm font-bold text-slate-200">No securities selected for comparison</h3>
          <p className="font-mono text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Click "+ Add Stock" in any column slot above to benchmark financial statements, returns, and valuation multiples.
          </p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-2xl bg-[#0D111A] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080B11]">
                  <th className="py-3 px-4 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider sticky left-0 z-10 bg-[#080B11] border-r border-slate-800 w-[240px]">
                    Metrics / Symbol
                  </th>
                  {selectedSymbols.map((sym, idx) => (
                    <th key={idx} className="py-3 px-4 text-xs font-mono font-black text-slate-100 text-right min-w-[120px]">
                      {sym || '—'}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                
                {/* ========================================================
                    SECTION 1: GENERAL STATS
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('general')} 
                  className="bg-[#080B11] border-b border-slate-800 cursor-pointer select-none font-mono"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ChevronDown className={`h-4 w-4 text-emerald-400 transition-transform ${collapsedSections.general ? '-rotate-90' : ''}`} />
                      General Key Statistics
                    </span>
                    <span className="text-[10px] text-slate-500 lowercase font-normal tracking-normal font-mono">
                      (profile & capitalization metadata)
                    </span>
                  </td>
                </tr>

                {!collapsedSections.general && (
                  <>
                    {renderRow(
                      'As of Latest Statements',
                      (d) => d.keyStats.asOf || '—',
                      () => null
                    )}
                    {renderRow(
                      'Market Value (Market Cap)',
                      (d) => formatMarketCap(d.keyStats.marketCap, d.profile.exchange, d.symbol),
                      (d) => d.keyStats.marketCap,
                      'high'
                    )}
                    {renderRow(
                      'Enterprise Value',
                      (d) => formatMarketCap(d.keyStats.enterpriseValue, d.profile.exchange, d.symbol),
                      (d) => d.keyStats.enterpriseValue,
                      'high'
                    )}
                    {renderRow(
                      'Price to Earnings (Trailing P/E)',
                      (d) => d.keyStats.peRatio ? Number(d.keyStats.peRatio).toFixed(2) : '—',
                      (d) => d.keyStats.peRatio,
                      'low'
                    )}
                    {renderRow(
                      'Diluted Earnings Per Share (EPS)',
                      (d) => formatPrice(d.keyStats.eps, d.profile.exchange, d.symbol),
                      (d) => d.keyStats.eps,
                      'high'
                    )}
                    {renderRow(
                      'Forward Dividend & Yield',
                      (d) => {
                        const rate = d.keyStats.dividendRate;
                        const yld = d.keyStats.dividendYield;
                        if (!rate && !yld) return '—';
                        return `${rate ? formatPrice(rate, d.profile.exchange, d.symbol) : '—'} (${yld ? Number(yld).toFixed(2) + '%' : '—'})`;
                      },
                      (d) => d.keyStats.dividendYield,
                      'high'
                    )}
                    {renderRow(
                      'Sector',
                      (d) => d.profile.sector || '—',
                      () => null
                    )}
                    {renderRow(
                      'Industry',
                      (d) => d.profile.industry || '—',
                      () => null
                    )}
                    {renderRow(
                      'CEO',
                      (d) => d.profile.ceo || '—',
                      () => null
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 2: PRICE PERFORMANCE
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('performance')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.performance ? '-rotate-90' : ''}`} />
                      Price Performance
                    </span>
                  </td>
                </tr>

                {!collapsedSections.performance && (
                  <>
                    {renderRow(
                      '1 Week',
                      (d) => <span className={Number(d.pricePerformance.oneWeek) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.pricePerformance.oneWeek)}</span>,
                      (d) => d.pricePerformance.oneWeek,
                      'high'
                    )}
                    {renderRow(
                      '3 Months',
                      (d) => <span className={Number(d.pricePerformance.threeMonths) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.pricePerformance.threeMonths)}</span>,
                      (d) => d.pricePerformance.threeMonths,
                      'high'
                    )}
                    {renderRow(
                      'YTD Return',
                      (d) => <span className={Number(d.pricePerformance.ytd) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.pricePerformance.ytd)}</span>,
                      (d) => d.pricePerformance.ytd,
                      'high'
                    )}
                    {renderRow(
                      '1 Year',
                      (d) => <span className={Number(d.pricePerformance.oneYear) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.pricePerformance.oneYear)}</span>,
                      (d) => d.pricePerformance.oneYear,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 3: INCOME STATEMENT
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('income')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.income ? '-rotate-90' : ''}`} />
                      Income Statement
                    </span>
                  </td>
                </tr>

                {!collapsedSections.income && (
                  <>
                    {renderRow(
                      'Revenue',
                      (d) => commonSize && d.incomeStatement.revenue ? '100.00%' : formatMarketCap(d.incomeStatement.revenue, d.profile.exchange, d.symbol),
                      (d) => commonSize && d.incomeStatement.revenue ? 100 : d.incomeStatement.revenue,
                      'high'
                    )}
                    {renderRow(
                      'Operating Expenses',
                      (d) => {
                        if (commonSize) {
                          if (!d.incomeStatement.revenue || !d.incomeStatement.operatingExpenses) return '—';
                          return `${((d.incomeStatement.operatingExpenses / d.incomeStatement.revenue) * 100).toFixed(2)}%`;
                        }
                        return formatMarketCap(d.incomeStatement.operatingExpenses, d.profile.exchange, d.symbol);
                      },
                      (d) => commonSize ? (d.incomeStatement.operatingExpenses && d.incomeStatement.revenue ? (d.incomeStatement.operatingExpenses / d.incomeStatement.revenue) * 100 : null) : d.incomeStatement.operatingExpenses,
                      'low'
                    )}
                    {renderRow(
                      'Operating Income',
                      (d) => {
                        if (commonSize) {
                          if (!d.incomeStatement.revenue || d.incomeStatement.operatingIncome === null) return '—';
                          return `${((d.incomeStatement.operatingIncome / d.incomeStatement.revenue) * 100).toFixed(2)}%`;
                        }
                        return formatMarketCap(d.incomeStatement.operatingIncome, d.profile.exchange, d.symbol);
                      },
                      (d) => commonSize ? (d.incomeStatement.operatingIncome !== null && d.incomeStatement.revenue ? (d.incomeStatement.operatingIncome / d.incomeStatement.revenue) * 100 : null) : d.incomeStatement.operatingIncome,
                      'high'
                    )}
                    {renderRow(
                      'Revenue Growth (YoY)',
                      (d) => <span className={Number(d.incomeStatement.revenueGrowthYoY) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.incomeStatement.revenueGrowthYoY)}</span>,
                      (d) => d.incomeStatement.revenueGrowthYoY,
                      'high'
                    )}
                    {renderRow(
                      'Gross Profit',
                      (d) => {
                        if (commonSize) {
                          if (!d.incomeStatement.revenue || d.incomeStatement.grossProfit === null) return '—';
                          return `${((d.incomeStatement.grossProfit / d.incomeStatement.revenue) * 100).toFixed(2)}%`;
                        }
                        return formatMarketCap(d.incomeStatement.grossProfit, d.profile.exchange, d.symbol);
                      },
                      (d) => commonSize ? (d.incomeStatement.grossProfit !== null && d.incomeStatement.revenue ? (d.incomeStatement.grossProfit / d.incomeStatement.revenue) * 100 : null) : d.incomeStatement.grossProfit,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 4: BALANCE SHEET
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('balance')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.balance ? '-rotate-90' : ''}`} />
                      Balance Sheet
                    </span>
                  </td>
                </tr>

                {!collapsedSections.balance && (
                  <>
                    {renderRow(
                      'Inventory',
                      (d) => formatMarketCap(d.balanceSheet.inventory, d.profile.exchange, d.symbol),
                      (d) => d.balanceSheet.inventory,
                      'low'
                    )}
                    {renderRow(
                      'Account Receivables Turnover',
                      (d) => d.balanceSheet.receivablesTurnover ? `${Number(d.balanceSheet.receivablesTurnover).toFixed(2)}x` : '—',
                      (d) => d.balanceSheet.receivablesTurnover,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 5: CASH FLOW
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('cash')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.cash ? '-rotate-90' : ''}`} />
                      Cash Flow
                    </span>
                  </td>
                </tr>

                {!collapsedSections.cash && (
                  <>
                    {renderRow(
                      'Cash Flow from Operations',
                      (d) => formatMarketCap(d.cashFlow.operatingCashFlow, d.profile.exchange, d.symbol),
                      (d) => d.cashFlow.operatingCashFlow,
                      'high'
                    )}
                    {renderRow(
                      'Capital Expenditures',
                      (d) => formatMarketCap(d.cashFlow.capex, d.profile.exchange, d.symbol),
                      (d) => d.cashFlow.capex,
                      'low'
                    )}
                    {renderRow(
                      'Cash from Investing Activities',
                      (d) => formatMarketCap(d.cashFlow.investingCashFlow, d.profile.exchange, d.symbol),
                      (d) => d.cashFlow.investingCashFlow,
                      'high'
                    )}
                    {renderRow(
                      'Free Cash Flow',
                      (d) => formatMarketCap(d.cashFlow.freeCashFlow, d.profile.exchange, d.symbol),
                      (d) => d.cashFlow.freeCashFlow,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 6: PRICE RATIOS
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('ratios')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.ratios ? '-rotate-90' : ''}`} />
                      Price Ratios / Valuation Multiples
                    </span>
                  </td>
                </tr>

                {!collapsedSections.ratios && (
                  <>
                    {renderRow(
                      'Price to Earnings Per Share (P/E)',
                      (d) => d.priceRatios.pe ? `${Number(d.priceRatios.pe).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.pe,
                      'low'
                    )}
                    {renderRow(
                      'Forward Price to Earnings (Forward P/E)',
                      (d) => d.priceRatios.forwardPe ? `${Number(d.priceRatios.forwardPe).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.forwardPe,
                      'low'
                    )}
                    {renderRow(
                      'Price to Free Cash Flow (P/FCF)',
                      (d) => d.priceRatios.pFreeCashFlow ? `${Number(d.priceRatios.pFreeCashFlow).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.pFreeCashFlow,
                      'low'
                    )}
                    {renderRow(
                      'Price to Book Value Per Share (P/B)',
                      (d) => d.priceRatios.pBook ? `${Number(d.priceRatios.pBook).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.pBook,
                      'low'
                    )}
                    {renderRow(
                      'Price to Sales Ratio (P/S)',
                      (d) => d.priceRatios.pSales ? `${Number(d.priceRatios.pSales).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.pSales,
                      'low'
                    )}
                    {renderRow(
                      'EV/EBITDA',
                      (d) => d.priceRatios.evEbitda ? `${Number(d.priceRatios.evEbitda).toFixed(2)}x` : '—',
                      (d) => d.priceRatios.evEbitda,
                      'low'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 7: MARGINS
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('margin')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.margin ? '-rotate-90' : ''}`} />
                      Margins
                    </span>
                  </td>
                </tr>

                {!collapsedSections.margin && (
                  <>
                    {renderRow(
                      'Operating Margin',
                      (d) => d.margin.operatingMargin ? `${Number(d.margin.operatingMargin).toFixed(2)}%` : '—',
                      (d) => d.margin.operatingMargin,
                      'high'
                    )}
                    {renderRow(
                      'Gross Margin',
                      (d) => d.margin.grossMargin ? `${Number(d.margin.grossMargin).toFixed(2)}%` : '—',
                      (d) => d.margin.grossMargin,
                      'high'
                    )}
                    {renderRow(
                      'Profit Margin',
                      (d) => d.margin.profitMargin ? `${Number(d.margin.profitMargin).toFixed(2)}%` : '—',
                      (d) => d.margin.profitMargin,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 8: EARNINGS
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('earnings')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.earnings ? '-rotate-90' : ''}`} />
                      Earnings
                    </span>
                  </td>
                </tr>

                {!collapsedSections.earnings && (
                  <>
                    {renderRow(
                      'Basic Earnings Per Share (Basic EPS)',
                      (d) => formatPrice(d.earnings.eps, d.profile.exchange, d.symbol),
                      (d) => d.earnings.eps,
                      'high'
                    )}
                    {renderRow(
                      'EPS YoY Growth',
                      (d) => <span className={Number(d.earnings.epsGrowthYoY) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatPercentChange(d.earnings.epsGrowthYoY)}</span>,
                      (d) => d.earnings.epsGrowthYoY,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 9: EQUITY RETURN
                    ======================================================== */}
                <tr 
                  onClick={() => toggleSection('return')} 
                  className="bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans"
                >
                  <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsedSections.return ? '-rotate-90' : ''}`} />
                      Equity Returns
                    </span>
                  </td>
                </tr>

                {!collapsedSections.return && (
                  <>
                    {renderRow(
                      'Return on Equity (ROE)',
                      (d) => d.equityReturn.roe ? `${Number(d.equityReturn.roe).toFixed(2)}%` : '—',
                      (d) => d.equityReturn.roe,
                      'high'
                    )}
                    {renderRow(
                      'Return on Assets (ROA)',
                      (d) => d.equityReturn.roa ? `${Number(d.equityReturn.roa).toFixed(2)}%` : '—',
                      (d) => d.equityReturn.roa,
                      'high'
                    )}
                    {renderRow(
                      'Return on Invested Capital (ROIC)',
                      (d) => d.equityReturn.roic ? `${Number(d.equityReturn.roic).toFixed(2)}%` : '—',
                      (d) => d.equityReturn.roic,
                      'high'
                    )}
                  </>
                )}

                {/* ========================================================
                    SECTION 10: SCORE SUMMARY
                    ======================================================== */}
                <tr className="bg-emerald-50/30 border-t-2 border-emerald-500">
                  <td className="py-4 px-4 text-sm font-black text-emerald-900 sticky left-0 z-10 bg-emerald-50/80 backdrop-blur-xs border-r border-emerald-100 flex flex-col">
                    <span>Overall Winner</span>
                    <span className="text-[10px] text-emerald-600/80 font-semibold uppercase tracking-wider mt-0.5">Metrics Won</span>
                  </td>
                  {columnsData.map((col, idx) => {
                    if (!col || col.loading || col.details?.error) {
                      return <td key={idx} className="py-4 px-4 text-center text-gray-300 font-mono text-xs">—</td>;
                    }
                    const isWinner = scores[idx] === Math.max(...scores.filter((_, i) => columnsData[i]?.details));
                    return (
                      <td key={idx} className={`py-4 px-4 text-center text-xl font-black font-mono ${isWinner ? 'text-emerald-600 bg-emerald-100/50 border-x border-emerald-200' : 'text-gray-400'}`}>
                        {scores[idx]} <span className="text-[10px] text-gray-400 font-sans tracking-wide uppercase">wins</span>
                        {isWinner && <div className="text-[10px] font-sans text-emerald-600 bg-emerald-200/50 inline-block px-2 py-0.5 rounded-full ml-2 uppercase tracking-widest align-middle">Winner</div>}
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

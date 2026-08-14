import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient.js';
import { Search, Globe, Command, Loader2 } from 'lucide-react';
import { getCountryFlagUrl, getExchangeBadge } from '../utils/symbolHelper.js';

interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange: string;
  country: string;
  isLocal: boolean;
}

interface SearchBarProps {
  placeholder?: string;
  variant?: 'default' | 'hero';
  onSelect?: (symbol: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = 'Search tickers...',
  variant = 'default',
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cmd+K / Ctrl+K global listener to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce dynamically
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
        setResults(resp.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('[SEARCH COMPONENT ERROR]', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setIsOpen(false);
    if (onSelect) {
      onSelect(symbol);
    } else {
      navigate(`/company/${encodeURIComponent(symbol.toUpperCase())}`);
    }
  };

  const isHero = variant === 'hero';

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative">
        <Search className={`absolute text-slate-400 ${
          isHero 
            ? 'left-4.5 top-1/2 -translate-y-1/2 h-5.5 w-5.5 text-emerald-400' 
            : 'left-3 top-2.5 h-4 w-4 text-slate-400'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
          id={isHero ? 'hero-stock-search' : 'global-stock-search'}
          className={
            isHero
              ? 'w-full rounded-2xl border border-slate-700/80 bg-[#0D111A]/90 py-3.5 pl-12 pr-12 text-[15px] font-medium text-slate-100 placeholder-slate-500 outline-none shadow-2xl backdrop-blur-xl transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : 'w-full rounded-xl border border-slate-800 bg-[#0D111A]/90 py-1.5 pl-9 pr-9 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:bg-[#141A26] focus:ring-1 focus:ring-emerald-500/30'
          }
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          ) : !isHero && (
            <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-500 font-mono">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Autocomplete Results Grid */}
      {isOpen && (
        <div className={`absolute top-full mt-2 z-50 rounded-2xl border border-slate-800 bg-[#0D111A] p-2 shadow-2xl backdrop-blur-2xl animate-fade-in ${
          isHero 
            ? 'left-0 right-0 w-full max-h-[380px] overflow-y-auto' 
            : 'right-0 w-[300px] sm:w-[360px] max-h-[380px] overflow-y-auto'
        }`}>
          
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="font-sans text-xs text-slate-400 font-medium">No equities found for "{query}"</p>
              <p className="font-mono text-[11px] text-slate-500 mt-1">Try "AAPL", "NVDA", "MSFT", or "TSLA"</p>
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold border-b border-slate-800/80 pb-1.5 mb-1 flex justify-between items-center">
                <span>Matching Equities</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  {results.length} Found
                </span>
              </div>
              <div className="space-y-0.5">
                {results.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-[#141A26] transition-colors focus:bg-[#141A26] outline-none group border border-transparent hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Country Flag Badge */}
                      <img
                        src={getCountryFlagUrl(item.exchange)}
                        alt="Flag"
                        referrerPolicy="no-referrer"
                        className="h-3 w-4 rounded-xs shrink-0 shadow-sm object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {item.displaySymbol || item.symbol}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 px-1 bg-slate-800/80 rounded border border-slate-700/80">
                            {getExchangeBadge(item.exchange)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-slate-400 font-medium mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action arrow indicator */}
                    <div className="flex items-center shrink-0 ml-2 text-slate-600 group-hover:text-emerald-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

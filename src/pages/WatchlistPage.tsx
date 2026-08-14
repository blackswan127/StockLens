import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../utils/apiClient.js';
import { StockCard } from '../components/StockCard.jsx';
import { CardSkeleton } from '../components/Skeleton.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { Star, Newspaper, Plus, Sparkles, Building, Briefcase, ExternalLink, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

interface WatchItem {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  change: number;
  change_pct: number;
}

interface IndexQuote {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  unavailable?: boolean;
}

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
  image?: string;
}

// Suggested starting stocks to let users seed their watchlists instantly
const SUGGESTED_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', exchange: 'NSE' }
];

export const WatchlistPage: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Fetch user watchlist
  const { data: watchlist, isPending: isWatchPending } = useQuery<WatchItem[]>({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const resp = await apiClient.get('/watchlist');
      return resp.data || [];
    }
  });

  // 1.5. Fetch global market indices
  const { data: indices, isPending: isIndicesPending, refetch: refetchIndices } = useQuery<IndexQuote[]>({
    queryKey: ['marketIndicesMain'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/indices');
      return resp.data || [];
    },
    refetchInterval: 60000 // 1 minute live sync
  });

  // 2. Fetch global market news
  const { data: news, isPending: isNewsPending } = useQuery<NewsItem[]>({
    queryKey: ['marketNews'],
    queryFn: async () => {
      const resp = await apiClient.get('/news/market');
      return (resp.data || []).slice(0, 6); // Limit to top 6 news items for beautiful layout
    },
    refetchInterval: 180000 // refresh news every 3 minutes
  });

  // 3. Mutator to add stock instantly
  const addStockMutation = useMutation({
    mutationFn: async (symbol: string) => {
      await apiClient.post('/watchlist/add', { symbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* 1. Centered Hero Search Section */}
      <div className="relative z-50 rounded-3xl border border-slate-800 bg-[#0D111A]/95 backdrop-blur-2xl shadow-3d-lg py-12 px-6 sm:px-12 text-center">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>INSTITUTIONAL EQUITY INTELLIGENCE</span>
          </div>
          
          <h1 className="font-sans text-3xl sm:text-5xl font-black tracking-tight text-slate-100 leading-tight">
            Financial Terminal & <br className="hidden sm:inline" />
            <span className="text-emerald-400">Intrinsic Value Screener</span>.
          </h1>
          
          <p className="font-sans text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Direct real-time monitoring across 200+ global equities with CAPM DCF valuations, 7-persona hedge fund radar ratings, and SEC EDGAR automated XBRL ingestion.
          </p>

          <div className="w-full max-w-xl mx-auto pt-2">
            <SearchBar 
              variant="hero" 
              placeholder="Search ticker, company name, or brand (e.g. NVDA, Apple, RELIANCE)..." 
            />
          </div>
        </div>
      </div>

      {/* 1.5 Global Market Indices Benchmarks Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="font-sans text-sm font-bold text-slate-200 tracking-tight">Global Market Benchmarks</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline-block">
              Multi-Exchange Telemetry
            </span>
            <button
              onClick={() => refetchIndices()}
              className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Sync Live Indices"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isIndicesPending ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-800/60 rounded-xl animate-pulse border border-slate-800 shadow-3d" />
            ))
          ) : (
            indices?.map((idx) => {
              if (idx.unavailable || idx.price === null || idx.change_pct === null) {
                return (
                  <div
                    key={idx.symbol}
                    className="p-3.5 border border-slate-800 bg-[#0D111A] rounded-xl shadow-3d flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-sans font-bold text-xs text-slate-200 tracking-tight block truncate">
                        {idx.name}
                      </span>
                      <div className="font-mono text-[9px] text-slate-500 uppercase">
                        {idx.symbol}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-slate-500 font-mono text-[9px]">
                      <AlertCircle className="h-2.5 w-2.5" />
                      <span>Unavailable</span>
                    </div>
                  </div>
                );
              }

              const isUp = idx.change_pct >= 0;
              return (
                <div 
                  key={idx.symbol}
                  className="p-3.5 border border-slate-800 bg-[#0D111A] rounded-xl shadow-3d card-3d-tilt transition-all duration-200 hover:border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-sans font-bold text-xs text-slate-200 tracking-tight block truncate">
                      {idx.name}
                    </span>
                    <div className="font-mono text-[9px] text-slate-500 uppercase">
                      {idx.symbol}
                    </div>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-1">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-100 tabular-nums truncate">
                      {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border tabular-nums shrink-0 ${
                      isUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}>
                      {isUp ? '+' : ''}{idx.change_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Hub Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Watchlist Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-current" />
              <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight">Active Portfolio Watchlist</h2>
            </div>
            
            <Link 
              to="/screener" 
              className="font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Open Universal Screener →
            </Link>
          </div>

          {isWatchPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 4, 3].map((idx) => (
                <CardSkeleton key={idx} />
              ))}
            </div>
          ) : watchlist && watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {watchlist.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  exchange={stock.exchange}
                  price={stock.price ?? undefined}
                  change={stock.change}
                  change_pct={stock.change_pct}
                  isStarred={true}
                />
              ))}
            </div>
          ) : (
            /* Watchlist Empty Active State */
            <div className="border border-dashed border-slate-800 rounded-3xl p-8 sm:p-12 text-center bg-[#0D111A]/90 backdrop-blur-xl shadow-xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-slate-200">Watchlist is currently empty</h3>
              <p className="mt-1 font-sans text-xs text-slate-400 max-w-sm mx-auto">
                Track and monitor companies in real time. Search any ticker above, or tap these popular high-volume instruments:
              </p>
              
              {/* Seeding suggestions layout */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {SUGGESTED_STOCKS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => addStockMutation.mutate(s.symbol)}
                    disabled={addStockMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-emerald-500/15 hover:border-emerald-500/40 text-xs font-mono font-bold text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-emerald-400" />
                    <span>{s.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Immersive Financial Hub News */}
        <div className="space-y-6 rounded-3xl border border-slate-800 bg-[#0D111A]/95 backdrop-blur-2xl shadow-2xl p-6">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
            <Newspaper className="h-5 w-5 text-emerald-400" />
            <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight">Market Telemetry & Wire</h2>
          </div>

          <div className="space-y-4">
            {isNewsPending ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="border-b border-slate-800 pb-4 last:border-0 space-y-2 animate-pulse">
                  <div className="h-3 w-28 bg-slate-800 rounded" />
                  <div className="h-4 w-full bg-slate-800 rounded" />
                  <div className="h-3.5 w-5/6 bg-slate-800 rounded" />
                </div>
              ))
            ) : news && news.length > 0 ? (
              news.map((item) => (
                <article key={item.id} className="border-b border-slate-800/80 pb-4 last:border-0 last:pb-0 group transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex justify-between items-baseline gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {item.source || 'BULLETIN'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {formatDate(item.datetime * 1000)}
                    </span>
                  </div>

                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group-hover:text-emerald-400 outline-none transition-colors"
                  >
                    <h3 className="font-sans font-bold text-xs sm:text-[13px] leading-snug text-slate-200 group-hover:text-emerald-400 flex items-start gap-1">
                      <span>{item.headline}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-500 group-hover:text-emerald-400 inline-block mt-0.5" />
                    </h3>
                  </a>
                  
                  {item.summary && (
                    <p className="font-sans text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-[#080B11]">
                <p className="font-mono text-xs">Bulletins feed temporarily offline</p>
                <p className="font-mono text-[10px] text-slate-600 mt-1">Live background polling active</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

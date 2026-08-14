import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { LineChart, AlertCircle, RefreshCw, Activity } from 'lucide-react';

interface IndexQuote {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  unavailable?: boolean;
}

export const MarketDashboardPage: React.FC = () => {
  // 1. Fetch indices quotes
  const { data: indices, isPending: isIndicesPending, refetch: refetchIndices } = useQuery<IndexQuote[]>({
    queryKey: ['marketIndicesMain'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/indices');
      return resp.data || [];
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      
      {/* 1. Header with title and manual updates */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            <h1 className="font-sans text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Global Market Dashboard
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-400 max-w-2xl">
            Real-time multi-exchange key indices, benchmark yields, and macroeconomic sentiment telemetry.
          </p>
        </div>

        <button
          onClick={() => { refetchIndices(); }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-300 bg-[#0D111A] hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
          <span>Sync Live Feeds</span>
        </button>
      </div>

      {/* 2. Global Index Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {isIndicesPending ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-800" />
          ))
        ) : (
          indices?.map((idx) => {
            if (idx.unavailable || idx.price === null || idx.change_pct === null) {
              return (
                <div
                  key={idx.symbol}
                  className="p-4 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <span className="font-sans font-bold text-xs text-slate-200 tracking-tight">
                      {idx.name}
                    </span>
                    <div className="font-mono text-[10px] text-slate-500 uppercase">
                      {idx.symbol}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                    <AlertCircle className="h-3 w-3" />
                    <span>Unavailable</span>
                  </div>
                </div>
              );
            }

            const isUp = idx.change_pct >= 0;
            return (
              <div 
                key={idx.symbol}
                className="p-4 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl transition-all duration-300 hover:border-slate-700 hover:bg-[#111723] hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <span className="font-sans font-bold text-xs text-slate-200 tracking-tight">
                    {idx.name}
                  </span>
                  <div className="font-mono text-[10px] text-slate-500 uppercase">
                    {idx.symbol}
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono font-bold text-sm sm:text-base text-slate-100 tabular-nums">
                    {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded border tabular-nums ${
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
  );
};

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { formatPercentChange } from '../utils/formatters.js';
import { Activity, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { MiniSparkline } from './ui/MiniSparkline.js';

interface IndexQuote {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  unavailable?: boolean;
}

export const Ticker: React.FC = () => {
  const { data: indices, isPending, error, refetch, isFetching } = useQuery<IndexQuote[]>({
    queryKey: ['marketIndices'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/indices');
      return resp.data;
    },
    refetchInterval: 60000 // refresh indices quote every minute
  });

  return (
    <div className="bg-[#080C14]/95 backdrop-blur-md text-slate-200 border-b border-slate-800/80 text-xs py-2 px-4 overflow-hidden shadow-md">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Label block */}
        <div className="flex items-center gap-2 flex-shrink-0 text-emerald-400 font-mono tracking-wider font-bold text-[11px]">
          <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>GLOBAL TAPE</span>
          <span className="h-3 w-px bg-slate-800 mx-1 hidden sm:inline" />
        </div>

        {/* Indices list */}
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar py-0.5 w-full justify-start sm:justify-end">
          {isPending ? (
            <div className="flex gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="h-4 w-28 bg-slate-800/60 rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="text-slate-500 font-mono text-xs">Indices feed offline. Retry.</div>
          ) : (
            indices?.map((idx) => {
              if (idx.unavailable || idx.price === null || idx.change_pct === null) {
                return (
                  <div
                    key={idx.symbol}
                    className="flex items-center gap-2 flex-shrink-0 border-r border-slate-800/80 last:border-0 pr-4 last:pr-0"
                  >
                    <span className="font-sans text-xs font-semibold text-slate-400">{idx.name}</span>
                    <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-800/40">
                      Offline
                    </span>
                  </div>
                );
              }

              const isUp = (idx.change ?? 0) >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="flex items-center gap-2.5 flex-shrink-0 border-r border-slate-800/80 last:border-0 pr-4 last:pr-0 group"
                >
                  <span className="font-sans text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">
                    {idx.name}
                  </span>
                  <span className="font-mono font-bold text-slate-100 text-xs tabular-nums">
                    {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  
                  {/* Mini trend sparkline */}
                  <MiniSparkline isUp={isUp} width={36} height={14} strokeWidth={1.2} />

                  <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isUp 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}>
                    {isUp ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {formatPercentChange(idx.change_pct)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Refresh indicator */}
        <button 
          onClick={() => refetch()}
          title="Manual Indices Refresh"
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200 shrink-0 hidden md:block"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

      </div>
    </div>
  );
};

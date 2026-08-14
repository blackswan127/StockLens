import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { Star, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { getCountryFlagUrl, getExchangeBadge } from '../utils/symbolHelper.js';
import { formatPrice, formatPercentChange } from '../utils/formatters.js';
import { usePrefetchCompany } from '../hooks/usePrefetchCompany.js';

interface StockCardProps {
  symbol: string;
  name: string;
  exchange: string;
  price?: number;
  change?: number;
  change_pct?: number;
  isStarred?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({
  symbol,
  name,
  exchange,
  price,
  change,
  change_pct,
  isStarred = false
}) => {
  const queryClient = useQueryClient();
  const prefetch = usePrefetchCompany();

  // Watchlist Star mutations
  const toggleStar = useMutation({
    mutationFn: async () => {
      if (isStarred) {
        return await apiClient.delete(`/watchlist/${encodeURIComponent(symbol)}`);
      } else {
        return await apiClient.post('/watchlist/add', { symbol });
      }
    },
    onSuccess: () => {
      // Invalidate both user watchlists & global query caches
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistStatus', symbol] });
    }
  });

  const isUp = (change ?? 0) >= 0;

  return (
    <div
      className="group relative border border-slate-800 bg-[#0D111A]/95 backdrop-blur-xl rounded-2xl p-5 shadow-3d card-3d-tilt flex flex-col justify-between h-44 hover:border-slate-700"
      onMouseEnter={() => prefetch(symbol)}
      onFocus={() => prefetch(symbol)}
    >
      {/* Upper info section */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={getCountryFlagUrl(exchange)}
              alt="Exchange flag"
              className="h-3 w-4 rounded-sm shrink-0 object-cover shadow-sm opacity-80"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              {getExchangeBadge(exchange)}
            </span>
          </div>

          {/* Star watchlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleStar.mutate();
            }}
            disabled={toggleStar.isPending}
            className={`p-1.5 rounded-lg border btn-3d transition-all cursor-pointer ${
              isStarred
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
            }`}
            title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Ticker & Full Name Link */}
        <Link 
          to={`/company/${encodeURIComponent(symbol)}`}
          className="block mt-2.5 min-w-0"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-mono font-black text-lg text-slate-100 group-hover:text-emerald-400 transition-colors tracking-tight">
              {symbol}
            </h3>
            <span className="truncate text-xs text-slate-400 font-medium max-w-[120px] sm:max-w-none">
              {name}
            </span>
          </div>
        </Link>
      </div>

      {/* Pricing block */}
      <div className="pt-3 border-t border-slate-800/80 flex items-end justify-between">
        <div>
          <div className="font-mono font-bold text-xl text-slate-100 tabular-nums">
            {formatPrice(price, exchange)}
          </div>
          <div className={`flex items-center gap-1 font-mono text-xs font-bold mt-0.5 ${
            isUp ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{formatPercentChange(change_pct)}</span>
          </div>
        </div>

        {/* Detailed direct navigation action button */}
        <Link
          to={`/company/${encodeURIComponent(symbol)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-200 bg-[#141A26] hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-all border border-slate-700 btn-3d"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Analyze</span>
        </Link>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { formatMarketCap, formatPercentChange, formatPrice } from '../../utils/formatters.js';
import type {
  ActivityTab,
  ActivityTabId,
  MarketMoverStock,
  MarketMoversResponse,
} from './types';

const ACTIVITY_TABS: readonly ActivityTab[] = [
  { id: 'most_active', label: 'Most Active' },
  { id: 'trending', label: 'Trending Now' },
  { id: 'gainers', label: 'Top Gainers' },
  { id: 'losers', label: 'Top Losers' },
  { id: 'highs_52w', label: '52 Week Gainers' },
  { id: 'lows_52w', label: '52 Week Losers' },
];

function renderSparkline(symbol: string, isUp: boolean) {
  if (!symbol) return null;
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  const points: number[] = [];
  const currentVal = 50;
  points.push(currentVal);

  const changeDir = isUp ? 1 : -1;
  for (let i = 1; i <= 8; i++) {
    const step = Math.sin(seed + i) * 15;
    const trend = (i / 8) * 18 * changeDir;
    points.push(currentVal + step + trend);
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const width = 80;
  const height = 24;
  const padding = 2;

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - padding - ((p - min) / range) * (height - 2 * padding);
    return { x, y };
  });

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = isUp ? '#10b981' : '#ef4444'; // emerald-500 or rose-500
  const gradientId = `spark-grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${isUp ? 'up' : 'down'}`;

  return (
    <svg width={width} height={height} className="overflow-visible select-none pointer-events-none mx-auto">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2" fill={strokeColor} />
    </svg>
  );
}

interface StockActivityWidgetProps {
  moversData: MarketMoversResponse | undefined;
  isPending: boolean;
  onSelectStock: (symbol: string) => void;
  onHoverStock: (symbol: string) => void;
}

export function StockActivityWidget({
  moversData,
  isPending,
  onSelectStock,
  onHoverStock,
}: StockActivityWidgetProps) {
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTabId>('most_active');

  const stocks: MarketMoverStock[] = moversData?.[activeActivityTab] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <h3 className="font-sans text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <span>Stock Activity</span>
          <span className="text-[10px] font-mono text-slate-500 font-semibold normal-case">
            (Top market dynamics and breakouts)
          </span>
        </h3>
      </div>

      {/* Tab switcher bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 border-b border-slate-800/80 scrollbar-none">
        {ACTIVITY_TABS.map((tab) => {
          const isActive = activeActivityTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveActivityTab(tab.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table showing stocks for the active tab in a vertical list layout */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0D111A] shadow-xl">
        <table className="min-w-full divide-y divide-slate-800/80 border-collapse">
          <thead className="bg-[#080B11] border-b border-slate-800 text-left">
            <tr>
              <th className="w-24 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Symbol</th>
              <th className="px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Name</th>
              <th className="w-24 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">Trend</th>
              <th className="w-28 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Price</th>
              <th className="w-28 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Change %</th>
              <th className="w-32 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Market Cap</th>
              <th className="w-32 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">P/E Ratio</th>
              <th className="w-36 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">52 Wk Change %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-transparent">
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse" aria-hidden="true">
                  <td className="w-24 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-24 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-28 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-28 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-32 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-32 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                  <td className="w-36 px-4 py-3 bg-[#0D111A] h-10" aria-hidden="true" />
                </tr>
              ))
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs font-mono text-slate-500 font-medium">
                  No active stocks found for this category.
                </td>
              </tr>
            ) : (
              stocks.map((stock) => {
                const isUp = (stock.change_pct ?? 0) >= 0;
                const is52wUp = (stock.change_52w ?? 0) >= 0;
                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelectStock(stock.symbol)}
                    onMouseEnter={() => onHoverStock(stock.symbol)}
                    className="hover:bg-[#141A26] cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="w-24 px-4 py-3.5 text-left">
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-200 border border-slate-700 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-colors">
                        {stock.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-300 truncate max-w-[150px] sm:max-w-md font-sans font-medium">
                      {stock.name}
                    </td>
                    <td className="w-24 px-4 py-3.5 text-center">
                      {renderSparkline(stock.symbol, isUp)}
                    </td>
                    <td className="w-28 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                      {formatPrice(stock.price, stock.exchange)}
                    </td>
                    <td className={`w-28 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums ${
                      isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatPercentChange(stock.change_pct)}
                    </td>
                    <td className="w-32 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-300 tabular-nums">
                      {typeof stock.market_cap === 'number' ? formatMarketCap(stock.market_cap, stock.exchange) : '—'}
                    </td>
                    <td className="w-32 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-300 tabular-nums">
                      {typeof stock.pe_ratio === 'number' ? `${stock.pe_ratio.toFixed(2)}` : '—'}
                    </td>
                    <td className={`w-36 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums ${
                      is52wUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {typeof stock.change_52w === 'number' ? `${stock.change_52w >= 0 ? '+' : ''}${stock.change_52w.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

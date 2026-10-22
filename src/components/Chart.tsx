import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { formatPrice } from '../utils/formatters.js';
import { ShieldAlert, RefreshCw, Plus, Check, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartPoint {
  date: string;
  timestamp: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface ChartTooltipEntry {
  payload: ChartPoint;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  exchange: string;
  currencyCode: string;
}

interface ChartMouseEvent {
  activePayload?: ChartTooltipEntry[];
  activeTooltipIndex?: number | string | null;
  activeIndex?: number | string | null;
  isTooltipActive?: boolean;
}

const CustomTooltip = ({ active, payload, exchange, currencyCode }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 shadow-md font-sans text-xs flex flex-col gap-0.5 pointer-events-none select-none min-w-[130px]">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Price</span>
        <span className="font-mono font-black text-neutral-950 text-sm">
          {formatPrice(data.close, exchange)} {currencyCode}
        </span>
        <div className="h-px bg-neutral-250 my-1.5" />
        <span className="text-[10px] text-neutral-700 font-semibold">{data.date}</span>
      </div>
    );
  }
  return null;
};

interface ChartProps {
  symbol: string;
  exchange?: string;
}

const PERIOD_TABS = [
  { label: '1D', value: '1D', labelText: 'past day' },
  { label: '5D', value: '5D', labelText: 'past 5 days' },
  { label: '1M', value: '1M', labelText: 'past month' },
  { label: '6M', value: '6M', labelText: 'past 6 months' },
  { label: 'YTD', value: 'YTD', labelText: 'year to date' },
  { label: '1Y', value: '1Y', labelText: 'past year' },
  { label: '5Y', value: '5Y', labelText: 'past 5 years' },
  { label: 'Max', value: 'MAX', labelText: 'all time' }
];

const intervalMap: Record<string, string> = {
  '1D': '5min',
  '5D': '15min',
  '1M': '1day',
  '6M': '1day',
  'YTD': '1day',
  '1Y': '1week',
  '5Y': '1month',
  'Max': '1month'
};

export const Chart: React.FC<ChartProps> = ({ symbol, exchange = 'US' }) => {
  const [selectedTab, setSelectedTab] = useState('1Y');
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const activePeriod = PERIOD_TABS.find(t => t.label === selectedTab) || PERIOD_TABS[5];
  const queryPeriod = activePeriod.value;
  const intervalQueryParam = intervalMap[selectedTab] || '1day';

  // Query chart with timeframe-specific cached entries
  const { data: chartData, isPending, isError, refetch } = useQuery<ChartPoint[]>({
    queryKey: ['chart', symbol, queryPeriod, intervalQueryParam],
    queryFn: async () => {
      const resp = await apiClient.get(`/chart/${encodeURIComponent(symbol)}?period=${queryPeriod}&interval=${intervalQueryParam}`);
      if (resp.data && resp.data.s === 'no_data') {
        return [];
      }
      return Array.isArray(resp.data) ? resp.data : [];
    },
    staleTime: 60000 
  });

  const handleTimeframeChange = (tf: string) => {
    setSelectedTab(tf);
    setHoveredPoint(null);
  };

  const getCurveType = (tab: string): 'linear' | 'monotone' | 'basis' => {
    if (tab === '1D' || tab === '5D') return 'linear';
    if (tab === '1M' || tab === '6M' || tab === 'YTD') return 'monotone';
    return 'basis'; 
  };

  const firstPoint = chartData?.[0];
  const lastPoint = chartData?.[chartData.length - 1];
  
  const initialPrice = firstPoint?.close ?? 0;
  const currentPrice = lastPoint?.close ?? 0;
  
  const activePriceVal = hoveredPoint ? hoveredPoint.close : currentPrice;
  const priceDiff = activePriceVal - initialPrice;
  const priceDiffPct = initialPrice > 0 ? (priceDiff / initialPrice) * 100 : 0;
  const isUp = priceDiff >= 0;

  let yMin: number | 'auto' = 'auto';
  let yMax: number | 'auto' = 'auto';
  if (chartData && chartData.length > 0) {
    const closes = chartData.map(d => d.close);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const spread = maxClose - minClose;
    const padding = spread * 0.12 || minClose * 0.04 || 1; 
    yMin = Math.max(0, Math.floor(minClose - padding));
    yMax = Math.ceil(maxClose + padding);
  }

  const getCurrencyCode = (ex: string) => {
    const uppercaseEx = (ex || '').toUpperCase();
    if (uppercaseEx.includes('NSE') || uppercaseEx.includes('BSE') || uppercaseEx.includes('INDIA')) {
      return 'INR';
    }
    if (uppercaseEx.includes('NYSE') || uppercaseEx.includes('NASDAQ') || uppercaseEx.includes('US') || uppercaseEx.includes('OTC')) {
      return 'USD';
    }
    if (uppercaseEx.includes('LSE') || uppercaseEx.includes('LONDON')) {
      return 'GBP';
    }
    return 'USD';
  };
  const currencyCode = getCurrencyCode(exchange);

  const renderStatusText = () => {
    if (hoveredPoint) {
      return (
        <span className="text-[11px] font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-md border border-neutral-200 transition-all duration-150">
          Viewing point: {hoveredPoint.date}
        </span>
      );
    }
    if (lastPoint) {
      return (
        <span className="text-[11px] font-semibold text-neutral-600">
          Last updated: <span className="text-neutral-900 font-bold">{lastPoint.date}</span> • Real-time Feeds
        </span>
      );
    }
    return <span className="text-[11px] font-semibold text-neutral-600">Market closed • Feeds active</span>;
  };

  return (
    <div className="border border-neutral-200/60 bg-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-sm transition-shadow duration-300 flex flex-col gap-6 font-sans relative overflow-hidden">
      
      {/* Decorative top-right accent glow to reflect premium aesthetic */}
      <div className={`absolute top-0 right-0 w-48 h-48 rounded-full filter blur-[80px] opacity-[0.06] transition-colors duration-500 pointer-events-none ${
        isUp ? 'bg-emerald-500' : 'bg-rose-500'
      }`} />

      {/* Modern Fintech Header Area with Monospace/Sans Fluid Numbers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4.5xl sm:text-5xl font-black tracking-tight text-neutral-900 font-sans tabular-nums leading-none">
              {activePriceVal.toFixed(2)}
            </span>
            <span className="text-xs text-neutral-600 font-black uppercase tracking-wider font-mono bg-neutral-100/90 px-2 py-0.5 rounded border border-neutral-200">
              {currencyCode}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2.5">
            <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.75 rounded-full transition-colors duration-300 ${
              isUp 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                : 'bg-rose-50 text-rose-700 border border-rose-100/50'
            }`}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? '+' : ''}{priceDiffPct.toFixed(2)}%
            </div>
            <span className={`text-xs font-bold transition-colors duration-300 ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? '+' : ''}{priceDiff.toFixed(2)} {activePeriod.labelText}
            </span>
          </div>

          <div className="mt-3 h-5 flex items-center">
            {renderStatusText()}
          </div>
        </div>

        {/* Following/Tracker High Apex Action Pill */}
        <button 
          onClick={() => setIsFollowing(!isFollowing)}
          className={`px-5 py-2.5 rounded-full text-xs font-bold font-sans flex items-center gap-1.5 transition-all duration-200 select-none border active:scale-[0.98] ${
            isFollowing 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800' 
              : 'bg-neutral-900 border-neutral-950 text-white hover:bg-neutral-800 shadow-sm'
          }`}
        >
          {isFollowing ? (
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Watching</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Track stock</span>
            </span>
          )}
        </button>
      </div>

      {/* Premium Segmented Segment Switcher */}
      <div className="bg-neutral-50/80 p-1 rounded-2xl border border-neutral-100/80 flex items-center overflow-x-auto scrollbar-none w-full shadow-inner-sm z-10">
        <div className="flex items-center w-full justify-between sm:justify-start gap-1">
          {PERIOD_TABS.map((p) => {
            const isActive = selectedTab === p.label;
            return (
              <button
                key={p.label}
                onClick={() => handleTimeframeChange(p.label)}
                className={`font-sans text-[11px] font-extrabold transition-all duration-200 py-2 px-3.5 sm:px-4 rounded-xl relative select-none uppercase tracking-wider text-center ${
                  isActive 
                    ? 'bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-300 font-black' 
                    : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/70'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Master High Fidelity Responsive Chart Container */}
      <div className="relative h-64 sm:h-[290px] w-full mt-2 z-10">
        {isPending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50/20 gap-3 border border-dashed border-neutral-200/70 rounded-2xl">
            <RefreshCw className="h-7 w-7 animate-spin text-neutral-400" />
            <p className="font-mono text-xs text-neutral-400 font-medium">Refining market feeds...</p>
          </div>
        ) : isError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50/20 text-rose-800 gap-2 border border-dashed border-rose-200/70 rounded-2xl px-6 py-8 text-center">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
            <span className="font-sans font-bold text-xs text-neutral-800">Connection Interrupted</span>
            <button 
              onClick={() => refetch()} 
              className="mt-2.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[11px] font-bold transition active:scale-[0.98]"
            >
              Reload candle
            </button>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div className="h-full w-full animate-in fade-in duration-300">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData} 
                margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
                onMouseMove={(e: ChartMouseEvent) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setHoveredPoint(e.activePayload[0].payload);
                  } else if (e && typeof e.activeTooltipIndex === 'number' && chartData && chartData[e.activeTooltipIndex]) {
                    setHoveredPoint(chartData[e.activeTooltipIndex]);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                }}
              >
                <defs>
                  <linearGradient id="gradientTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isUp ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} 
                      stopOpacity={0.14} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isUp ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} 
                      stopOpacity={0.00} 
                    />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F4" vertical={false} opacity={0.65} />
                
                <XAxis 
                  dataKey="date" 
                  stroke="#374151" 
                  fontSize={10} 
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1.2 }}
                  dy={10}
                  minTickGap={45}
                />
                
                <YAxis 
                  stroke="#374151" 
                  fontSize={10} 
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val: number | string) => `${Number(val).toFixed(0)}`}
                  domain={[yMin, yMax]}
                  dx={-6}
                />
                
                <Tooltip 
                  content={<CustomTooltip exchange={exchange} currencyCode={currencyCode} />} 
                  cursor={{ stroke: '#dadce0', strokeWidth: 1.5, strokeDasharray: '3 3' }} 
                />
                
                <Area 
                  type={getCurveType(selectedTab)} 
                  dataKey="close" 
                  stroke={isUp ? '#10b981' : '#f43f5e'} 
                  strokeWidth={2.4}
                  fillOpacity={1} 
                  fill="url(#gradientTrend)" 
                  activeDot={{ r: 5, stroke: isUp ? '#10b981' : '#f43f5e', strokeWidth: 2, fill: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50/20 gap-2 border border-dashed border-neutral-200/70 rounded-2xl">
            <span className="font-sans font-semibold text-neutral-400 text-xs">Price history unavailable for this symbol/period</span>
          </div>
        )}
      </div>

    </div>
  );
};

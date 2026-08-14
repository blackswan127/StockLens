import React from 'react';
import { formatMarketCap, formatPrice, formatPercentChange } from '../../utils/formatters.js';
import { ArrowRight, TrendingUp, TrendingDown, Layers, ShieldCheck } from 'lucide-react';

interface ValuationWaterfallProps {
  dcfResult: {
    pvFcfSum: number;
    pvTerminalValue: number;
    enterpriseValue: number;
    netDebt: number;
    equityValue: number;
    fairValuePerShare: number;
    upsidePercent?: number;
  };
  currentPrice?: number;
  cashAndEquivalents: number;
  totalDebt: number;
  sharesOutstanding: number;
  exchange: string;
  symbol: string;
}

export const ValuationWaterfall: React.FC<ValuationWaterfallProps> = ({
  dcfResult,
  currentPrice,
  cashAndEquivalents,
  totalDebt,
  sharesOutstanding,
  exchange,
  symbol,
}) => {
  if (!dcfResult || !dcfResult.enterpriseValue) return null;

  const pvFcfPct = Math.round((dcfResult.pvFcfSum / dcfResult.enterpriseValue) * 100);
  const pvTermPct = Math.round((dcfResult.pvTerminalValue / dcfResult.enterpriseValue) * 100);

  const upside =
    currentPrice && currentPrice > 0
      ? ((dcfResult.fairValuePerShare - currentPrice) / currentPrice) * 100
      : dcfResult.upsidePercent ?? 0;

  const isUndervalued = upside > 0;

  const steps = [
    {
      label: 'PV Projected FCF',
      value: formatMarketCap(dcfResult.pvFcfSum, exchange, symbol),
      detail: `${pvFcfPct}% of EV`,
      type: 'subtotal',
    },
    {
      label: 'PV Terminal Value',
      value: formatMarketCap(dcfResult.pvTerminalValue, exchange, symbol),
      detail: `${pvTermPct}% of EV`,
      type: 'subtotal',
    },
    {
      label: 'Enterprise Value',
      value: formatMarketCap(dcfResult.enterpriseValue, exchange, symbol),
      detail: 'Core Operations',
      type: 'total',
      color: 'text-indigo-400',
    },
    {
      label: '+ Cash & Liquid Assets',
      value: `+${formatMarketCap(cashAndEquivalents, exchange, symbol)}`,
      detail: 'Non-operating cash',
      type: 'adjustment-pos',
    },
    {
      label: '− Total Debt & Obligations',
      value: `−${formatMarketCap(totalDebt, exchange, symbol)}`,
      detail: 'Credit claims',
      type: 'adjustment-neg',
    },
    {
      label: 'Implied Equity Value',
      value: formatMarketCap(dcfResult.equityValue, exchange, symbol),
      detail: 'Shareholder residual',
      type: 'total',
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Waterfall Step Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`rounded-xl p-3 border transition-all ${
              step.type === 'total'
                ? 'bg-[#141A26] border-slate-700 shadow-md'
                : 'bg-[#0D111A]/80 border-slate-800/80'
            }`}
          >
            <span className="font-sans text-[11px] font-semibold text-slate-400 block truncate">
              {step.label}
            </span>
            <span
              className={`font-mono font-bold text-sm block mt-1 truncate ${
                step.color || 'text-slate-100'
              }`}
            >
              {step.value}
            </span>
            <span className="font-mono text-[10px] text-slate-500 block truncate mt-0.5">
              {step.detail}
            </span>
          </div>
        ))}
      </div>

      {/* Intrinsic Per-Share Hero Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-[#0E1522] via-[#121B2B] to-[#0E1522] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-sans font-bold text-xs uppercase tracking-wider text-slate-400">
              DCF Model Intrinsic Fair Value
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-black text-2xl text-emerald-400">
                {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
              </span>
              <span className="font-sans text-xs text-slate-400">per share</span>
            </div>
          </div>
        </div>

        {/* Upside / Downside Signal Pill */}
        {currentPrice && currentPrice > 0 && (
          <div className="flex items-center gap-3 bg-[#090D15]/80 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
            <div className="text-right">
              <span className="font-sans text-[10px] text-slate-500 block uppercase">
                Market Price: {formatPrice(currentPrice, exchange, symbol)}
              </span>
              <span
                className={`font-mono font-bold text-sm inline-flex items-center gap-1 ${
                  isUndervalued ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUndervalued ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPercentChange(upside)} {isUndervalued ? 'Undervalued' : 'Overvalued'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

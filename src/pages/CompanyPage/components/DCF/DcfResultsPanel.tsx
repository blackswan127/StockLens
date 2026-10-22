import type { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DCFResult } from '../../../../utils/dcfCalculator.js';
import type { DCFData } from '../../hooks/useDCFData.js';
import { formatPrice, formatPercentChange } from '../../../../utils/formatters.js';

interface DcfResultsPanelProps {
  dcfResult: DCFResult | null;
  dcfError: string | null;
  data: DCFData;
  exchange: string;
  symbol: string;
  projectionYears: number;
}

function clampToRange(value: number, low: number, high: number): number {
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

export const DcfResultsPanel: FC<DcfResultsPanelProps> = ({
  dcfResult,
  dcfError,
  data,
  exchange,
  symbol,
  projectionYears,
}) => {
  const peerImpliedValue =
    data.peerMedianPE && data.companyEPS ? data.peerMedianPE * data.companyEPS : null;
  const range =
    data.low_52w !== null && data.high_52w !== null
      ? { low: data.low_52w, high: data.high_52w }
      : null;

  if (dcfError) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="font-bold">{dcfError}</span>
      </div>
    );
  }

  if (!dcfResult) return null;

  return (
    <div
      className={`p-5 rounded-xl border flex flex-col gap-5 ${
        dcfResult.upsidePercent > 0
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
          : 'bg-red-50/50 border-red-100 text-red-950'
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            DCF Intrinsic Fair Value
          </span>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-3xl font-extrabold font-mono tracking-tight leading-none block"
          >
            {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
          </span>
          <span className="text-[11.5px] text-slate-500 block">
            Based on a 2-Stage projection model ({projectionYears} years) and WACC discount rate of{' '}
            {formatPercentChange(dcfResult.wacc * 100)}.
          </span>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center md:text-right border-slate-200/60 md:border-r pr-0 md:pr-5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Price
            </span>
            <span className="text-lg font-bold font-mono text-slate-700 block">
              {formatPrice(data.currentPrice, exchange, symbol)}
            </span>
          </div>

          <div className="text-center md:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Valuation Gap
            </span>
            <span
              className={`text-xl font-black font-mono block ${
                dcfResult.upsidePercent > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {dcfResult.upsidePercent > 0 ? '▲' : '▼'}{' '}
              {Math.abs(dcfResult.upsidePercent).toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block">
              {dcfResult.upsidePercent > 0 ? 'Undervalued' : 'Overvalued'}
            </span>
          </div>
        </div>
      </div>

      {peerImpliedValue !== null && data.peerMedianPE && data.companyEPS && (
        <div className="w-full border-t border-slate-200/60 pt-4 mt-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Peer-Relative Sanity Check</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">Peer Median P/E:</span>
              <span className="font-mono font-bold">{data.peerMedianPE.toFixed(1)}x</span>
            </div>
            <div className="h-6 w-px bg-slate-200/60"></div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500">Peer Implied Value:</span>
              <span className="font-mono font-bold">
                {formatPrice(peerImpliedValue, exchange, symbol)}
              </span>
            </div>
            {Math.abs(
              (dcfResult.fairValuePerShare - peerImpliedValue) / peerImpliedValue
            ) > 0.4 && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold">DCF diverges {'>'}40% from peers</span>
              </div>
            )}
          </div>
        </div>
      )}

      {range && (
        <div className="w-full border-t border-slate-200/60 pt-4 mt-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-5">
            <span>52-Week Range Price Overlay</span>
            <span className="text-slate-500 font-mono font-normal normal-case">
              Current is at{' '}
              {clampToRange(data.currentPrice, range.low, range.high).toFixed(0)}% of 52w range
            </span>
          </div>

          <div
            role="img"
            aria-label={`52-week price range. Low ${formatPrice(range.low, exchange, symbol)}, high ${formatPrice(range.high, exchange, symbol)}, current price ${formatPrice(data.currentPrice, exchange, symbol)}, DCF fair value ${formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}.`}
            className="relative h-14 flex items-center px-4"
          >
            <div className="w-full h-1.5 bg-slate-200/60 rounded-full relative">
              <div className="absolute inset-0 bg-slate-300/40 rounded-full"></div>

              <div
                className="absolute -top-[34px] -translate-x-1/2 flex flex-col items-center z-20"
                style={{
                  left: `${clampToRange(dcfResult.fairValuePerShare, range.low, range.high)}%`,
                }}
              >
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] border whitespace-nowrap ${
                    dcfResult.upsidePercent > 0
                      ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
                      : 'bg-red-50 border-red-200 text-[#DC2626]'
                  }`}
                >
                  DCF: {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
                </span>
                <div
                  className={`w-1.5 h-1.5 rotate-45 border-r border-b -mt-1 bg-white ${
                    dcfResult.upsidePercent > 0 ? 'border-emerald-200' : 'border-red-200'
                  }`}
                ></div>
                <div
                  className={`h-2.5 w-2.5 rounded-full border-2 border-white mt-0.5 shadow-sm ${
                    dcfResult.upsidePercent > 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                  }`}
                ></div>
              </div>

              <div
                className="absolute -bottom-[28px] -translate-x-1/2 flex flex-col items-center z-10"
                style={{
                  left: `${clampToRange(data.currentPrice, range.low, range.high)}%`,
                }}
              >
                <div className="h-2.5 w-1 bg-slate-800 rounded-full border border-white -mt-0.5"></div>
                <span className="text-[10px] font-bold text-slate-700 mt-0.5 whitespace-nowrap">
                  Current: {formatPrice(data.currentPrice, exchange, symbol)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
            <span>52w Low: {formatPrice(range.low, exchange, symbol)}</span>
            <span>52w High: {formatPrice(range.high, exchange, symbol)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

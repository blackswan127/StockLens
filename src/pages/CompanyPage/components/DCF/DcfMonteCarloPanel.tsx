import type { FC } from 'react';
import { Activity } from 'lucide-react';
import type { MonteCarloResult } from '../../../../utils/monteCarlo.js';
import { formatPrice } from '../../../../utils/formatters.js';

interface DcfMonteCarloPanelProps {
  monteCarloResult: MonteCarloResult;
  exchange: string;
  symbol: string;
}

export const DcfMonteCarloPanel: FC<DcfMonteCarloPanelProps> = ({
  monteCarloResult,
  exchange,
  symbol,
}) => {
  const maxCount = Math.max(
    ...monteCarloResult.histogram.map((bin) => bin.count),
    0
  );
  const { p10, p50, p90 } = monteCarloResult.percentiles;

  return (
    <div className="bg-white border border-[#E5E8EF] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Activity className="h-5 w-5 text-indigo-500" />
        <div>
          <h3 className="font-sans font-bold text-[14px] text-slate-800 tracking-wide">
            Monte Carlo Simulation{' '}
            <span className="text-slate-400 font-normal text-xs ml-1">
              (10,000 Iterations)
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Probability distribution of intrinsic value based on randomized inputs (Normal
            Distribution).
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div
          role="img"
          aria-label={`Monte Carlo distribution histogram. 10th percentile ${formatPrice(p10, exchange, symbol)}, median ${formatPrice(p50, exchange, symbol)}, 90th percentile ${formatPrice(p90, exchange, symbol)}.`}
          className="w-full md:w-2/3 h-32 flex items-end gap-[1px]"
        >
          {monteCarloResult.histogram.map((bin) => {
            const heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
            return (
              <div
                key={`${bin.min}-${bin.max}`}
                className="flex-1 bg-indigo-500/80 hover:bg-indigo-600 transition-all rounded-t-sm"
                style={{ height: `${Math.max(2, heightPercent)}%` }}
                title={`${formatPrice(bin.min, exchange, symbol)} - ${formatPrice(bin.max, exchange, symbol)} (${bin.count} iterations)`}
              />
            );
          })}
        </div>

        <div className="w-full md:w-1/3 space-y-2.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Fair Value Percentiles
          </h4>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">10th Percentile (Bear)</span>
            <span className="font-mono font-bold text-red-600">
              {formatPrice(p10, exchange, symbol)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs border-y border-slate-200 py-1.5 my-1.5">
            <span className="text-slate-800 font-bold">50th Percentile (Median)</span>
            <span className="font-mono font-bold text-indigo-600 text-sm">
              {formatPrice(p50, exchange, symbol)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">90th Percentile (Bull)</span>
            <span className="font-mono font-bold text-[#059669]">
              {formatPrice(p90, exchange, symbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

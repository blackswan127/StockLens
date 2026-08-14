import React from 'react';
import { formatMarketCap, formatPercentChange } from '../../../../utils/formatters.js';

interface DCFProjectedCashFlowsProps {
  dcfResult: any;
  exchange: string;
  symbol: string;
}

export const DCFProjectedCashFlows: React.FC<DCFProjectedCashFlowsProps> = ({ dcfResult, exchange, symbol }) => {
  if (!dcfResult) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-sans font-bold text-xs text-slate-300 uppercase tracking-wider font-mono">
        Projected Free Cash Flows Schedule
      </h4>
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="min-w-full divide-y divide-slate-800 text-xs font-sans text-slate-300 bg-[#080B11]">
          <thead>
            <tr className="bg-[#0D111A] border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-left">
              <th className="py-2.5 px-4">Period</th>
              <th className="text-right py-2.5 px-4">Revenue</th>
              <th className="text-right py-2.5 px-4">Rev Growth</th>
              <th className="text-right py-2.5 px-4">FCF Margin</th>
              <th className="text-right py-2.5 px-4">Projected FCF</th>
              <th className="text-right py-2.5 px-4 text-emerald-400">Discounted PV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {dcfResult.projectedYears.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-[#141A26] transition-colors">
                <td className="py-2.5 px-4 font-mono font-bold text-slate-200">Year {idx + 1} ({item.year})</td>
                <td className="text-right py-2.5 px-4 font-mono text-slate-300">{formatMarketCap(item.revenue, exchange, symbol)}</td>
                <td className="text-right py-2.5 px-4 font-mono font-semibold text-slate-300">{formatPercentChange(item.growthRate * 100)}</td>
                <td className="text-right py-2.5 px-4 font-mono text-slate-400">{(item.fcfMargin * 100).toFixed(1)}%</td>
                <td className="text-right py-2.5 px-4 font-mono text-slate-200">{formatMarketCap(item.fcf, exchange, symbol)}</td>
                <td className="text-right py-2.5 px-4 font-mono font-bold text-emerald-400">
                  {formatMarketCap(item.discountedFcf, exchange, symbol)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#0D111A] font-bold border-t border-slate-800">
              <td className="py-2.5 px-4 text-slate-200 font-mono">Terminal Value (TV)</td>
              <td className="text-right py-2.5 px-4 font-mono text-slate-600">—</td>
              <td className="text-right py-2.5 px-4 font-mono text-slate-600">—</td>
              <td className="text-right py-2.5 px-4 font-mono text-slate-600">—</td>
              <td className="text-right py-2.5 px-4 font-mono text-slate-200">{formatMarketCap(dcfResult.terminalValue, exchange, symbol)}</td>
              <td className="text-right py-2.5 px-4 font-mono font-bold text-emerald-400">
                {formatMarketCap(dcfResult.pvTerminalValue, exchange, symbol)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

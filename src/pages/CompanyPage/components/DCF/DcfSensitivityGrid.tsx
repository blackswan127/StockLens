import type { FC } from 'react';
import type { DCFResult } from '../../../../utils/dcfCalculator.js';
import { formatPrice, formatPercentChange } from '../../../../utils/formatters.js';
import type { DcfSensitivityData } from '../../hooks/dcfSensitivity.js';
import type { DcfSensitivityGridId } from './dcfTypes.js';

interface DcfSensitivityGridProps {
  sensitivity: DcfSensitivityData;
  activeGrid: DcfSensitivityGridId;
  onGridChange: (grid: DcfSensitivityGridId) => void;
  dcfResult: DCFResult;
  terminalGrowth: number;
  revenueGrowth: number;
  fcfMargin: number;
  exchange: string;
  symbol: string;
}

export const DcfSensitivityGrid: FC<DcfSensitivityGridProps> = ({
  sensitivity,
  activeGrid,
  onGridChange,
  dcfResult,
  terminalGrowth,
  revenueGrowth,
  fcfMargin,
  exchange,
  symbol,
}) => {
  const {
    waccSteps,
    growthSteps,
    waccGrowthTable,
    revenueGrowthSteps,
    fcfMarginSteps,
    revenueMarginTable,
  } = sensitivity;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h4 className="font-sans font-bold text-[12.5px] text-slate-800 uppercase tracking-wider">
          Valuation Sensitivity Analysis
        </h4>

        <div
          role="radiogroup"
          aria-label="Sensitivity matrix"
          className="flex bg-slate-100 p-0.5 rounded-lg border border-[#E5E8EF] gap-0.5 text-xs font-semibold"
        >
          <button
            type="button"
            role="radio"
            aria-checked={activeGrid === 'wacc_g'}
            onClick={() => onGridChange('wacc_g')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeGrid === 'wacc_g'
                ? 'bg-[#059669] text-white font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            WACC vs. Terminal Growth
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activeGrid === 'rev_margin'}
            onClick={() => onGridChange('rev_margin')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeGrid === 'rev_margin'
                ? 'bg-[#059669] text-white font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Revenue Growth vs. FCF Margin
          </button>
        </div>
      </div>

      {activeGrid === 'wacc_g' ? (
        <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
          <table className="min-w-full divide-y divide-[#E5E8EF] text-xs font-sans bg-white text-center">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E5E8EF] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-[#E5E8EF] text-left text-slate-500 font-bold whitespace-nowrap">
                  WACC \ Terminal Growth
                </th>
                {growthSteps.map((growthValue) => (
                  <th
                    key={growthValue}
                    className="py-2.5 px-4 font-mono font-bold"
                  >
                    {formatPercentChange(growthValue * 100)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EF] font-mono text-slate-600">
              {waccSteps.map((waccValue, rowIndex) => {
                const isBaseWacc = Math.abs(waccValue - dcfResult.wacc) < 0.0001;
                return (
                  <tr
                    key={waccValue}
                    className={`${isBaseWacc ? 'bg-[#F0F5FF]/40 font-bold' : 'hover:bg-slate-50/50'} transition`}
                  >
                    <td className="py-2.5 px-4 font-bold border-r border-[#E5E8EF] text-left bg-slate-50/40 text-slate-700">
                      {formatPercentChange(waccValue * 100)}
                    </td>
                    {growthSteps.map((growthValue, columnIndex) => {
                      const value = waccGrowthTable[rowIndex]?.[columnIndex];
                      const isBaseGrowth = Math.abs(growthValue - terminalGrowth) < 0.0001;
                      const isCenter = isBaseWacc && isBaseGrowth;

                      return (
                        <td
                          key={growthValue}
                          className={`py-2.5 px-4 text-center ${
                            isCenter
                              ? 'bg-[#059669]/10 text-[#059669] font-black border border-[#059669]/20'
                              : isNaN(value) || value <= 0
                                ? 'text-slate-350'
                                : 'text-slate-700'
                          }`}
                        >
                          {isNaN(value) || value <= 0
                            ? '—'
                            : formatPrice(value, exchange, symbol)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
          <table className="min-w-full divide-y divide-[#E5E8EF] text-xs font-sans bg-white text-center">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E5E8EF] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 border-r border-[#E5E8EF] text-left text-slate-500 font-bold whitespace-nowrap">
                  Revenue Growth \ FCF Margin
                </th>
                {fcfMarginSteps.map((marginValue) => (
                  <th
                    key={marginValue}
                    className="py-2.5 px-4 font-mono font-bold"
                  >
                    {(marginValue * 100).toFixed(1)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EF] font-mono text-slate-600">
              {revenueGrowthSteps.map((growthValue, rowIndex) => {
                const isBaseGrowth = Math.abs(growthValue - revenueGrowth) < 0.0001;
                return (
                  <tr
                    key={growthValue}
                    className={`${isBaseGrowth ? 'bg-[#F0F5FF]/40 font-bold' : 'hover:bg-slate-50/50'} transition`}
                  >
                    <td className="py-2.5 px-4 font-bold border-r border-[#E5E8EF] text-left bg-slate-50/40 text-slate-700">
                      {formatPercentChange(growthValue * 100)}
                    </td>
                    {fcfMarginSteps.map((marginValue, columnIndex) => {
                      const value = revenueMarginTable[rowIndex]?.[columnIndex];
                      const isBaseMargin = Math.abs(marginValue - fcfMargin) < 0.0001;
                      const isCenter = isBaseGrowth && isBaseMargin;

                      return (
                        <td
                          key={marginValue}
                          className={`py-2.5 px-4 text-center ${
                            isCenter
                              ? 'bg-[#059669]/10 text-[#059669] font-black border border-[#059669]/20'
                              : isNaN(value) || value <= 0
                                ? 'text-slate-350'
                                : 'text-slate-700'
                          }`}
                        >
                          {isNaN(value) || value <= 0
                            ? '—'
                            : formatPrice(value, exchange, symbol)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

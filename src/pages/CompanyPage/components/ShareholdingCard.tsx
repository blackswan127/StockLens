import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  formatDate,
  formatLargeNumber,
  formatShares,
  getCurrencySymbol,
} from '../../../utils/formatters.js';
import type { InstitutionalHolder, ShareholdingData } from './companyTypes.js';

interface ShareholdingCardProps {
  data: ShareholdingData | null;
  isPending: boolean;
  exchange: string;
  symbol: string;
}

const formatHeldPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—';

const getHolderKey = (holder: InstitutionalHolder, index: number): string => {
  if (holder.cusip) return holder.cusip;
  const organization = holder.organization ?? 'institution';
  const reportDate = holder.reportDate ?? 'undated';
  return `${organization}-${reportDate}-${index}`;
};

export const ShareholdingCard = React.memo(function ShareholdingCard({
  data,
  isPending,
  exchange,
  symbol,
}: ShareholdingCardProps) {
  const hasData =
    !!data &&
    ((data.majorHolders != null && data.majorHolders.insidersPercentHeld != null) ||
      (data.institutionalHolders != null && data.institutionalHolders.length > 0) ||
      (data.mutualFundHolders != null && data.mutualFundHolders.length > 0));

  const currency = getCurrencySymbol(exchange, symbol);

  return (
    <div id="shareholding" className="space-y-6 scroll-mt-20">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Shareholding Structure & Institutional Claims
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            SEC 13F / Proxy disclosures
          </span>
        </div>

        {isPending ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-slate-500 font-mono text-xs space-y-3"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            <span>Syncing shareholding pattern disclosures...</span>
          </div>
        ) : hasData && data ? (
          <div className="space-y-6">
            {data.majorHolders && data.majorHolders.insidersPercentHeld != null && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Major Holders Split
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
                  <table className="w-full text-left font-sans text-xs">
                    <caption className="sr-only">Major holders breakdown</caption>
                    <tbody className="divide-y divide-slate-800">
                      {[
                        {
                          label: '% of Shares Held by All Insiders',
                          value: formatHeldPercent(data.majorHolders.insidersPercentHeld),
                        },
                        {
                          label: '% of Shares Held by Institutions',
                          value: formatHeldPercent(data.majorHolders.institutionsPercentHeld),
                        },
                        {
                          label: '% of Float Held by Institutions',
                          value: formatHeldPercent(data.majorHolders.institutionsFloatPercentHeld),
                        },
                        {
                          label: 'Number of Institutions Holding Shares',
                          value:
                            data.majorHolders.institutionsCount != null
                              ? formatLargeNumber(data.majorHolders.institutionsCount)
                              : '—',
                        },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-[#141A26] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400 w-1/4 border-r border-slate-800 text-right bg-[#0D111A]/40 whitespace-nowrap">
                            {row.value}
                          </td>
                          <th
                            scope="row"
                            className="px-4 py-3 text-slate-300 font-medium text-left"
                          >
                            {row.label}
                          </th>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.institutionalHolders && data.institutionalHolders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Top Institutional 13F Holders
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800 text-xs font-sans text-left">
                      <thead>
                        <tr className="bg-[#0D111A] text-slate-400 border-b border-slate-800 text-[10.5px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                          <th scope="col" className="py-3 px-4 text-left">
                            Institution
                          </th>
                          <th scope="col" className="py-3 px-4 text-right">
                            Shares Held
                          </th>
                          <th scope="col" className="py-3 px-4 text-center">
                            Reported Date
                          </th>
                          <th scope="col" className="py-3 px-4 text-right">
                            % Float
                          </th>
                          <th scope="col" className="py-3 px-4 text-right text-emerald-400">
                            Position Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {data.institutionalHolders.map((item, index) => {
                          const valueFormatted =
                            item.value != null
                              ? `${currency}${Math.round(item.value).toLocaleString()}`
                              : '—';
                          return (
                            <tr
                              key={getHolderKey(item, index)}
                              className="hover:bg-[#141A26] transition-colors"
                            >
                              <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                                {item.organization ?? '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                                {item.position != null
                                  ? formatShares(item.position, exchange, symbol)
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                                {item.reportDate ? formatDate(item.reportDate) : '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                                {formatHeldPercent(item.pctHeld)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                {valueFormatted}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="py-12 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl"
            aria-live="polite"
          >
            Shareholding pattern data unavailable for this company
          </div>
        )}
      </div>
    </div>
  );
});

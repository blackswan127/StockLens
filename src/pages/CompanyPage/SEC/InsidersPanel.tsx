import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatDate } from '../../../utils/formatters.js';
import type { EdgarInsiders, QuerySection } from '../types.js';

interface InsidersPanelProps {
  insiders: QuerySection<EdgarInsiders>;
  upperSymbol: string;
}

export const InsidersPanel: React.FC<InsidersPanelProps> = ({ insiders, upperSymbol }) => {
  const { data, isPending, isError } = insiders;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Recent Form 4 Insider Filings ({upperSymbol})
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">Last 12 Months</span>
      </div>

      {isPending ? (
        <div className="py-12 text-center space-y-2">
          <div className="text-emerald-400 animate-pulse text-sm font-mono font-medium">
            Fetching Form 4 insider transactions…
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Parsing XML Form 4 rosters from SEC EDGAR
          </div>
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-rose-400 text-sm font-mono bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
          ⚠️ Could not load insider activities for {upperSymbol}.
        </div>
      ) : data && data.transactions ? (
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0B0F19]">
          <table className="min-w-full divide-y divide-slate-800 text-[13px] font-sans">
            <thead>
              <tr className="bg-[#0D111A] text-emerald-400 border-b border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold whitespace-nowrap">Insider Name</th>
                <th className="py-3 px-4 font-bold whitespace-nowrap">
                  Relationship / Role
                </th>
                <th className="py-3 px-4 font-bold whitespace-nowrap">Filing Date</th>
                <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Action</th>
                <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Shares</th>
                <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Price</th>
                <th className="py-3 px-4 text-right font-bold whitespace-nowrap">
                  Total Value
                </th>
                <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.transactions.map((tx) => {
                let badgeClass =
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                if (tx.action === 'Sell') {
                  badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                } else if (tx.action !== 'Buy') {
                  badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                }

                return (
                  <tr
                    key={`${tx.secLink}-${tx.name}-${tx.date}-${tx.code}`}
                    className="hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                      {tx.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {tx.relationship}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${badgeClass}`}
                      >
                        {tx.action} ({tx.code})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
                      {tx.shares.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                      ${tx.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      ${tx.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <a
                        href={tx.secLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition"
                        title="View SEC Source Form 4"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-500 font-mono text-xs">
          No insider transactions found.
        </div>
      )}
    </div>
  );
};

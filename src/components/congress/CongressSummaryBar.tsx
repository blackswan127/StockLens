import React from 'react';

interface CongressSummaryBarProps {
  totalTrades: number;
  purchases: number;
  sales: number;
  mostRecentTradeDate: string | null;
}

export const CongressSummaryBar: React.FC<CongressSummaryBarProps> = ({
  totalTrades,
  purchases,
  sales,
  mostRecentTradeDate
}) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Total Disclosures</span>
          <span className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">{totalTrades}</span>
        </div>
        <div className="flex flex-col pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Purchases</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{purchases}</span>
        </div>
        <div className="flex flex-col pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Sales</span>
          <span className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">{sales}</span>
        </div>
        <div className="flex flex-col pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Latest Filing</span>
          <span className="text-base font-bold font-mono text-slate-200 mt-2">{formatDate(mostRecentTradeDate)}</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { EnrichedTrade } from '../../utils/congressHelpers.js';
import { CommitteeTag } from './CommitteeTag.jsx';
import { RelevanceBadge } from './RelevanceBadge.jsx';
import { ExternalLink } from 'lucide-react';

interface CongressTradeRowProps {
  trade: EnrichedTrade;
}

export const CongressTradeRow: React.FC<CongressTradeRowProps> = ({ trade }) => {
  const isPurchase = trade.type && trade.type.toLowerCase().includes('purchase');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
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

  const renderLagBadge = (days: number) => {
    if (days <= 30) {
      return <span className="text-slate-400 font-mono text-[10px]">Filed in {days}d</span>;
    } else if (days <= 44) {
      return <span className="text-amber-400 font-mono text-[10px] font-bold">Filed in {days}d</span>;
    } else {
      return <span className="text-rose-400 font-mono text-[10px] font-bold">Filed in {days}d ⚠</span>;
    }
  };

  return (
    <a
      href={trade.ptr_link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-slate-800/80 hover:bg-[#141A26] transition-colors gap-3 cursor-pointer no-underline block group"
    >
      <div className="flex items-start gap-3 w-full md:w-auto">
        {/* Left Badge */}
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black shadow-sm ${
          isPurchase 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
        }`}>
          {isPurchase ? 'BUY' : 'SELL'}
        </div>

        {/* Senator Info & Committee Tags */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-100 font-sans text-sm group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              {trade.senator}
              <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {trade.owner && trade.owner !== 'Self' && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                {trade.owner}
              </span>
            )}
          </div>

          {/* Committee Tags */}
          {trade.committees && trade.committees.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-slate-500 text-[10px] mr-0.5">🏛</span>
              {trade.committees.map((comm, idx) => (
                <CommitteeTag key={idx} label={comm} />
              ))}
            </div>
          )}

          {/* Relevance Badge */}
          {trade.isRelevant && (
            <div className="mt-0.5">
              <RelevanceBadge />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Amount & Date */}
      <div className="flex md:flex-col justify-between items-baseline md:items-end w-full md:w-auto shrink-0 md:text-right text-xs mt-1 md:mt-0 pl-11 md:pl-0">
        <span className="font-bold text-slate-100 font-mono text-sm md:text-xs order-2 md:order-1 tabular-nums">{trade.amount}</span>
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs order-1 md:order-2 md:mt-1">
          <span>{formatDate(trade.transaction_date)}</span>
          <span className="text-slate-700">•</span>
          {renderLagBadge(trade.lagDays)}
        </div>
      </div>
    </a>
  );
};

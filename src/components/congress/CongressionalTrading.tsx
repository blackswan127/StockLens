import React, { useState } from 'react';
import { useCongressData } from '../../hooks/useCongressData.js';
import { CongressSummaryBar } from './CongressSummaryBar.jsx';
import { CongressTradeRow } from './CongressTradeRow.jsx';
import { AlertCircle, Landmark } from 'lucide-react';

interface CongressionalTradingProps {
  ticker: string;
}

export const CongressionalTrading: React.FC<CongressionalTradingProps> = ({ ticker }) => {
  const { trades, isLoading, isError, refetch } = useCongressData(ticker);
  const [showAll, setShowAll] = useState<boolean>(false);

  // Derive stats
  const totalTrades = trades.length;
  const purchases = trades.filter(t => t.type && t.type.toLowerCase().includes('purchase')).length;
  const sales = totalTrades - purchases;
  const mostRecentTradeDate = totalTrades > 0 ? trades[0].transaction_date : null;

  // Render 3 pulsing skeleton rows inside card
  const renderLoading = () => {
    return (
      <div className="space-y-4">
        {/* Skeletons for summary bar */}
        <div className="h-24 bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d p-5 animate-pulse flex justify-between">
          <div className="h-12 w-20 bg-slate-800/60 rounded-xl"></div>
          <div className="h-12 w-20 bg-slate-800/60 rounded-xl"></div>
          <div className="h-12 w-20 bg-slate-800/60 rounded-xl"></div>
          <div className="h-12 w-20 bg-slate-800/60 rounded-xl"></div>
        </div>
        {/* Skeletons for trade list card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center animate-pulse border-b border-slate-800/80 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-800/60 shrink-0"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-800/60 rounded"></div>
                  <div className="h-3 w-48 bg-slate-800/60 rounded"></div>
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="h-4 w-24 bg-slate-800/60 rounded"></div>
                <div className="h-3 w-16 bg-slate-800/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render error retry card
  const renderError = () => {
    return (
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-100 font-sans text-base">Could not load congressional data</h4>
          <p className="text-slate-400 font-sans text-xs">There was an issue fetching the latest disclosure data. Please try again.</p>
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold rounded-xl hover:bg-emerald-500/30 transition-all btn-3d cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  };

  // Render centered empty state
  const renderEmpty = () => {
    return (
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d p-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-400">
            <Landmark className="h-8 w-8" />
          </div>
        </div>
        <h4 className="font-bold text-slate-100 font-sans text-sm">No Senate trades recorded for {ticker}</h4>
        <p className="text-slate-400 font-sans text-xs max-w-sm mx-auto leading-relaxed">
          Members of Congress are required under the STOCK Act to disclose financial trades within 45 days.
        </p>
      </div>
    );
  };

  if (isLoading) return renderLoading();
  if (isError) return renderError();
  if (totalTrades === 0) return renderEmpty();

  const visibleTrades = showAll ? trades : trades.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-400" />
          <span>Congressional STOCK Act Trading</span>
        </h3>
        <p className="text-slate-400 font-sans text-xs">
          U.S. Senate & House STOCK Act disclosures and committee-cross-referenced trading signals.
        </p>
      </div>

      {/* Stats summary bar */}
      <CongressSummaryBar
        totalTrades={totalTrades}
        purchases={purchases}
        sales={sales}
        mostRecentTradeDate={mostRecentTradeDate}
      />

      {/* Trades card list */}
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-3d overflow-hidden">
        <div className="flex flex-col">
          {visibleTrades.map((trade, idx) => (
            <CongressTradeRow key={idx} trade={trade} />
          ))}
        </div>

        {/* Show More toggle */}
        {totalTrades > 5 && (
          <div className="p-4 bg-[#080B11]/60 border-t border-slate-800/80 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              {showAll ? 'Show Fewer Trades' : `View All ${totalTrades} Filings`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

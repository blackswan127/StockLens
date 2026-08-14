import React from 'react';
import { formatMarketCap, formatShares, formatPrice } from '../../../../utils/formatters.js';

interface DCFValuationBridgeProps {
  dcfResult: any;
  cashAndEquivalents: number;
  totalDebt: number;
  sharesOutstanding: number;
  exchange: string;
  symbol: string;
}

export const DCFValuationBridge: React.FC<DCFValuationBridgeProps> = ({ 
  dcfResult, 
  cashAndEquivalents, 
  totalDebt, 
  sharesOutstanding, 
  exchange, 
  symbol 
}) => {
  if (!dcfResult) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-sans font-bold text-xs text-slate-300 uppercase tracking-wider font-mono">
        Valuation Step-by-Step Bridge
      </h4>
      <div className="bg-[#080B11] border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs font-sans">
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400 flex items-center gap-1.5">
            PV of Projected Cash Flows
            <span className="text-[10px] text-slate-500">({(100 - (dcfResult.pvTerminalValue / dcfResult.enterpriseValue * 100)).toFixed(1)}% of EV)</span>
          </span>
          <span className="font-mono font-bold text-slate-100">{formatMarketCap(dcfResult.pvFcfSum, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400 flex items-center gap-1.5">
            PV of Terminal Value
            <span className="text-[10px] text-slate-500 font-bold">({(dcfResult.pvTerminalValue / dcfResult.enterpriseValue * 100).toFixed(1)}% of EV)</span>
          </span>
          <span className="font-mono font-bold text-slate-100">{formatMarketCap(dcfResult.pvTerminalValue, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-bold text-emerald-400">Enterprise Value (EV)</span>
          <span className="font-mono font-extrabold text-emerald-400">{formatMarketCap(dcfResult.enterpriseValue, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400">Cash & Equivalents (+)</span>
          <span className="font-mono font-bold text-slate-100">{formatMarketCap(cashAndEquivalents, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400">Total Debt (−)</span>
          <span className="font-mono font-bold text-slate-100">{formatMarketCap(totalDebt, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400">Net Debt</span>
          <span className="font-mono font-bold text-slate-100">{formatMarketCap(dcfResult.netDebt, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-bold text-slate-300">Equity Value</span>
          <span className="font-mono font-extrabold text-slate-100">{formatMarketCap(dcfResult.equityValue, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
          <span className="font-medium text-slate-400">Shares Outstanding</span>
          <span className="font-mono font-bold text-slate-100">{formatShares(sharesOutstanding, exchange, symbol)}</span>
        </div>
        <div className="flex justify-between items-center py-2.5 col-span-1 md:col-span-2 border-t border-slate-800 mt-1">
          <span className="font-bold text-xs text-slate-200 uppercase tracking-wide">Intrinsic Fair Value / Share</span>
          <span className="font-mono font-black text-base text-emerald-400">
            {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
          </span>
        </div>
      </div>
    </div>
  );
};

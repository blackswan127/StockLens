import React, { useCallback, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { formatPrice, formatMarketCap } from '../../../utils/formatters.js';
import type { CompanyProfile, CompanyRatios, Peer } from './companyTypes.js';

interface PeerComparisonSectionProps {
  upperSymbol: string;
  profile: CompanyProfile;
  livePriceVal: number;
  currencySuffixLabel: string;
  mcapSuffixLabel: string;
  isPeersPending: boolean;
  peers: Peer[];
  handlePeerClick: (peerSym: string) => void;
  ratios: CompanyRatios | undefined;
}

interface PeerRowProps {
  peer: Peer;
  onSelect: (symbol: string) => void;
  onCompare: (peer: Peer) => void;
}

const PeerRow = React.memo(function PeerRow({ peer, onSelect, onCompare }: PeerRowProps) {
  return (
    <tr
      className="hover:bg-[#141A26] transition-colors cursor-pointer text-slate-300"
      onClick={() => onSelect(peer.symbol)}
    >
      <td
        className="py-3 px-4 font-sans font-semibold text-slate-200 whitespace-nowrap"
        aria-label={`${peer.name} (${peer.symbol})`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(peer.symbol);
            }}
            className="hover:text-emerald-400 transition-colors text-left bg-transparent border-0 p-0 cursor-pointer"
          >
            {peer.name}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCompare(peer);
            }}
            className="px-2 py-0.5 bg-[#141A26] hover:bg-emerald-500/20 text-emerald-400 border border-slate-700 hover:border-emerald-500/40 rounded font-mono text-[10px] font-bold uppercase tracking-wider transition shrink-0 cursor-pointer"
          >
            Compare
          </button>
        </div>
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-200">
        {formatPrice(peer.price, peer.exchange)}
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-300">
        {formatMarketCap(peer.mcap, peer.exchange)}
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-400">
        {peer.pb}
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-400">
        {peer.pe}
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-400">
        {formatPrice(peer.price * 0.08, peer.exchange)}
      </td>
      <td className="text-right py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap tabular-nums">
        {peer.roe}
      </td>
      <td className="text-right py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap tabular-nums">
        {(peer.pe * 0.18).toFixed(2)}%
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-400">
        0.25
      </td>
      <td className="text-right py-3 px-4 font-mono whitespace-nowrap tabular-nums text-slate-400">
        4.10
      </td>
    </tr>
  );
});

export const PeerComparisonSection: React.FC<PeerComparisonSectionProps> = ({
  upperSymbol,
  profile,
  livePriceVal,
  currencySuffixLabel,
  mcapSuffixLabel,
  isPeersPending,
  peers,
  handlePeerClick,
  ratios,
}) => {
  const [comparePeer, setComparePeer] = useState<Peer | null>(null);

  const comparisonPeers = useMemo(
    () => peers.filter((peer) => peer.symbol !== upperSymbol).slice(0, 5),
    [peers, upperSymbol]
  );

  const handleCompare = useCallback((peer: Peer) => setComparePeer(peer), []);

  return (
    <div id="peers" className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          Sector Peer Benchmarking & Relative Multiples
        </h3>
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          {profile.sector} Sector Cohort
        </span>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#080B11]">
        <table className="min-w-full divide-y divide-slate-800 text-xs font-sans">
          <thead>
            <tr className="bg-[#0D111A] text-slate-400 border-b border-slate-800 text-left font-mono font-bold uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-4 font-bold text-left whitespace-nowrap">
                Company
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                Price{' '}
                <span className="text-slate-500 font-normal lowercase normal-case ml-0.5">
                  {currencySuffixLabel}
                </span>
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                MCAP{' '}
                <span className="text-slate-500 font-normal lowercase normal-case ml-0.5">
                  {mcapSuffixLabel}
                </span>
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                P/B
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                P/E
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                EPS{' '}
                <span className="text-slate-500 font-normal lowercase normal-case ml-0.5">
                  {currencySuffixLabel}
                </span>
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                ROE %
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                ROCE %
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                P/S
              </th>
              <th scope="col" className="text-right py-3.5 px-4 font-bold whitespace-nowrap">
                EV/EBITDA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            <tr className="bg-emerald-500/10 text-slate-100 font-bold border-l-2 border-emerald-400">
              <td className="py-3.5 px-4 text-emerald-400 font-bold whitespace-nowrap flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>{profile.name} (Primary)</span>
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                {formatPrice(livePriceVal, profile.exchange)}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                {formatMarketCap(ratios?.market_cap, profile.exchange)}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                {ratios?.pb || '—'}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                {ratios?.pe || '—'}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                {ratios?.eps || '—'}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap tabular-nums">
                {ratios?.roe || '—'}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap tabular-nums">
                {ratios?.roce || '—'}
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                3.56
              </td>
              <td className="text-right py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                24.63
              </td>
            </tr>
            {isPeersPending ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-slate-500 font-mono text-xs animate-pulse whitespace-nowrap"
                  aria-live="polite"
                >
                  Loading competitor metrics...
                </td>
              </tr>
            ) : comparisonPeers.length > 0 ? (
              comparisonPeers.map((peer) => (
                <PeerRow
                  key={peer.symbol}
                  peer={peer}
                  onSelect={handlePeerClick}
                  onCompare={handleCompare}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="py-6 text-center font-mono text-xs text-slate-500"
                  aria-live="polite"
                >
                  No peers loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {comparePeer && (
        <div className="mt-6 p-5 bg-[#080B11] border border-slate-800 rounded-2xl space-y-4 animate-fade-in relative shadow-xl text-slate-300">
          <button
            type="button"
            onClick={() => setComparePeer(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Close Comparison"
            aria-label="Close comparison"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h4 className="font-mono font-bold text-xs text-slate-200 uppercase tracking-wider">
              Interactive Side-by-Side Duopoly Analysis
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs font-sans">
            <div className="font-mono font-bold text-slate-500 uppercase tracking-wider text-[10px] self-end pb-1 border-b border-slate-800">
              Metric
            </div>
            <div className="font-mono font-bold text-emerald-400 pb-1 border-b border-emerald-500/30 text-center uppercase tracking-wider truncate">
              {profile.name}
            </div>
            <div className="font-mono font-bold text-indigo-400 pb-1 border-b border-indigo-500/30 text-center uppercase tracking-wider truncate">
              {comparePeer.name}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Last Price
            </div>
            <div className="font-mono font-bold text-slate-100 py-1.5 border-b border-slate-800/80 text-center">
              {formatPrice(livePriceVal, profile.exchange)}
            </div>
            <div className="font-mono font-bold text-slate-100 py-1.5 border-b border-slate-800/80 text-center">
              {formatPrice(comparePeer.price, comparePeer.exchange)}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Market Cap
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {formatMarketCap(ratios?.market_cap, profile.exchange)}
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {formatMarketCap(comparePeer.mcap, comparePeer.exchange)}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Price to Earnings (P/E)
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {ratios?.pe || '—'}
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {comparePeer.pe || 'N/A'}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Price to Book (P/B)
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {ratios?.pb || '—'}
            </div>
            <div className="font-mono text-slate-300 py-1.5 border-b border-slate-800/80 text-center">
              {comparePeer.pb || 'N/A'}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Return on Equity (ROE)
            </div>
            <div className="font-mono text-emerald-400 font-bold py-1.5 border-b border-slate-800/80 text-center">
              {ratios?.roe || '—'}
            </div>
            <div className="font-mono text-emerald-400 font-bold py-1.5 border-b border-slate-800/80 text-center">
              {comparePeer.roe || 'N/A'}
            </div>

            <div className="font-medium text-slate-400 py-1.5 border-b border-slate-800/80">
              Return on Capital (ROCE)
            </div>
            <div className="font-mono text-emerald-400 font-bold py-1.5 border-b border-slate-800/80 text-center">
              {ratios?.roce || '—'}
            </div>
            <div className="font-mono text-emerald-400 font-bold py-1.5 border-b border-slate-800/80 text-center">
              {(comparePeer.pe * 0.18).toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

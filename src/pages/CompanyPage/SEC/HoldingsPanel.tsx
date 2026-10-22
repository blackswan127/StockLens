import React from 'react';
import { Building, Search } from 'lucide-react';
import type { EdgarHoldings, QuerySection } from '../types.js';

interface HoldingsSearchResult {
  name: string;
  cik: string;
}

const QUICK_ACCESS_FUNDS = [
  { label: 'Berkshire Hathaway', cik: '0001067983' },
  { label: 'Bill Gates Fund', cik: '0001166559' },
  { label: 'Soros Fund', cik: '0001029160' },
];

interface HoldingsPanelProps {
  holdings: QuerySection<EdgarHoldings>;
  holdingsQuery: string;
  onHoldingsQueryChange: (query: string) => void;
  holdingsSearchInput: string;
  onHoldingsSearchInputChange: (value: string) => void;
}

export const HoldingsPanel: React.FC<HoldingsPanelProps> = ({
  holdings,
  holdingsQuery,
  onHoldingsQueryChange,
  holdingsSearchInput,
  onHoldingsSearchInputChange,
}) => {
  const { data, isPending, isError } = holdings;
  const [holdingsSearchResults, setHoldingsSearchResults] = React.useState<
    HoldingsSearchResult[]
  >([]);
  const [isHoldingsSearching, setIsHoldingsSearching] = React.useState(false);
  const [showHoldingsDropdown, setShowHoldingsDropdown] = React.useState(false);
  const holdingsDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        holdingsDropdownRef.current &&
        !holdingsDropdownRef.current.contains(e.target as Node)
      ) {
        setShowHoldingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!holdingsSearchInput.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsHoldingsSearching(true);
      try {
        const resp = await fetch(
          `/api/edgar/filer-search?name=${encodeURIComponent(holdingsSearchInput)}`
        );
        const searchData = await resp.json();
        if (searchData.results) {
          setHoldingsSearchResults(searchData.results);
        } else if (searchData.cik) {
          setHoldingsSearchResults([searchData]);
        } else {
          setHoldingsSearchResults([]);
        }
        setShowHoldingsDropdown(true);
      } catch (err) {
        console.error('[EDGAR SEARCH]', err);
      } finally {
        setIsHoldingsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [holdingsSearchInput]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-[#080B11] rounded-xl p-4 border border-slate-800 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (holdingsSearchInput.trim()) {
              onHoldingsQueryChange(holdingsSearchInput.trim());
            }
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1" ref={holdingsDropdownRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search fund manager name, 10-digit SEC CIK, or ticker..."
              value={holdingsSearchInput}
              onChange={(e) => {
                const value = e.target.value;
                onHoldingsSearchInputChange(value);
                if (!value.trim()) {
                  setHoldingsSearchResults([]);
                  setIsHoldingsSearching(false);
                }
                setShowHoldingsDropdown(true);
              }}
              onFocus={() =>
                holdingsSearchInput.trim() && setShowHoldingsDropdown(true)
              }
              className="w-full pl-9 pr-4 py-2 bg-[#0D111A] border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {isHoldingsSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-3.5 w-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showHoldingsDropdown && holdingsSearchInput.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D111A] border border-slate-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {isHoldingsSearching && holdingsSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono">
                    Searching SEC EDGAR directory...
                  </div>
                ) : holdingsSearchResults.length > 0 ? (
                  <div className="py-1">
                    {holdingsSearchResults.map((result) => (
                      <button
                        key={result.cik}
                        type="button"
                        onClick={() => {
                          onHoldingsSearchInputChange(result.name);
                          onHoldingsQueryChange(result.cik);
                          setShowHoldingsDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-[#141A26] transition-colors flex flex-col cursor-pointer border-b border-slate-800/60 last:border-none"
                      >
                        <span className="text-xs font-bold text-slate-200">{result.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          CIK: {result.cik}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 font-mono">
                    No matching institutions found
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            Pull 13F Portfolio
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px] font-mono">
            Quick Access:
          </span>
          {QUICK_ACCESS_FUNDS.map((fund) => (
            <button
              key={fund.cik}
              type="button"
              onClick={() => {
                onHoldingsSearchInputChange(fund.cik);
                onHoldingsQueryChange(fund.cik);
              }}
              className={`px-3 py-1 border rounded-lg transition font-medium text-[11px] font-mono cursor-pointer ${
                holdingsQuery === fund.cik
                  ? 'border-emerald-500/60 text-emerald-400 bg-emerald-500/15 font-bold'
                  : 'border-slate-800 bg-[#0D111A] text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {fund.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="py-12 text-center space-y-2">
          <div className="text-emerald-400 animate-pulse text-sm font-mono font-medium">
            Fetching 13F institutional holdings…
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Parsing SEC Form 13F-HR table format
          </div>
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-rose-400 text-sm font-mono bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
          ⚠️ Could not load 13F holdings data for this institution.
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5 font-mono">
              <Building className="h-4 w-4 text-emerald-400" />
              <span>{data.managerName}</span>
            </h4>
            <div className="flex gap-2 text-[10px] font-mono text-slate-400 uppercase">
              <span>
                Reporting Period:{' '}
                <strong className="text-slate-200">{data.portfolioDate}</strong>
              </span>
              <span>·</span>
              <span>
                Source: <strong className="text-slate-200">SEC Form 13F-HR</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0B0F19]">
            <table className="min-w-full divide-y divide-slate-800 text-[13px] font-sans">
              <thead>
                <tr className="bg-[#0D111A] text-emerald-400 border-b border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Ticker</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">
                    Issuer Company Name
                  </th>
                  <th className="py-3 px-4 text-right font-bold whitespace-nowrap">
                    Value (USD in Thousands)
                  </th>
                  <th className="py-3 px-4 text-right font-bold whitespace-nowrap">
                    Shares Held
                  </th>
                  <th className="py-3 px-4 text-center font-bold whitespace-nowrap">
                    Option Status
                  </th>
                  <th className="py-3 px-4 text-right font-bold whitespace-nowrap">
                    QoQ Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.holdings && data.holdings.length > 0 ? (
                  data.holdings.map((hold) => {
                    const isCall = hold.option === 'Call';
                    const isPut = hold.option === 'Put';

                    let changeColor = 'text-slate-400';
                    if (hold.qoqChange.startsWith('+') || hold.qoqChange === 'New') {
                      changeColor = 'text-emerald-400 font-bold';
                    } else if (hold.qoqChange.startsWith('-')) {
                      changeColor = 'text-rose-400 font-bold';
                    }

                    return (
                      <tr
                        key={`${hold.ticker}-${hold.name}-${hold.option ?? 'common'}`}
                        className="hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {hold.ticker}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                          {hold.name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                          ${hold.value.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                          {hold.shares.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                          {isCall ? (
                            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold uppercase">
                              Call
                            </span>
                          ) : isPut ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase">
                              Put
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          <span className={changeColor}>
                            {hold.qoqChange === 'New' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase">
                                NEW
                              </span>
                            ) : (
                              hold.qoqChange
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-500 font-mono text-xs"
                    >
                      No portfolio assets returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-500 font-mono text-xs">
          No holdings report loaded.
        </div>
      )}
    </div>
  );
};

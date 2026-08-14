import React from 'react';
import { Building, ExternalLink, FileText, Search } from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import { ProxyStatementPanel } from './components/ProxyStatementPanel.jsx';
import { PayVersusPerformancePanel } from './components/PayVersusPerformancePanel.tsx';

interface Peer {
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  pe: number;
  pb: number;
  roe: string;
  exchange: string;
}

interface SECTabProps {
  upperSymbol: string;
  peers: Peer[];
  activeSecSubTab: 'standardized' | 'insiders' | 'holdings' | 'tenk' | 'proxy';
  setActiveSecSubTab: React.Dispatch<React.SetStateAction<'standardized' | 'insiders' | 'holdings' | 'tenk' | 'proxy'>>;
  secComparePeer: string;
  setSecComparePeer: React.Dispatch<React.SetStateAction<string>>;
  activeSecStatement: 'income' | 'balance' | 'cash';
  setActiveSecStatement: React.Dispatch<React.SetStateAction<'income' | 'balance' | 'cash'>>;
  holdingsSearchInput: string;
  setHoldingsSearchInput: React.Dispatch<React.SetStateAction<string>>;
  holdingsQuery: string;
  setHoldingsQuery: React.Dispatch<React.SetStateAction<string>>;
  activeTenKTab: 'business' | 'risk' | 'mda';
  setActiveTenKTab: React.Dispatch<React.SetStateAction<'business' | 'risk' | 'mda'>>;
  showRiskDiff: boolean;
  setShowRiskDiff: React.Dispatch<React.SetStateAction<boolean>>;

  // SEC EDGAR Data & States
  edgarFinancials: any;
  isEdgarFinancialsPending: boolean;
  isEdgarFinancialsError: boolean;
  edgarCompareFinancials: any;
  edgarInsiders: any;
  isEdgarInsidersPending: boolean;
  isEdgarInsidersError: boolean;
  edgarHoldings: any;
  isEdgarHoldingsPending: boolean;
  isEdgarHoldingsError: boolean;
  edgarSection1: any;
  isSection1Pending: boolean;
  isSection1Error: boolean;
  edgarSection1A: any;
  isSection1APending: boolean;
  isSection1AError: boolean;
  edgarSection7: any;
  isSection7Pending: boolean;
  isSection7Error: boolean;
  edgarRiskDiff: any;
  isRiskDiffPending: boolean;
  isRiskDiffError: boolean;
  edgarProxy: any;
  isEdgarProxyPending: boolean;
  isEdgarProxyError: boolean;
  edgarPayVersusPerformance: any;
  isEdgarPayVersusPerformancePending: boolean;
  isEdgarPayVersusPerformanceError: boolean;
}

export const SECTab: React.FC<SECTabProps> = ({
  upperSymbol,
  peers,
  activeSecSubTab,
  setActiveSecSubTab,
  secComparePeer,
  setSecComparePeer,
  activeSecStatement,
  setActiveSecStatement,
  holdingsSearchInput,
  setHoldingsSearchInput,
  holdingsQuery,
  setHoldingsQuery,
  activeTenKTab,
  setActiveTenKTab,
  showRiskDiff,
  setShowRiskDiff,

  edgarFinancials,
  isEdgarFinancialsPending,
  isEdgarFinancialsError,
  edgarCompareFinancials,
  edgarInsiders,
  isEdgarInsidersPending,
  isEdgarInsidersError,
  edgarHoldings,
  isEdgarHoldingsPending,
  isEdgarHoldingsError,
  edgarSection1,
  isSection1Pending,
  isSection1Error,
  edgarSection1A,
  isSection1APending,
  isSection1AError,
  edgarSection7,
  isSection7Pending,
  isSection7Error,
  edgarRiskDiff,
  isRiskDiffPending,
  isRiskDiffError,
  edgarProxy,
  isEdgarProxyPending,
  isEdgarProxyError,
  edgarPayVersusPerformance,
  isEdgarPayVersusPerformancePending,
  isEdgarPayVersusPerformanceError,
}) => {
  const [secSearchInput, setSecSearchInput] = React.useState('');
  const [diffFilter, setDiffFilter] = React.useState<'all' | 'changes' | 'added' | 'removed'>('all');

  const [holdingsSearchResults, setHoldingsSearchResults] = React.useState<{name: string, cik: string}[]>([]);
  const [isHoldingsSearching, setIsHoldingsSearching] = React.useState(false);
  const [showHoldingsDropdown, setShowHoldingsDropdown] = React.useState(false);
  const holdingsDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (holdingsDropdownRef.current && !holdingsDropdownRef.current.contains(e.target as Node)) {
        setShowHoldingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!holdingsSearchInput.trim()) {
      setHoldingsSearchResults([]);
      setIsHoldingsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsHoldingsSearching(true);
      try {
        const resp = await fetch(`/api/edgar/filer-search?name=${encodeURIComponent(holdingsSearchInput)}`);
        const data = await resp.json();
        if (data.results) {
          setHoldingsSearchResults(data.results);
        } else if (data.cik) {
          setHoldingsSearchResults([data]);
        } else {
          setHoldingsSearchResults([]);
        }
        setShowHoldingsDropdown(true);
      } catch (err) {
        console.error('[EDGAR SEARCH]', err);
      } finally {
        setIsHoldingsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [holdingsSearchInput]);

  const isParagraphHeader = (p: string): boolean => {
    const trimmed = p.trim();
    if (trimmed.length === 0 || trimmed.length > 90) return false;
    
    // Ignore pure numbers (page numbers) and navigation labels
    if (/^\d+$/.test(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'table of contents') return false;

    // Don't format as header if it ends with punctuation like periods
    const lastChar = trimmed[trimmed.length - 1];
    if (lastChar === '.' || lastChar === '?' || lastChar === '!') return false;
    // Common header indicators: starts with Item, Note, Table, Part, or contains standard sections
    if (lower.startsWith('item ') || lower.startsWith('note ') || lower.startsWith('part ') || lower.startsWith('section ') || lower.startsWith('risks related ')) {
      return true;
    }
    // If it's in Title Case or Upper Case and short, treat as header
    const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const words = trimmed.split(/\s+/);
    const isTitleCase = words.every(w => {
      if (w.length <= 3) return true; // ignore short words like of/and/the
      const firstChar = w[0];
      return firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar);
    });
    return isAllUpper || isTitleCase;
  };

  const isNoiseParagraph = (p: string): boolean => {
    const trimmed = p.trim();
    if (trimmed.length === 0) return true;
    // Ignore pure numbers (page numbers)
    if (/^\d+$/.test(trimmed)) return true;
    // Ignore "Table of Contents" and variant endings
    const lower = trimmed.toLowerCase();
    if (lower === 'table of contents' || lower === 'table of contents.') return true;
    return false;
  };

  const highlightText = (text: string, search: string) => {
    if (!search || !search.trim()) return text;
    const cleanSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // escape regex special chars
    const regex = new RegExp(`(${cleanSearch})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm font-semibold px-0.5">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div id="sec" className="space-y-6 scroll-mt-20 animate-fade-in">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>🏛️ SEC EDGAR Filings & XBRL Intelligence</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Live Stream</span>
            </h3>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Direct primary filings: XBRL standardized financial data, Form 4 insider rosters, 13F institutional portfolios, and Section diffs.
            </p>
          </div>

          {/* Interactive sub-tabs switcher */}
          <div className="flex bg-[#080B11] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0 gap-1 font-mono text-xs">
            {[
              { id: 'standardized', label: '📊 Standardized Statements' },
              { id: 'insiders', label: '👥 Insider Activities' },
              { id: 'holdings', label: '🏢 Institutional Holdings' },
              { id: 'tenk', label: '📄 10-K Analysis' },
              { id: 'proxy', label: '📋 Proxy Statement' }
            ].map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => {
                  setActiveSecSubTab(subTab.id as any);
                }}
                className={`flex-1 lg:flex-none px-3.5 py-1.5 font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeSecSubTab === subTab.id 
                    ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tab: Standardized Statements */}
        {activeSecSubTab === 'standardized' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-[#080B11] rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {[
                  { id: 'income', label: 'Income Statement' },
                  { id: 'balance', label: 'Balance Sheet' },
                  { id: 'cash', label: 'Cash Flow' }
                ].map((stmt) => (
                  <button
                    key={stmt.id}
                    onClick={() => setActiveSecStatement(stmt.id as any)}
                    className={`px-3 py-1.5 font-semibold rounded-lg border transition-all cursor-pointer ${
                      activeSecStatement === stmt.id
                        ? 'bg-[#141A26] border-emerald-500/50 text-emerald-400 shadow-xs font-bold'
                        : 'bg-[#0D111A] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {stmt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto font-mono text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Compare Peer:</span>
                <div className="relative flex-1 md:flex-none">
                  <select
                    value={secComparePeer}
                    onChange={(e) => setSecComparePeer(e.target.value)}
                    className="w-full md:w-48 bg-[#0D111A] border border-slate-800 rounded-lg py-1.5 px-3 text-xs font-mono font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None (Select Ticker)</option>
                    {peers && peers.filter(p => p.symbol !== upperSymbol).map(peer => (
                      <option key={peer.symbol} value={peer.symbol}>
                        {peer.symbol} - {peer.name}
                      </option>
                    ))}
                  </select>
                </div>
                {secComparePeer && (
                  <button
                    onClick={() => setSecComparePeer('')}
                    className="px-2.5 py-1.5 text-[10px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg font-bold uppercase transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {isEdgarFinancialsPending ? (
              <div className="py-10 text-center space-y-2">
                <div className="text-slate-400 animate-pulse text-sm font-medium">Fetching SEC EDGAR XBRL data…</div>
                <div className="text-slate-300 text-xs">This can take 30–60 seconds on first load</div>
              </div>
            ) : isEdgarFinancialsError ? (
              <div className="py-8 text-center text-red-400 text-sm">⚠️ Could not load SEC financials for {upperSymbol}. The company may not be SEC-registered or EDGAR data is unavailable right now.</div>
            ) : edgarFinancials ? (
              (() => {
                const statementKey = activeSecStatement === 'income'
                  ? 'incomeStatement'
                  : activeSecStatement === 'balance'
                    ? 'balanceSheet'
                    : 'cashFlow';

                const activeRows = edgarFinancials[statementKey] || [];
                const peerRows = edgarCompareFinancials ? edgarCompareFinancials[statementKey] || [] : [];

                // Dynamically get the list of years sorted descending from activeRows and peerRows
                const years = Array.from(
                  new Set([
                    ...activeRows.flatMap((row: any) => Object.keys(row.values || {})),
                    ...peerRows.flatMap((row: any) => Object.keys(row.values || {}))
                  ])
                ).sort((a, b) => b.localeCompare(a));

                return (
                  <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
                    <table className="min-w-full divide-y divide-[#E5E8EF] text-[13.5px] font-sans">
                      <thead>
                        <tr className="bg-[rgba(5,150,105,0.06)] text-[#059669] border-b border-[#E5E8EF] text-left text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 font-bold whitespace-nowrap">Standardized Item (USD in Millions)</th>
                          {secComparePeer ? (
                            years.flatMap(year => [
                              <th key={`${upperSymbol}-${year}`} className="py-3 px-4 text-right font-bold whitespace-nowrap bg-[#E6F0FF]/30">{upperSymbol} ({year})</th>,
                              <th key={`${secComparePeer}-${year}`} className="py-3 px-4 text-right font-bold whitespace-nowrap bg-[#EEF2FF]/40">{secComparePeer} ({year})</th>
                            ])
                          ) : (
                            years.map(year => (
                              <th key={year} className="py-3 px-4 text-right font-bold whitespace-nowrap">FY {year}</th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {activeRows.map((row: any, rIdx: number) => {
                          const peerRow = peerRows.find((pr: any) => pr.label === row.label);
                          const isBoldRow = ['Total Revenue', 'Gross Profit', 'Operating Income', 'Net Income', 'Total Assets', 'Total Liabilities', 'Total Stockholders Equity', 'Operating Cash Flow', 'Free Cash Flow'].includes(row.label);
                          
                          const formatVal = (val: any) => {
                            if (val === undefined || val === null) return '—';
                            if (typeof val === 'number') {
                              if (row.label.includes('EPS')) {
                                return `$${val.toFixed(2)}`;
                              }
                              return `$${val.toLocaleString()}M`;
                            }
                            return val;
                          };

                          return (
                            <tr
                              key={rIdx}
                              className={`${
                                isBoldRow 
                                  ? 'font-bold text-slate-900 bg-[rgba(5,150,105,0.06)]/20' 
                                  : rIdx % 2 === 1 
                                    ? 'bg-slate-50/10' 
                                    : 'bg-white'
                              } hover:bg-slate-50/40 transition`}
                            >
                              <td className="py-3 px-4 font-sans font-medium text-slate-800 whitespace-nowrap">{row.label}</td>
                              {secComparePeer ? (
                                years.flatMap(year => [
                                  <td key={`${upperSymbol}-${year}`} className="py-3 px-4 text-right font-semibold bg-[#E6F0FF]/15 text-slate-900 whitespace-nowrap">{formatVal(row.values[year])}</td>,
                                  <td key={`${secComparePeer}-${year}`} className="py-3 px-4 text-right text-slate-650 bg-[#EEF2FF]/20 whitespace-nowrap">{formatVal(peerRow?.values[year])}</td>
                                ])
                              ) : (
                                years.map((year, idx) => (
                                  <td key={year} className={`py-3 px-4 text-right whitespace-nowrap ${idx === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                    {formatVal(row.values[year])}
                                  </td>
                                ))
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              <div className="py-4 text-center text-slate-400">Failed to load statements.</div>
            )}
          </div>
        )}

        {/* Sub-tab: Insider Activities (Form 4) */}
        {activeSecSubTab === 'insiders' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recent Form 4 Insider Filings ({upperSymbol})
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Last 12 Months</span>
            </div>

            {isEdgarInsidersPending ? (
              <div className="py-10 text-center space-y-2">
                <div className="text-slate-400 animate-pulse text-sm font-medium">Fetching Form 4 insider filings…</div>
                <div className="text-slate-300 text-xs">SEC EDGAR data may take 30–60 seconds</div>
              </div>
            ) : isEdgarInsidersError ? (
              <div className="py-8 text-center text-red-400 text-sm">⚠️ Could not load insider activities for {upperSymbol}. The company may not be SEC-registered.</div>
            ) : edgarInsiders && edgarInsiders.transactions ? (
              <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
                <table className="min-w-full divide-y divide-[#E5E8EF] text-[13.5px] font-sans">
                  <thead>
                    <tr className="bg-[rgba(5,150,105,0.06)] text-[#059669] border-b border-[#E5E8EF] text-left text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold whitespace-nowrap">Insider Name</th>
                      <th className="py-3 px-4 font-bold whitespace-nowrap">Relationship / Role</th>
                      <th className="py-3 px-4 font-bold whitespace-nowrap">Filing Date</th>
                      <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Action</th>
                      <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Shares</th>
                      <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Price</th>
                      <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Total Value</th>
                      <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {edgarInsiders.transactions.map((tx: any, tIdx: number) => {
                      let badgeClass = '';
                      if (tx.action === 'Buy') badgeClass = 'bg-emerald-50 text-[#16A34A] border border-[#16A34A]/15';
                      else if (tx.action === 'Sell') badgeClass = 'bg-rose-50 text-[#DC2626] border border-[#DC2626]/15';
                      else badgeClass = 'bg-emerald-50 text-emerald-600 border border-blue-150';

                      return (
                        <tr key={tIdx} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{tx.name}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tx.relationship}</td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {tx.action} ({tx.code})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">{tx.shares.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">${tx.price.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">${tx.value.toLocaleString()}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <a
                              href={tx.secLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1.5 rounded-lg border border-[#E5E8EF] text-slate-400 hover:text-[#059669] hover:bg-[#059669]/5 transition"
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
              <div className="py-4 text-center text-slate-400">No insider transactions found.</div>
            )}
          </div>
        )}

        {/* Sub-tab: Institutional Holdings (13F) */}
        {activeSecSubTab === 'holdings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-xl p-4 border border-[#E5E8EF] space-y-3">
              {/* Search bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (holdingsSearchInput.trim()) {
                    setHoldingsQuery(holdingsSearchInput.trim());
                  }
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1" ref={holdingsDropdownRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search manager name, 10-digit SEC CIK, or ticker..."
                    value={holdingsSearchInput}
                    onChange={(e) => {
                      setHoldingsSearchInput(e.target.value);
                      setShowHoldingsDropdown(true);
                    }}
                    onFocus={() => holdingsSearchInput.trim() && setShowHoldingsDropdown(true)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E8EF] rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669]"
                  />
                  {isHoldingsSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-3 w-3 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {/* Dropdown */}
                  {showHoldingsDropdown && holdingsSearchInput.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E8EF] rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                      {isHoldingsSearching && holdingsSearchResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Searching SEC EDGAR database...</div>
                      ) : holdingsSearchResults.length > 0 ? (
                        <div className="py-1">
                          {holdingsSearchResults.map((result, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setHoldingsSearchInput(result.name);
                                setHoldingsQuery(result.cik);
                                setShowHoldingsDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex flex-col cursor-pointer border-b border-slate-50 last:border-none"
                            >
                              <span className="text-xs font-bold text-slate-800">{result.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">CIK: {result.cik}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">No matching institutions found</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#059669] text-white font-sans text-xs font-bold rounded-xl hover:bg-[#059669]/90 transition shadow-3xs cursor-pointer"
                >
                  Pull 13F Portfolio
                </button>
              </form>

              {/* Quick access buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Quick Access:</span>
                {[
                  { label: 'Berkshire Hathaway', cik: '0001067983' },
                  { label: 'Bill Gates Fund', cik: '0001166559' },
                  { label: 'Soros Fund', cik: '0001029160' }
                ].map((fund) => (
                  <button
                    key={fund.cik}
                    type="button"
                    onClick={() => {
                      setHoldingsSearchInput(fund.cik);
                      setHoldingsQuery(fund.cik);
                    }}
                    className={`px-3 py-1 bg-white border rounded-lg hover:border-[#059669] hover:text-[#059669] transition font-medium text-[11px] cursor-pointer ${
                      holdingsQuery === fund.cik
                        ? 'border-[#059669] text-[#059669] bg-emerald-50/10 font-bold'
                        : 'border-[#E5E8EF] text-slate-600'
                    }`}
                  >
                    {fund.label}
                  </button>
                ))}
              </div>
            </div>

            {isEdgarHoldingsPending ? (
              <div className="py-10 text-center space-y-2">
                <div className="text-slate-400 animate-pulse text-sm font-medium">Fetching 13F institutional holdings…</div>
                <div className="text-slate-300 text-xs">SEC EDGAR data may take 30–60 seconds</div>
              </div>
            ) : isEdgarHoldingsError ? (
              <div className="py-8 text-center text-red-400 text-sm">⚠️ Could not load 13F holdings data. This fund may not have filed 13F reports with the SEC.</div>
            ) : edgarHoldings ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    <Building className="h-4 w-4 text-[#059669]" />
                    <span>{edgarHoldings.managerName}</span>
                  </h4>
                  <div className="flex gap-2 text-[10px] font-mono text-slate-400 uppercase">
                    <span>Reporting Period: <strong>{edgarHoldings.portfolioDate}</strong></span>
                    <span>·</span>
                    <span>Source: <strong>SEC Form 13F-HR</strong></span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl bg-white">
                  <table className="min-w-full divide-y divide-[#E5E8EF] text-[13.5px] font-sans">
                    <thead>
                      <tr className="bg-[rgba(5,150,105,0.06)] text-[#059669] border-b border-[#E5E8EF] text-left text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 font-bold whitespace-nowrap">Ticker</th>
                        <th className="py-3 px-4 font-bold whitespace-nowrap">Issuer Company Name</th>
                        <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Value (USD in Thousands)</th>
                        <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Shares Held</th>
                        <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Option Status</th>
                        <th className="py-3 px-4 text-right font-bold whitespace-nowrap">QoQ Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {edgarHoldings.holdings && edgarHoldings.holdings.length > 0 ? (
                        edgarHoldings.holdings.map((hold: any, hIdx: number) => {
                          const isCall = hold.option === 'Call';
                          const isPut = hold.option === 'Put';
                          
                          let changeColor = 'text-slate-500';
                          if (hold.qoqChange.startsWith('+') || hold.qoqChange === 'New') {
                            changeColor = 'text-[#16A34A] font-bold';
                          } else if (hold.qoqChange.startsWith('-')) {
                            changeColor = 'text-[#DC2626] font-bold';
                          }

                          return (
                            <tr key={hIdx} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-mono font-bold text-[#059669] whitespace-nowrap">{hold.ticker}</td>
                              <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{hold.name}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">${hold.value.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right font-mono text-slate-655 whitespace-nowrap">{hold.shares.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {isCall ? (
                                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-650 border border-teal-150 text-[10px] font-bold uppercase tracking-wide">Call</span>
                                ) : isPut ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-650 border border-amber-150 text-[10px] font-bold uppercase tracking-wide">Put</span>
                                ) : (
                                  <span className="text-slate-350">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                                <span className={changeColor}>
                                  {hold.qoqChange === 'New' ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-blue-150 text-[9px] font-bold uppercase tracking-wide">NEW</span>
                                  ) : hold.qoqChange}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">No portfolio assets returned.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400">Failed to load holdings report.</div>
            )}
          </div>
        )}

        {/* Sub-tab: 10-K Filings Analysis */}
        {activeSecSubTab === 'tenk' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-xl p-4 border border-[#E5E8EF] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex bg-white p-0.5 rounded-lg border border-[#E5E8EF] max-w-sm gap-0.5">
                {[
                  { id: 'business', label: 'Item 1. Business' },
                  { id: 'risk', label: 'Item 1A. Risk Factors' },
                  { id: 'mda', label: 'Item 7. MD&A Analysis' }
                ].map((sectionTab) => (
                  <button
                    key={sectionTab.id}
                    onClick={() => setActiveTenKTab(sectionTab.id as any)}
                    className={`px-3 py-1.5 font-sans text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTenKTab === sectionTab.id 
                        ? 'bg-[#059669] text-white shadow-sm font-bold' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {sectionTab.label}
                  </button>
                ))}
              </div>

              {activeTenKTab === 'risk' && (
                <div className="flex items-center gap-2 select-none">
                  <span className="text-xs font-bold text-slate-650 uppercase tracking-wide">YoY Risk Factors Diff:</span>
                  <button
                    type="button"
                    onClick={() => setShowRiskDiff(!showRiskDiff)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showRiskDiff ? 'bg-[#059669]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        showRiskDiff ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Search Toolbar & Theme Highlights */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4 mb-2">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search keywords (e.g. AI, FSD, tariff, risk, revenue)..."
                  value={secSearchInput}
                  onChange={(e) => setSecSearchInput(e.target.value)}
                  className="w-full bg-white border border-[#E5E8EF] rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-[10px] font-mono text-slate-405 uppercase tracking-wider shrink-0">Quick Themes:</span>
                <div className="flex flex-wrap gap-1">
                  {['AI', 'FSD', 'Robotaxi', 'Tariff', 'Risk', 'Revenue'].map((pill) => (
                    <button
                      key={pill}
                      onClick={() => setSecSearchInput(secSearchInput === pill ? '' : pill)}
                      className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer ${
                        secSearchInput === pill
                          ? 'bg-[#059669]/10 border-[#059669]/30 text-[#059669]'
                          : 'bg-white border-[#E5E8EF] text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Text Content Rendering Area - Unified Paper Canvas */}
            <div className="bg-white border border-[#E5E8EF] rounded-xl p-6 shadow-sm space-y-4">
              {activeTenKTab === 'business' ? (
                isSection1Pending ? (
                  <div className="py-8 text-center text-slate-400 animate-pulse font-mono text-xs">Loading Business description...</div>
                ) : edgarSection1 && edgarSection1.paragraphs ? (
                  <div className="space-y-4 animate-in fade-in duration-250">
                    <h4 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="h-4 w-4 text-[#059669]" />
                      <span>{edgarSection1.title}</span>
                    </h4>
                    <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-700">
                      {edgarSection1.paragraphs.filter((p: string) => !isNoiseParagraph(p)).map((p: string, pIdx: number) => {
                        if (isParagraphHeader(p)) {
                          return (
                            <h5 key={pIdx} className="font-sans font-bold text-slate-900 text-sm mt-6 mb-2 border-t border-slate-100 pt-4 first:border-0 first:mt-0 first:pt-0">
                              {p}
                            </h5>
                          );
                        }
                        return (
                          <p key={pIdx} className="leading-relaxed text-slate-700 text-left">
                            {highlightText(p, secSearchInput)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 font-mono text-xs">Failed to load Business description.</div>
                )
              ) : activeTenKTab === 'risk' ? (
                showRiskDiff ? (
                  isRiskDiffPending ? (
                    <div className="py-8 text-center text-slate-400 animate-pulse font-mono text-xs">Computing YoY difference analysis...</div>
                  ) : edgarRiskDiff && edgarRiskDiff.paragraphs ? (
                    <div className="space-y-4 animate-in fade-in duration-250">
                      {/* Diff Filtering Switcher */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-2">
                        <div className="flex bg-slate-50 p-0.5 rounded-lg border border-[#E5E8EF] max-w-sm gap-0.5 w-full sm:w-auto">
                          {[
                            { id: 'all', label: 'All Risks' },
                            { id: 'changes', label: 'Changes Only' },
                            { id: 'added', label: 'Added Only' },
                            { id: 'removed', label: 'Removed Only' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setDiffFilter(item.id as any)}
                              className={`flex-1 sm:flex-none px-3 py-1 font-sans text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                diffFilter === item.id 
                                  ? 'bg-slate-800 text-white shadow-xs' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex gap-4 text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-150 inline-block" /> Added</span>
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-50 border border-rose-150 inline-block" /> Removed</span>
                          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white border border-[#E5E8EF] inline-block" /> Unchanged</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-700">
                        {edgarRiskDiff.paragraphs
                          .filter((p: any) => !isNoiseParagraph(p.text))
                          .filter((p: any) => {
                            if (diffFilter === 'changes') return p.status === 'added' || p.status === 'removed';
                            if (diffFilter === 'added') return p.status === 'added';
                            if (diffFilter === 'removed') return p.status === 'removed';
                            return true; // all
                          })
                          .map((p: any, pIdx: number) => {
                            let styleClass = 'p-3 rounded-xl border border-[#E5E8EF] bg-white';
                            if (p.status === 'added') {
                              styleClass = 'p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 text-emerald-955 font-medium shadow-[0_1px_2px_rgba(5,150,105,0.03)]';
                            } else if (p.status === 'removed') {
                              styleClass = 'p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 text-rose-955 line-through decoration-rose-300 font-medium shadow-[0_1px_2px_rgba(220,38,38,0.03)]';
                            } else {
                              styleClass = 'p-3 text-slate-655 border border-slate-100 bg-slate-50/10';
                            }
                            
                            return (
                              <div key={pIdx} className={styleClass}>
                                {p.status === 'added' || p.status === 'removed' ? (
                                  highlightText(p.text, secSearchInput)
                                ) : isParagraphHeader(p.text) ? (
                                  <h5 className="font-sans font-bold text-slate-900 text-sm">{p.text}</h5>
                                ) : (
                                  highlightText(p.text, secSearchInput)
                                )}
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 font-mono text-xs">Failed to load risk factor difference report.</div>
                  )
                ) : (
                  isSection1APending ? (
                    <div className="py-8 text-center text-slate-400 animate-pulse font-mono text-xs">Loading Risk Factors section...</div>
                  ) : edgarSection1A && edgarSection1A.paragraphs ? (
                    <div className="space-y-4 animate-in fade-in duration-250">
                      <h4 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <FileText className="h-4 w-4 text-[#059669]" />
                        <span>{edgarSection1A.title}</span>
                      </h4>
                      <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-700">
                        {edgarSection1A.paragraphs.filter((p: string) => !isNoiseParagraph(p)).map((p: string, pIdx: number) => {
                          if (isParagraphHeader(p)) {
                            return (
                              <h5 key={pIdx} className="font-sans font-bold text-slate-900 text-sm mt-6 mb-2 border-t border-slate-100 pt-4 first:border-0 first:mt-0 first:pt-0">
                                {p}
                              </h5>
                            );
                          }
                          return (
                            <p key={pIdx} className="leading-relaxed text-slate-755 text-left">
                              {highlightText(p, secSearchInput)}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 font-mono text-xs">Failed to load Risk Factors.</div>
                  )
                )
              ) : (
                isSection7Pending ? (
                  <div className="py-8 text-center text-slate-400 animate-pulse font-mono text-xs">Loading MD&A section...</div>
                ) : edgarSection7 && edgarSection7.paragraphs ? (
                  <div className="space-y-4 animate-in fade-in duration-250">
                    <h4 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="h-4 w-4 text-[#059669]" />
                      <span>{edgarSection7.title}</span>
                    </h4>
                    <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-700">
                      {edgarSection7.paragraphs.filter((p: string) => !isNoiseParagraph(p)).map((p: string, pIdx: number) => {
                        if (isParagraphHeader(p)) {
                          return (
                            <h5 key={pIdx} className="font-sans font-bold text-slate-900 text-sm mt-6 mb-2 border-t border-slate-100 pt-4 first:border-0 first:mt-0 first:pt-0">
                              {p}
                            </h5>
                          );
                        }
                        return (
                          <p key={pIdx} className="leading-relaxed text-slate-700 text-left">
                            {highlightText(p, secSearchInput)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 font-mono text-xs">Failed to load MD&A analysis.</div>
                )
              )}
            </div>
          </div>
        )}

        {/* Sub-tab: Proxy Statement Panel */}
        {activeSecSubTab === 'proxy' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-sans font-bold text-sm text-gray-900 mb-2">
                Pay versus Performance (structured XBRL)
              </h4>
              <PayVersusPerformancePanel
                data={edgarPayVersusPerformance}
                isPending={isEdgarPayVersusPerformancePending}
                isError={isEdgarPayVersusPerformanceError}
                upperSymbol={upperSymbol}
              />
            </div>

            <div className="border-t border-gray-150 pt-6">
              <h4 className="font-sans font-bold text-sm text-gray-900 mb-2">
                Full Proxy Statement (parsed from filing HTML)
              </h4>
              <ProxyStatementPanel
                data={edgarProxy}
                isPending={isEdgarProxyPending}
                isError={isEdgarProxyError}
                upperSymbol={upperSymbol}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

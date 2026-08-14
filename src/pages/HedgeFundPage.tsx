import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../utils/apiClient.js';
import { Bot, Loader2, Target, DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, X, ShieldCheck, Zap, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '../utils/formatters.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { TerminalCard } from '../components/ui/TerminalCard.js';
import { TelemetryBadge } from '../components/ui/TelemetryBadge.js';
import { RadarInvestorChart } from '../components/ui/RadarInvestorChart.js';
import { AnimatedNumber } from '../components/ui/AnimatedNumber.js';

interface AgentResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string[];
}

interface StockEvaluationResult {
  symbol: string;
  price: number;
  agents: {
    benGraham: AgentResult;
    billAckman: AgentResult;
    cathieWood: AgentResult;
    charlieMunger: AgentResult;
    philFisher: AgentResult;
    stanDruckenmiller: AgentResult;
    warrenBuffett: AgentResult;
  };
}

interface PortfolioDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  reasoning: string[];
  allocationAmount: number;
}

interface HedgeFundResult {
  decisions: Record<string, PortfolioDecision>;
  evaluations: Record<string, StockEvaluationResult>;
  summary: string[];
}

const PRESET_BASKETS = [
  { name: 'Tech Titans', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL'] },
  { name: 'Value Moats', tickers: ['BRK-B', 'JNJ', 'KO', 'PG'] },
  { name: 'Growth & EV', tickers: ['TSLA', 'AMZN', 'META', 'PLTR'] },
];

export const HedgeFundPage: React.FC = () => {
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'TSLA', 'NVDA']);
  const [cashInput, setCashInput] = useState(100000);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);

  const mutation = useMutation<HedgeFundResult, Error, { tickers: string[]; cash: number }>({
    mutationFn: async (payload) => {
      const resp = await apiClient.post<HedgeFundResult>('/hedge-fund/run', payload);
      return resp.data;
    }
  });

  const handleRun = () => {
    if (tickers.length === 0) return;
    mutation.mutate({ tickers, cash: cashInput });
  };

  const getSignalIcon = (signal: string) => {
    if (signal === 'bullish') return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    if (signal === 'bearish') return <XCircle className="h-4 w-4 text-rose-400" />;
    return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  };

  const getSignalBadge = (signal: string) => {
    if (signal === 'bullish') return 'telemetry-emerald';
    if (signal === 'bearish') return 'telemetry-rose';
    return 'telemetry-amber';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                7-Agent Hedge Fund Terminal
              </h1>
              <TelemetryBadge variant="indigo" label="MULTI-AGENT AI" pulse size="xs" />
            </div>
          </div>
          <p className="font-sans text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Deterministic philosophical scoring engine simulating Warren Buffett, Charlie Munger, Ben Graham, Phil Fisher, Stan Druckenmiller, Bill Ackman, and Cathie Wood.
          </p>
        </div>

        {/* Total portfolio cash preview badge */}
        <div className="flex items-center gap-3 bg-[#0D111A] border border-slate-800 px-4 py-2.5 rounded-2xl shrink-0 shadow-md">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Allocatable Capital</span>
            <span className="font-mono font-black text-slate-100 text-sm">
              <AnimatedNumber value={cashInput} prefix="$" decimals={0} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Config Panel */}
        <div className="lg:col-span-1 space-y-6">
          <TerminalCard
            title="Cockpit Controls"
            subtitle="Configure target basket & risk parameters"
            icon={<Target className="h-4 w-4" />}
          >
            <div className="space-y-5">
              {/* Presets */}
              <div>
                <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                  Quick Basket Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_BASKETS.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => setTickers(b.tickers)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Tickers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-300">Target Equities ({tickers.length}/10)</label>
                  {tickers.length > 0 && (
                    <button
                      onClick={() => setTickers([])}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[38px] p-2 rounded-xl bg-[#080B11] border border-slate-800">
                  {tickers.map((ticker) => (
                    <div
                      key={ticker}
                      className="flex items-center gap-1 bg-[#141A26] text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-bold font-mono group"
                    >
                      <span>{ticker}</span>
                      <button 
                        onClick={() => setTickers(tickers.filter(t => t !== ticker))}
                        className="hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-md p-0.5 ml-1 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {tickers.length === 0 && (
                    <span className="text-xs text-slate-500 italic py-1 px-1">Add up to 10 tickers below...</span>
                  )}
                </div>

                {tickers.length < 10 && (
                  <SearchBar 
                    placeholder="Search ticker to add (e.g. MSFT)..." 
                    onSelect={(sym) => {
                      if (!tickers.includes(sym.toUpperCase())) {
                        setTickers([...tickers, sym.toUpperCase()]);
                      }
                    }} 
                  />
                )}
              </div>

              {/* Starting Cash */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capital Pool ($ USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-800 bg-[#080B11] pl-9 pr-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={cashInput}
                    onChange={(e) => setCashInput(Number(e.target.value))}
                    min="1000"
                    step="1000"
                  />
                </div>
              </div>

              {/* Run Button */}
              <button
                onClick={handleRun}
                disabled={mutation.isPending || tickers.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-xs tracking-wider uppercase font-mono"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Evaluating 7 Personas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Execute Fund Consensus</span>
                  </>
                )}
              </button>
            </div>
          </TerminalCard>

          {/* Portfolio Summary Card */}
          {mutation.data && (
            <TerminalCard
              title="Execution Summary"
              subtitle="Capital allocation & risk limits"
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            >
              <ul className="space-y-2.5 text-xs text-slate-300">
                {mutation.data.summary.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#080B11]/80 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </TerminalCard>
          )}
        </div>

        {/* Right Results Pane */}
        <div className="lg:col-span-2 space-y-6">
          {mutation.isError && (
            <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>Failed to execute engine evaluation. Please verify tickers and try again.</span>
            </div>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center bg-[#090D15]/60 backdrop-blur-xl flex flex-col items-center justify-center text-slate-400 min-h-[380px]">
              <div className="h-16 w-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                <Target className="h-8 w-8 text-emerald-500/60" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1.5">Cockpit Standing By</h3>
              <p className="max-w-md mx-auto text-xs text-slate-500 leading-relaxed">
                Add your target equity tickers, specify portfolio cash, and run the simulation to generate 7-agent conviction scorecards and interactive radar charts.
              </p>
            </div>
          )}

          {mutation.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>Persona Decisions</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                    {Object.keys(mutation.data.decisions).length} Evaluated
                  </span>
                </h2>
                <span className="text-[11px] font-mono text-slate-500">Click row to inspect radar chart</span>
              </div>
              
              {Object.entries(mutation.data.decisions).map(([symbol, decision]) => {
                const evalData = mutation.data.evaluations[symbol];
                const isExpanded = expandedStock === symbol;

                const actionStyle =
                  decision.action === 'BUY'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : decision.action === 'SELL'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={symbol}
                    className="rounded-2xl border border-slate-800 bg-[#0D111A] overflow-hidden transition-all duration-300 hover:border-slate-700 shadow-3d card-3d-tilt"
                  >
                    {/* Header Row */}
                    <div 
                      className="p-5 flex flex-wrap items-center justify-between cursor-pointer hover:bg-[#141A26] transition-colors gap-4"
                      onClick={() => setExpandedStock(isExpanded ? null : symbol)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`px-3 py-1.5 rounded-xl font-black font-mono text-xs border tracking-wider shrink-0 ${actionStyle}`}>
                          {decision.action}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                            <span>{symbol}</span>
                            <span className="text-xs font-semibold text-slate-400 font-mono">
                              {evalData ? formatPrice(evalData.price, 'USD') : ''}
                            </span>
                          </h3>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                            {decision.quantity > 0 ? (
                              <span className="text-emerald-400 font-semibold">
                                Allocated {decision.quantity} shares ({formatPrice(decision.allocationAmount, 'USD')})
                              </span>
                            ) : (
                              <span className="text-slate-500">Zero allocation</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Brief reasoning snippet */}
                      <div className="flex items-center gap-4 ml-auto">
                        <div className="hidden sm:block max-w-xs text-right text-[11px] text-slate-400">
                          <span className="truncate block">{decision.reasoning[0] || 'Standard risk filter applied'}</span>
                        </div>
                        <div className="p-1 rounded-lg bg-slate-800/80 text-slate-400 btn-3d">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded 7-Agent Details & Radar Chart */}
                    {isExpanded && evalData && (
                      <div className="border-t border-slate-800 bg-[#080B11] p-6 space-y-6 animate-fade-in">
                        
                        {/* Radar Chart Visualizer Row */}
                        <div className="bg-[#0D111A] rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-around gap-6 shadow-3d">
                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                              7-Investor Conviction Radar
                            </span>
                            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                              Multi-vector analysis measuring alignment across value, growth, quality, quant momentum, and margin of safety.
                            </p>
                          </div>
                          <RadarInvestorChart agents={evalData.agents} symbol={symbol} size={280} />
                        </div>

                        {/* Individual Agent Cards Grid */}
                        <div>
                          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Individual Persona Scorecards
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(evalData.agents).map(([agentKey, result]) => {
                              const badgeClass = getSignalBadge(result.signal);
                              return (
                                <div
                                  key={agentKey}
                                  className="p-4 rounded-xl border border-slate-800 bg-[#0D111A] space-y-2 hover:border-slate-700 transition-colors shadow-3d card-3d-tilt"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-sans font-bold text-xs text-slate-200 capitalize">
                                      {agentKey.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                        {result.confidence.toFixed(0)}% Conviction
                                      </span>
                                      {getSignalIcon(result.signal)}
                                    </div>
                                  </div>
                                  <ul className="text-[11px] space-y-1 text-slate-400">
                                    {result.reasoning.map((r, i) => (
                                      <li
                                        key={i}
                                        className={
                                          r.startsWith('✅')
                                            ? 'text-emerald-400'
                                            : r.startsWith('❌')
                                            ? 'text-rose-400'
                                            : 'text-slate-300'
                                        }
                                      >
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { HelpCircle, BadgeInfo, Loader2 } from 'lucide-react';
import { formatPrice, formatMarketCap, formatShares, formatDate, formatLargeNumber, getCurrencySymbol } from '../../utils/formatters.js';
import { FinStarRating } from './components/FinStarRating.jsx';

interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  weburl: string;
  ipo: string;
  description: string;
}

interface Ratios {
  symbol: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  debt_equity: string;
  eps: string;
  market_cap: number;
  dividend_yield: string;
  enterprise_value?: number | null;
  shares_outstanding?: number | null;
  book_value?: number | null;
  total_cash?: number | null;
  total_debt?: number | null;
  sales_growth?: string | null;
  profit_growth?: string | null;
}

interface OverviewTabProps {
  detailData: any;
  profile: CompanyProfile;
  ratios: Ratios | undefined;
  quote: any;
  handleScrollToSection: (id: string) => void;
  shareholding: any;
  isShareholdingPending: boolean;
}

const getTooltipContent = (tag: string, ratios: Ratios | undefined): string => {
  if (!ratios || ratios.pe === '—') return 'Data unavailable for this metric.';
  const peNum = parseFloat(ratios.pe) || 0;
  const roeNum = parseFloat(ratios.roe.replace('%', '')) || 0;
  const deNum = parseFloat(ratios.debt_equity) || 0;

  if (tag === 'Valuation') {
    const isExpensive = peNum > 30;
    return `P/E ratio is ${ratios.pe} vs sector median of ~24 — stock is ${isExpensive ? 'trading at a premium compared to peer group averages.' : 'optimally priced and positioned for attractive entries.'}`;
  }
  if (tag === 'Efficiency') {
    const isEfficient = roeNum > 15;
    return `ROE represents efficiency at ${ratios.roe} vs hurdle of 15.00%. ${isEfficient ? 'Capital employment generates comfortable return-on-equity rates.' : 'Average operations with space for asset utilization refinement.'}`;
  }
  if (tag === 'Financials') {
    const isHealthy = deNum < 1.5;
    return `Debt/Equity leverage represents ${ratios.debt_equity} vs safety threshold of < 1.5. ${isHealthy ? 'Prudent capital structure with highly serviceable leverage limits.' : 'Elevated corporate debt requires cautious interest servicing check.'}`;
  }
  return '';
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  detailData,
  profile,
  ratios,
  quote,
  handleScrollToSection,
  shareholding,
  isShareholdingPending
}) => {
  // Simple dynamic FinStar rating calculation based on real ratios
  const hasRatios = !!ratios && ratios.pe !== '—';
  const peNum = hasRatios ? parseFloat(ratios.pe) : 0;
  const roeNum = hasRatios ? parseFloat(ratios.roe.replace('%', '')) : 0;
  const deNum = hasRatios ? parseFloat(ratios.debt_equity) : 0;

  const getValuationStars = (pe: number) => {
    if (pe === 0) return 0;
    if (pe < 15) return 4;
    if (pe < 30) return 3;
    return 1;
  };
  const getValuationStatus = (pe: number) => {
    if (pe === 0) return '—';
    if (pe < 15) return 'Attractive';
    if (pe < 30) return 'Fair';
    return 'Expensive';
  };

  const getEfficiencyStars = (roe: number) => {
    if (roe === 0) return 0;
    if (roe > 15) return 4;
    return 2;
  };

  const getFinancialsStars = (de: number) => {
    if (de === 0) return 0;
    if (de < 1.0) return 4;
    if (de < 2.0) return 3;
    return 1;
  };

  const valuationStars = getValuationStars(peNum);
  const efficiencyStars = getEfficiencyStars(roeNum);
  const financialsStars = getFinancialsStars(deNum);

  const overallStars = hasRatios ? Math.round((valuationStars + efficiencyStars + financialsStars) / 3) : 0;

  return (
    <div id="overview" className="space-y-6 scroll-mt-20 animate-fade-in">
      {/* Two-Column Grid Setup containing Price Summary + Essentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Price Summary Panel */}
        <div className="lg:col-span-4 bg-[#0D111A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Price Range Extremes
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Session
            </span>
          </div>
          
          <div className="grid grid-cols-2 border border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
            <div className="p-4 border-r border-b border-slate-800 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Today's High</span>
              <span className="font-mono font-bold text-slate-100 text-base mt-1 block tabular-nums">
                {quote?.high ? formatPrice(quote.high, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 border-b border-slate-800 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Today's Low</span>
              <span className="font-mono font-bold text-slate-100 text-base mt-1 block tabular-nums">
                {quote?.low ? formatPrice(quote.low, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 border-r border-slate-800 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">52W High</span>
              <span className="font-mono font-bold text-emerald-400 text-base mt-1 block tabular-nums">
                {quote?.high_52w ? formatPrice(quote.high_52w, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">52W Low</span>
              <span className="font-mono font-bold text-rose-400 text-base mt-1 block tabular-nums">
                {quote?.low_52w ? formatPrice(quote.low_52w, profile.exchange) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Company Essentials Panel */}
        <div className="lg:col-span-8 bg-[#0D111A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Company Fundamental Essentials
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Consolidated figures (TTM)</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
            {[
              { label: 'MARKET CAP', value: ratios?.market_cap ? formatMarketCap(ratios.market_cap, profile.exchange) : '—' },
              { label: 'ENTERPRISE VALUE', value: ratios?.enterprise_value ? formatMarketCap(ratios.enterprise_value, profile.exchange) : '—' },
              { label: 'NO. OF SHARES', value: ratios?.shares_outstanding ? formatShares(ratios.shares_outstanding, profile.exchange, profile.symbol) : '—' },
              { label: 'P/E RATIO', value: ratios?.pe || '—' },
              { label: 'P/B RATIO', value: ratios?.pb || '—' },
              { label: 'DIV. YIELD', value: ratios?.dividend_yield || '—' },
              { label: 'BOOK VALUE', value: ratios?.book_value ? formatPrice(ratios.book_value, profile.exchange) : '—' },
              { label: 'TOTAL CASH', value: ratios?.total_cash ? formatMarketCap(ratios.total_cash, profile.exchange) : '—' },
              { label: 'TOTAL DEBT', value: ratios?.total_debt ? formatMarketCap(ratios.total_debt, profile.exchange) : '—' },
              { label: 'EPS (TTM)', value: ratios?.eps || '—' },
              { label: 'SALES GROWTH', value: ratios?.sales_growth || '—' },
              { label: 'ROE', value: ratios?.roe || '—' },
              { label: 'ROCE', value: ratios?.roce || '—' },
              { label: 'PROFIT GROWTH', value: ratios?.profit_growth || '—' }
            ].map((stat, statIdx) => (
              <div key={statIdx} className="p-3.5 border-r border-b border-slate-800 hover:bg-[#141A26] transition-colors">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span>{stat.label}</span>
                </span>
                <span className="font-mono font-bold text-slate-100 text-sm sm:text-[15px] mt-1 block tabular-nums">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FinStar Ratings Panel */}
      <div className="bg-[#0D111A] rounded-2xl p-5 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100 leading-tight">FinStar Quantitative Scorecard</h2>
              <FinStarRating stars={overallStars} />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">Algorithmic scoring factoring valuation multiples, ROE hurdles, and capital structure safety.</p>
          </div>
          
          <span className="bg-[#141A26] text-emerald-400 border border-emerald-500/30 rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold tracking-wider inline-flex items-center shrink-0 shadow-sm">
            Composite Score: {overallStars} / 5
          </span>
        </div>

        {hasRatios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {[
              { 
                tag: 'Ownership', 
                stat: { status: '—', stars: 0, desc: 'Institutional & insider ownership tracking.' } 
              },
              { 
                tag: 'Valuation', 
                stat: { 
                  status: getValuationStatus(peNum), 
                  stars: valuationStars, 
                  desc: peNum > 0 ? `P/E ratio is ${ratios.pe} vs sector median of ~24.` : 'Valuation details unavailable.' 
                } 
              },
              { 
                tag: 'Efficiency', 
                stat: { 
                  status: roeNum > 15 ? 'Strong' : roeNum > 0 ? 'Average' : '—', 
                  stars: efficiencyStars, 
                  desc: roeNum > 0 ? `ROE represents efficiency at ${ratios.roe}.` : 'Efficiency details unavailable.' 
                } 
              },
              { 
                tag: 'Financials', 
                stat: { 
                  status: deNum < 1.5 ? 'Good' : deNum > 0 ? 'Poor' : '—', 
                  stars: financialsStars, 
                  desc: deNum > 0 ? `Debt/Equity leverage represents ${ratios.debt_equity}.` : 'Financial leverage details unavailable.' 
                } 
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className="bg-[#080B11] border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">
                      {item.tag}
                    </span>
                    {(() => {
                      const status = item.stat.status || '';
                      const s = status.toLowerCase();
                      let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (s.includes('poor') || s.includes('expensive')) badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                      else if (s.includes('strong') || s.includes('good') || s.includes('attractive')) badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      else if (s.includes('fair') || s.includes('average')) badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      
                      return (
                        <span className={`border px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${badgeColor}`}>
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <FinStarRating stars={item.stat.stars} starClassName="h-3.5 w-3.5" />
                </div>

                <p className="text-xs font-sans text-slate-400 leading-relaxed">
                  {item.stat.desc}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Rating data unavailable for this company
          </div>
        )}
      </div>

      {/* Shareholding Pattern Card */}
      <div id="shareholding" className="space-y-6 scroll-mt-20">
        <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Shareholding Structure & Institutional Claims
            </h3>
            <span className="text-[10px] font-mono text-slate-500">SEC 13F / Proxy disclosures</span>
          </div>

          {isShareholdingPending ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-mono text-xs space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <span>Syncing shareholding pattern disclosures...</span>
            </div>
          ) : shareholding && (
            (shareholding.majorHolders && shareholding.majorHolders.insidersPercentHeld !== null) ||
            (shareholding.institutionalHolders && shareholding.institutionalHolders.length > 0) ||
            (shareholding.mutualFundHolders && shareholding.mutualFundHolders.length > 0)
          ) ? (
            <div className="space-y-6">
              {/* Major Holders Breakdown */}
              {shareholding.majorHolders && shareholding.majorHolders.insidersPercentHeld !== null && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Major Holders Split</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
                    <table className="w-full text-left font-sans text-xs">
                      <tbody className="divide-y divide-slate-800">
                        {[
                          {
                            label: '% of Shares Held by All Insiders',
                            value: shareholding.majorHolders.insidersPercentHeld !== null 
                              ? `${(shareholding.majorHolders.insidersPercentHeld * 100).toFixed(2)}%` 
                              : '—'
                          },
                          {
                            label: '% of Shares Held by Institutions',
                            value: shareholding.majorHolders.institutionsPercentHeld !== null 
                              ? `${(shareholding.majorHolders.institutionsPercentHeld * 100).toFixed(2)}%` 
                              : '—'
                          },
                          {
                            label: '% of Float Held by Institutions',
                            value: shareholding.majorHolders.institutionsFloatPercentHeld !== null 
                              ? `${(shareholding.majorHolders.institutionsFloatPercentHeld * 100).toFixed(2)}%` 
                              : '—'
                          },
                          {
                            label: 'Number of Institutions Holding Shares',
                            value: shareholding.majorHolders.institutionsCount !== null 
                              ? formatLargeNumber(shareholding.majorHolders.institutionsCount) 
                              : '—'
                          }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#141A26] transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-emerald-400 w-1/4 border-r border-slate-800 text-right bg-[#0D111A]/40 whitespace-nowrap">
                              {row.value}
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-medium">
                              {row.label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Institutional Holders */}
              {shareholding.institutionalHolders && shareholding.institutionalHolders.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Top Institutional 13F Holders</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-800 text-xs font-sans text-left">
                        <thead>
                          <tr className="bg-[#0D111A] text-slate-400 border-b border-slate-800 text-[10.5px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                            <th className="py-3 px-4 text-left">Institution</th>
                            <th className="py-3 px-4 text-right">Shares Held</th>
                            <th className="py-3 px-4 text-center">Reported Date</th>
                            <th className="py-3 px-4 text-right">% Float</th>
                            <th className="py-3 px-4 text-right text-emerald-400">Position Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {shareholding.institutionalHolders.map((item: any, idx: number) => {
                            const currency = getCurrencySymbol(profile.exchange, profile.symbol);
                            const valFormatted = item.value 
                              ? `${currency}${Math.round(item.value).toLocaleString()}` 
                              : '—';
                            return (
                              <tr key={idx} className="hover:bg-[#141A26] transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">{item.organization}</td>
                                <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">{item.position ? formatShares(item.position, profile.exchange, profile.symbol) : '—'}</td>
                                <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">{item.reportDate ? formatDate(item.reportDate) : '—'}</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                                  {item.pctHeld !== null ? `${(item.pctHeld * 100).toFixed(2)}%` : '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">{valFormatted}</td>
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
            <div className="py-12 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Shareholding pattern data unavailable for this company
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import {
  formatPrice,
  formatMarketCap,
  formatShares,
} from '../../utils/formatters.js';
import { FinStarRating } from './components/FinStarRating.jsx';
import { ShareholdingCard } from './components/ShareholdingCard.js';
import { asShareholding, asStockQuote } from './components/companyTypes.js';
import type {
  InstitutionalHolder,
  MajorHolders,
  ShareholdingData,
  StockQuote,
} from './components/companyTypes.js';
import type {
  CompanyDetailData,
  CompanyProfile,
  CompanyQuote,
  CompanyShareholding,
  Ratios,
  ShareholdingHolder,
  ShareholdingMajorHolders,
} from './types.js';

export type { CompanyProfile, Ratios };

export interface FundamentalStat {
  label: string;
  value: string;
}

export interface PriceExtremes {
  high?: number | null;
  low?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
}

export type OverviewQuote = StockQuote | CompanyQuote | PriceExtremes;

export interface ShareholdingBreakdown {
  majorHolders?: MajorHolders | ShareholdingMajorHolders | null;
  institutionalHolders?: InstitutionalHolder[] | ShareholdingHolder[] | null;
  mutualFundHolders?: unknown[] | ShareholdingHolder[] | null;
}

export type OverviewShareholding =
  | ShareholdingData
  | CompanyShareholding
  | ShareholdingBreakdown;

export type FinStarCategory = 'Ownership' | 'Valuation' | 'Efficiency' | 'Financials';

export type FinStarStatus =
  | 'Attractive'
  | 'Fair'
  | 'Expensive'
  | 'Strong'
  | 'Average'
  | 'Good'
  | 'Poor'
  | '—';

export interface FinStarCategoryCardProps {
  tag: string;
  status: string;
  stars: number;
  description: string;
}

export interface FinStarRatingCard {
  tag: FinStarCategory | string;
  status: FinStarStatus | string;
  stars: number;
  description: string;
}

export interface OverviewTabProps {
  detailData?: CompanyDetailData | null;
  profile: CompanyProfile;
  ratios: Ratios | undefined;
  quote?: OverviewQuote | null;
  handleScrollToSection?: (id: string) => void;
  shareholding?: OverviewShareholding | null;
  isShareholdingPending: boolean;
}

const getBadgeColor = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized.includes('poor') || normalized.includes('expensive')) {
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }
  if (
    normalized.includes('strong') ||
    normalized.includes('good') ||
    normalized.includes('attractive')
  ) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
  if (normalized.includes('fair') || normalized.includes('average')) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const FinStarCategoryCard = React.memo(function FinStarCategoryCard({
  tag,
  status,
  stars,
  description,
}: FinStarCategoryCardProps) {
  return (
    <div className="bg-[#080B11] border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between gap-3">
      <div className="space-y-2.5">
        <div className="flex justify-between items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">
            {tag}
          </span>
          <span
            className={`border px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${getBadgeColor(status)}`}
          >
            {status}
          </span>
        </div>

        <FinStarRating stars={stars} starClassName="h-3.5 w-3.5" />
      </div>

      <p className="text-xs font-sans text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
});

export const OverviewTab: React.FC<OverviewTabProps> = ({
  profile,
  ratios,
  quote,
  shareholding,
  isShareholdingPending,
}) => {
  const quoteData = asStockQuote(quote);
  const shareholdingData = asShareholding(shareholding);

  const hasRatios = !!ratios && ratios.pe !== '—';
  const peNum = hasRatios ? parseFloat(ratios.pe) : 0;
  const roeNum = hasRatios ? parseFloat(ratios.roe.replace('%', '')) : 0;
  const deNum = hasRatios ? parseFloat(ratios.debt_equity) : 0;

  const getValuationStars = (pe: number): number => {
    if (pe === 0) return 0;
    if (pe < 15) return 4;
    if (pe < 30) return 3;
    return 1;
  };
  const getValuationStatus = (pe: number): FinStarStatus => {
    if (pe === 0) return '—';
    if (pe < 15) return 'Attractive';
    if (pe < 30) return 'Fair';
    return 'Expensive';
  };

  const getEfficiencyStars = (roe: number): number => {
    if (roe === 0) return 0;
    if (roe > 15) return 4;
    return 2;
  };

  const getFinancialsStars = (de: number): number => {
    if (de === 0) return 0;
    if (de < 1.0) return 4;
    if (de < 2.0) return 3;
    return 1;
  };

  const peLabel = ratios?.pe ?? '—';
  const roeLabel = ratios?.roe ?? '—';
  const debtEquityLabel = ratios?.debt_equity ?? '—';

  const valuationStars = getValuationStars(peNum);
  const efficiencyStars = getEfficiencyStars(roeNum);
  const financialsStars = getFinancialsStars(deNum);

  const overallStars = hasRatios
    ? Math.round((valuationStars + efficiencyStars + financialsStars) / 3)
    : 0;

  const fundamentals: FundamentalStat[] = [
    {
      label: 'MARKET CAP',
      value: ratios?.market_cap
        ? formatMarketCap(ratios.market_cap, profile.exchange)
        : '—',
    },
    {
      label: 'ENTERPRISE VALUE',
      value: ratios?.enterprise_value
        ? formatMarketCap(ratios.enterprise_value, profile.exchange)
        : '—',
    },
    {
      label: 'NO. OF SHARES',
      value: ratios?.shares_outstanding
        ? formatShares(ratios.shares_outstanding, profile.exchange, profile.symbol)
        : '—',
    },
    { label: 'P/E RATIO', value: ratios?.pe || '—' },
    { label: 'P/B RATIO', value: ratios?.pb || '—' },
    { label: 'DIV. YIELD', value: ratios?.dividend_yield || '—' },
    {
      label: 'BOOK VALUE',
      value: ratios?.book_value ? formatPrice(ratios.book_value, profile.exchange) : '—',
    },
    {
      label: 'TOTAL CASH',
      value: ratios?.total_cash ? formatMarketCap(ratios.total_cash, profile.exchange) : '—',
    },
    {
      label: 'TOTAL DEBT',
      value: ratios?.total_debt ? formatMarketCap(ratios.total_debt, profile.exchange) : '—',
    },
    { label: 'EPS (TTM)', value: ratios?.eps || '—' },
    { label: 'SALES GROWTH', value: ratios?.sales_growth || '—' },
    { label: 'ROE', value: ratios?.roe || '—' },
    { label: 'ROCE', value: ratios?.roce || '—' },
    { label: 'PROFIT GROWTH', value: ratios?.profit_growth || '—' },
  ];

  const ratingCards: FinStarRatingCard[] = [
    {
      tag: 'Ownership',
      status: '—',
      stars: 0,
      description: 'Institutional & insider ownership tracking.',
    },
    {
      tag: 'Valuation',
      status: getValuationStatus(peNum),
      stars: valuationStars,
      description:
        peNum > 0
          ? `P/E ratio is ${peLabel} vs sector median of ~24.`
          : 'Valuation details unavailable.',
    },
    {
      tag: 'Efficiency',
      status: roeNum > 15 ? 'Strong' : roeNum > 0 ? 'Average' : '—',
      stars: efficiencyStars,
      description:
        roeNum > 0
          ? `ROE represents efficiency at ${roeLabel}.`
          : 'Efficiency details unavailable.',
    },
    {
      tag: 'Financials',
      status: deNum < 1.5 ? 'Good' : deNum > 0 ? 'Poor' : '—',
      stars: financialsStars,
      description:
        deNum > 0
          ? `Debt/Equity leverage represents ${debtEquityLabel}.`
          : 'Financial leverage details unavailable.',
    },
  ];

  return (
    <div id="overview" className="space-y-6 scroll-mt-20 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                Today's High
              </span>
              <span className="font-mono font-bold text-slate-100 text-base mt-1 block tabular-nums">
                {quoteData?.high ? formatPrice(quoteData.high, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 border-b border-slate-800 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                Today's Low
              </span>
              <span className="font-mono font-bold text-slate-100 text-base mt-1 block tabular-nums">
                {quoteData?.low ? formatPrice(quoteData.low, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 border-r border-slate-800 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                52W High
              </span>
              <span className="font-mono font-bold text-emerald-400 text-base mt-1 block tabular-nums">
                {quoteData?.high_52w ? formatPrice(quoteData.high_52w, profile.exchange) : '—'}
              </span>
            </div>
            <div className="p-4 hover:bg-[#141A26] transition-colors">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                52W Low
              </span>
              <span className="font-mono font-bold text-rose-400 text-base mt-1 block tabular-nums">
                {quoteData?.low_52w ? formatPrice(quoteData.low_52w, profile.exchange) : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#0D111A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Company Fundamental Essentials
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Consolidated figures (TTM)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-slate-800 rounded-xl overflow-hidden bg-[#080B11]">
            {fundamentals.map((stat) => (
              <div
                key={stat.label}
                className="p-3.5 border-r border-b border-slate-800 hover:bg-[#141A26] transition-colors"
              >
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

      <div className="bg-[#0D111A] rounded-2xl p-5 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100 leading-tight">
                FinStar Quantitative Scorecard
              </h2>
              <FinStarRating stars={overallStars} />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Algorithmic scoring factoring valuation multiples, ROE hurdles, and capital structure
              safety.
            </p>
          </div>

          <span className="bg-[#141A26] text-emerald-400 border border-emerald-500/30 rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold tracking-wider inline-flex items-center shrink-0 shadow-sm">
            Composite Score: {overallStars} / 5
          </span>
        </div>

        {hasRatios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {ratingCards.map((card) => (
              <FinStarCategoryCard
                key={card.tag}
                tag={card.tag}
                status={card.status}
                stars={card.stars}
                description={card.description}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Rating data unavailable for this company
          </div>
        )}
      </div>

      <ShareholdingCard
        data={shareholdingData}
        isPending={isShareholdingPending}
        exchange={profile.exchange}
        symbol={profile.symbol}
      />
    </div>
  );
};

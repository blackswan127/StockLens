import React from 'react';
import type { CompanyDetailData, CompanyNews, CompanyProfile } from './types';
import {
  asCompanyNews,
  type CompanyNewsItem,
} from './components/companyTypes.js';

/** Corporate governance rating and score attributes */
export interface CorporateGovernanceScores {
  auditScore?: number | null;
  boardScore?: number | null;
  compensationScore?: number | null;
  shareholderRightsScore?: number | null;
  overallScore?: number | null;
}

/** Executive officer leadership profile */
export interface ExecutiveOfficerProfile {
  name: string;
  title?: string | null;
  age?: number | null;
  since?: string | number | null;
  compensation?: number | null;
}

/** Sector, industry, and classification attributes */
export interface SectorIndustryAttributes {
  sector?: string | null;
  industry?: string | null;
  subIndustry?: string | null;
  industryGroup?: string | null;
  sicCode?: string | null;
  sicDescription?: string | null;
}

/** Comprehensive company profile data */
export interface CompanyProfileData {
  symbol?: string;
  name?: string;
  description?: string | null;
  website?: string | null;
  country?: string | null;
  exchange?: string | null;
  sectorIndustry?: SectorIndustryAttributes | null;
  governanceScores?: CorporateGovernanceScores | null;
  officers?: ExecutiveOfficerProfile[] | null;
}

/** Detail data structure supporting company profile, governance, officers, sector/industry, and financial statements */
export interface InfoTabDetailData extends Partial<CompanyDetailData> {
  profile?: (CompanyProfile & CompanyProfileData) | CompanyProfileData | null;
  governanceScores?: CorporateGovernanceScores | null;
  officers?: ExecutiveOfficerProfile[] | null;
  sectorIndustry?: SectorIndustryAttributes | null;
}

interface InfoTabProps {
  detailData: InfoTabDetailData | CompanyProfileData | CompanyDetailData | null | undefined;
  companyNews: (CompanyNewsItem | CompanyNews)[] | undefined;
  isCompanyNewsPending: boolean;
}

const formatNewsDate = (datetime: number | null | undefined): string => {
  if (datetime === null || datetime === undefined) return '—';
  const date = new Date(datetime * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const NewsBulletinCard = React.memo(function NewsBulletinCard({
  item,
}: {
  item: CompanyNewsItem;
}) {
  const articleUrl = item.url && item.url !== '#' ? item.url : null;
  const pubDate = formatNewsDate(item.datetime);
  const headline = item.headline || 'Untitled bulletin';

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-[#080B11] flex flex-col justify-between hover:border-emerald-500/30 transition">
      <div className="space-y-2">
        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
          {pubDate} · {item.source ?? '—'}
        </span>
        <h4 className="font-bold text-xs text-slate-200 line-clamp-2">
          {articleUrl ? (
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              {headline}
            </a>
          ) : (
            headline
          )}
        </h4>
        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
          {item.summary ?? '—'}
        </p>
      </div>
      {articleUrl ? (
        <a
          href={articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 text-left mt-4 uppercase cursor-pointer"
        >
          Continue Reading →
        </a>
      ) : (
        <span className="text-[10px] font-mono font-bold text-emerald-400 text-left mt-4 uppercase">
          Continue Reading →
        </span>
      )}
    </div>
  );
});

export const InfoTab: React.FC<InfoTabProps> = ({ companyNews, isCompanyNewsPending }) => {
  const newsItems = asCompanyNews(companyNews).slice(0, 4);

  return (
    <div id="info" className="space-y-6 scroll-mt-20 animate-fade-in font-sans">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-3 flex items-center gap-2">
          <span>📰 Corporate Actions & Bulletins Feed</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          {isCompanyNewsPending ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`news-skeleton-${index}`}
                className="p-4 rounded-xl border border-slate-800 bg-[#080B11] space-y-3 animate-pulse"
              >
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded" />
                <div className="h-3 w-5/6 bg-slate-800 rounded" />
                <div className="h-3 w-4/6 bg-slate-800 rounded" />
              </div>
            ))
          ) : newsItems.length > 0 ? (
            newsItems.map((item) => (
              <NewsBulletinCard
                key={item.id ?? `${item.headline ?? 'bulletin'}-${item.datetime ?? 'undated'}`}
                item={item}
              />
            ))
          ) : (
            <div
              className="col-span-full py-8 text-center text-xs text-slate-500 font-mono"
              aria-live="polite"
            >
              No corporate news bulletins available at this time.
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0D111A] border border-slate-800 border-l-4 border-l-emerald-500 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 select-none">
            PRO
          </div>
          <p className="text-xs font-medium text-slate-300 text-center md:text-left">
            Get DuPont Analysis, historic 10-year filings, and 50 premium stock templates on{' '}
            <span className="font-bold text-emerald-400">StockLens PRO & TickerPlus</span>.
          </p>
        </div>
        <div className="relative group">
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-slate-800 text-slate-500 font-mono text-xs font-bold rounded-lg cursor-not-allowed shrink-0 border border-slate-700"
          >
            CLAIM 7-DAY FREE TRIAL
          </button>
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#141A26] border border-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap left-1/2 -translate-x-1/2 font-mono">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};

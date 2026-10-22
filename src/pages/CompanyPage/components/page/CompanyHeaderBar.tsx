import React from 'react';
import { Link } from 'react-router-dom';
import type { CompanyProfile, CompanyQuote } from '../../types';
import { CompanyQuotePanel, type ReportType } from './CompanyQuotePanel.js';

export interface CompanyHeaderBarProps {
  upperSymbol: string;
  profile: CompanyProfile;
  quote: CompanyQuote | undefined;
  isStarred: boolean;
  isStarPending: boolean;
  copied: boolean;
  reportType: ReportType;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onCopyLink: () => void;
  onToggleStar: () => void;
  onReportTypeChange: (type: ReportType) => void;
}

export const CompanyHeaderBar: React.FC<CompanyHeaderBarProps> = ({
  upperSymbol,
  profile,
  quote,
  isStarred,
  isStarPending,
  copied,
  reportType,
  isRefreshing,
  onRefresh,
  onCopyLink,
  onToggleStar,
  onReportTypeChange,
}) => {
  return (
    <>
      {/* Breadcrumbs */}
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        <Link to="/" className="hover:text-emerald-400 transition-colors">
          TERMINAL
        </Link>
        <span>/</span>
        <span className="text-slate-600">EQUITY</span>
        <span>/</span>
        <span className="text-slate-300 font-bold">
          {upperSymbol} ({profile.name})
        </span>
      </div>

      {/* Primary Ticker Summary Box (Company Header Bar) */}
      <div className="rounded-3xl border border-slate-800 bg-[#0D111A]/95 backdrop-blur-xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:border-slate-700">
        <div className="space-y-3">
          <div className="flex items-center gap-3.5 flex-wrap">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt="Logo"
                className="h-11 w-11 object-contain p-1.5 border border-slate-800 rounded-xl bg-slate-900 shadow-sm"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  (event.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-slate-100 tracking-tight">
                  {profile.name}
                </h1>
                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                  {upperSymbol}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-400">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {profile.exchange || 'NYSE/NASDAQ'}
                </span>
                <span className="text-slate-700">•</span>
                <span>
                  Sector:{' '}
                  <span className="font-semibold text-slate-200">
                    {profile.sector || 'Equities'}
                  </span>
                </span>
                {profile.industry && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="max-sm:hidden inline">
                      Industry:{' '}
                      <span className="font-semibold text-slate-300">{profile.industry}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <CompanyQuotePanel
          upperSymbol={upperSymbol}
          exchange={profile.exchange}
          quote={quote}
          isStarred={isStarred}
          isStarPending={isStarPending}
          copied={copied}
          reportType={reportType}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onCopyLink={onCopyLink}
          onToggleStar={onToggleStar}
          onReportTypeChange={onReportTypeChange}
        />
      </div>
    </>
  );
};

import React from 'react';
import { Check, ExternalLink, FileText, Loader2, RefreshCw, Star } from 'lucide-react';
import { formatPrice } from '../../../../utils/formatters.js';
import type { CompanyQuote } from '../../types';

export type ReportType = 'snapshot' | 'full';

interface CompanyQuotePanelProps {
  upperSymbol: string;
  exchange: string;
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

export const CompanyQuotePanel: React.FC<CompanyQuotePanelProps> = ({
  upperSymbol,
  exchange,
  quote,
  isStarred,
  isStarPending,
  copied,
  reportType,
  isRefreshing = false,
  onRefresh,
  onCopyLink,
  onToggleStar,
  onReportTypeChange,
}) => {
  const livePriceVal = quote?.price || 0;
  const liveChangePercent = quote?.changePercent || 0;
  const liveChangeAmount = quote?.change || 0;
  const isUp = liveChangePercent >= 0;

  return (
    <div className="flex items-center gap-4 w-full md:w-auto md:ml-auto md:justify-end flex-wrap">
      <div className="text-right">
        <div className="flex items-baseline justify-end gap-3">
          {!quote ? (
            <>
              <div className="h-10 w-32 bg-slate-800/60 animate-pulse rounded-lg"></div>
              <div className="h-6 w-20 bg-slate-800/60 animate-pulse rounded-lg"></div>
            </>
          ) : (
            <>
              <span className="font-mono font-black text-3xl sm:text-4xl text-slate-100 tracking-tight leading-none tabular-nums">
                {formatPrice(livePriceVal, exchange)}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                  isUp
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}
                {liveChangeAmount.toFixed(2)} ({isUp ? '+' : ''}
                {liveChangePercent.toFixed(2)}%)
              </span>
            </>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-1">
          Feed: Yahoo Live Sync · Updated:{' '}
          {quote?.updated_at
            ? new Date(quote.updated_at).toLocaleTimeString()
            : new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopyLink}
          className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-emerald-400 bg-slate-900/80 hover:bg-slate-800 transition-all hover:scale-105"
          title="Copy Shareable Link"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={onToggleStar}
          disabled={isStarPending}
          className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${
            isStarred
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Watchlist"
        >
          {isStarPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          )}
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-emerald-400 bg-slate-900/80 hover:bg-slate-800 transition-all hover:scale-105"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

        {/* AI Research Report Downloader */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <select
            value={reportType}
            onChange={(event) => onReportTypeChange(event.target.value as ReportType)}
            className="bg-[#080B11] border border-slate-800 text-slate-300 text-xs font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="full">Full Report</option>
            <option value="snapshot">Snapshot</option>
          </select>

          <a
            href={`/api/report/${upperSymbol}?format=pdf&type=${reportType}`}
            download={`${upperSymbol}_Report.pdf`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-all text-xs font-mono font-bold"
            title="Generate PDF Report"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </a>

          <a
            href={`/api/report/${upperSymbol}?format=word&type=${reportType}`}
            download={`${upperSymbol}_Report.docx`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition-all text-xs font-mono font-bold"
            title="Generate Word Report"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Word</span>
          </a>
        </div>
      </div>
    </div>
  );
};

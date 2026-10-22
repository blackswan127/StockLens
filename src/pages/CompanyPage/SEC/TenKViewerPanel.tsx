import React from 'react';
import { FileText, Search } from 'lucide-react';
import type {
  EdgarRiskDiff,
  EdgarSection,
  QuerySection,
  RiskDiffFilter,
  TenKTab,
} from '../types.js';
import { SectionParagraphs } from './SectionParagraphs.js';
import { HighlightedText, isNoiseParagraph, isParagraphHeader } from './secText.js';

const TEN_K_TAB_OPTIONS: ReadonlyArray<{ id: TenKTab; label: string }> = [
  { id: 'business', label: 'Item 1. Business' },
  { id: 'risk', label: 'Item 1A. Risk Factors' },
  { id: 'mda', label: 'Item 7. MD&A Analysis' },
];

const RISK_DIFF_OPTIONS: ReadonlyArray<{ id: RiskDiffFilter; label: string }> = [
  { id: 'all', label: 'All Risks' },
  { id: 'changes', label: 'Changes Only' },
  { id: 'added', label: 'Added Only' },
  { id: 'removed', label: 'Removed Only' },
];

const QUICK_THEMES = ['AI', 'Cloud', 'Tariff', 'Margin', 'Risk', 'Revenue'];

export interface TenKViewerPanelProps {
  tenKTab: TenKTab;
  onTenKTabChange: (tab: TenKTab) => void;
  showRiskDiff: boolean;
  onShowRiskDiffChange: (show: boolean) => void;
  section1: QuerySection<EdgarSection>;
  section1A: QuerySection<EdgarSection>;
  section7: QuerySection<EdgarSection>;
  riskDiff: QuerySection<EdgarRiskDiff>;
}

export type TenKPanelProps = TenKViewerPanelProps;

export const TenKViewerPanel: React.FC<TenKViewerPanelProps> = ({
  tenKTab,
  onTenKTabChange,
  showRiskDiff,
  onShowRiskDiffChange,
  section1,
  section1A,
  section7,
  riskDiff,
}) => {
  const [searchInput, setSearchInput] = React.useState('');
  const [diffFilter, setDiffFilter] = React.useState<RiskDiffFilter>('all');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-[#080B11] rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex bg-[#0D111A] p-0.5 rounded-lg border border-slate-800 max-w-sm gap-0.5">
          {TEN_K_TAB_OPTIONS.map((sectionTab) => (
            <button
              key={sectionTab.id}
              onClick={() => onTenKTabChange(sectionTab.id)}
              className={`px-3 py-1.5 font-mono text-xs font-semibold rounded-md transition-all cursor-pointer ${
                tenKTab === sectionTab.id
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sectionTab.label}
            </button>
          ))}
        </div>

        {tenKTab === 'risk' && (
          <div className="flex items-center gap-2 select-none font-mono">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              YoY Risk Diff:
            </span>
            <button
              type="button"
              aria-label="Toggle year-over-year risk factor diff"
              aria-pressed={showRiskDiff}
              onClick={() => onShowRiskDiffChange(!showRiskDiff)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showRiskDiff ? 'bg-emerald-600' : 'bg-slate-700'
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

      <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-slate-800 pb-3">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search keywords (e.g. AI, cloud, margin, risk, revenue)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[#080B11] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
            Quick Themes:
          </span>
          <div className="flex flex-wrap gap-1">
            {QUICK_THEMES.map((pill) => (
              <button
                key={pill}
                onClick={() => setSearchInput(searchInput === pill ? '' : pill)}
                className={`px-2.5 py-1 text-[10.5px] font-bold font-mono rounded-lg border transition cursor-pointer ${
                  searchInput === pill
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0D111A] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-6 shadow-inner space-y-4">
        {tenKTab === 'business' ? (
          <SectionTabContent
            section={section1}
            search={searchInput}
            loadingMessage="Loading Item 1. Business description…"
            emptyMessage="Item 1. Business disclosure not available."
          />
        ) : tenKTab === 'risk' ? (
          showRiskDiff ? (
            <RiskDiffContent
              riskDiff={riskDiff}
              search={searchInput}
              diffFilter={diffFilter}
              onDiffFilterChange={setDiffFilter}
            />
          ) : (
            <SectionTabContent
              section={section1A}
              search={searchInput}
              loadingMessage="Loading Item 1A. Risk Factors…"
              emptyMessage="Item 1A. Risk Factors not available."
            />
          )
        ) : (
          <SectionTabContent
            section={section7}
            search={searchInput}
            loadingMessage="Loading Item 7. MD&A Analysis…"
            emptyMessage="Item 7. MD&A Analysis not available."
          />
        )}
      </div>
    </div>
  );
};

export const TenKPanel = TenKViewerPanel;

interface SectionTabContentProps {
  section: QuerySection<EdgarSection>;
  search: string;
  loadingMessage: string;
  emptyMessage: string;
}

const SectionTabContent: React.FC<SectionTabContentProps> = ({
  section,
  search,
  loadingMessage,
  emptyMessage,
}) => {
  const { data, isPending } = section;

  if (isPending) {
    return (
      <div className="py-12 text-center text-emerald-400 animate-pulse font-mono text-xs">
        {loadingMessage}
      </div>
    );
  }

  if (!data || !data.paragraphs) {
    return (
      <div className="py-8 text-center text-slate-500 font-mono text-xs">{emptyMessage}</div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h4 className="font-bold text-sm text-slate-100 border-b border-slate-800 pb-2.5 flex items-center gap-2 uppercase tracking-wider font-mono">
        <FileText className="h-4 w-4 text-emerald-400" />
        <span>{data.title}</span>
      </h4>
      <SectionParagraphs paragraphs={data.paragraphs} search={search} />
    </div>
  );
};

interface RiskDiffContentProps {
  riskDiff: QuerySection<EdgarRiskDiff>;
  search: string;
  diffFilter: RiskDiffFilter;
  onDiffFilterChange: (filter: RiskDiffFilter) => void;
}

const RiskDiffContent: React.FC<RiskDiffContentProps> = ({
  riskDiff,
  search,
  diffFilter,
  onDiffFilterChange,
}) => {
  const { data, isPending } = riskDiff;

  if (isPending) {
    return (
      <div className="py-12 text-center text-emerald-400 animate-pulse font-mono text-xs">
        Computing YoY risk factor diff matrix…
      </div>
    );
  }

  if (!data || !data.paragraphs) {
    return (
      <div className="py-8 text-center text-slate-500 font-mono text-xs">
        Risk factor diff not available.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 mb-2">
        <div className="flex bg-[#0D111A] p-0.5 rounded-lg border border-slate-800 max-w-sm gap-0.5 w-full sm:w-auto font-mono">
          {RISK_DIFF_OPTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => onDiffFilterChange(item.id)}
              className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                diffFilter === item.id
                  ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />{' '}
            Added
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/20 border border-rose-500/40 inline-block" />{' '}
            Removed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-slate-800 border border-slate-700 inline-block" />{' '}
            Unchanged
          </span>
        </div>
      </div>

      <div className="space-y-3 font-sans text-[13.5px] leading-relaxed text-slate-300">
        {data.paragraphs
          .filter((p) => !isNoiseParagraph(p.text))
          .filter((p) => {
            if (diffFilter === 'changes')
              return p.status === 'added' || p.status === 'removed';
            if (diffFilter === 'added') return p.status === 'added';
            if (diffFilter === 'removed') return p.status === 'removed';
            return true;
          })
          .map((p) => {
            let styleClass =
              'p-3.5 rounded-xl border border-slate-800 bg-[#0D111A] text-slate-300';
            if (p.status === 'added') {
              styleClass =
                'p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium';
            } else if (p.status === 'removed') {
              styleClass =
                'p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 line-through font-medium';
            }

            return (
              <div key={`${p.status}:${p.text}`} className={styleClass}>
                {p.status === 'added' || p.status === 'removed' ? (
                  <HighlightedText text={p.text} search={search} />
                ) : isParagraphHeader(p.text) ? (
                  <h5 className="font-bold text-slate-100 text-sm font-mono">{p.text}</h5>
                ) : (
                  <HighlightedText text={p.text} search={search} />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

import React from 'react';
import { Chart } from '../../components/Chart.jsx';
import { DCFCalculator } from './DCFCalculator.js';
import { PeerComparisonSection } from './components/PeerComparisonSection.js';
import { GrowthTrendsGrid } from './components/GrowthTrendsGrid.js';
import { CustomRatiosGrid } from './components/CustomRatiosGrid.js';
import { asFinancialStatements, type FinancialStatements } from './components/financialRows.js';
import type { CompanyProfile, CompanyRatios as Ratios, Peer } from './components/companyTypes.js';
import type { CompanyDetailData, CompanyFinancials } from './types.js';

export type PeerComparisonRecord = Peer;
export type ValuationCompanyProfile = CompanyProfile;
export type ValuationRatios = Ratios;
export type AnalysisMetricData = CompanyDetailData;
export type AnalysisFinancialStatements = CompanyFinancials | FinancialStatements;

export interface AnalysisTabProps {
  upperSymbol: string;
  profile: CompanyProfile;
  livePriceVal: number;
  detailData?: CompanyDetailData | null;
  currencySuffixLabel: string;
  mcapSuffixLabel: string;
  isPeersPending: boolean;
  peers: Peer[];
  handlePeerClick: (peerSym: string) => void;
  ratios: Ratios | undefined;
  isNasdaq: boolean;
  financials?: CompanyFinancials | FinancialStatements | null;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  upperSymbol,
  profile,
  livePriceVal,
  currencySuffixLabel,
  mcapSuffixLabel,
  isPeersPending,
  peers,
  handlePeerClick,
  ratios,
  financials,
}) => {
  const statements = React.useMemo(() => asFinancialStatements(financials), [financials]);

  return (
    <div id="analysis" className="space-y-6 scroll-mt-20 animate-fade-in">
      <div id="charts" className="space-y-3">
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-1 shadow-sm flex items-center gap-1 max-w-sm sm:max-w-none w-fit">
          <button
            type="button"
            className="px-4 py-1.5 bg-[#141A26] text-emerald-400 border border-slate-700 font-mono text-xs font-bold rounded-lg transition-all shadow-sm"
          >
            Interactive Price & Technical Chart
          </button>
        </div>

        <Chart symbol={upperSymbol} exchange={profile.exchange} />
      </div>

      <PeerComparisonSection
        upperSymbol={upperSymbol}
        profile={profile}
        livePriceVal={livePriceVal}
        currencySuffixLabel={currencySuffixLabel}
        mcapSuffixLabel={mcapSuffixLabel}
        isPeersPending={isPeersPending}
        peers={peers}
        handlePeerClick={handlePeerClick}
        ratios={ratios}
      />

      <DCFCalculator symbol={upperSymbol} exchange={profile.exchange} profile={profile} />

      <div id="ratios" className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Multi-Period Growth Rates & Solvency Trends
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Historical trajectory analysis</span>
        </div>

        <GrowthTrendsGrid upperSymbol={upperSymbol} ratios={ratios} financials={statements} />

        <CustomRatiosGrid
          upperSymbol={upperSymbol}
          livePriceVal={livePriceVal}
          ratios={ratios}
          financials={statements}
        />
      </div>
    </div>
  );
};

import React from 'react';
import { OverviewTab } from '../../OverviewTab.jsx';
import { AnalysisTab } from '../../AnalysisTab.jsx';
import { InfoTab } from '../../InfoTab.jsx';
import { FinancialsTab } from '../../FinancialsTab.jsx';
import { SECTab } from '../../SECTab.jsx';
import { SECProvider, type SECControls } from '../../SECContext';
import type {
  CompanyDetailData,
  CompanyFinancials,
  CompanyNews,
  CompanyProfile,
  CompanyQuote,
  CompanySecData,
  CompanyShareholding,
  Peer,
  Ratios,
} from '../../types';

interface CompanyPanelsProps {
  upperSymbol: string;
  profile: CompanyProfile;
  ratios: Ratios | undefined;
  quote: CompanyQuote | undefined;
  detailData: CompanyDetailData;
  shareholding: CompanyShareholding | undefined;
  isShareholdingPending: boolean;
  companyNews: CompanyNews[] | undefined;
  isCompanyNewsPending: boolean;
  financials: CompanyFinancials | undefined;
  isFinancialsPending: boolean;
  financialsErr: unknown;
  peers: Peer[] | undefined;
  isPeersPending: boolean;
  livePriceVal: number;
  currencySuffixLabel: string;
  mcapSuffixLabel: string;
  isNasdaq: boolean;
  isUSStock: boolean;
  sec: CompanySecData;
  secControls: SECControls;
  handleScrollToSection: (id: string) => void;
  handlePeerClick: (peerSymbol: string) => void;
}

export const CompanyPanels: React.FC<CompanyPanelsProps> = ({
  upperSymbol,
  profile,
  ratios,
  quote,
  detailData,
  shareholding,
  isShareholdingPending,
  companyNews,
  isCompanyNewsPending,
  financials,
  isFinancialsPending,
  financialsErr,
  peers,
  isPeersPending,
  livePriceVal,
  currencySuffixLabel,
  mcapSuffixLabel,
  isNasdaq,
  isUSStock,
  sec,
  secControls,
  handleScrollToSection,
  handlePeerClick,
}) => {
  return (
    <>
      {/* Render modular tab panels sequentially to match original layout scroll-anchoring */}
      <div role="tabpanel" id="company-panel-overview" aria-labelledby="company-tab-overview">
        <OverviewTab
          detailData={detailData}
          profile={profile}
          ratios={ratios}
          quote={quote}
          handleScrollToSection={handleScrollToSection}
          shareholding={shareholding}
          isShareholdingPending={isShareholdingPending}
        />
      </div>

      <div role="tabpanel" id="company-panel-analysis" aria-labelledby="company-tab-analysis">
        <AnalysisTab
          upperSymbol={upperSymbol}
          profile={profile}
          livePriceVal={livePriceVal}
          detailData={detailData}
          currencySuffixLabel={currencySuffixLabel}
          mcapSuffixLabel={mcapSuffixLabel}
          isPeersPending={isPeersPending}
          peers={peers || []}
          handlePeerClick={handlePeerClick}
          ratios={ratios}
          isNasdaq={isNasdaq}
          financials={financials}
        />
      </div>

      <div role="tabpanel" id="company-panel-info" aria-labelledby="company-tab-info">
        <InfoTab
          detailData={detailData}
          companyNews={companyNews}
          isCompanyNewsPending={isCompanyNewsPending}
        />
      </div>

      <div role="tabpanel" id="company-panel-financials" aria-labelledby="company-tab-financials">
        <FinancialsTab
          symbol={upperSymbol}
          financials={financials}
          isFinancialsPending={isFinancialsPending}
          financialsErr={financialsErr}
          currencySuffixLabel={currencySuffixLabel}
        />
      </div>

      {isUSStock && (
        <SECProvider
          value={{
            upperSymbol,
            peers: peers || [],
            controls: secControls,
            data: sec,
          }}
        >
          <div role="tabpanel" id="company-panel-sec" aria-labelledby="company-tab-sec">
            <SECTab />
          </div>
        </SECProvider>
      )}
    </>
  );
};

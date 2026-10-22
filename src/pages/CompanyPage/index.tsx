import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  TrendingUp,
} from 'lucide-react';
import { useCompanyData } from './hooks/useCompanyData';
import { buildCompanyDetailData } from './detailData';
import { parsePrimaryTab, parseSecSubTab } from './types';
import type { PrimaryTab, SecSubTab } from './types';
import type { SECControls } from './SECContext';
import {
  CompanyConnectionError,
  CompanyNotFoundError,
  CompanySkeletonState,
} from './components/page/CompanyErrorStates.js';
import { CompanyHeaderBar } from './components/page/CompanyHeaderBar.js';
import {
  CompanyTabNav,
  type PrimaryTabDefinition,
} from './components/page/CompanyTabNav.js';
import { CompanyPanels } from './components/page/CompanyPanels.js';
import type { ReportType } from './components/page/CompanyQuotePanel.js';

export const CompanyPage: React.FC = () => {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const upperSymbol = symbol.toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();

  const activePrimaryTab = parsePrimaryTab(searchParams.get('tab'));
  const activeSecSubTab: SecSubTab =
    activePrimaryTab === 'sec' ? parseSecSubTab(searchParams.get('sub')) : 'standardized';

  // Standardized statement comparison states
  const [secComparePeer, setSecComparePeer] = useState<string>('');
  const [activeSecStatement, setActiveSecStatement] = useState<'income' | 'balance' | 'cash'>(
    'income'
  );

  // Holdings CIK or Symbol search states
  const [holdingsSearchInput, setHoldingsSearchInput] = useState<string>('0001067983');
  const [holdingsQuery, setHoldingsQuery] = useState<string>('0001067983');

  // 10-K Section and Diff states
  const [activeTenKTab, setActiveTenKTab] = useState<'business' | 'risk' | 'mda'>('business');
  const [showRiskDiff, setShowRiskDiff] = useState<boolean>(false);

  // Sharing copy link states
  const [copied, setCopied] = useState(false);

  // Report type state
  const [reportType, setReportType] = useState<ReportType>('full');

  const {
    isStarred,
    toggleStar,
    profile,
    isProfilePending,
    profileErr,
    ratios,
    peers,
    isPeersPending,
    quote,
    companyNews,
    isCompanyNewsPending,
    isUSStock,
    financials,
    isFinancialsPending,
    financialsErr,
    shareholding,
    isShareholdingPending,
    sec,
  } = useCompanyData({
    upperSymbol,
    secComparePeer,
    holdingsQuery,
    showRiskDiff,
  });

  const detailData = useMemo(
    () => buildCompanyDetailData({ financials, ratios, profile }),
    [financials, ratios, profile]
  );

  const handleSelectPrimaryTab = (tab: PrimaryTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    nextParams.delete('sub');
    setSearchParams(nextParams);
    handleScrollToSection(tab);
  };

  const handleSelectSecSubTab = (subTab: SecSubTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'sec');
    nextParams.set('sub', subTab);
    setSearchParams(nextParams);
  };

  const handlePeerClick = (peerSym: string) => {
    navigate(`/company/${encodeURIComponent(peerSym.toUpperCase())}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/company/${upperSymbol}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isProfilePending) {
    return <CompanySkeletonState />;
  }

  if (profileErr) {
    return (
      <CompanyConnectionError
        onRetry={() => window.location.reload()}
        onBack={() => navigate('/')}
      />
    );
  }

  if (!profile) {
    return (
      <CompanyNotFoundError
        upperSymbol={upperSymbol}
        onBack={() => navigate('/')}
      />
    );
  }

  const livePriceVal = quote?.price || 0;

  const primaryTabs: PrimaryTabDefinition[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis', label: 'Valuation & DCF', icon: TrendingUp },
    { id: 'info', label: 'Company Info', icon: Building2 },
    { id: 'financials', label: 'Financials', icon: BarChart3 },
    ...(isUSStock ? [{ id: 'sec' as const, label: 'SEC Filings', icon: FileText }] : []),
  ];

  // isNasdaq flag
  const isNasdaq =
    upperSymbol === 'AAPL' ||
    upperSymbol === 'MSFT' ||
    upperSymbol === 'TSLA' ||
    upperSymbol === 'NVDA' ||
    (profile?.exchange || '').toUpperCase().includes('NASDAQ') ||
    (profile?.exchange || '').toUpperCase().includes('NYSE') ||
    (profile?.exchange || '').toUpperCase().includes('US') ||
    (profile?.exchange || '').toUpperCase().includes('OTC') ||
    (!upperSymbol.endsWith('.NS') &&
      !upperSymbol.endsWith('.BO') &&
      (upperSymbol === 'SNDK' ||
        upperSymbol === 'DELL' ||
        upperSymbol === 'WDC' ||
        upperSymbol === 'HPE' ||
        upperSymbol === 'NTAP' ||
        upperSymbol.length <= 5));

  const isIndian =
    upperSymbol.endsWith('.NS') ||
    upperSymbol.endsWith('.BO') ||
    (profile?.exchange || '').toUpperCase().includes('NSE') ||
    (profile?.exchange || '').toUpperCase().includes('BSE') ||
    (profile?.exchange || '').toUpperCase().includes('INDIA');
  const currencySuffixLabel = isIndian ? 'Rs.' : '$';
  const mcapSuffixLabel = isIndian ? 'Cr.' : 'B';

  const secControls: SECControls = {
    subTab: activeSecSubTab,
    setSubTab: handleSelectSecSubTab,
    comparePeer: secComparePeer,
    setComparePeer: setSecComparePeer,
    statement: activeSecStatement,
    setStatement: setActiveSecStatement,
    holdingsQuery,
    setHoldingsQuery,
    holdingsSearchInput,
    setHoldingsSearchInput,
    tenKTab: activeTenKTab,
    setTenKTab: setActiveTenKTab,
    showRiskDiff,
    setShowRiskDiff,
  };

  return (
    <div className="min-h-screen w-full py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
        <CompanyHeaderBar
          upperSymbol={upperSymbol}
          profile={profile}
          quote={quote}
          isStarred={isStarred}
          isStarPending={toggleStar.isPending}
          copied={copied}
          reportType={reportType}
          onCopyLink={handleCopyLink}
          onToggleStar={() => toggleStar.mutate()}
          onRefresh={() => window.location.reload()}
          onReportTypeChange={setReportType}
        />

        <CompanyTabNav
          tabs={primaryTabs}
          activeTab={activePrimaryTab}
          isUSStock={isUSStock}
          onSelect={handleSelectPrimaryTab}
        />

        <CompanyPanels
          upperSymbol={upperSymbol}
          profile={profile}
          ratios={ratios}
          quote={quote}
          detailData={detailData}
          shareholding={shareholding}
          isShareholdingPending={isShareholdingPending}
          companyNews={companyNews}
          isCompanyNewsPending={isCompanyNewsPending}
          financials={financials}
          isFinancialsPending={isFinancialsPending}
          financialsErr={financialsErr}
          peers={peers}
          isPeersPending={isPeersPending}
          livePriceVal={livePriceVal}
          currencySuffixLabel={currencySuffixLabel}
          mcapSuffixLabel={mcapSuffixLabel}
          isNasdaq={isNasdaq}
          isUSStock={isUSStock}
          sec={sec}
          secControls={secControls}
          handleScrollToSection={handleScrollToSection}
          handlePeerClick={handlePeerClick}
        />
      </div>
    </div>
  );
};

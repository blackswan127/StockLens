import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCompanyData } from './hooks/useCompanyData.js';
import { formatPrice, formatMarketCap, formatShares } from '../../utils/formatters.js';
import { 
  Star, ArrowLeft, ExternalLink, Check, Loader2, RefreshCw, 
  SearchX, ShieldAlert, LayoutDashboard, TrendingUp, Building2, FileText
} from 'lucide-react';
import { CompanyPageSkeleton } from '../../components/Skeleton.jsx';

import { OverviewTab } from './OverviewTab.jsx';
import { AnalysisTab } from './AnalysisTab.jsx';
import { InfoTab } from './InfoTab.jsx';
import { SECTab } from './SECTab.jsx';

function formatRealFinancialsToRegistry(financials: any) {
  if (!financials) return { annualPnL: [], balanceSheet: [], cashFlows: [] };

  const annualPnL: any[] = [];
  const balanceSheet: any[] = [];
  const cashFlows: any[] = [];

  if (financials.incomeStatement && financials.incomeStatement.length > 0) {
    const periods = financials.incomeStatement.map((r: any) => String(r.year || '—'));
    const revenues = financials.incomeStatement.map((r: any) => r.revenue !== undefined && r.revenue !== null ? r.revenue.toLocaleString() : '—');
    const grossProfits = financials.incomeStatement.map((r: any) => r.grossProfit !== undefined && r.grossProfit !== null ? r.grossProfit.toLocaleString() : '—');
    const netIncomes = financials.incomeStatement.map((r: any) => r.netIncome !== undefined && r.netIncome !== null ? r.netIncome.toLocaleString() : '—');

    annualPnL.push({ particulars: "Revenue", periods, values: [revenues] });
    annualPnL.push({ particulars: "Gross Profit", periods, values: [grossProfits] });
    annualPnL.push({ particulars: "Net Profit / Net Income", periods, values: [netIncomes] });
  }

  if (financials.balanceSheet && financials.balanceSheet.length > 0) {
    const periods = financials.balanceSheet.map((r: any) => String(r.year || '—'));
    const assets = financials.balanceSheet.map((r: any) => r.assets !== undefined && r.assets !== null ? r.assets.toLocaleString() : '—');
    const liabilities = financials.balanceSheet.map((r: any) => r.liabilities !== undefined && r.liabilities !== null ? r.liabilities.toLocaleString() : '—');
    const equities = financials.balanceSheet.map((r: any) => r.equity !== undefined && r.equity !== null ? r.equity.toLocaleString() : '—');

    balanceSheet.push({ particulars: "Total Assets", periods, values: [assets] });
    balanceSheet.push({ particulars: "Total Liabilities", periods, values: [liabilities] });
    balanceSheet.push({ particulars: "Shareholders' Equity", periods, values: [equities] });
  }

  if (financials.cashFlow && financials.cashFlow.length > 0) {
    const periods = financials.cashFlow.map((r: any) => String(r.year || '—'));
    const opert = financials.cashFlow.map((r: any) => r.operating !== undefined && r.operating !== null ? r.operating.toLocaleString() : '—');
    const invest = financials.cashFlow.map((r: any) => r.investing !== undefined && r.investing !== null ? r.investing.toLocaleString() : '—');
    const financ = financials.cashFlow.map((r: any) => r.financing !== undefined && r.financing !== null ? r.financing.toLocaleString() : '—');

    cashFlows.push({ particulars: "Operating Cash Flow", periods, values: [opert] });
    cashFlows.push({ particulars: "Investing Cash Flow", periods, values: [invest] });
    cashFlows.push({ particulars: "Financing Cash Flow", periods, values: [financ] });

    const fcf = financials.cashFlow.map((r: any) => {
      const opVal = r.operating || 0;
      const invVal = r.investing || 0;
      return (opVal + invVal).toLocaleString();
    });
    cashFlows.push({ particulars: "Free Cash Flow (FCF)", periods, values: [fcf] });
  }

  return { annualPnL, balanceSheet, cashFlows };
}

export const CompanyPage: React.FC = () => {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const upperSymbol = symbol.toUpperCase();

  // Grouped Primary Navigation Mode state
  const [activePrimaryTab, setActivePrimaryTab] = useState<'overview' | 'analysis' | 'info' | 'sec'>('overview');

  // SEC Filings sub-tab state
  const [activeSecSubTab, setActiveSecSubTab] = useState<'standardized' | 'insiders' | 'holdings' | 'tenk' | 'proxy'>('standardized');
  
  // Standardized statement comparison states
  const [secComparePeer, setSecComparePeer] = useState<string>('');
  const [activeSecStatement, setActiveSecStatement] = useState<'income' | 'balance' | 'cash'>('income');

  // Holdings CIK or Symbol search states
  const [holdingsSearchInput, setHoldingsSearchInput] = useState<string>('0001067983');
  const [holdingsQuery, setHoldingsQuery] = useState<string>('0001067983');

  // 10-K Section and Diff states
  const [activeTenKTab, setActiveTenKTab] = useState<'business' | 'risk' | 'mda'>('business');
  const [showRiskDiff, setShowRiskDiff] = useState<boolean>(false);

  // Sharing copy link states
  const [copied, setCopied] = useState(false);
  
  // Report type state
  const [reportType, setReportType] = useState<'snapshot' | 'full'>('full');

  const {
    watchlist,
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
    edgarFinancials,
    isEdgarFinancialsPending,
    isEdgarFinancialsError,
    edgarCompareFinancials,
    edgarInsiders,
    isEdgarInsidersPending,
    isEdgarInsidersError,
    edgarHoldings,
    isEdgarHoldingsPending,
    isEdgarHoldingsError,
    edgarSection1,
    isSection1Pending,
    isSection1Error,
    edgarSection1A,
    isSection1APending,
    isSection1AError,
    edgarSection7,
    isSection7Pending,
    isSection7Error,
    edgarRiskDiff,
    isRiskDiffPending,
    isRiskDiffError,
    edgarProxy,
    isEdgarProxyPending,
    isEdgarProxyError,
    edgarPayVersusPerformance,
    isEdgarPayVersusPerformancePending,
    isEdgarPayVersusPerformanceError,
    shareholding,
    isShareholdingPending
  } = useCompanyData({
    upperSymbol,
    secComparePeer,
    holdingsQuery,
    showRiskDiff,
    activeSecSubTab,
    activePrimaryTab
  });

  const handlePeerClick = (peerSym: string) => {
    navigate(`/company/${encodeURIComponent(peerSym.toUpperCase())}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
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
    return <CompanyPageSkeleton />;
  }

  if (profileErr) {
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-rose-50 border border-rose-155 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-3xs">
          <ShieldAlert className="h-8 w-8 text-[#DC2626]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">API Connection Timeout</h2>
          <p className="font-mono text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Our data provider queries timed out, or client rate limits have been exceeded. Please reload the dashboard shortly to resume.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#059669] font-sans text-xs font-bold text-white rounded-xl hover:bg-[#059669]/90 transition shadow-3xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 animate-spin-hover" />
            <span>Retry Connection</span>
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-700 bg-[#141A26] font-mono text-xs font-bold text-slate-200 hover:bg-slate-800 rounded-xl transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-32 text-center space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-amber-50 border border-amber-155 rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
          <SearchX className="h-8 w-8 text-[#F59E0B]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">Ticker Not Found</h2>
          <p className="font-mono text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            The symbol <span className="font-bold text-[#DC2626] bg-rose-50 px-1.5 py-0.5 rounded">"{upperSymbol}"</span> could not be mapped to any listed corporation in our local indices or international exchange registries.
          </p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#059669] font-sans text-xs font-bold text-white rounded-xl hover:bg-[#059669]/90 transition mx-auto shadow-3xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Search Another Ticker</span>
        </button>
      </div>
    );
  }

  // Live prices and change percent
  const livePriceVal = quote?.price || 0;
  const liveChangePercent = quote?.changePercent || 0;
  const liveChangeAmount = quote?.change || 0;
  const isUp = liveChangePercent >= 0;

  // Fetch fully customized and structured visual data model
  const detailData = {} as any;

  // Format real financials to registry format
  const formattedFin = formatRealFinancialsToRegistry(financials);

  // Extend detailData with real data and clean fallbacks to prevent runtime crashes
  (detailData as any).essentials = {
    marketCapCr: ratios?.market_cap ? formatMarketCap(ratios.market_cap, profile.exchange) : '—',
    enterpriseValue: ratios?.enterprise_value ? formatMarketCap(ratios.enterprise_value, profile.exchange) : '—',
    pe: ratios?.pe || '—',
    pb: ratios?.pb || '—',
    roe: ratios?.roe || '—',
    roce: ratios?.roce || '—',
    epsTTM: ratios?.eps || '—',
    debt: ratios?.total_debt ? formatMarketCap(ratios.total_debt, profile.exchange) : '—',
    cash: ratios?.total_cash ? formatMarketCap(ratios.total_cash, profile.exchange) : '—',
    sharesOutstanding: ratios?.shares_outstanding ? formatShares(ratios.shares_outstanding, profile.exchange, profile.symbol) : '—',
    salesGrowth: ratios?.sales_growth || '—',
    profitGrowth: ratios?.profit_growth || '—',
  };

  (detailData as any).ratiosHistorical = {
    salesGrowth: { yr1: '—', yr3: '—', yr5: '—' },
    profitGrowth: { yr1: '—', yr3: '—', yr5: '—' },
    roe: { yr1: '—', yr3: '—', yr5: '—', history: [] },
    roce: { yr1: '—', yr3: '—', yr5: '—', history: [] },
  };

  (detailData as any).annualPnL = formattedFin.annualPnL;
  (detailData as any).balanceSheet = formattedFin.balanceSheet;
  (detailData as any).cashFlows = formattedFin.cashFlows;

  // isNasdaq flag
  const isNasdaq = upperSymbol === 'AAPL' || upperSymbol === 'MSFT' || upperSymbol === 'TSLA' || upperSymbol === 'NVDA' ||
    (profile?.exchange || '').toUpperCase().includes('NASDAQ') || (profile?.exchange || '').toUpperCase().includes('NYSE') || (profile?.exchange || '').toUpperCase().includes('US') || (profile?.exchange || '').toUpperCase().includes('OTC') ||
    (!upperSymbol.endsWith('.NS') && !upperSymbol.endsWith('.BO') && (upperSymbol === 'SNDK' || upperSymbol === 'DELL' || upperSymbol === 'WDC' || upperSymbol === 'HPE' || upperSymbol === 'NTAP' || upperSymbol.length <= 5));

  const isIndian = upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO') || (profile?.exchange || '').toUpperCase().includes('NSE') || (profile?.exchange || '').toUpperCase().includes('BSE') || (profile?.exchange || '').toUpperCase().includes('INDIA');
  const currencySuffixLabel = isIndian ? 'Rs.' : '$';
  const mcapSuffixLabel = isIndian ? 'Cr.' : 'B';

  return (
    <div className="min-h-screen w-full py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
        
        {/* Breadcrumbs */}
        <div className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Link to="/" className="hover:text-emerald-400 transition-colors">TERMINAL</Link>
          <span>/</span>
          <span className="text-slate-600">EQUITY</span>
          <span>/</span>
          <span className="text-slate-300 font-bold">{upperSymbol} ({profile.name})</span>
        </div>

        {/* Primary Ticker Summary Box (Company Header) */}
        <div className="rounded-3xl border border-slate-800 bg-[#0D111A]/95 backdrop-blur-xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:border-slate-700">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5 flex-wrap">
              {profile.logo ? (
                <img 
                  src={profile.logo} 
                  alt="Logo" 
                  className="h-11 w-11 object-contain p-1.5 border border-slate-800 rounded-xl bg-slate-900 shadow-sm" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
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
                  <span>Sector: <span className="font-semibold text-slate-200">{profile.sector || 'Equities'}</span></span>
                  {profile.industry && (
                    <>
                      <span className="text-slate-700">•</span>
                      <span className="hidden sm:inline">Industry: <span className="font-semibold text-slate-300">{profile.industry}</span></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Currency Quote Panel & Actions */}
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
                      {formatPrice(livePriceVal, profile.exchange)}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                      isUp 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{liveChangeAmount.toFixed(2)} ({isUp ? '+' : ''}{liveChangePercent.toFixed(2)}%)
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                Feed: Yahoo Live Sync · Updated: {quote?.updated_at ? new Date(quote.updated_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
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
                onClick={() => toggleStar.mutate()}
                disabled={toggleStar.isPending}
                className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${
                  isStarred
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Watchlist"
              >
                {toggleStar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                )}
              </button>

              <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

              {/* AI Research Report Downloader */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'snapshot' | 'full')}
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
        </div>

        {/* Primary Tab Navigation Row (Sticky Pill Switcher) */}
        <div className="border border-slate-800 bg-[#0D111A]/95 backdrop-blur-2xl rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-1 z-30">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg shrink-0 select-none flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              INTELLIGENCE HUB
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <span className="font-mono text-xs text-slate-500 uppercase tracking-widest hidden md:inline">SECTIONS:</span>
          </div>

          {/* Mobile Dropdown Menu */}
          <div className="block sm:hidden relative w-full">
            <select
              value={activePrimaryTab}
              onChange={(e) => {
                const tabId = e.target.value as any;
                setActivePrimaryTab(tabId);
                handleScrollToSection(tabId);
              }}
              className="w-full bg-[#080B11] border border-slate-800 rounded-xl py-2 px-3 text-xs font-sans font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="overview">Overview</option>
              <option value="analysis">Valuation & DCF Analysis</option>
              <option value="info">Company Profile</option>
              {isUSStock && <option value="sec">SEC EDGAR Filings</option>}
            </select>
          </div>

          {/* Desktop Segmented Buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-[#080B11] p-1 rounded-xl border border-slate-800">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'analysis', label: 'Valuation & DCF', icon: TrendingUp },
              { id: 'info', label: 'Company Info', icon: Building2 },
              ...(isUSStock ? [{ id: 'sec', label: 'SEC Filings', icon: FileText }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              const ia = activePrimaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActivePrimaryTab(tab.id as any);
                    handleScrollToSection(tab.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all ${
                    ia
                      ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Render modular tab panels sequentially to match original layout scroll-anchoring */}
        <OverviewTab
          detailData={detailData}
          profile={profile}
          ratios={ratios}
          quote={quote}
          handleScrollToSection={handleScrollToSection}
          shareholding={shareholding}
          isShareholdingPending={isShareholdingPending}
        />
        
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

        <InfoTab
          detailData={detailData}
          companyNews={companyNews}
          isCompanyNewsPending={isCompanyNewsPending}
        />

        {isUSStock && (
          <SECTab
            upperSymbol={upperSymbol}
            peers={peers || []}
            activeSecSubTab={activeSecSubTab}
            setActiveSecSubTab={setActiveSecSubTab}
            secComparePeer={secComparePeer}
            setSecComparePeer={setSecComparePeer}
            activeSecStatement={activeSecStatement}
            setActiveSecStatement={setActiveSecStatement}
            holdingsSearchInput={holdingsSearchInput}
            setHoldingsSearchInput={setHoldingsSearchInput}
            holdingsQuery={holdingsQuery}
            setHoldingsQuery={setHoldingsQuery}
            activeTenKTab={activeTenKTab}
            setActiveTenKTab={setActiveTenKTab}
            showRiskDiff={showRiskDiff}
            setShowRiskDiff={setShowRiskDiff}
            
            edgarFinancials={edgarFinancials}
            isEdgarFinancialsPending={isEdgarFinancialsPending}
            isEdgarFinancialsError={isEdgarFinancialsError}
            edgarCompareFinancials={edgarCompareFinancials}
            edgarInsiders={edgarInsiders}
            isEdgarInsidersPending={isEdgarInsidersPending}
            isEdgarInsidersError={isEdgarInsidersError}
            edgarHoldings={edgarHoldings}
            isEdgarHoldingsPending={isEdgarHoldingsPending}
            isEdgarHoldingsError={isEdgarHoldingsError}
            edgarSection1={edgarSection1}
            isSection1Pending={isSection1Pending}
            isSection1Error={isSection1Error}
            edgarSection1A={edgarSection1A}
            isSection1APending={isSection1APending}
            isSection1AError={isSection1AError}
            edgarSection7={edgarSection7}
            isSection7Pending={isSection7Pending}
            isSection7Error={isSection7Error}
            edgarRiskDiff={edgarRiskDiff}
            isRiskDiffPending={isRiskDiffPending}
            isRiskDiffError={isRiskDiffError}
            edgarProxy={edgarProxy}
            isEdgarProxyPending={isEdgarProxyPending}
            isEdgarProxyError={isEdgarProxyError}
            edgarPayVersusPerformance={edgarPayVersusPerformance}
            isEdgarPayVersusPerformancePending={isEdgarPayVersusPerformancePending}
            isEdgarPayVersusPerformanceError={isEdgarPayVersusPerformanceError}
          />
        )}

      </div>
    </div>
  );
};

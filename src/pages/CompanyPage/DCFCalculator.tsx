import React, { useState, useEffect } from 'react';
import { HelpCircle, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Calculator, Sliders, Download, TrendingUp, TrendingDown, Info, Activity } from 'lucide-react';
import { useDCFData } from './hooks/useDCFData.js';
import { computeDCF, computeSensitivityTable, DCFInputs } from '../../utils/dcfCalculator.js';
import { runMonteCarloSimulation } from '../../utils/monteCarlo.js';
import { formatPrice, formatMarketCap, formatPercentChange, formatShares } from '../../utils/formatters.js';
import { ProvenanceTooltip } from './components/DCF/ProvenanceTooltip.js';
import { DCFProjectedCashFlows } from './components/DCF/DCFProjectedCashFlows.js';
import { DCFValuationBridge } from './components/DCF/DCFValuationBridge.js';



interface DCFCalculatorProps {
  symbol: string;
  exchange: string;
  profile: {
    sector?: string;
    industry?: string;
    name?: string;
    country?: string;
  };
}

// 2D grid sensitivity calculation helper for Revenue Growth vs FCF Margin
function computeRevenueMarginSensitivityTable(
  baseInputs: DCFInputs,
  currentPrice: number,
  growthRange: number[],
  marginRange: number[]
): number[][] {
  const table: number[][] = [];
  for (const gVal of growthRange) {
    const row: number[] = [];
    for (const mVal of marginRange) {
      try {
        const result = computeDCF({
          ...baseInputs,
          revenueGrowthRate: gVal,
          fcfMargin: mVal,
          targetFcfMargin: mVal // assume constant margin for the sensitivity table cell
        }, currentPrice);
        row.push(result.fairValuePerShare);
      } catch {
        row.push(NaN);
      }
    }
    table.push(row);
  }
  return table;
}

export const DCFCalculator: React.FC<DCFCalculatorProps> = ({ symbol, exchange, profile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, isError, error } = useDCFData(symbol);

  // Scenario toggle state ('bear' | 'base' | 'bull')
  const [scenario, setScenario] = useState<'bear' | 'base' | 'bull'>('base');
  const [hasAcknowledgedFinancial, setHasAcknowledgedFinancial] = useState(false);

  // Growth & Projections assumptions
  const [revenueGrowth, setRevenueGrowth] = useState<number>(0.08);
  const [fcfMargin, setFcfMargin] = useState<number>(0.15);
  const [targetFcfMargin, setTargetFcfMargin] = useState<number>(0.15);
  const [projectionYears, setProjectionYears] = useState<number>(5);
  const [terminalGrowth, setTerminalGrowth] = useState<number>(0.025);
  const [midYearConvention, setMidYearConvention] = useState<boolean>(false);

  // WACC assumptions
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.0425);
  const [equityRiskPremium, setEquityRiskPremium] = useState<number>(0.055);
  const [beta, setBeta] = useState<number>(1.0);
  const [costOfDebt, setCostOfDebt] = useState<number>(0.05);
  const [taxRate, setTaxRate] = useState<number>(0.21);

  // Financial inputs assumptions
  const [sharesOutstanding, setSharesOutstanding] = useState<number>(0);
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [cashAndEquivalents, setCashAndEquivalents] = useState<number>(0);
  const [latestRevenue, setLatestRevenue] = useState<number>(0);
  const [marketCap, setMarketCap] = useState<number>(0);

  // Active sensitivity grid switcher ('wacc_g' | 'rev_margin')
  const [activeGrid, setActiveGrid] = useState<'wacc_g' | 'rev_margin'>('wacc_g');

  // Base default values derived from data (for scenario resetting)
  const getBaseDefaults = () => {
    if (!data) return null;

    let baseRevCAGR = 0.08;
    const revs = data.historicalRevenue || [];
    if (revs.length >= 2) {
      const oldest = revs[0].value;
      const newest = revs[revs.length - 1].value;
      const n = revs.length - 1;
      if (oldest > 0 && newest > 0) {
        baseRevCAGR = Math.min(Math.max(Math.pow(newest / oldest, 1 / n) - 1, -0.10), 0.30);
      }
    } else if (data.analystGrowthEstimate5yr !== null) {
      baseRevCAGR = data.analystGrowthEstimate5yr;
    }

    let baseFcfMargin = 0.15;
    // Prefer the UNLEVERED (FCFF) series so the derived margin is consistent with
    // WACC discounting and the enterprise-value → equity net-debt bridge. Falls
    // back to the reported levered FCF only if FCFF is unavailable.
    const fcf = (data.historicalFCFF && data.historicalFCFF.length > 0) ? data.historicalFCFF : (data.historicalFCF || []);
    const revsList = data.historicalRevenue || [];
    const margins = [];
    for (const fcfItem of fcf) {
      const matchingRev = revsList.find(r => r.year === fcfItem.year);
      if (matchingRev && matchingRev.value > 0) {
        margins.push(fcfItem.value / matchingRev.value);
      }
    }
    if (margins.length > 0) {
      baseFcfMargin = Math.max(margins.reduce((sum, val) => sum + val, 0) / margins.length, 0);
    }

    let baseDebtCost = (data.riskFreeRate || 0.0425) + 0.015;
    if (data.syntheticCostOfDebt !== undefined && data.syntheticCostOfDebt !== null) {
      baseDebtCost = data.syntheticCostOfDebt;
    } else if (data.totalDebt && data.totalDebt > 0 && data.interestExpense && data.interestExpense > 0) {
      baseDebtCost = Math.abs(data.interestExpense) / data.totalDebt;
    }

    const isIndian = data.currency === 'INR';
    const baseERP = isIndian ? 0.075 : 0.055; // 7.5% country risk ERP for India, 5.5% standard long-run for US

    return {
      revCAGR: baseRevCAGR,
      fcfMargin: baseFcfMargin,
      beta: data.beta || 1.0,
      erp: baseERP,
      debtCost: baseDebtCost
    };
  };

  const applyScenario = (type: 'bear' | 'base' | 'bull') => {
    const defaults = getBaseDefaults();
    if (!defaults) return;

    setScenario(type);

    if (type === 'base') {
      setRevenueGrowth(defaults.revCAGR);
      setFcfMargin(defaults.fcfMargin);
      setTargetFcfMargin(defaults.fcfMargin);
      setBeta(defaults.beta);
      setEquityRiskPremium(defaults.erp);
    } else if (type === 'bear') {
      setRevenueGrowth(defaults.revCAGR * 0.5); // 50% of base revenue growth
      setFcfMargin(Math.max(defaults.fcfMargin - 0.03, 0)); // -300bps margin contraction
      setTargetFcfMargin(Math.max(defaults.fcfMargin - 0.05, 0)); // target FCF margin decays further in bear
      setBeta(defaults.beta + 0.2); // higher volatility/risk
      setEquityRiskPremium(defaults.erp + 0.005); // higher required premium
    } else if (type === 'bull') {
      setRevenueGrowth(Math.min(defaults.revCAGR * 1.5, 0.50)); // 1.5x of base revenue growth, capped at 50%
      setFcfMargin(defaults.fcfMargin + 0.03); // +300bps margin expansion
      setTargetFcfMargin(defaults.fcfMargin + 0.06); // target FCF margin scales up in bull
      setBeta(Math.max(defaults.beta - 0.1, 0.4)); // lower volatility/risk
      setEquityRiskPremium(defaults.erp - 0.005); // lower required premium
    }
  };

  const resetToDefaults = () => {
    if (!data) return;
    setScenario('base');
    const defaults = getBaseDefaults();
    if (!defaults) return;

    const revsList = data.historicalRevenue || [];
    const lastRev = revsList.length > 0 ? revsList[revsList.length - 1].value : 0;

    setRevenueGrowth(defaults.revCAGR);
    setFcfMargin(defaults.fcfMargin);
    setTargetFcfMargin(defaults.fcfMargin);
    setProjectionYears(5);
    setTerminalGrowth(Math.min(data.riskFreeRate || 0.025, 0.03)); // GDP growth proxy capped at 3%
    setRiskFreeRate(data.riskFreeRate || 0.0425);
    setEquityRiskPremium(defaults.erp);
    setBeta(defaults.beta);
    setCostOfDebt(defaults.debtCost);
    setTaxRate(data.taxRate !== null && data.taxRate !== undefined ? data.taxRate : 0.21);
    setSharesOutstanding(data.sharesOutstanding || 0);
    setTotalDebt(data.totalDebt || 0);
    setCashAndEquivalents(data.cashAndEquivalents || 0);
    setLatestRevenue(lastRev);
    setMarketCap(data.marketCap || 0);
  };

  useEffect(() => {
    if (data) {
      resetToDefaults();
    }
  }, [data]);

  // Recalculate DCF Model dynamically
  let dcfResult = null;
  let dcfError = null;

  const isFinancialSector = profile?.sector?.toLowerCase().includes('financial') || 
                            profile?.industry?.toLowerCase().includes('bank') || 
                            profile?.industry?.toLowerCase().includes('insurance');

  if (data) {
    if (sharesOutstanding <= 0) {
      dcfError = 'Shares outstanding must be greater than zero.';
    } else if (latestRevenue < 0) {
      dcfError = 'Latest revenue cannot be negative.';
    } else if (terminalGrowth >= 0.045) {
      dcfError = `Terminal growth rate (${(terminalGrowth * 100).toFixed(1)}%) is excessively high. It cannot exceed long-term GDP growth (~4.5%).`;
    } else if (isFinancialSector && !hasAcknowledgedFinancial) {
      dcfError = 'DCF valuation is blocked for Financial Sector stocks. Please acknowledge the warning below to proceed.';
    } else {
      try {
        dcfResult = computeDCF(
          {
            revenueGrowthRate: revenueGrowth,
            fcfMargin,
            targetFcfMargin,
            projectionYears,
            terminalGrowthRate: terminalGrowth,
            midYearConvention,
            riskFreeRate,
            equityRiskPremium,
            beta,
            costOfDebt,
            taxRate,
            marketCap: marketCap || (sharesOutstanding * data.currentPrice),
            totalDebt,
            latestRevenue,
            cashAndEquivalents,
            sharesOutstanding,
          },
          data.currentPrice
        );
      } catch (err: any) {
        dcfError = err.message || 'Error computing DCF model';
      }
    }
  }

  const monteCarloResult = React.useMemo(() => {
    if (!dcfResult || !latestRevenue || sharesOutstanding <= 0 || !data) return null;
    return runMonteCarloSimulation({
      baseInputs: {
        revenueGrowthRate: revenueGrowth,
        fcfMargin,
        targetFcfMargin,
        projectionYears,
        terminalGrowthRate: terminalGrowth,
        midYearConvention,
        riskFreeRate,
        equityRiskPremium,
        beta,
        costOfDebt,
        taxRate,
        marketCap: marketCap || (sharesOutstanding * data.currentPrice),
        totalDebt,
        latestRevenue,
        cashAndEquivalents,
        sharesOutstanding,
      },
      currentPrice: data.currentPrice,
      baseWacc: dcfResult.wacc,
      revenueGrowthStdDev: Math.abs(revenueGrowth * 0.20) || 0.02, // 20% of base
      targetFcfMarginStdDev: Math.abs(targetFcfMargin * 0.10) || 0.01, // 10% of target margin
      fcfMarginStdDev: Math.abs(fcfMargin * 0.10) || 0.01, // 10% of initial margin
      waccStdDev: dcfResult.wacc * 0.10 || 0.005, // 10% of WACC
      terminalGrowthStdDev: Math.abs(terminalGrowth * 0.20) || 0.0025, // 20% of base
    }, 10000);
  }, [dcfResult, latestRevenue, revenueGrowth, fcfMargin, targetFcfMargin, terminalGrowth, riskFreeRate, equityRiskPremium, beta, costOfDebt, taxRate, marketCap, sharesOutstanding, totalDebt, cashAndEquivalents, projectionYears, midYearConvention, data]);

  // WACC sensitivity ranges (Grid A)
  const waccSteps = dcfResult ? [
    dcfResult.wacc - 0.02,
    dcfResult.wacc - 0.01,
    dcfResult.wacc,
    dcfResult.wacc + 0.01,
    dcfResult.wacc + 0.02
  ] : [];

  const growthSteps = [
    terminalGrowth - 0.01,
    terminalGrowth - 0.005,
    terminalGrowth,
    terminalGrowth + 0.005,
    terminalGrowth + 0.01
  ];

  const sensitivityTable = (dcfResult && data) ? computeSensitivityTable(
    {
      revenueGrowthRate: revenueGrowth,
      fcfMargin,
      targetFcfMargin,
      projectionYears,
      terminalGrowthRate: terminalGrowth,
      midYearConvention,
      riskFreeRate,
      equityRiskPremium,
      beta,
      costOfDebt,
      taxRate,
      marketCap: marketCap || (sharesOutstanding * data.currentPrice),
      totalDebt,
      latestRevenue,
      cashAndEquivalents,
      sharesOutstanding,
    },
    data.currentPrice,
    waccSteps,
    growthSteps
  ) : [];

  // Growth vs Margin sensitivity ranges (Grid B)
  const revGrowthSteps = [
    revenueGrowth - 0.04,
    revenueGrowth - 0.02,
    revenueGrowth,
    revenueGrowth + 0.02,
    revenueGrowth + 0.04
  ];

  const fcfMarginSteps = [
    Math.max(fcfMargin - 0.04, 0),
    Math.max(fcfMargin - 0.02, 0),
    fcfMargin,
    fcfMargin + 0.02,
    fcfMargin + 0.04
  ];
  // Deduplicate in case clamping at 0 causes repeats
  const uniqueMarginSteps = Array.from(new Set(fcfMarginSteps));

  const revMarginSensitivityTable = (dcfResult && data) ? computeRevenueMarginSensitivityTable(
    {
      revenueGrowthRate: revenueGrowth,
      fcfMargin,
      targetFcfMargin,
      projectionYears,
      terminalGrowthRate: terminalGrowth,
      midYearConvention,
      riskFreeRate,
      equityRiskPremium,
      beta,
      costOfDebt,
      taxRate,
      marketCap: marketCap || (sharesOutstanding * data.currentPrice),
      totalDebt,
      latestRevenue,
      cashAndEquivalents,
      sharesOutstanding,
    },
    data.currentPrice,
    revGrowthSteps,
    uniqueMarginSteps
  ) : [];

  // Exporters
  const exportToCSV = () => {
    if (!dcfResult || !data) return;
    
    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `Discounted Cash Flow (DCF) Model Export - ${symbol} (${data.companyName})\r\n`;
    csvContent += `Generated On,${new Date().toLocaleString()}\r\n`;
    csvContent += `Current Stock Price,${data.currentPrice}\r\n`;
    csvContent += `DCF Fair Value per Share,${dcfResult.fairValuePerShare.toFixed(2)}\r\n`;
    csvContent += `Valuation Gap,${dcfResult.upsidePercent.toFixed(2)}%\r\n\r\n`;

    csvContent += `1. Assumptions\r\n`;
    csvContent += `Assumption,Value\r\n`;
    csvContent += `Revenue Growth Rate (Base),${(revenueGrowth * 100).toFixed(2)}%\r\n`;
    csvContent += `FCF Margin (Initial),${(fcfMargin * 100).toFixed(2)}%\r\n`;
    csvContent += `FCF Margin (Target Year N),${(targetFcfMargin * 100).toFixed(2)}%\r\n`;
    csvContent += `Projection Years,${projectionYears}\r\n`;
    csvContent += `Terminal Growth Rate (g),${(terminalGrowth * 100).toFixed(2)}%\r\n`;
    csvContent += `Risk-Free Rate,${(riskFreeRate * 100).toFixed(2)}%\r\n`;
    csvContent += `Equity Risk Premium (ERP),${(equityRiskPremium * 100).toFixed(2)}%\r\n`;
    csvContent += `Beta,${beta.toFixed(2)}\r\n`;
    csvContent += `Cost of Debt (after tax),${(costOfDebt * (1 - taxRate) * 100).toFixed(2)}%\r\n`;
    csvContent += `Effective Tax Rate,${(taxRate * 100).toFixed(2)}%\r\n`;
    csvContent += `Mid-Year Discounting,${midYearConvention ? 'Yes' : 'No'}\r\n`;
    csvContent += `Shares Outstanding,${sharesOutstanding}\r\n`;
    csvContent += `Total Debt,${totalDebt}\r\n`;
    csvContent += `Cash & Equivalents,${cashAndEquivalents}\r\n\r\n`;

    csvContent += `2. Year-by-Year Cash Flow Projections\r\n`;
    csvContent += `Year,Projected Revenue,Revenue Growth,FCF Margin,Free Cash Flow,Discounted FCF\r\n`;
    dcfResult.projectedYears.forEach(y => {
      csvContent += `${y.year},${y.revenue.toFixed(0)},${(y.growthRate * 100).toFixed(2)}%,${(y.fcfMargin * 100).toFixed(2)}%,${y.fcf.toFixed(0)},${y.discountedFcf.toFixed(0)}\r\n`;
    });
    csvContent += `Terminal Value (TV),,,,${dcfResult.terminalValue.toFixed(0)},${dcfResult.pvTerminalValue.toFixed(0)}\r\n\r\n`;

    csvContent += `3. Valuation Valuation Bridge\r\n`;
    csvContent += `Item,Value\r\n`;
    csvContent += `PV of Projected Cash Flows,${dcfResult.pvFcfSum.toFixed(0)}\r\n`;
    csvContent += `PV of Terminal Value,${dcfResult.pvTerminalValue.toFixed(0)}\r\n`;
    csvContent += `Enterprise Value (EV),${dcfResult.enterpriseValue.toFixed(0)}\r\n`;
    csvContent += `Cash & Equivalents (+),${cashAndEquivalents.toFixed(0)}\r\n`;
    csvContent += `Total Debt (-),${totalDebt.toFixed(0)}\r\n`;
    csvContent += `Net Debt,${dcfResult.netDebt.toFixed(0)}\r\n`;
    csvContent += `Equity Value,${dcfResult.equityValue.toFixed(0)}\r\n`;
    csvContent += `Shares Outstanding,${sharesOutstanding}\r\n`;
    csvContent += `Intrinsic Fair Value per Share,${dcfResult.fairValuePerShare.toFixed(2)}\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DCF_Model_${symbol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine warnings
  const isNegativeFCF = data?.historicalFCF && data.historicalFCF.length > 0 && data.historicalFCF.every((f: any) => f.value <= 0);

  // WACC limits alerts
  const isWaccLow = dcfResult && dcfResult.wacc < 0.05;
  const isWaccHigh = dcfResult && dcfResult.wacc > 0.20;

  // Tax rate warnings
  const isTaxRateAtypical = taxRate !== null && (taxRate < 0.10 || taxRate > 0.40);

  // Revenue warnings
  const isRevenueZero = latestRevenue === 0;

  if (isLoading) {
    return (
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl animate-pulse flex items-center justify-center min-h-[100px]">
        <div className="text-slate-400 font-mono text-xs flex items-center gap-2">
          <Activity className="h-4 w-4 animate-spin text-emerald-400" />
          <span>Calibrating intrinsic DCF valuation models...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 shadow-xl flex items-center gap-3 text-rose-300 font-sans text-xs">
        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
        <span>Failed to fetch DCF data: {error?.message || 'Data unavailable.'}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:border-slate-700">
      {/* Header Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#141A26] transition-colors cursor-pointer text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-bold text-slate-100 uppercase tracking-wider">
                Discounted Cash Flow (DCF) Valuation Suite
              </h3>
              <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                CAPM + Damodaran
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-400 mt-0.5">
              Intrinsic valuation, Monte Carlo simulations & 2D sensitivity matrices for {data.companyName || symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.dataConfidence && (
            <div className="hidden sm:flex items-center" title="Cross-validation confidence vs SEC EDGAR filings">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border ${
                data.dataConfidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                data.dataConfidence === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {data.dataConfidence === 'high' ? '● SEC Validated' :
                 data.dataConfidence === 'medium' ? '● SEC Diverged' :
                 '○ Unvalidated'}
              </span>
            </div>
          )}
          {dcfResult && !dcfError && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Fair Value:</span>
              <span className={`font-black text-sm tabular-nums ${dcfResult.upsidePercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
              </span>
            </div>
          )}
          <div className="p-1 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-slate-200">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-slate-800 space-y-6 text-slate-300 font-sans text-sm animate-fade-in bg-[#090D15]/90">
          
          {/* Bear / Base / Bull Scenario Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0D111A] border border-slate-800 p-4 rounded-xl">
            <div>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">Valuation Scenario Presets</span>
              <span className="text-[11px] text-slate-400 font-mono">Select Bear, Base, or Bull to load calibrated projection bounds.</span>
            </div>
            
            <div className="flex bg-[#080B11] p-1 rounded-xl border border-slate-800 shrink-0 gap-1 text-xs font-mono font-semibold">
              {[
                { id: 'bear', label: 'Bear 🐻' },
                { id: 'base', label: 'Base 📊' },
                { id: 'bull', label: 'Bull 🐂' }
              ].map((btn) => (
                <button
                  type="button"
                  key={btn.id}
                  onClick={() => applyScenario(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    scenario === btn.id 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Warning Banners */}
          <div className="space-y-2">
            {isNegativeFCF && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Negative Cash Flow: </span>
                  This company has negative historical free cash flow. Intrinsic calculations may be unreliable or turn negative. Consider custom modeling below.
                </div>
              </div>
            )}

            {isFinancialSector && !hasAcknowledgedFinancial && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2.5 text-xs text-red-900">
                <div className="flex gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Financial sector stock blocked: </span>
                    DCF calculations are fundamentally flawed for financial institutions (banks, insurers) because debt is raw material, not capital. Proceeding will likely yield nonsensical valuations.
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasAcknowledgedFinancial(true);
                  }}
                  className="self-end px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold transition cursor-pointer"
                >
                  I understand, proceed anyway
                </button>
              </div>
            )}

            {isRevenueZero && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Zero Revenue Warning: </span>
                  Latest revenue is set to zero. Projections will result in a $0 fair value. Please enter a valid revenue value below.
                </div>
              </div>
            )}

            {isTaxRateAtypical && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
                <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atypical Tax Rate: </span>
                  Effective tax rate is atypical ({(taxRate * 100).toFixed(1)}%). Standard statutory rates (e.g. 21% for US, 25% for India) are recommended for cost of debt.
                </div>
              </div>
            )}

            {isWaccLow && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atypical WACC (Floor): </span>
                  WACC is exceptionally low ({(dcfResult!.wacc * 100).toFixed(2)}%). This can lead to excessively high/unrealistic valuations.
                </div>
              </div>
            )}

            {isWaccHigh && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atypical WACC (Ceiling): </span>
                  WACC is exceptionally high ({(dcfResult!.wacc * 100).toFixed(2)}%). This heavily discounts future cash flows and may undervalue the business.
                </div>
              </div>
            )}
          </div>

          {/* Result Banner */}
          {dcfError ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-bold">{dcfError}</span>
            </div>
          ) : dcfResult && (
            <div className={`p-5 rounded-xl border flex flex-col gap-5 ${
              dcfResult.upsidePercent > 0 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' 
                : 'bg-red-50/50 border-red-100 text-red-950'
            }`}>
              {/* Key Metrics Row */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DCF Intrinsic Fair Value</span>
                  <span className="text-3xl font-extrabold font-mono tracking-tight leading-none block">
                    {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
                  </span>
                  <span className="text-[11.5px] text-slate-500 block">
                    Based on a 2-Stage projection model ({projectionYears} years) and WACC discount rate of {formatPercentChange(dcfResult.wacc * 100)}.
                  </span>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-center md:text-right border-slate-200/60 md:border-r pr-0 md:pr-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Price</span>
                    <span className="text-lg font-bold font-mono text-slate-700 block">
                      {formatPrice(data.currentPrice, exchange, symbol)}
                    </span>
                  </div>

                  <div className="text-center md:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valuation Gap</span>
                    <span className={`text-xl font-black font-mono block ${
                      dcfResult.upsidePercent > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}>
                      {dcfResult.upsidePercent > 0 ? '▲' : '▼'} {Math.abs(dcfResult.upsidePercent).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block">
                      {dcfResult.upsidePercent > 0 ? 'Undervalued' : 'Overvalued'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Peer Implied Value Overlay */}
              {data.peerMedianPE && data.companyEPS && (
                <div className="w-full border-t border-slate-200/60 pt-4 mt-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Peer-Relative Sanity Check</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-700">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Peer Median P/E:</span>
                      <span className="font-mono font-bold">{data.peerMedianPE.toFixed(1)}x</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200/60"></div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Peer Implied Value:</span>
                      <span className="font-mono font-bold">{formatPrice(data.peerMedianPE * data.companyEPS, exchange, symbol)}</span>
                    </div>
                    {Math.abs((dcfResult.fairValuePerShare - (data.peerMedianPE * data.companyEPS)) / (data.peerMedianPE * data.companyEPS)) > 0.4 && (
                      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="font-semibold">DCF diverges {'>'}40% from peers</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 52-Week Range Price Overlay */}
              {data.low_52w !== null && data.high_52w !== null && (
                <div className="w-full border-t border-slate-200/60 pt-4 mt-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-5">
                    <span>52-Week Range Price Overlay</span>
                    <span className="text-slate-500 font-mono font-normal normal-case">
                      Current is at {Math.max(0, Math.min(100, ((data.currentPrice - data.low_52w) / (data.high_52w - data.low_52w) * 100))).toFixed(0)}% of 52w range
                    </span>
                  </div>
                  
                  <div className="relative h-14 flex items-center px-4">
                    {/* The Range Bar */}
                    <div className="w-full h-1.5 bg-slate-200/60 rounded-full relative">
                      {/* Active range bar */}
                      <div className="absolute inset-0 bg-slate-300/40 rounded-full"></div>
                      
                      {/* DCF Fair Value Marker (Above the bar) */}
                      <div 
                        className="absolute -top-[34px] -translate-x-1/2 flex flex-col items-center z-20"
                        style={{ left: `${Math.max(0, Math.min(100, ((dcfResult.fairValuePerShare - data.low_52w) / (data.high_52w - data.low_52w)) * 100))}%` }}
                      >
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] border whitespace-nowrap ${
                          dcfResult.upsidePercent > 0 
                            ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]' 
                            : 'bg-red-50 border-red-200 text-[#DC2626]'
                        }`}>
                          DCF: {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
                        </span>
                        {/* Triangle Pointer */}
                        <div className={`w-1.5 h-1.5 rotate-45 border-r border-b -mt-1 bg-white ${
                          dcfResult.upsidePercent > 0 ? 'border-emerald-200' : 'border-red-200'
                        }`}></div>
                        {/* Circle indicator on the bar */}
                        <div className={`h-2.5 w-2.5 rounded-full border-2 border-white mt-0.5 shadow-sm ${
                          dcfResult.upsidePercent > 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                        }`}></div>
                      </div>

                      {/* Current Price Marker (Below the bar) */}
                      <div 
                        className="absolute -bottom-[28px] -translate-x-1/2 flex flex-col items-center z-10"
                        style={{ left: `${Math.max(0, Math.min(100, ((data.currentPrice - data.low_52w) / (data.high_52w - data.low_52w)) * 100))}%` }}
                      >
                        {/* Vertical line indicator on the bar */}
                        <div className="h-2.5 w-1 bg-slate-800 rounded-full border border-white -mt-0.5"></div>
                        <span className="text-[10px] font-bold text-slate-700 mt-0.5 whitespace-nowrap">
                          Current: {formatPrice(data.currentPrice, exchange, symbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                    <span>52w Low: {formatPrice(data.low_52w, exchange, symbol)}</span>
                    <span>52w High: {formatPrice(data.high_52w, exchange, symbol)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assumptions Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projections Card */}
            <div className="bg-[#F8F9FB] border border-[#E5E8EF] rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                <Sliders className="h-4.5 w-4.5 text-[#059669]" />
                <h4 className="font-sans font-bold text-[12.5px] text-slate-800 uppercase tracking-wider">
                  Growth & Projections
                </h4>
              </div>

              {/* Revenue Growth */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    Revenue Growth Rate (Stage 1)
                    <span className="text-slate-400 cursor-help" title="High-growth revenue CAGR. Fades linearly to terminal rate in years 6-10 if projection period is > 5 years.">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    Auto: {data.historicalRevenue && data.historicalRevenue.length >= 2 
                      ? ((Math.pow(data.historicalRevenue[data.historicalRevenue.length-1].value / data.historicalRevenue[0].value, 1/(data.historicalRevenue.length-1)) - 1)*100).toFixed(1)
                      : '8.0'}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-0.20"
                    max="0.50"
                    step="0.005"
                    value={revenueGrowth}
                    onChange={(e) => {
                      setRevenueGrowth(parseFloat(e.target.value));
                      setScenario('base');
                    }}
                    className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={revenueGrowth === undefined || isNaN(revenueGrowth) ? '' : Number((revenueGrowth * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setRevenueGrowth(isNaN(val) ? 0 : val / 100);
                      setScenario('base');
                    }}
                    className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-semibold">%</span>
                </div>
              </div>

              {/* FCF Margin (Initial) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    FCF Margin (Initial Year 1)
                    <span className="text-slate-400 cursor-help" title="Unlevered free cash flow (FCFF) margin for Year 1 — auto-seeded from historical FCFF (reported FCF + after-tax interest) so it is consistent with WACC discounting. Linearly transitions to the Target Margin in the final year.">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    Auto: {data.historicalFCF && data.historicalFCF.length > 0 ? 'historical avg' : '15%'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="0.60"
                    step="0.005"
                    value={fcfMargin}
                    onChange={(e) => {
                      setFcfMargin(parseFloat(e.target.value));
                      setScenario('base');
                    }}
                    className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={fcfMargin === undefined || isNaN(fcfMargin) ? '' : Number((fcfMargin * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFcfMargin(isNaN(val) ? 0 : val / 100);
                      setScenario('base');
                    }}
                    className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-semibold">%</span>
                </div>
              </div>

              {/* FCF Margin (Target Year N) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  FCF Margin (Target Year {projectionYears})
                  <span className="text-slate-400 cursor-help" title="Unlevered free cash flow (FCFF) margin reached in the final projection year. Useful for scaling businesses with operating leverage.">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="0.60"
                    step="0.005"
                    value={targetFcfMargin}
                    onChange={(e) => {
                      setTargetFcfMargin(parseFloat(e.target.value));
                      setScenario('base');
                    }}
                    className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={targetFcfMargin === undefined || isNaN(targetFcfMargin) ? '' : Number((targetFcfMargin * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTargetFcfMargin(isNaN(val) ? 0 : val / 100);
                      setScenario('base');
                    }}
                    className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-semibold">%</span>
                </div>
              </div>

              {/* Projection Years */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  Projection Period
                  <span className="text-slate-400 cursor-help" title="Years of high-growth cash flows to project before terminal value.">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={projectionYears}
                    onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                    className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={projectionYears}
                    onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                    className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-semibold w-4">Yrs</span>
                </div>
              </div>

              {/* Terminal Growth */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  Terminal Growth Rate (g)
                  <span className="text-slate-400 cursor-help" title="Long-term growth rate after projection period. Typically proxy for long-run GDP growth (2-3%).">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="0.05"
                    step="0.001"
                    value={terminalGrowth}
                    onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
                    className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={terminalGrowth === undefined || isNaN(terminalGrowth) ? '' : Number((terminalGrowth * 100).toFixed(1))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTerminalGrowth(isNaN(val) ? 0 : val / 100);
                    }}
                    className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-semibold">%</span>
                </div>
              </div>
            </div>

            {/* Discount Rate (WACC) Card */}
            <div className="bg-[#F8F9FB] border border-[#E5E8EF] rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                <Sliders className="h-4.5 w-4.5 text-[#1A6EFF]" />
                <h4 className="font-sans font-bold text-[12.5px] text-slate-800 uppercase tracking-wider">
                  Discount Rate (WACC)
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Risk-Free Rate */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Risk-Free Rate
                    <ProvenanceTooltip provenanceData={data?.provenance?.riskFreeRate} />
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    value={riskFreeRate === undefined || isNaN(riskFreeRate) ? '' : Number((riskFreeRate * 100).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setRiskFreeRate(isNaN(val) ? 0 : val / 100);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                </div>

                {/* Beta */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Beta (Volatility)
                    <ProvenanceTooltip provenanceData={data?.provenance?.beta} />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={beta === undefined || isNaN(beta) ? '' : Number(beta.toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBeta(isNaN(val) ? 1.0 : val);
                      setScenario('base');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                </div>

                {/* Equity Risk Premium */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Equity Risk Premium
                    <span className="text-slate-400 cursor-help" title="Excess return required over risk-free rate for stocks (5.5% US, 7.5% India country risk).">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={equityRiskPremium === undefined || isNaN(equityRiskPremium) ? '' : Number((equityRiskPremium * 100).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEquityRiskPremium(isNaN(val) ? 0 : val / 100);
                      setScenario('base');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                </div>

                {/* Cost of Debt */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Cost of Debt
                    <ProvenanceTooltip provenanceData={data?.provenance?.interestExpense} />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={costOfDebt === undefined || isNaN(costOfDebt) ? '' : Number((costOfDebt * 100).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCostOfDebt(isNaN(val) ? 0 : val / 100);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                </div>

                {/* Tax Rate */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Effective Tax Rate
                    <ProvenanceTooltip provenanceData={data?.provenance?.taxRate} />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRate === undefined || isNaN(taxRate) ? '' : Number((taxRate * 100).toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTaxRate(isNaN(val) ? 0 : val / 100);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
                  />
                </div>

                {/* Calculated WACC */}
                <div className="p-3 bg-white border border-[#E5E8EF] rounded-lg flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Computed WACC</span>
                  <span className="font-mono font-extrabold text-slate-900 text-lg leading-none mt-1">
                    {dcfResult ? `${(dcfResult.wacc * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>

                {/* Mid-Year Convention toggle */}
                <label className="p-3 bg-white border border-[#E5E8EF] rounded-lg flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                    Mid-Year Discounting
                    <span className="text-slate-400 cursor-help" title="Discount cash flows at mid-year (period − 0.5) instead of year-end, assuming cash arrives evenly through the year. Slightly increases fair value and is standard in professional models.">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={midYearConvention}
                    onChange={(e) => setMidYearConvention(e.target.checked)}
                    className="h-4 w-4 accent-[#059669] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Edit Valuation Stats Collapsible Card */}
          <div className="border border-[#E5E8EF] rounded-xl p-4 space-y-4">
            <h4 className="font-sans font-bold text-[11.5px] text-slate-500 uppercase tracking-wider">
              Finances & Share Structure Assumptions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center">
                  Latest Revenue
                  <ProvenanceTooltip provenanceData={{ source: data?.historicalRevenue?.[data.historicalRevenue.length - 1]?.source || 'Yahoo Annual', fallbackApplied: false }} />
                </label>
                <input
                  type="number"
                  min="1"
                  value={latestRevenue || ''}
                  onChange={(e) => setLatestRevenue(Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:bg-white text-slate-700"
                />
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
                  {formatMarketCap(latestRevenue, exchange, symbol)}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center">
                  Total Debt
                  <ProvenanceTooltip provenanceData={data?.provenance?.totalDebt} />
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalDebt || ''}
                  onChange={(e) => setTotalDebt(Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:bg-white text-slate-700"
                />
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
                  {formatMarketCap(totalDebt, exchange, symbol)}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center">
                  Cash & Equivalents
                  <ProvenanceTooltip provenanceData={data?.provenance?.cashAndEquivalents} />
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashAndEquivalents || ''}
                  onChange={(e) => setCashAndEquivalents(Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:bg-white text-slate-700"
                />
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
                  {formatMarketCap(cashAndEquivalents, exchange, symbol)}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center">
                  Shares Outstanding
                  <ProvenanceTooltip provenanceData={data?.provenance?.sharesOutstanding} />
                </label>
                <input
                  type="number"
                  min="1"
                  value={sharesOutstanding || ''}
                  onChange={(e) => setSharesOutstanding(Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:bg-white text-slate-700"
                />
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
                  {formatShares(sharesOutstanding, exchange, symbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Projected Cash Flows Table */}
          {dcfResult && (
            <DCFProjectedCashFlows dcfResult={dcfResult} exchange={exchange} symbol={symbol} />
          )}

          {/* Valuation Bridge */}
          {dcfResult && (
            <DCFValuationBridge 
              dcfResult={dcfResult}
              cashAndEquivalents={cashAndEquivalents}
              totalDebt={totalDebt}
              sharesOutstanding={sharesOutstanding}
              exchange={exchange}
              symbol={symbol}
            />
          )}

          {/* Sensitivity Table section */}
          {dcfResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-sans font-bold text-[12.5px] text-slate-800 uppercase tracking-wider">
                  Valuation Sensitivity Analysis
                </h4>
                
                {/* Switcher tabs */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-[#E5E8EF] gap-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveGrid('wacc_g')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      activeGrid === 'wacc_g' 
                        ? 'bg-[#059669] text-white font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    WACC vs. Terminal Growth
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGrid('rev_margin')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      activeGrid === 'rev_margin' 
                        ? 'bg-[#059669] text-white font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Revenue Growth vs. FCF Margin
                  </button>
                </div>
              </div>

              {activeGrid === 'wacc_g' ? (
                <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
                  <table className="min-w-full divide-y divide-[#E5E8EF] text-xs font-sans bg-white text-center">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E8EF] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 border-r border-[#E5E8EF] text-left text-slate-500 font-bold whitespace-nowrap">
                          WACC \ Terminal Growth
                        </th>
                        {growthSteps.map((g, idx) => (
                          <th key={idx} className="py-2.5 px-4 font-mono font-bold">
                            {formatPercentChange(g * 100)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E8EF] font-mono text-slate-600">
                      {waccSteps.map((wVal, rIdx) => {
                        const isBaseWacc = Math.abs(wVal - dcfResult!.wacc) < 0.0001;
                        return (
                          <tr key={rIdx} className={`${isBaseWacc ? 'bg-[#F0F5FF]/40 font-bold' : 'hover:bg-slate-50/50'} transition`}>
                            <td className="py-2.5 px-4 font-bold border-r border-[#E5E8EF] text-left bg-slate-50/40 text-slate-700">
                              {formatPercentChange(wVal * 100)}
                            </td>
                            {growthSteps.map((gVal, cIdx) => {
                              const val = sensitivityTable[rIdx]?.[cIdx];
                              const isBaseGrowth = Math.abs(gVal - terminalGrowth) < 0.0001;
                              const isCenter = isBaseWacc && isBaseGrowth;
                              
                              return (
                                <td 
                                  key={cIdx} 
                                  className={`py-2.5 px-4 text-center ${
                                    isCenter 
                                      ? 'bg-[#059669]/10 text-[#059669] font-black border border-[#059669]/20' 
                                      : isNaN(val) || val <= 0 
                                        ? 'text-slate-350' 
                                        : 'text-slate-700'
                                  }`}
                                >
                                  {isNaN(val) || val <= 0 ? '—' : formatPrice(val, exchange, symbol)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E5E8EF] rounded-xl">
                  <table className="min-w-full divide-y divide-[#E5E8EF] text-xs font-sans bg-white text-center">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E8EF] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4 border-r border-[#E5E8EF] text-left text-slate-500 font-bold whitespace-nowrap">
                          Revenue Growth \ FCF Margin
                        </th>
                        {uniqueMarginSteps.map((m, idx) => (
                          <th key={idx} className="py-2.5 px-4 font-mono font-bold">
                            {(m * 100).toFixed(1)}%
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E8EF] font-mono text-slate-600">
                      {revGrowthSteps.map((gVal, rIdx) => {
                        const isBaseGrowth = Math.abs(gVal - revenueGrowth) < 0.0001;
                        return (
                          <tr key={rIdx} className={`${isBaseGrowth ? 'bg-[#F0F5FF]/40 font-bold' : 'hover:bg-slate-50/50'} transition`}>
                            <td className="py-2.5 px-4 font-bold border-r border-[#E5E8EF] text-left bg-slate-50/40 text-slate-700">
                              {formatPercentChange(gVal * 100)}
                            </td>
                            {uniqueMarginSteps.map((mVal, cIdx) => {
                              const val = revMarginSensitivityTable[rIdx]?.[cIdx];
                              const isBaseMargin = Math.abs(mVal - fcfMargin) < 0.0001;
                              const isCenter = isBaseGrowth && isBaseMargin;
                              
                              return (
                                <td 
                                  key={cIdx} 
                                  className={`py-2.5 px-4 text-center ${
                                    isCenter 
                                      ? 'bg-[#059669]/10 text-[#059669] font-black border border-[#059669]/20' 
                                      : isNaN(val) || val <= 0 
                                        ? 'text-slate-350' 
                                        : 'text-slate-700'
                                  }`}
                                >
                                  {isNaN(val) || val <= 0 ? '—' : formatPrice(val, exchange, symbol)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Monte Carlo Simulation UI */}
          {monteCarloResult && !dcfError && (
            <div className="bg-white border border-[#E5E8EF] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Activity className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="font-sans font-bold text-[14px] text-slate-800 tracking-wide">
                    Monte Carlo Simulation <span className="text-slate-400 font-normal text-xs ml-1">(10,000 Iterations)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Probability distribution of intrinsic value based on randomized inputs (Normal Distribution).
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-2/3 h-32 flex items-end gap-[1px]">
                  {monteCarloResult.histogram.map((bin, idx) => {
                    const maxCount = Math.max(...monteCarloResult.histogram.map(b => b.count));
                    const heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
                    return (
                      <div 
                        key={idx} 
                        className="flex-1 bg-indigo-500/80 hover:bg-indigo-600 transition-all rounded-t-sm"
                        style={{ height: `${Math.max(2, heightPercent)}%` }}
                        title={`${formatPrice(bin.min, exchange, symbol)} - ${formatPrice(bin.max, exchange, symbol)} (${bin.count} iterations)`}
                      />
                    );
                  })}
                </div>

                <div className="w-full md:w-1/3 space-y-2.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Fair Value Percentiles</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">10th Percentile (Bear)</span>
                    <span className="font-mono font-bold text-red-600">{formatPrice(monteCarloResult.percentiles.p10, exchange, symbol)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-y border-slate-200 py-1.5 my-1.5">
                    <span className="text-slate-800 font-bold">50th Percentile (Median)</span>
                    <span className="font-mono font-bold text-indigo-600 text-sm">{formatPrice(monteCarloResult.percentiles.p50, exchange, symbol)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">90th Percentile (Bull)</span>
                    <span className="font-mono font-bold text-[#059669]">{formatPrice(monteCarloResult.percentiles.p90, exchange, symbol)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-400 font-mono text-[10.5px]">
              Data freshness: {data.dataFreshness ? new Date(data.dataFreshness).toLocaleString() : new Date().toLocaleString()}
            </span>
            
            <div className="flex items-center gap-2">
              {dcfResult && !dcfError && (
                <button
                  onClick={exportToCSV}
                  className="px-3 py-1.5 bg-[#059669]/10 hover:bg-[#059669]/15 border border-[#059669]/15 rounded-lg font-semibold text-[#059669] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export model (CSV)</span>
                </button>
              )}

              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-[#E5E8EF] rounded-lg font-semibold text-slate-600 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import type { DCFData } from './useDCFData.js';
import type { DcfResetDefaults, DcfScenarioDefaults } from '../components/DCF/dcfTypes.js';

export function deriveScenarioDefaults(data: DCFData): DcfScenarioDefaults {
  let baseRevCAGR = 0.08;
  const revs = data.historicalRevenue || [];
  if (revs.length >= 2) {
    const oldest = revs[0].value;
    const newest = revs[revs.length - 1].value;
    const n = revs.length - 1;
    if (oldest > 0 && newest > 0) {
      baseRevCAGR = Math.min(Math.max(Math.pow(newest / oldest, 1 / n) - 1, -0.1), 0.3);
    }
  } else if (data.analystGrowthEstimate5yr !== null && data.analystGrowthEstimate5yr !== undefined) {
    baseRevCAGR = data.analystGrowthEstimate5yr;
  }

  let baseFcfMargin = 0.15;
  const fcf =
    data.historicalFCFF && data.historicalFCFF.length > 0
      ? data.historicalFCFF
      : data.historicalFCF || [];
  const revsList = data.historicalRevenue || [];
  const margins: number[] = [];
  for (const fcfItem of fcf) {
    const matchingRev = revsList.find((r) => r.year === fcfItem.year);
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

  const baseERP = data.currency === 'INR' ? 0.075 : 0.055;

  return {
    revCAGR: baseRevCAGR,
    fcfMargin: baseFcfMargin,
    beta: data.beta || 1.0,
    erp: baseERP,
    debtCost: baseDebtCost,
  };
}

export function deriveResetDefaults(data: DCFData): DcfResetDefaults {
  const defaults = deriveScenarioDefaults(data);
  const revsList = data.historicalRevenue || [];
  const lastRev = revsList.length > 0 ? revsList[revsList.length - 1].value : 0;

  return {
    revenueGrowth: defaults.revCAGR,
    fcfMargin: defaults.fcfMargin,
    targetFcfMargin: defaults.fcfMargin,
    projectionYears: 5,
    terminalGrowth: Math.min(data.riskFreeRate || 0.025, 0.03),
    riskFreeRate: data.riskFreeRate || 0.0425,
    equityRiskPremium: defaults.erp,
    beta: defaults.beta,
    costOfDebt: defaults.debtCost,
    taxRate: data.taxRate !== null && data.taxRate !== undefined ? data.taxRate : 0.21,
    sharesOutstanding: data.sharesOutstanding || 0,
    totalDebt: data.totalDebt || 0,
    cashAndEquivalents: data.cashAndEquivalents || 0,
    latestRevenue: lastRev,
    marketCap: data.marketCap || 0,
  };
}

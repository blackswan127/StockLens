export interface DuPont3Stage {
  netMargin: number;
  assetTurnover: number;
  equityMultiplier: number;
  roe: number;
}

export interface DuPont5Stage {
  taxBurden: number;
  interestBurden: number;
  operatingMargin: number;
  assetTurnover: number;
  equityMultiplier: number;
  roe: number;
}

export interface DuPontAnalysis {
  stage3?: DuPont3Stage | null;
  stage5?: DuPont5Stage | null;
  netMargin: number | null;
  assetTurnover: number | null;
  equityMultiplier: number | null;
  roe?: number | null;
}

export interface ComputedMetrics {
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  dupont: DuPontAnalysis | null;
}

export interface FinancialRawNumber {
  raw?: number | string | null;
  fmt?: string;
  [key: string]: unknown;
}

export type FinancialMetricValue = number | string | FinancialRawNumber | null | undefined;

export interface FinancialDataInput {
  totalRevenue?: FinancialMetricValue;
  grossProfit?: FinancialMetricValue;
  operatingIncome?: FinancialMetricValue;
  netIncomeToNonControllingInterests?: FinancialMetricValue;
  netIncome?: FinancialMetricValue;
  grossMargins?: FinancialMetricValue;
  operatingMargins?: FinancialMetricValue;
  profitMargins?: FinancialMetricValue;
  currentRatio?: FinancialMetricValue;
  debtToEquity?: FinancialMetricValue;
  returnOnEquity?: FinancialMetricValue;
  revenueGrowth?: FinancialMetricValue;
  operatingExpenses?: FinancialMetricValue;
  incomeBeforeTax?: FinancialMetricValue;
  ebt?: FinancialMetricValue;
  incomeTaxExpense?: FinancialMetricValue;
  totalAssets?: FinancialMetricValue;
  totalStockholderEquity?: FinancialMetricValue;
  stockholdersEquity?: FinancialMetricValue;
  totalCurrentAssets?: FinancialMetricValue;
  currentAssets?: FinancialMetricValue;
  totalCurrentLiabilities?: FinancialMetricValue;
  currentLiabilities?: FinancialMetricValue;
  totalDebt?: FinancialMetricValue;
  shortLongTermDebt?: FinancialMetricValue;
  longTermDebt?: FinancialMetricValue;
  [key: string]: unknown;
}

export function computeRatios(
  financials: FinancialDataInput | null | undefined,
  balanceSheet: FinancialDataInput | null | undefined,
  latestFund: FinancialDataInput | null | undefined = {}
): ComputedMetrics {
  const getVal = (obj: FinancialDataInput | null | undefined, key: string): number | null => {
    if (!obj) return null;
    const val = obj[key];
    if (val === undefined || val === null) return null;
    if (typeof val === 'object' && val !== null && 'raw' in val) {
      const raw = (val as FinancialRawNumber).raw;
      if (typeof raw === 'number') return isNaN(raw) ? null : raw;
      if (typeof raw === 'string' && !isNaN(Number(raw))) return Number(raw);
      return null;
    }
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    return null;
  };

  const totalRevenue = getVal(financials, 'totalRevenue') || getVal(latestFund, 'totalRevenue');
  const grossProfit = getVal(financials, 'grossProfit') || getVal(latestFund, 'grossProfit');
  const operatingIncome = getVal(financials, 'operatingIncome') || getVal(latestFund, 'operatingIncome');
  const netIncome = getVal(financials, 'netIncomeToNonControllingInterests') || getVal(financials, 'netIncome') || getVal(latestFund, 'netIncome');
  
  const totalAssets = getVal(balanceSheet, 'totalAssets') || getVal(latestFund, 'totalAssets');
  const totalEquity = getVal(balanceSheet, 'totalStockholderEquity') || getVal(balanceSheet, 'stockholdersEquity') || getVal(latestFund, 'stockholdersEquity');
  const currentAssets = getVal(balanceSheet, 'totalCurrentAssets') || getVal(balanceSheet, 'currentAssets') || getVal(latestFund, 'currentAssets');
  const currentLiabilities = getVal(balanceSheet, 'totalCurrentLiabilities') || getVal(balanceSheet, 'currentLiabilities') || getVal(latestFund, 'currentLiabilities');
  
  let totalDebt = getVal(balanceSheet, 'totalDebt') || getVal(latestFund, 'totalDebt');
  if (totalDebt === null || totalDebt === undefined) {
    const shortDebt = getVal(balanceSheet, 'shortLongTermDebt') || 0;
    const longDebt = getVal(balanceSheet, 'longTermDebt') || 0;
    totalDebt = shortDebt + longDebt;
  }

  // Compute margins
  const gmVal = getVal(financials, 'grossMargins');
  const grossMargin = totalRevenue && grossProfit
    ? (grossProfit / totalRevenue) * 100
    : (gmVal !== null ? (gmVal > 1 ? gmVal : gmVal * 100) : null);

  const omVal = getVal(financials, 'operatingMargins');
  const operatingMargin = totalRevenue && operatingIncome
    ? (operatingIncome / totalRevenue) * 100
    : (omVal !== null ? (omVal > 1 ? omVal : omVal * 100) : null);

  const pmVal = getVal(financials, 'profitMargins');
  const netMargin = totalRevenue && netIncome
    ? (netIncome / totalRevenue) * 100
    : (pmVal !== null ? (pmVal > 1 ? pmVal : pmVal * 100) : null);

  // Compute liquidity/solvency
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : (getVal(financials, 'currentRatio') || null);
  const deVal = getVal(financials, 'debtToEquity');
  const debtToEquity = totalDebt !== null && totalEquity
    ? totalDebt / totalEquity
    : (deVal !== null ? (deVal > 10 ? deVal / 100 : deVal) : null);

  // Compute return
  const roeVal = getVal(financials, 'returnOnEquity');
  const returnOnEquity = netIncome && totalEquity
    ? (netIncome / totalEquity) * 100
    : (roeVal !== null ? (roeVal > 1 ? roeVal : roeVal * 100) : null);

  // Compute revenue growth
  let revenueGrowth: number | null = null;
  const rawGrowth = getVal(financials, 'revenueGrowth') ?? getVal(latestFund, 'revenueGrowth');
  if (rawGrowth !== null && rawGrowth !== undefined && !isNaN(Number(rawGrowth))) {
    const numGrowth = Number(rawGrowth);
    revenueGrowth = Math.abs(numGrowth) <= 2 && numGrowth !== 0 ? numGrowth * 100 : numGrowth;
  }

  // ─── DuPont 3-Stage & 5-Stage Analysis ─────────────────────────────────────
  let dupont: DuPontAnalysis | null = null;
  const dRev = totalRevenue;
  const dAssets = totalAssets;
  const dEquity = totalEquity;
  const dNetInc = netIncome;
  const opExp = getVal(financials, 'operatingExpenses');
  const dEbit = operatingIncome || (grossProfit && opExp ? grossProfit - opExp : null);
  
  let dPretax = getVal(financials, 'incomeBeforeTax') || getVal(financials, 'ebt') || getVal(latestFund, 'incomeBeforeTax');
  const taxExp = getVal(financials, 'incomeTaxExpense');
  if (!dPretax && dNetInc && taxExp) {
    dPretax = dNetInc + taxExp;
  }

  if (dRev && dAssets && dEquity && dNetInc && dRev > 0 && dAssets > 0 && dEquity > 0) {
    const nm = dNetInc / dRev;
    const at = dRev / dAssets;
    const em = dAssets / dEquity;
    const roe3 = nm * at * em;

    const stage3: DuPont3Stage = {
      netMargin: nm,
      assetTurnover: at,
      equityMultiplier: em,
      roe: roe3
    };

    let stage5: DuPont5Stage | null = null;
    if (dEbit && dEbit > 0) {
      const opMargin = dEbit / dRev;
      const pretax = dPretax && dPretax > 0 ? dPretax : (dNetInc / 0.79);
      const taxBurden = Math.min(Math.max(dNetInc / pretax, 0.4), 1.2);
      const interestBurden = Math.min(Math.max(pretax / dEbit, 0.4), 1.3);
      const roe5 = taxBurden * interestBurden * opMargin * at * em;

      stage5 = {
        taxBurden,
        interestBurden,
        operatingMargin: opMargin,
        assetTurnover: at,
        equityMultiplier: em,
        roe: roe5
      };
    } else {
      // Fallback stage5 derived from stage3
      stage5 = {
        taxBurden: 0.79,
        interestBurden: 0.95,
        operatingMargin: (operatingMargin ? operatingMargin / 100 : nm * 1.3),
        assetTurnover: at,
        equityMultiplier: em,
        roe: roe3
      };
    }

    dupont = {
      stage3,
      stage5,
      netMargin: nm,
      assetTurnover: at,
      equityMultiplier: em,
      roe: roe3
    };
  }

  return {
    revenueGrowth,
    grossMargin,
    operatingMargin,
    netMargin,
    currentRatio,
    debtToEquity,
    returnOnEquity,
    dupont
  };
}

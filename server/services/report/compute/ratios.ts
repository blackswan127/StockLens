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

export function computeRatios(financials: any, balanceSheet: any, latestFund: any = {}): ComputedMetrics {
  const getVal = (obj: any, key: string) => {
    if (!obj || obj[key] === undefined || obj[key] === null) return null;
    if (typeof obj[key] === 'object' && 'raw' in obj[key]) return obj[key].raw;
    return obj[key];
  };

  const totalRevenue = getVal(financials, 'totalRevenue') || getVal(latestFund, 'totalRevenue');
  const grossProfit = getVal(financials, 'grossProfit') || getVal(latestFund, 'grossProfit');
  const operatingIncome = getVal(financials, 'operatingIncome') || getVal(latestFund, 'operatingIncome');
  const netIncome = getVal(financials, 'netIncomeToNonControllingInterests') || getVal(financials, 'netIncome') || getVal(latestFund, 'netIncome');
  
  const totalAssets = getVal(balanceSheet, 'totalAssets') || getVal(latestFund, 'totalAssets');
  const totalLiabilities = getVal(balanceSheet, 'totalLiab') || getVal(balanceSheet, 'totalLiabilitiesNetMinorityInterest') || getVal(latestFund, 'totalLiabilitiesNetMinorityInterest');
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
  const grossMargin = totalRevenue && grossProfit ? (grossProfit / totalRevenue) * 100 : (getVal(financials, 'grossMargins') !== null ? (getVal(financials, 'grossMargins') > 1 ? getVal(financials, 'grossMargins') : getVal(financials, 'grossMargins') * 100) : null);
  const operatingMargin = totalRevenue && operatingIncome ? (operatingIncome / totalRevenue) * 100 : (getVal(financials, 'operatingMargins') !== null ? (getVal(financials, 'operatingMargins') > 1 ? getVal(financials, 'operatingMargins') : getVal(financials, 'operatingMargins') * 100) : null);
  const netMargin = totalRevenue && netIncome ? (netIncome / totalRevenue) * 100 : (getVal(financials, 'profitMargins') !== null ? (getVal(financials, 'profitMargins') > 1 ? getVal(financials, 'profitMargins') : getVal(financials, 'profitMargins') * 100) : null);

  // Compute liquidity/solvency
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : (getVal(financials, 'currentRatio') || null);
  const debtToEquity = totalDebt !== null && totalEquity ? totalDebt / totalEquity : (getVal(financials, 'debtToEquity') !== null ? (getVal(financials, 'debtToEquity') > 10 ? getVal(financials, 'debtToEquity') / 100 : getVal(financials, 'debtToEquity')) : null);

  // Compute return
  const returnOnEquity = netIncome && totalEquity ? (netIncome / totalEquity) * 100 : (getVal(financials, 'returnOnEquity') !== null ? (getVal(financials, 'returnOnEquity') > 1 ? getVal(financials, 'returnOnEquity') : getVal(financials, 'returnOnEquity') * 100) : null);

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
  const dEbit = operatingIncome || (grossProfit && getVal(financials, 'operatingExpenses') ? grossProfit - getVal(financials, 'operatingExpenses') : null);
  
  let dPretax = getVal(financials, 'incomeBeforeTax') || getVal(financials, 'ebt') || getVal(latestFund, 'incomeBeforeTax');
  if (!dPretax && dNetInc && getVal(financials, 'incomeTaxExpense')) {
    dPretax = dNetInc + getVal(financials, 'incomeTaxExpense');
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


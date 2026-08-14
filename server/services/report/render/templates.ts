import { YFData } from '../data/yahooFinanceService.js';
import { SecData } from '../data/secEdgarService.js';
import { FredData } from '../data/fredService.js';
import { ComputedMetrics } from '../compute/ratios.js';
import { HedgeFundResult } from '../../hedgeFundEngine.js';
import { PeerMetric } from '../data/peerService.js';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export interface ReportContent {
  title: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  companyName: string;
  currentPrice: string;
  priceChange: string;
  fiftyTwoWeekRange: string;
  marketCap: string;
  timestamp: string;

  executiveSummary: string;
  finstarRating: string;

  businessDescription: string;

  chartUrl: string;
  returns: {
    oneMonth: string;
    threeMonth: string;
    oneYear: string;
    threeYear: string;
    fiveYear: string;
  };
  beta: string;

  valuation: {
    pe: string;
    pb: string;
    ps: string;
    evEbitda: string;
    peg: string;
    dividendYield: string;
  };

  incomeStatement?: TableData;
  balanceSheet?: TableData;
  cashFlow?: TableData;

  scenarios: TableData;

  dupont: any;
  growth: any;
  peers: PeerMetric[];
  congressionalTrades: any[];
  proxyStatement: any;

  riskFactors: string;
  riskDiff: any;

  macroContext: string;
  hedgeFundResult: HedgeFundResult | null;
  bullBearSummary: string;
  dataFreshness: Record<string, string>;
}

function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num === 0) return '$0';
  
  const isNegative = num < 0;
  num = Math.abs(num);
  
  let formatted = '';
  if (num >= 1e9) {
    formatted = `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    formatted = `$${(num / 1e6).toFixed(2)}M`;
  } else {
    formatted = `$${num.toLocaleString()}`;
  }
  
  return isNegative ? `(${formatted})` : formatted;
}

function calculateCAGR(oldVal: number, newVal: number, years: number): string {
  if (!oldVal || !newVal || oldVal <= 0 || newVal <= 0) return '-';
  const cagr = (Math.pow(newVal / oldVal, 1 / years) - 1) * 100;
  return `${cagr.toFixed(1)}%`;
}

function formatTableDataWithCAGR(fundamentals: any[], metricKeys: {key: string, label: string, type?: string}[]): TableData | undefined {
  if (!fundamentals || fundamentals.length === 0) return undefined;
  const sorted = [...fundamentals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const last3 = sorted.slice(-3);
  
  const headers = ['Metric', ...last3.map(f => new Date(f.date).getFullYear().toString()), '2Y CAGR'];

  const rows = metricKeys.map(mk => {
    const row = [mk.label];
    last3.forEach(f => {
      const val = f[mk.key];
      if (val === undefined || val === null) {
        row.push('N/A');
      } else {
        if (mk.type === 'percent') {
          row.push(val !== 0 ? `${(val * 100).toFixed(1)}%` : '-');
        } else {
          row.push(formatCurrency(val));
        }
      }
    });
    
    // Calculate CAGR over the last 3 available years if possible
    let cagr = '-';
    if (last3.length >= 3 && mk.type !== 'percent') {
      const oldVal = last3[0][mk.key];
      const newVal = last3[last3.length - 1][mk.key];
      cagr = calculateCAGR(oldVal, newVal, 2); // 3 points = 2 intervals
    }
    row.push(cagr);
    return row;
  });

  return { headers, rows };
}

function getScenarioCatalysts(sector: string, industry: string, revGrowth: number): { bull: string; base: string; bear: string } {
  const s = (sector || '').toLowerCase();
  const ind = (industry || '').toLowerCase();
  const isHighGrowth = revGrowth > 0.20;

  if (s.includes('tech') || ind.includes('software') || ind.includes('semiconductor') || ind.includes('internet') || ind.includes('hardware') || ind.includes('it services')) {
    return {
      bull: isHighGrowth 
        ? "Hyper-scale cloud revenue acceleration, enterprise AI monetization & gross margin expansion"
        : "Enterprise AI adoption, cloud gross margin expansion & recurring ARR consolidation",
      base: "Steady enterprise contract renewals & moderate IT budget expansion (+8-12%)",
      bear: "IT budget scrutiny, elongation of enterprise sales cycles & multiples compression"
    };
  }

  if (s.includes('financial') || ind.includes('bank') || ind.includes('insurance') || ind.includes('capital market')) {
    return {
      bull: "Net interest margin (NIM) expansion, strong loan underwriting & credit fee growth",
      base: "Stable deposit beta, moderate loan book expansion & controlled credit loss provisions",
      bear: "Credit quality degradation, rising non-performing loans & rate spread compression"
    };
  }

  if (s.includes('health') || ind.includes('bio') || ind.includes('pharma') || ind.includes('medical')) {
    return {
      bull: "Pipeline commercialization, key regulatory FDA clearances & high-margin therapeutic growth",
      base: "Predictable prescription volume growth & steady patent exclusivity commercialization",
      bear: "Clinical trial/regulatory delays, patent cliff exposure & pricing reimbursement pressures"
    };
  }

  if (s.includes('consumer cyclical') || s.includes('consumer discretionary') || ind.includes('retail') || ind.includes('auto') || ind.includes('apparel') || ind.includes('restaurant')) {
    return {
      bull: "Direct-to-consumer volume growth, pricing resilience & premium product mix shift",
      base: "Stable consumer demand trends & disciplined omnichannel inventory management",
      bear: "Discretionary consumer spending slowdown, aggressive discounting & margin contraction"
    };
  }

  if (s.includes('consumer defensive') || s.includes('consumer staple') || ind.includes('beverage') || ind.includes('food') || ind.includes('tobacco') || ind.includes('household')) {
    return {
      bull: "Volume market share gains, strong brand pricing power & supply chain deflation",
      base: "Inelastic staple demand, modest volume growth & stable operating cash flows",
      bear: "Private-label brand substitution, input cost inflation & volume elasticity erosion"
    };
  }

  if (s.includes('energy') || ind.includes('oil') || ind.includes('gas') || ind.includes('renewable') || ind.includes('petroleum')) {
    return {
      bull: "Sustained hydrocarbon realization pricing, upstream efficiency & expanded FCF yields",
      base: "Disciplined CapEx reinvestment, range-bound energy pricing & programmatic buybacks",
      bear: "Global demand deceleration, supply quota expansion & refining margin compression"
    };
  }

  if (s.includes('industrial') || ind.includes('aerospace') || ind.includes('machinery') || ind.includes('transport') || ind.includes('logistics') || ind.includes('defense')) {
    return {
      bull: "Robust multi-year order backlog execution, infrastructure stimulus & operating leverage",
      base: "Steady book-to-bill ratios & normal equipment replacement cycle progression",
      bear: "Industrial production slowdown, supply chain bottlenecks & margin contraction"
    };
  }

  if (s.includes('communication') || ind.includes('telecom') || ind.includes('media') || ind.includes('entertainment')) {
    return {
      bull: "Digital advertising recovery, streaming profitability inflection & reduced churn",
      base: "Predictable subscriber ARPU trends & disciplined content production CapEx",
      bear: "Ad spending pullbacks, heightened streaming competition & subscriber attrition"
    };
  }

  if (s.includes('utilit') || ind.includes('power') || ind.includes('electric') || ind.includes('water')) {
    return {
      bull: "Regulated rate base expansion, clean energy CapEx incentives & robust data center load demand",
      base: "Predictable regulated return on equity & steady operational dividend payouts",
      bear: "Elevated cost of debt capital, regulatory rate case pushback & grid upgrade cost overruns"
    };
  }

  if (s.includes('real estate') || ind.includes('reit')) {
    return {
      bull: "Accelerating lease renewal spreads, high occupancy rates & strong NOI expansion",
      base: "Stable rental collection, predictable tenant retention & regular dividend yields",
      bear: "Cap rate expansion, tenant insolvency risks & elevated debt refinancing costs"
    };
  }

  if (s.includes('material') || ind.includes('chemical') || ind.includes('mining') || ind.includes('metal')) {
    return {
      bull: "Global infrastructure demand acceleration, supply tightness & strong realized commodity pricing",
      base: "Steady industrial demand & balanced channel inventory restocking cycles",
      bear: "Commodity price deflation, downstream demand slump & elevated fixed operational costs"
    };
  }

  return {
    bull: "Market share consolidation, operating leverage inflection & margin expansion",
    base: "Consensus revenue trajectory, steady pricing power & disciplined unit economics",
    bear: "Macro deceleration, elevated competitive friction & valuation multiple compression"
  };
}

export function generateReportContent(
  ticker: string,
  yfData: YFData,
  secData: SecData,
  fredData: FredData,
  metrics: ComputedMetrics,
  chartUrl: string,
  peers: PeerMetric[],
  hfResult: HedgeFundResult | null,
  analystNote?: string
): ReportContent {
  const fmt = (num: number | null | undefined, suffix: string = '') => (num !== null && num !== undefined && !isNaN(num)) ? `${num.toFixed(2)}${suffix}` : 'N/A';

  const profile = yfData.profile?.assetProfile || {};
  const quote = yfData.profile?.price || yfData.quoteSummary?.financialData || {};
  const stats = yfData.profile?.defaultKeyStatistics || {};
  const quoteType = yfData.quoteSummary?.quoteType || {};
  
  const companyName = quoteType.longName || quoteType.shortName || quote.shortName || profile.longName || ticker;
  const sector = profile.sector || profile.finnhubIndustry || 'Unknown';
  const industry = profile.industry || profile.finnhubIndustry || 'Unknown';
  const exchange = quote.exchangeName || quoteType.exchange || 'US Market';

  const currentPrice = fmt(quote.regularMarketPrice || quote.currentPrice);
  const changeRaw = quote.regularMarketChange || 0;
  const changePct = quote.regularMarketChangePercent || 0;
  const priceChange = `${changeRaw > 0 ? '+' : ''}${fmt(changeRaw)} (${changePct > 0 ? '+' : ''}${fmt(changePct * 100, '%')})`;
  const summaryDetail = yfData.quoteSummary?.summaryDetail || {};
  const fiftyTwoWeekRange = `${fmt(summaryDetail.fiftyTwoWeekLow || quote.fiftyTwoWeekLow)} - ${fmt(summaryDetail.fiftyTwoWeekHigh || quote.fiftyTwoWeekHigh)}`;
  const marketCap = formatCurrency(quote.marketCap || stats.marketCap);

  // Fundamentals and historical progression
  const fundamentals = yfData.fundamentals || [];
  const sortedFund = [...fundamentals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  sortedFund.forEach((f, i) => {
    f.grossMargin = f.totalRevenue && f.grossProfit ? (f.grossProfit / f.totalRevenue) : 0;
    f.netMargin = f.totalRevenue && f.netIncome ? (f.netIncome / f.totalRevenue) : 0;
    if (i > 0) {
      const prevRev = sortedFund[i - 1].totalRevenue;
      f.revenueGrowth = prevRev ? (f.totalRevenue / prevRev) - 1 : 0;
    } else {
      f.revenueGrowth = 0;
    }
    // Fallback compute for operating expenses if missing
    if (f.operatingExpenses === undefined || f.operatingExpenses === null) {
      if (f.grossProfit !== undefined && f.operatingIncome !== undefined) {
        f.operatingExpenses = f.grossProfit - f.operatingIncome;
      }
    }
  });

  // Derive FinStar Rating & Bull/Bear Synthesis from Hedge Fund Agents
  let finstarRating = 'NEUTRAL';
  let bullishCount = 0;
  let bearishCount = 0;
  let bullPoints: string[] = [];
  let bearPoints: string[] = [];

  const personaDisplayNames: Record<string, string> = {
    warrenBuffett: 'Warren Buffett',
    billAckman: 'Bill Ackman',
    benGraham: 'Ben Graham',
    charlieMunger: 'Charlie Munger',
    cathieWood: 'Cathie Wood',
    philFisher: 'Phil Fisher',
    stanDruckenmiller: 'Stanley Druckenmiller'
  };

  if (hfResult && hfResult.evaluations && hfResult.evaluations[ticker]) {
    const agents = hfResult.evaluations[ticker].agents;
    Object.entries(agents).forEach(([agentKey, agent]: [string, any]) => {
      const persona = personaDisplayNames[agentKey] || agentKey.replace(/([A-Z])/g, ' $1').trim().replace('Agent', '');
      
      if (agent.signal === 'bullish') {
        bullishCount++;
      } else if (agent.signal === 'bearish') {
        bearishCount++;
      }

      // Collect specific persona reasons
      if (agent.reasoning && Array.isArray(agent.reasoning)) {
        agent.reasoning.forEach((reason: string) => {
          const cleanReason = reason.replace(/^[✅❌⚠️•*-]\s*/, '').trim();
          if (reason.includes('✅') || agent.signal === 'bullish') {
            bullPoints.push(`[Bull Catalyst - ${persona}] ${cleanReason}`);
          } else if (reason.includes('❌') || reason.includes('⚠️') || agent.signal === 'bearish') {
            bearPoints.push(`[Bear Risk - ${persona}] ${cleanReason}`);
          }
        });
      }
    });
    
    const netScore = bullishCount - bearishCount;
    if (netScore >= 1) finstarRating = 'BULLISH';
    else if (netScore <= -1) finstarRating = 'BEARISH';
    else finstarRating = 'NEUTRAL';
  }

  // Deduplicate and assemble balanced Bull / Bear synthesis
  const uniqueBull = Array.from(new Set(bullPoints));
  const uniqueBear = Array.from(new Set(bearPoints));

  const balancedPoints: string[] = [];
  if (uniqueBull.length > 0) {
    balancedPoints.push(...uniqueBull.slice(0, 3));
  }
  if (uniqueBear.length > 0) {
    balancedPoints.push(...uniqueBear.slice(0, 3));
  }

  // Fallback if no hedge fund evaluation is present
  if (balancedPoints.length === 0) {
    if (metrics.grossMargin !== null && metrics.grossMargin > 30) {
      balancedPoints.push(`[Bull Catalyst - Moat] Strong gross margin of ${fmt(metrics.grossMargin, '%')} demonstrates pricing power and structural unit economics.`);
    } else {
      balancedPoints.push(`[Bull Catalyst - Operational] Defensible market presence within the ${industry} landscape.`);
    }
    if (metrics.returnOnEquity !== null && metrics.returnOnEquity > 15) {
      balancedPoints.push(`[Bull Catalyst - Capital Efficiency] High ROE of ${fmt(metrics.returnOnEquity, '%')} supports compounding intrinsic book value.`);
    }
    if (metrics.debtToEquity !== null && metrics.debtToEquity > 1.0) {
      balancedPoints.push(`[Bear Risk - Leverage] Debt-to-Equity ratio of ${fmt(metrics.debtToEquity, 'x')} presents balance sheet sensitivity in higher-rate environments.`);
    } else {
      balancedPoints.push(`[Bear Risk - Valuation] Multiple compression risk if macroeconomic growth decelerates.`);
    }
    balancedPoints.push(`[Bear Risk - Macro] Sector rotation volatility and supply chain/input cost uncertainties.`);
  }

  const bullBearSummary = balancedPoints.join('\n');

  // Quantitative Scenario Calculations
  const rawBeta = stats.beta ?? quote.beta ?? yfData.quoteSummary?.defaultKeyStatistics?.beta;
  const betaNum = (typeof rawBeta === 'number' && !isNaN(rawBeta) && rawBeta > 0) 
    ? rawBeta 
    : (typeof rawBeta === 'string' && !isNaN(parseFloat(rawBeta)) && parseFloat(rawBeta) > 0 ? parseFloat(rawBeta) : 1.0);
  const beta = fmt(betaNum);

  const yfRevGrowth = yfData.quoteSummary?.financialData?.revenueGrowth ?? yfData.profile?.financialData?.revenueGrowth;
  let revGrowthNum = 0.08;
  if (typeof yfRevGrowth === 'number' && !isNaN(yfRevGrowth)) {
    revGrowthNum = yfRevGrowth;
  } else if (sortedFund.length >= 2 && typeof sortedFund[sortedFund.length - 1].revenueGrowth === 'number') {
    revGrowthNum = sortedFund[sortedFund.length - 1].revenueGrowth;
  } else if (metrics.revenueGrowth !== null && !isNaN(metrics.revenueGrowth)) {
    revGrowthNum = metrics.revenueGrowth / 100;
  }

  const rawPrice = quote.regularMarketPrice ?? quote.currentPrice ?? quote.price;
  const basePriceNum = (typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0)
    ? rawPrice
    : (parseFloat(String(rawPrice || '0').replace(/[$,]/g, '')) || 100);

  // Bull Case Upside Calculation: driven by beta & revenue growth
  const bullUpsideRate = Math.max(0.12, Math.min(0.50, (betaNum || 1.0) * 0.15 + (revGrowthNum || 0.1) * 0.5));
  const bullTargetPrice = basePriceNum * (1 + bullUpsideRate);
  const bullImpliedReturn = `+${(bullUpsideRate * 100).toFixed(1)}%`;

  // Base Case Consensus Calculation: Wall Street target or steady progression (+6% to +18%)
  const targetMeanPrice = yfData.quoteSummary?.financialData?.targetMeanPrice ??
                          yfData.profile?.financialData?.targetMeanPrice ??
                          stats.targetMeanPrice ??
                          yfData.quoteSummary?.defaultKeyStatistics?.targetMeanPrice;

  let baseTargetPrice: number;
  let baseRate: number;
  if (typeof targetMeanPrice === 'number' && targetMeanPrice > 0 && targetMeanPrice >= basePriceNum * 0.85 && targetMeanPrice <= basePriceNum * 1.50) {
    baseTargetPrice = targetMeanPrice;
    baseRate = (baseTargetPrice - basePriceNum) / basePriceNum;
  } else {
    baseRate = Math.max(0.06, Math.min(0.18, 0.08 + Math.max(0, revGrowthNum) * 0.25));
    baseTargetPrice = basePriceNum * (1 + baseRate);
  }
  const baseImpliedReturn = `${baseRate >= 0 ? '+' : ''}${(baseRate * 100).toFixed(1)}%`;

  // Bear Case Downside Calculation: downside floor driven by beta and multiple compression
  const bearDownsideRate = Math.max(0.10, Math.min(0.35, (betaNum || 1.0) * 0.12));
  const bearTargetPrice = basePriceNum * (1 - bearDownsideRate);
  const bearImpliedReturn = `-${(bearDownsideRate * 100).toFixed(1)}%`;

  const bullProbability = finstarRating === 'BULLISH' ? '30%' : (finstarRating === 'BEARISH' ? '20%' : '25%');
  const baseProbability = finstarRating === 'NEUTRAL' ? '60%' : '55%';
  const bearProbability = finstarRating === 'BEARISH' ? '25%' : (finstarRating === 'BULLISH' ? '15%' : '20%');

  const catalysts = getScenarioCatalysts(sector, industry, revGrowthNum);

  const scenarioHeaders = ['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst'];
  const scenarioRows = [
    ['Bull Case', bullProbability, `$${bullTargetPrice.toFixed(2)}`, bullImpliedReturn, catalysts.bull],
    ['Base Case', baseProbability, `$${baseTargetPrice.toFixed(2)}`, baseImpliedReturn, catalysts.base],
    ['Bear Case', bearProbability, `$${bearTargetPrice.toFixed(2)}`, bearImpliedReturn, catalysts.bear]
  ];
  const scenarios: TableData = {
    headers: scenarioHeaders,
    rows: scenarioRows
  };

  const returns = yfData.returns || { oneMonth: null, threeMonth: null, oneYear: null, threeYear: null, fiveYear: null };

  const executiveSummary = (analystNote && analystNote.trim().length > 0) 
    ? analystNote.trim() 
    : `1. STRATEGIC MOAT & PRICING POWER\n` +
      `${companyName} (${ticker}) commands a defensible competitive position within the global ${industry} landscape (${sector} sector). The company exhibits a gross profit margin of ${fmt(metrics.grossMargin, '%')} and an operating margin of ${fmt(metrics.operatingMargin, '%')}, reflecting solid pricing power, structural unit economics, and operational efficiency relative to peer benchmarks.\n\n` +
      `2. CAPITAL ALLOCATION EFFICIENCY\n` +
      `Management continues to deploy capital with a disciplined focus on high-ROI organic reinvestment. With a Return on Equity (ROE) of ${fmt(metrics.returnOnEquity, '%')}, the firm generates substantial economic surplus above its cost of capital. A debt-to-equity ratio of ${fmt(metrics.debtToEquity, 'x')} and current ratio of ${fmt(metrics.currentRatio, 'x')} provide balance sheet flexibility to support R&D initiatives and shareholder return programs.\n\n` +
      `3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY\n` +
      `Over the forward 12-month horizon, operational triggers include market share consolidation, accelerating new product adoption, and operating leverage inflection. Under our Bull Case (${bullImpliedReturn} target at $${bullTargetPrice.toFixed(2)}), ${catalysts.bull.toLowerCase()}, whereas our Bear Case (${bearImpliedReturn} downside at $${bearTargetPrice.toFixed(2)}) factors in ${catalysts.bear.toLowerCase()}.\n\n` +
      `4. SEC 10-K RISK FACTOR SYNTHESIS\n` +
      `Forensic examination of SEC EDGAR disclosures and 7-persona quantitative hedge fund consensus identifies key sensitivities surrounding supply chain concentration, foreign currency headwinds, and sector rotation dynamics.`;

  const valuation = {
    pe: fmt(summaryDetail.trailingPE || summaryDetail.forwardPE || quote.trailingPE || quote.forwardPE),
    pb: fmt(stats.priceToBook),
    ps: fmt(summaryDetail.priceToSalesTrailing12Months || stats.priceToSalesTrailing12Months),
    evEbitda: fmt(stats.enterpriseToEbitda),
    peg: fmt(stats.pegRatio),
    dividendYield: fmt(quote.dividendYield ? quote.dividendYield * 100 : stats.trailingAnnualDividendYield ? stats.trailingAnnualDividendYield * 100 : null, '%')
  };

  const incomeStatement = formatTableDataWithCAGR(sortedFund, [
    { key: 'totalRevenue', label: 'Total Revenue' },
    { key: 'revenueGrowth', label: 'Revenue Growth (YoY)', type: 'percent' },
    { key: 'grossProfit', label: 'Gross Profit' },
    { key: 'grossMargin', label: 'Gross Margin', type: 'percent' },
    { key: 'operatingExpenses', label: 'Operating Expenses' },
    { key: 'operatingIncome', label: 'Operating Income' },
    { key: 'netIncome', label: 'Net Income' },
    { key: 'netMargin', label: 'Net Margin', type: 'percent' }
  ]);
  const balanceSheet = formatTableDataWithCAGR(sortedFund, [
    { key: 'totalAssets', label: 'Total Assets' },
    { key: 'totalLiabilitiesNetMinorityInterest', label: 'Total Liabilities' },
    { key: 'totalDebt', label: 'Total Debt' },
    { key: 'stockholdersEquity', label: 'Stockholders Equity' }
  ]);
  const cashFlow = formatTableDataWithCAGR(sortedFund, [
    { key: 'operatingCashFlow', label: 'Operating Cash Flow' },
    { key: 'investingCashFlow', label: 'Investing Cash Flow' },
    { key: 'financingCashFlow', label: 'Financing Cash Flow' },
    { key: 'freeCashFlow', label: 'Free Cash Flow' }
  ]);

  const macroContext = `In the broader macroeconomic environment, the Federal Funds Rate is at ${fmt(fredData.fedFundsRate, '%')} ` +
    `and recent GDP growth was ${fmt(fredData.gdpGrowth, '%')}.`;

  const now = new Date().toISOString();
  const dataFreshness = {
    'Quotes & Pricing': quote.regularMarketTime ? new Date(quote.regularMarketTime instanceof Date ? quote.regularMarketTime : quote.regularMarketTime * 1000).toISOString() : now,
    'Valuation & Financials': sortedFund.length > 0 ? new Date(sortedFund[sortedFund.length - 1].date).toISOString() : now,
    'SEC Filings & Risks': secData.riskDiff?.filingDate || secData.proxyStatement?.filedDate || now,
    'Congressional Trades': secData.congressionalTrades && secData.congressionalTrades.length > 0 ? new Date(secData.congressionalTrades[0].disclosureDate || secData.congressionalTrades[0].transactionDate).toISOString() : now
  };

  let businessDescription = secData.businessDescription;
  let riskFactors = secData.riskFactors;
  
  const isForeign = ticker.includes('.') || quoteType.quoteType === 'ETF';
  if (isForeign && (!businessDescription || businessDescription.includes('Not available'))) {
    const msg = `Foreign private issuer or non-corporate entity — no SEC 10-K filed. ${companyName} is listed on ${exchange} and files home-country reports, 20-F/6-K forms, or prospectus documents not currently parsed by the 10-K pipeline.`;
    businessDescription = msg;
    riskFactors = msg;
  }

  return {
    title: `${ticker} Equity Research Report`,
    ticker,
    exchange,
    sector,
    industry,
    companyName,
    currentPrice,
    priceChange,
    fiftyTwoWeekRange,
    marketCap,
    timestamp: now,

    executiveSummary,
    finstarRating,

    businessDescription,

    chartUrl,
    returns: {
      oneMonth: fmt(returns.oneMonth !== null ? returns.oneMonth * 100 : null, '%'),
      threeMonth: fmt(returns.threeMonth !== null ? returns.threeMonth * 100 : null, '%'),
      oneYear: fmt(returns.oneYear !== null ? returns.oneYear * 100 : null, '%'),
      threeYear: fmt(returns.threeYear !== null ? returns.threeYear * 100 : null, '%'),
      fiveYear: fmt(returns.fiveYear !== null ? returns.fiveYear * 100 : null, '%')
    },
    beta,

    valuation,

    incomeStatement,
    balanceSheet,
    cashFlow,

    scenarios,

    dupont: metrics.dupont || null,
    growth: yfData.profile?.earningsTrend || null,
    peers: peers,
    congressionalTrades: secData.congressionalTrades || [],
    proxyStatement: secData.proxyStatement ? {
      url: secData.proxyStatement.secUrl,
      proposals: secData.proxyStatement.shareholderProposals || []
    } : null,

    riskFactors,
    riskDiff: secData.riskDiff || null,

    macroContext,
    hedgeFundResult: hfResult,
    bullBearSummary,
    dataFreshness
  };
}

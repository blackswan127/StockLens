import axios from 'axios';
import CircuitBreaker from 'opossum';
import pLimit from 'p-limit';
import { cacheService, CACHE_TTLS } from './cache.js';

/**
 * Alpha Vantage fallback data provider.
 *
 * This is the SECONDARY market-data source for StockLens. Yahoo Finance
 * (see ./yahoo.ts) remains the primary; every method here is only reached
 * from a Yahoo catch-block, and returns data mapped into the exact same
 * shape the Yahoo service produces so the two are drop-in interchangeable.
 *
 * Alpha Vantage's free tier is heavily rate limited (historically 5 req/min,
 * 25 req/day), so this module is deliberately conservative:
 *   - every response is cached (shared with the Yahoo cache keys where the
 *     shape matches, plus its own av: namespace)
 *   - concurrency is capped at 1 with a minimum spacing between calls
 *   - a circuit breaker trips fast when the upstream is unhealthy
 *   - rate-limit / info envelopes ("Note", "Information") are treated as errors
 */

// --- Alpha Vantage API Upstream Response Interfaces ---

export interface AlphaVantageGlobalQuote {
  '01. symbol'?: string;
  '02. open'?: string;
  '03. high'?: string;
  '04. low'?: string;
  '05. price'?: string;
  '06. volume'?: string;
  '07. latest trading day'?: string;
  '08. previous close'?: string;
  '09. change'?: string;
  '10. change percent'?: string;
}

export interface AlphaVantageQuoteResponse {
  'Global Quote'?: AlphaVantageGlobalQuote;
  [key: string]: unknown;
}

export interface AlphaVantageBar {
  '1. open'?: string;
  '2. high'?: string;
  '3. low'?: string;
  '4. close'?: string;
  '5. volume'?: string;
}

export interface AlphaVantageTimeSeriesResponse {
  [key: string]: Record<string, AlphaVantageBar> | unknown;
}

export interface AlphaVantageOverview {
  Symbol?: string;
  AssetType?: string;
  Name?: string;
  Description?: string;
  Exchange?: string;
  Currency?: string;
  Country?: string;
  Sector?: string;
  Industry?: string;
  Address?: string;
  OfficialSite?: string;
  FiscalYearEnd?: string;
  LatestQuarter?: string;
  MarketCapitalization?: string;
  EBITDA?: string;
  PERatio?: string;
  PEGRatio?: string;
  BookValue?: string;
  DividendPerShare?: string;
  DividendYield?: string;
  EPS?: string;
  RevenuePerShareTTM?: string;
  ProfitMargin?: string;
  OperatingMarginTTM?: string;
  ReturnOnAssetsTTM?: string;
  ReturnOnEquityTTM?: string;
  RevenueTTM?: string;
  GrossProfitTTM?: string;
  DilutedEPSTTM?: string;
  QuarterlyEarningsGrowthYOY?: string;
  QuarterlyRevenueGrowthYOY?: string;
  AnalystTargetPrice?: string;
  TrailingPE?: string;
  ForwardPE?: string;
  PriceToSalesRatioTTM?: string;
  PriceToBookRatio?: string;
  EVToRevenue?: string;
  EVToEBITDA?: string;
  Beta?: string;
  SharesOutstanding?: string;
  [key: string]: unknown;
}

export interface AlphaVantageIncomeReport {
  fiscalDateEnding?: string;
  reportedCurrency?: string;
  grossProfit?: string;
  totalRevenue?: string;
  costOfRevenue?: string;
  costofGoodsAndServicesSold?: string;
  operatingIncome?: string;
  sellingGeneralAndAdministrative?: string;
  researchAndDevelopment?: string;
  operatingExpenses?: string;
  investmentIncomeNet?: string;
  netInterestIncome?: string;
  interestIncome?: string;
  interestExpense?: string;
  nonInterestIncome?: string;
  otherNonOperatingIncome?: string;
  depreciation?: string;
  depreciationAndAmortization?: string;
  incomeBeforeTax?: string;
  incomeTaxExpense?: string;
  interestAndDebtExpense?: string;
  netIncomeFromContinuingOperations?: string;
  comprehensiveIncomeNetOfTax?: string;
  ebit?: string;
  ebitda?: string;
  netIncome?: string;
}

export interface AlphaVantageIncomeResponse {
  symbol?: string;
  annualReports?: AlphaVantageIncomeReport[];
  quarterlyReports?: AlphaVantageIncomeReport[];
  [key: string]: unknown;
}

export interface AlphaVantageBalanceReport {
  fiscalDateEnding?: string;
  reportedCurrency?: string;
  totalAssets?: string;
  totalCurrentAssets?: string;
  cashAndCashEquivalentsAtCarryingValue?: string;
  cashAndShortTermInvestments?: string;
  inventory?: string;
  currentNetReceivables?: string;
  totalNonCurrentAssets?: string;
  propertyPlantEquipment?: string;
  accumulatedDepreciationAmortizationPPE?: string;
  intangibleAssets?: string;
  intangibleAssetsExcludingGoodwill?: string;
  goodwill?: string;
  investments?: string;
  longTermInvestments?: string;
  shortTermInvestments?: string;
  otherCurrentAssets?: string;
  otherNonCurrentAssets?: string;
  totalLiabilities?: string;
  totalCurrentLiabilities?: string;
  currentAccountsPayable?: string;
  deferredRevenue?: string;
  currentDebt?: string;
  shortTermDebt?: string;
  totalNonCurrentLiabilities?: string;
  capitalLeaseObligations?: string;
  longTermDebt?: string;
  currentLongTermDebt?: string;
  longTermDebtNoncurrent?: string;
  shortLongTermDebtTotal?: string;
  otherCurrentLiabilities?: string;
  otherNonCurrentLiabilities?: string;
  totalShareholderEquity?: string;
  treasuryStock?: string;
  retainedEarnings?: string;
  commonStock?: string;
  commonStockSharesOutstanding?: string;
}

export interface AlphaVantageBalanceResponse {
  symbol?: string;
  annualReports?: AlphaVantageBalanceReport[];
  quarterlyReports?: AlphaVantageBalanceReport[];
  [key: string]: unknown;
}

export interface AlphaVantageCashFlowReport {
  fiscalDateEnding?: string;
  reportedCurrency?: string;
  operatingCashflow?: string;
  paymentsForOperatingActivities?: string;
  proceedsFromOperatingActivities?: string;
  changeInOperatingLiabilities?: string;
  changeInOperatingAssets?: string;
  depreciationDepletionAndAmortization?: string;
  capitalExpenditures?: string;
  changeInReceivables?: string;
  changeInInventory?: string;
  profitLoss?: string;
  cashflowFromInvestment?: string;
  cashflowFromFinancing?: string;
  proceedsFromRepaymentsOfShortTermDebt?: string;
  paymentsForRepurchaseOfCommonStock?: string;
  paymentsForRepurchaseOfEquity?: string;
  paymentsForRepurchaseOfPreferredStock?: string;
  dividendPayout?: string;
  dividendPayoutCommonStock?: string;
  dividendPayoutPreferredStock?: string;
  proceedsFromIssuanceOfCommonStock?: string;
  proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet?: string;
  proceedsFromIssuanceOfPreferredStock?: string;
  proceedsFromRepurchaseOfEquity?: string;
  proceedsFromSaleOfTreasuryStock?: string;
  changeInCashAndCashEquivalents?: string;
  changeInExchangeRate?: string;
  netIncome?: string;
}

export interface AlphaVantageCashFlowResponse {
  symbol?: string;
  annualReports?: AlphaVantageCashFlowReport[];
  quarterlyReports?: AlphaVantageCashFlowReport[];
  [key: string]: unknown;
}

export interface AlphaVantageSearchMatch {
  '1. symbol'?: string;
  '2. name'?: string;
  '3. type'?: string;
  '4. region'?: string;
  '5. marketOpen'?: string;
  '6. marketClose'?: string;
  '7. timezone'?: string;
  '8. currency'?: string;
  '9. matchScore'?: string;
}

export interface AlphaVantageSearchResponse {
  bestMatches?: AlphaVantageSearchMatch[];
  [key: string]: unknown;
}

// Alpha Vantage Technical Indicators (SMA, EMA, RSI, MACD, etc.)
export interface AlphaVantageTechnicalIndicatorMeta {
  '1: Symbol'?: string;
  '2: Indicator'?: string;
  '3: Last Refreshed'?: string;
  '4: Interval'?: string;
  '5: Time Zone'?: string;
  [key: string]: string | undefined;
}

export interface AlphaVantageIndicatorDataPoint {
  [indicatorValueKey: string]: string;
}

export interface AlphaVantageIndicatorResponse {
  'Meta Data'?: AlphaVantageTechnicalIndicatorMeta;
  [timeSeriesKey: string]: Record<string, AlphaVantageIndicatorDataPoint> | AlphaVantageTechnicalIndicatorMeta | unknown;
}

// --- StockLens Mapped Output Types ---

export interface AlphaVantageQuoteOutput {
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  high_52w: number | null;
  low_52w: number | null;
  volume: number | null;
  avg_volume: number | null;
  source: string;
}

export interface AlphaVantageCandlesOutput {
  s: 'ok' | 'no_data';
  t?: number[];
  c?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  v?: number[];
  source?: string;
}

export interface AlphaVantageBasicFinancialsOutput {
  metric: {
    peTrailing: number | null;
    peForward: number | null;
    pegRatio: number | null;
    priceToBook: number | null;
    priceToSales: number | null;
    dividendYield: number | null;
    roeTTM: number | null;
    roaTTM: number | null;
    debtEquityAnnual: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    grossMargins: number | null;
    operatingMargins: number | null;
    profitMargins: number | null;
    freeCashflow: number | null;
    totalDebt: number | null;
    marketCapitalization: number | null;
    peAnnual: number | null;
    pbAnnual: number | null;
    roicTTM: number | null;
    epsBasicExclExtraItemsTTM: number | null;
    dividendYieldIndicated: number | null;
    enterpriseValue: number | null;
    evEbitda: number | null;
    sharesOutstanding: number | null;
    bookValue: number | null;
    totalCash: number | null;
    beta: number | null;
  };
  source: string;
}

export interface AlphaVantageProfileOutput {
  name: string;
  logo: string;
  finnhubIndustry: string;
  exchange: string;
  country: string;
  weburl: string;
  ipo: string;
  ceo: string;
  description: string;
  source: string;
}

export interface AlphaVantageFinancialStatementItem {
  endDate?: string;
  totalRevenue: number | null;
  grossProfit: number | null;
  netIncome: number | null;
  operatingIncome: number | null;
  ebit: number | null;
}

export interface AlphaVantageBalanceSheetItem {
  endDate?: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalStockholderEquity: number | null;
}

export interface AlphaVantageCashFlowItem {
  endDate?: string;
  totalCashFromOperatingActivities: number | null;
  capitalExpenditures: number | null;
  totalCashFromFinancingActivities: number | null;
}

export interface AlphaVantageFinancialsOutput {
  incomeStatement: AlphaVantageFinancialStatementItem[];
  incomeStatementQuarterly: AlphaVantageFinancialStatementItem[];
  balanceSheet: AlphaVantageBalanceSheetItem[];
  balanceSheetQuarterly: AlphaVantageBalanceSheetItem[];
  cashFlow: AlphaVantageCashFlowItem[];
  cashFlowQuarterly: AlphaVantageCashFlowItem[];
  ratios: {
    recommendationKey: string;
    targetMeanPrice: number | null;
    profitMargins: number | null;
    operatingMargins: number | null;
    returnOnAssets: number | null;
    returnOnEquity: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    dividendYield: number | null;
    pegRatio: number | null;
    priceToBook: number | null;
    enterpriseToEquity: number | null;
  };
  source: string;
}

export interface AlphaVantageSearchResultItem {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange: string;
}

export interface AlphaVantageSearchOutput {
  result: AlphaVantageSearchResultItem[];
}

const BASE_URL = 'https://www.alphavantage.co/query';

function getApiKey(): string | null {
  const key = process.env.ALPHAVANTAGE_API_KEY || process.env.ALPHA_VANTAGE_API_KEY;
  return key && key.trim() && key !== 'YOUR_ALPHAVANTAGE_API_KEY_HERE' ? key.trim() : null;
}

export function isAlphaVantageConfigured(): boolean {
  return getApiKey() !== null;
}

// Serialize outbound calls and space them out to respect the free-tier budget.
const limit = pLimit(1);
let lastCallAt = 0;
const MIN_SPACING_MS = 1500;

async function rawRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }

  return limit(async () => {
    const wait = MIN_SPACING_MS - (Date.now() - lastCallAt);
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    lastCallAt = Date.now();

    const { data } = await axios.get<Record<string, unknown>>(BASE_URL, {
      params: { ...params, apikey: apiKey },
      timeout: 12000,
      headers: { 'User-Agent': 'StockLens/1.0' }
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Empty Alpha Vantage response');
    }
    // Rate-limit / advisory envelopes come back with HTTP 200 but no data.
    if (data['Note'] || data['Information']) {
      throw new Error(`Alpha Vantage throttled: ${String(data['Note'] || data['Information'])}`);
    }
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${String(data['Error Message'])}`);
    }
    return data;
  });
}

const breakerOptions = {
  timeout: 14000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  volumeThreshold: 3
};
const avBreaker = new CircuitBreaker(rawRequest, breakerOptions);

function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === '' || v === 'None' || v === '-') return null;
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const alphaVantageService = {
  isConfigured: isAlphaVantageConfigured,

  // GLOBAL_QUOTE -> matches yahooService.getQuote() output shape
  getQuote: async (symbol: string): Promise<AlphaVantageQuoteOutput> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `av:quote:${rawSymbol}`;
    const cached = await cacheService.get<AlphaVantageQuoteOutput>(cacheKey);
    if (cached) return cached;

    console.log(`[ALPHAVANTAGE] Fetching GLOBAL_QUOTE for: ${rawSymbol}`);
    const data = (await avBreaker.fire({ function: 'GLOBAL_QUOTE', symbol: rawSymbol })) as AlphaVantageQuoteResponse;
    const q = data['Global Quote'] || {};
    const price = toNum(q['05. price']);
    if (price === null) {
      throw new Error('Alpha Vantage returned no price');
    }

    const quoteObj: AlphaVantageQuoteOutput = {
      price,
      change: toNum(q['09. change']) ?? 0,
      change_pct: toNum((q['10. change percent'] || '').replace('%', '')) ?? 0,
      high: toNum(q['03. high']) ?? price,
      low: toNum(q['04. low']) ?? price,
      open: toNum(q['02. open']) ?? price,
      prev_close: toNum(q['08. previous close']) ?? price,
      high_52w: null,
      low_52w: null,
      volume: toNum(q['06. volume']),
      avg_volume: null,
      source: 'ALPHAVANTAGE'
    };

    await cacheService.set(cacheKey, quoteObj, CACHE_TTLS.QUOTE);
    return quoteObj;
  },

  // TIME_SERIES_* -> matches yahooService.getCandles() output shape
  getCandles: async (symbol: string, resolution: string): Promise<AlphaVantageCandlesOutput> => {
    const rawSymbol = symbol.toUpperCase();

    let fn = 'TIME_SERIES_DAILY';
    let seriesKey = 'Time Series (Daily)';
    const params: Record<string, string> = { symbol: rawSymbol, outputsize: 'full' };

    if (resolution === '5' || resolution === '15') {
      fn = 'TIME_SERIES_INTRADAY';
      seriesKey = `Time Series (${resolution}min)`;
      params.interval = `${resolution}min`;
    } else if (resolution === 'W') {
      fn = 'TIME_SERIES_WEEKLY';
      seriesKey = 'Weekly Time Series';
      delete params.outputsize;
    } else if (resolution === 'M') {
      fn = 'TIME_SERIES_MONTHLY';
      seriesKey = 'Monthly Time Series';
      delete params.outputsize;
    }
    params.function = fn;

    const cacheKey = `av:candles:${rawSymbol}:${resolution}`;
    const cached = await cacheService.get<AlphaVantageCandlesOutput>(cacheKey);
    if (cached) return cached;

    console.log(`[ALPHAVANTAGE] Fetching ${fn} for: ${rawSymbol}`);
    const data = (await avBreaker.fire(params)) as Record<string, Record<string, AlphaVantageBar> | undefined>;
    const series = data[seriesKey];
    if (!series || typeof series !== 'object') {
      return { s: 'no_data' };
    }

    const t: number[] = [];
    const c: number[] = [];
    const o: number[] = [];
    const h: number[] = [];
    const l: number[] = [];
    const v: number[] = [];

    // Alpha Vantage returns most-recent-first; sort ascending by date.
    const dates = Object.keys(series).sort();
    for (const date of dates) {
      const bar = series[date];
      if (!bar) continue;
      const close = toNum(bar['4. close']);
      if (close === null) continue;
      t.push(Math.floor(new Date(date).getTime() / 1000));
      c.push(close);
      o.push(toNum(bar['1. open']) ?? close);
      h.push(toNum(bar['2. high']) ?? close);
      l.push(toNum(bar['3. low']) ?? close);
      v.push(toNum(bar['5. volume']) ?? 0);
    }

    const result: AlphaVantageCandlesOutput = { s: t.length > 0 ? 'ok' : 'no_data', t, c, o, h, l, v, source: 'ALPHAVANTAGE' };
    if (t.length > 0) {
      await cacheService.set(cacheKey, result, CACHE_TTLS.QUOTE);
    }
    return result;
  },

  // OVERVIEW -> matches yahooService.getBasicFinancials() output shape
  getBasicFinancials: async (symbol: string): Promise<AlphaVantageBasicFinancialsOutput> => {
    const overview = await alphaVantageService._getOverview(symbol);
    const marketCap = toNum(overview.MarketCapitalization);

    const mapped: AlphaVantageBasicFinancialsOutput = {
      metric: {
        peTrailing: toNum(overview.TrailingPE) ?? toNum(overview.PERatio),
        peForward: toNum(overview.ForwardPE),
        pegRatio: toNum(overview.PEGRatio),
        priceToBook: toNum(overview.PriceToBookRatio),
        priceToSales: toNum(overview.PriceToSalesRatioTTM),
        dividendYield: overview.DividendYield ? (toNum(overview.DividendYield) ?? 0) * 100 : null,

        roeTTM: overview.ReturnOnEquityTTM ? (toNum(overview.ReturnOnEquityTTM) ?? 0) * 100 : null,
        roaTTM: overview.ReturnOnAssetsTTM ? (toNum(overview.ReturnOnAssetsTTM) ?? 0) * 100 : null,
        debtEquityAnnual: null,
        currentRatio: null,

        revenueGrowth: overview.QuarterlyRevenueGrowthYOY ? (toNum(overview.QuarterlyRevenueGrowthYOY) ?? 0) * 100 : null,
        earningsGrowth: overview.QuarterlyEarningsGrowthYOY ? (toNum(overview.QuarterlyEarningsGrowthYOY) ?? 0) * 100 : null,
        grossMargins: overview.GrossProfitTTM && overview.RevenueTTM
          ? ((toNum(overview.GrossProfitTTM) ?? 0) / (toNum(overview.RevenueTTM) || 1)) * 100
          : null,
        operatingMargins: overview.OperatingMarginTTM ? (toNum(overview.OperatingMarginTTM) ?? 0) * 100 : null,
        profitMargins: overview.ProfitMargin ? (toNum(overview.ProfitMargin) ?? 0) * 100 : null,

        freeCashflow: null,
        totalDebt: null,
        marketCapitalization: marketCap ? marketCap / 1000000 : null,

        // Backwards-compatible fields consumed by the ratios/peers routes
        peAnnual: toNum(overview.PERatio) ?? toNum(overview.TrailingPE),
        pbAnnual: toNum(overview.PriceToBookRatio),
        roicTTM: null,
        epsBasicExclExtraItemsTTM: toNum(overview.EPS) ?? toNum(overview.DilutedEPSTTM),
        dividendYieldIndicated: overview.DividendYield ? (toNum(overview.DividendYield) ?? 0) * 100 : null,
        enterpriseValue: null,
        evEbitda: toNum(overview.EVToEBITDA),
        sharesOutstanding: toNum(overview.SharesOutstanding),
        bookValue: toNum(overview.BookValue),
        totalCash: null,
        beta: toNum(overview.Beta)
      },
      source: 'ALPHAVANTAGE'
    };

    return mapped;
  },

  // OVERVIEW -> matches yahooService.getProfile() output shape
  getProfile: async (symbol: string): Promise<AlphaVantageProfileOutput> => {
    const overview = await alphaVantageService._getOverview(symbol);
    if (!overview.Name && !overview.Symbol) {
      throw new Error('Alpha Vantage returned no profile data');
    }

    let logoUrl = '';
    if (overview.OfficialSite) {
      try {
        logoUrl = `https://logo.clearbit.com/${new URL(overview.OfficialSite).hostname}`;
      } catch (_) { /* ignore malformed site */ }
    }

    return {
      name: overview.Name || symbol.toUpperCase(),
      logo: logoUrl,
      finnhubIndustry: overview.Industry || overview.Sector || 'Miscellaneous Industries',
      exchange: overview.Exchange || 'OTC Market',
      country: overview.Country || 'US',
      weburl: overview.OfficialSite || '',
      ipo: '—',
      ceo: '—',
      description: overview.Description || `${overview.Name || symbol.toUpperCase()} is a leading global enterprise.`,
      source: 'ALPHAVANTAGE'
    };
  },

  // INCOME_STATEMENT + BALANCE_SHEET + CASH_FLOW -> yahooService.getFinancials() shape
  getFinancials: async (symbol: string): Promise<AlphaVantageFinancialsOutput> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `av:financials:${rawSymbol}`;
    const cached = await cacheService.get<AlphaVantageFinancialsOutput>(cacheKey);
    if (cached) return cached;

    console.log(`[ALPHAVANTAGE] Fetching financial statements for: ${rawSymbol}`);
    const [income, balance, cash] = (await Promise.all([
      avBreaker.fire({ function: 'INCOME_STATEMENT', symbol: rawSymbol }),
      avBreaker.fire({ function: 'BALANCE_SHEET', symbol: rawSymbol }),
      avBreaker.fire({ function: 'CASH_FLOW', symbol: rawSymbol })
    ])) as [AlphaVantageIncomeResponse, AlphaVantageBalanceResponse, AlphaVantageCashFlowResponse];

    // Map AV report rows into the ...History[] shape the fundamentals route expects.
    const mapIncome = (r: AlphaVantageIncomeReport): AlphaVantageFinancialStatementItem => ({
      endDate: r.fiscalDateEnding,
      totalRevenue: toNum(r.totalRevenue),
      grossProfit: toNum(r.grossProfit),
      netIncome: toNum(r.netIncome),
      operatingIncome: toNum(r.operatingIncome),
      ebit: toNum(r.ebit)
    });
    const mapBalance = (r: AlphaVantageBalanceReport): AlphaVantageBalanceSheetItem => ({
      endDate: r.fiscalDateEnding,
      totalAssets: toNum(r.totalAssets),
      totalLiabilities: toNum(r.totalLiabilities),
      totalStockholderEquity: toNum(r.totalShareholderEquity)
    });
    const mapCash = (r: AlphaVantageCashFlowReport): AlphaVantageCashFlowItem => ({
      endDate: r.fiscalDateEnding,
      totalCashFromOperatingActivities: toNum(r.operatingCashflow),
      capitalExpenditures: toNum(r.capitalExpenditures),
      totalCashFromFinancingActivities: toNum(r.cashflowFromFinancing)
    });

    const mapped: AlphaVantageFinancialsOutput = {
      incomeStatement: (income.annualReports || []).map(mapIncome),
      incomeStatementQuarterly: (income.quarterlyReports || []).map(mapIncome),
      balanceSheet: (balance.annualReports || []).map(mapBalance),
      balanceSheetQuarterly: (balance.quarterlyReports || []).map(mapBalance),
      cashFlow: (cash.annualReports || []).map(mapCash),
      cashFlowQuarterly: (cash.quarterlyReports || []).map(mapCash),
      ratios: {
        recommendationKey: '—',
        targetMeanPrice: null,
        profitMargins: null,
        operatingMargins: null,
        returnOnAssets: null,
        returnOnEquity: null,
        debtToEquity: null,
        currentRatio: null,
        dividendYield: null,
        pegRatio: null,
        priceToBook: null,
        enterpriseToEquity: null
      },
      source: 'ALPHAVANTAGE'
    };

    await cacheService.set(cacheKey, mapped, CACHE_TTLS.FUNDAMENTALS);
    return mapped;
  },

  // SYMBOL_SEARCH -> matches yahooService.searchSymbol() output shape
  searchSymbol: async (query: string): Promise<AlphaVantageSearchOutput> => {
    console.log(`[ALPHAVANTAGE] SYMBOL_SEARCH for query: ${query}`);
    const data = (await avBreaker.fire({ function: 'SYMBOL_SEARCH', keywords: query })) as AlphaVantageSearchResponse;
    const matches = data.bestMatches || [];
    return {
      result: matches
        .filter((m: AlphaVantageSearchMatch) => Boolean(m && m['1. symbol']))
        .map((m: AlphaVantageSearchMatch) => ({
          symbol: m['1. symbol'] || '',
          description: m['2. name'] || m['1. symbol'] || '',
          displaySymbol: m['1. symbol'] || '',
          type: m['3. type'] || 'Stock',
          exchange: m['4. region'] || 'Global'
        }))
    };
  },

  // Shared OVERVIEW fetch — profile and ratios both derive from it, so cache once.
  _getOverview: async (symbol: string): Promise<AlphaVantageOverview> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `av:overview:${rawSymbol}`;
    const cached = await cacheService.get<AlphaVantageOverview>(cacheKey);
    if (cached) return cached;

    console.log(`[ALPHAVANTAGE] Fetching OVERVIEW for: ${rawSymbol}`);
    const data = (await avBreaker.fire({ function: 'OVERVIEW', symbol: rawSymbol })) as AlphaVantageOverview;
    if (!data || Object.keys(data).length === 0 || (!data.Symbol && !data.Name)) {
      throw new Error('Alpha Vantage returned empty overview');
    }
    await cacheService.set(cacheKey, data, CACHE_TTLS.FUNDAMENTALS);
    return data;
  }
};

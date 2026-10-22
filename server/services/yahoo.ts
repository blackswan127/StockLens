import YahooFinance from 'yahoo-finance2';
import { cacheService, CACHE_TTLS, type SaveQuoteBackupInput } from './cache.js';
import { z } from 'zod';
import CircuitBreaker from 'opossum';
import { alphaVantageService } from './alphaVantage.js';

// --- Type Definitions for Yahoo Finance Responses & Service Outputs ---

export interface MarketPlaylistItem {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  high_52w: number | null;
  low_52w: number | null;
  exchange: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  change_52w: number | null;
}

export interface YahooScreenerQuote {
  symbol: string;
  displayName?: string | null;
  longName?: string | null;
  shortName?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fullExchangeName?: string | null;
  exchange?: string | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  fiftyTwoWeekChangePercent?: number | null;
}

export interface YahooScreenerResponse {
  quotes?: YahooScreenerQuote[];
}

export interface YahooTrendingSymbolsResponse {
  quotes?: Array<{ symbol: string }>;
}

export interface YahooFinancialRatios {
  recommendationKey?: string;
  targetMeanPrice?: number | null;
  profitMargins?: number | null;
  operatingMargins?: number | null;
  returnOnAssets?: number | null;
  returnOnEquity?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  dividendYield?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  enterpriseToEquity?: number | null;
}

export interface StandardizedFinancials {
  incomeStatement?: Record<string, unknown>[] | unknown[];
  incomeStatementQuarterly?: Record<string, unknown>[] | unknown[];
  balanceSheet?: Record<string, unknown>[] | unknown[];
  balanceSheetQuarterly?: Record<string, unknown>[] | unknown[];
  cashFlow?: Record<string, unknown>[] | unknown[];
  cashFlowQuarterly?: Record<string, unknown>[] | unknown[];
  ratios?: Partial<YahooFinancialRatios> | Record<string, unknown>;
}

export interface YahooFinancialsQuoteSummary {
  incomeStatementHistory?: { incomeStatementHistory?: Record<string, unknown>[] };
  incomeStatementHistoryQuarterly?: { incomeStatementHistory?: Record<string, unknown>[] };
  balanceSheetHistory?: { balanceSheetStatements?: Record<string, unknown>[] };
  balanceSheetHistoryQuarterly?: { balanceSheetStatements?: Record<string, unknown>[] };
  cashflowStatementHistory?: { cashflowStatements?: Record<string, unknown>[] };
  cashflowStatementHistoryQuarterly?: { cashflowStatements?: Record<string, unknown>[] };
  financialData?: {
    recommendationKey?: string | null;
    targetMeanPrice?: number | null;
    profitMargins?: number | null;
    operatingMargins?: number | null;
    returnOnAssets?: number | null;
    returnOnEquity?: number | null;
    debtToEquity?: number | null;
    currentRatio?: number | null;
  };
  defaultKeyStatistics?: {
    dividendYield?: number | null;
    pegRatio?: number | null;
    priceToBook?: number | null;
    enterpriseToRevenue?: number | null;
  };
}

export interface IndexQuote {
  price?: number | null;
  change?: number | null;
  change_pct?: number | null;
  high?: number | null;
  low?: number | null;
  prev_close?: number | null;
}

export interface RealtimeQuote {
  price?: number | null;
  change?: number | null;
  change_pct?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  prev_close?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
  volume?: number | null;
  avg_volume?: number | null;
  source?: string;
  name?: string | null;
  exchange?: string | null;
  epsTrailingTwelveMonths?: number | null;
  epsForward?: number | null;
  marketCap?: number | null;
  pe?: number | null;
  pb?: number | null;
  roe?: number | string | null;
}

export interface YahooQuoteRaw {
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketDayHigh?: number | null;
  regularMarketDayLow?: number | null;
  regularMarketOpen?: number | null;
  regularMarketPreviousClose?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  regularMarketVolume?: number | null;
  averageDailyVolume3Month?: number | null;
  shortName?: string | null;
  longName?: string | null;
  exchange?: string | null;
  epsTrailingTwelveMonths?: number | null;
  epsForward?: number | null;
  marketCap?: number | null;
}

export interface CompanyOfficer {
  name?: string | null;
  title?: string | null;
}

export interface YahooProfileQuoteSummary {
  assetProfile?: {
    website?: string | null;
    industry?: string | null;
    country?: string | null;
    longBusinessSummary?: string | null;
    companyOfficers?: CompanyOfficer[];
  };
  price?: {
    longName?: string | null;
    shortName?: string | null;
    exchangeName?: string | null;
    exchange?: string | null;
  };
}

export interface CompanyProfile {
  name?: string;
  logo?: string;
  finnhubIndustry?: string;
  exchange?: string;
  country?: string;
  weburl?: string;
  ipo?: string;
  ceo?: string;
  description?: string;
}

export interface YahooFinancialData {
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  freeCashflow?: number | null;
  totalDebt?: number | null;
  totalCash?: number | null;
}

export interface YahooDefaultKeyStatistics {
  trailingPE?: number | null;
  forwardPE?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  enterpriseToRevenue?: number | null;
  enterpriseToEbitda?: number | null;
  sharesOutstanding?: number | null;
  bookValue?: number | null;
  beta?: number | null;
}

export interface YahooSummaryDetail {
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToSalesTrailing12Months?: number | null;
  dividendYield?: number | null;
}

export interface YahooBasicSummaryResult {
  financialData?: YahooFinancialData;
  defaultKeyStatistics?: YahooDefaultKeyStatistics;
  summaryDetail?: YahooSummaryDetail;
}

export interface BasicFinancialMetrics {
  peTrailing?: number | null;
  peForward?: number | null;
  pegRatio?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  dividendYield?: number | null;
  roeTTM?: number | null;
  roaTTM?: number | null;
  debtEquityAnnual?: number | null;
  currentRatio?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  freeCashflow?: number | null;
  totalDebt?: number | null;
  marketCapitalization?: number | null;
  peAnnual?: number | null;
  pbAnnual?: number | null;
  roicTTM?: number | null;
  epsBasicExclExtraItemsTTM?: number | null;
  dividendYieldIndicated?: number | null;
  enterpriseValue?: number | null;
  evEbitda?: number | null;
  sharesOutstanding?: number | null;
  bookValue?: number | null;
  totalCash?: number | null;
  beta?: number | null;
}

export interface BasicFinancials {
  metric?: BasicFinancialMetrics;
  source?: string;
}

export interface YahooRecommendationItem {
  symbol?: string;
}

export interface YahooRecommendationsResult {
  recommendedSymbols?: YahooRecommendationItem[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
}

export interface YahooNewsItem {
  uuid?: string | null;
  title?: string | null;
  summary?: string | null;
  publisher?: string | null;
  providerPublishTime?: string | number | Date | null;
  link?: string | null;
}

export interface YahooSearchQuoteItem {
  symbol?: string;
  longname?: string | null;
  shortname?: string | null;
  quoteType?: string | null;
  exchange?: string | null;
}

export interface YahooSearchResult {
  news?: YahooNewsItem[];
  quotes?: YahooSearchQuoteItem[];
}

export interface SearchSymbolItem {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange: string;
}

export interface SearchSymbolResponse {
  result: SearchSymbolItem[];
}

export type ChartInterval =
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '90m'
  | '1h'
  | '1d'
  | '5d'
  | '1wk'
  | '1mo'
  | '3mo';

export interface ChartOptions {
  period1: Date | string | number;
  period2?: Date | string | number;
  useYfid?: boolean;
  interval?: ChartInterval;
  includePrePost?: boolean;
  events?: string;
  lang?: string;
  return?: 'array' | 'object';
}

export interface YahooChartQuote {
  date: string | number | Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

export interface YahooChartResult {
  quotes?: YahooChartQuote[];
}

export interface CandlesResponse {
  s: 'ok' | 'no_data';
  t?: number[];
  c?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  v?: number[];
  source?: string;
}

export interface MajorHoldersBreakdownData {
  insidersPercentHeld?: number | null;
  institutionsPercentHeld?: number | null;
  institutionsFloatPercentHeld?: number | null;
  institutionsCount?: number | null;
}

export interface OwnershipHolder {
  organization: string;
  position: number | null;
  reportDate: string | Date | null;
  pctHeld: number | null;
  value: number | null;
}

export interface YahooOwnershipItem {
  organization?: string | null;
  position?: number | null;
  reportDate?: string | Date | null;
  pctHeld?: number | null;
  value?: number | null;
}

export interface YahooShareholdingQuoteSummary {
  majorHoldersBreakdown?: {
    insidersPercentHeld?: number | null;
    institutionsPercentHeld?: number | null;
    institutionsFloatPercentHeld?: number | null;
    institutionsCount?: number | null;
  };
  institutionOwnership?: {
    ownershipList?: YahooOwnershipItem[];
  };
  fundOwnership?: {
    ownershipList?: YahooOwnershipItem[];
  };
}

export interface ShareholdingResult {
  majorHolders?: Partial<MajorHoldersBreakdownData> | Record<string, unknown>;
  institutionalHolders?: OwnershipHolder[] | unknown[];
  mutualFundHolders?: OwnershipHolder[] | unknown[];
}

export interface FundamentalsTimeSeriesOptions {
  period1: Date | number | string;
  period2?: Date | number | string;
  type?: 'annual' | 'quarterly' | 'trailing' | string;
  merge?: boolean;
  padTimeSeries?: boolean;
  lang?: string;
  region?: string;
  module: string;
}

export interface YahooEarningsTrendItem {
  period?: string;
  growth?: number | null;
}

export interface YahooGrowthQuoteSummary {
  earningsTrend?: {
    trend?: YahooEarningsTrendItem[];
  };
}

export interface GrowthEstimatesResult {
  growthEstimate5yr: number | null;
}

export type QuoteSummaryModule =
  | 'assetProfile'
  | 'balanceSheetHistory'
  | 'balanceSheetHistoryQuarterly'
  | 'calendarEvents'
  | 'cashflowStatementHistory'
  | 'cashflowStatementHistoryQuarterly'
  | 'defaultKeyStatistics'
  | 'earnings'
  | 'earningsHistory'
  | 'earningsTrend'
  | 'financialData'
  | 'fundOwnership'
  | 'fundPerformance'
  | 'fundProfile'
  | 'incomeStatementHistory'
  | 'incomeStatementHistoryQuarterly'
  | 'indexTrend'
  | 'industryTrend'
  | 'insiderHolders'
  | 'insiderTransactions'
  | 'institutionOwnership'
  | 'majorDirectHolders'
  | 'majorHoldersBreakdown'
  | 'netSharePurchaseActivity'
  | 'price'
  | 'quoteType'
  | 'recommendationTrend'
  | 'secFilings'
  | 'sectorTrend'
  | 'summaryDetail'
  | 'summaryProfile'
  | 'topHoldings'
  | 'upgradeDowngradeHistory';

export interface QuoteSummaryOptions {
  formatted?: boolean;
  modules?: QuoteSummaryModule[] | 'all';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Best-effort Alpha Vantage fallback wrapper. Yahoo Finance is always tried
 * first; this runs only from a Yahoo catch-block. It never throws — a failed
 * fallback simply returns null so the caller can continue to its SQLite
 * backup layer, preserving the existing waterfall behaviour.
 */
async function tryAlphaVantage<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  if (!alphaVantageService.isConfigured()) return null;
  try {
    console.warn(`[FALLBACK] Yahoo failed, attempting Alpha Vantage for ${label}...`);
    const result = await fn();
    console.log(`[FALLBACK] Alpha Vantage succeeded for ${label}`);
    return result;
  } catch (avErr) {
    console.error(`[FALLBACK] Alpha Vantage also failed for ${label}:`, getErrorMessage(avErr));
    return null;
  }
}

// ESM/CJS interop compatibility resolver for bundlers (e.g. esbuild/webpack)
type YahooFinanceClient = InstanceType<typeof YahooFinance>;
type YahooFinanceConstructor = new (options?: { queue?: { concurrency?: number } }) => YahooFinanceClient;

let YahooFinanceClass: YahooFinanceConstructor = YahooFinance as unknown as YahooFinanceConstructor;
if (
  YahooFinanceClass &&
  typeof (YahooFinanceClass as unknown as { default?: YahooFinanceConstructor }).default === 'function'
) {
  YahooFinanceClass = (YahooFinanceClass as unknown as { default: YahooFinanceConstructor }).default;
}

// Caps concurrency globally at client level to avoid rate limits
let yahooFinance: YahooFinanceClient = new YahooFinanceClass({
  queue: { concurrency: 4 }
});

// yahoo-finance2's cookie/crumb session is known to silently expire during
// long-running unattended batch jobs (see github.com/gadicc/yahoo-finance2
// issues #741 and #764). When that happens, every subsequent call in a batch
// fails until the process restarts. This helper forces a brand-new client
// instance (fresh cookie/crumb handshake on the next call) without requiring
// a server restart.
export function resetYahooSession(): void {
  console.warn('[YAHOO] Resetting client session (fresh cookie/crumb on next request)...');
  yahooFinance = new YahooFinanceClass({
    queue: { concurrency: 4 }
  });
}

// Request Coalescing Map and Helper
const inFlight = new Map<string, Promise<unknown>>();

async function dedupedFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<T>;
  }
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise as Promise<unknown>);
  return promise;
}

// Zod Schema Validation for quotes
const QuoteSchema = z.object({
  price: z.number().positive(),
  change: z.number(),
  change_pct: z.number().min(-100).max(1000),
}).passthrough();

// Circuit Breaker configuration
const breakerOptions = {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10
};

const quoteBreaker = new CircuitBreaker(
  (sym: string) => yahooFinance.quote(sym),
  breakerOptions
);

const quoteSummaryBreaker = new CircuitBreaker(
  (sym: string, options?: QuoteSummaryOptions) =>
    yahooFinance.quoteSummary(
      sym,
      options as Parameters<YahooFinanceClient['quoteSummary']>[1]
    ),
  breakerOptions
);

const recommendationsBreaker = new CircuitBreaker(
  (sym: string) => yahooFinance.recommendationsBySymbol(sym),
  breakerOptions
);

const searchBreaker = new CircuitBreaker(
  (query: string) => yahooFinance.search(query),
  breakerOptions
);

const chartBreaker = new CircuitBreaker(
  (sym: string, options?: ChartOptions) =>
    yahooFinance.chart(
      sym,
      options as Parameters<YahooFinanceClient['chart']>[1]
    ),
  breakerOptions
);

const fundamentalsTimeSeriesBreaker = new CircuitBreaker(
  (sym: string, options: FundamentalsTimeSeriesOptions) =>
    yahooFinance.fundamentalsTimeSeries(
      sym,
      options as Parameters<YahooFinanceClient['fundamentalsTimeSeries']>[1]
    ),
  breakerOptions
);

export const yahooService = {
  // Predefined playlists from Yahoo Finance native global screener
  getMarketPlaylist: async (scrId: string): Promise<MarketPlaylistItem[]> => {
    const cacheKey = `yahoo:playlist:${scrId}`;
    const cached = await cacheService.get<MarketPlaylistItem[]>(cacheKey);
    if (cached) {
      cacheService.logHit('playlist', scrId, 'MEMCACHE_PLAYLIST');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching native playlist for: ${scrId}`);
      const result: MarketPlaylistItem[] = await dedupedFetch(cacheKey, async (): Promise<MarketPlaylistItem[]> => {
        const screenerFn = yahooFinance.screener as (...args: unknown[]) => Promise<YahooScreenerResponse>;
        const raw = await screenerFn(
          { scrIds: scrId, count: 25 },
          {},
          { validateResult: false }
        );
        const quotes = raw.quotes || [];
        return quotes.map((q: YahooScreenerQuote): MarketPlaylistItem => ({
          symbol: q.symbol,
          name: q.displayName || q.longName || q.shortName || q.symbol,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          change_pct: q.regularMarketChangePercent ?? null,
          high_52w: q.fiftyTwoWeekHigh ?? null,
          low_52w: q.fiftyTwoWeekLow ?? null,
          exchange: q.fullExchangeName || q.exchange || null,
          market_cap: q.marketCap ?? null,
          pe_ratio: q.trailingPE ?? null,
          change_52w: q.fiftyTwoWeekChangePercent ?? null
        }));
      });

      await cacheService.set(cacheKey, result, 600); // 10 min TTL
      return result;
    } catch (error) {
      console.error(`[YAHOO PLAYLIST ERROR] Failed to fetch playlist ${scrId}:`, getErrorMessage(error));
      return [];
    }
  },

  // Trending symbols from Yahoo Finance
  getTrendingSymbols: async (country: string): Promise<MarketPlaylistItem[]> => {
    const cacheKey = `yahoo:trending:${country}`;
    const cached = await cacheService.get<MarketPlaylistItem[]>(cacheKey);
    if (cached) {
      cacheService.logHit('trending', country, 'MEMCACHE_TRENDING');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching native trending symbols for: ${country}`);
      const result: MarketPlaylistItem[] = await dedupedFetch(cacheKey, async (): Promise<MarketPlaylistItem[]> => {
        const raw = (await yahooFinance.trendingSymbols(country)) as YahooTrendingSymbolsResponse;
        const quotes = raw.quotes || [];
        const symbols = quotes.map((q) => q.symbol).filter(Boolean);
        
        if (symbols.length === 0) return [];
        
        // Fetch detailed quotes for these symbols to normalize them
        const detailedQuotes = (await yahooFinance.quote(symbols)) as YahooScreenerQuote[];
        return detailedQuotes.map((q: YahooScreenerQuote): MarketPlaylistItem => ({
          symbol: q.symbol,
          name: q.displayName || q.longName || q.shortName || q.symbol,
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          change_pct: q.regularMarketChangePercent ?? null,
          high_52w: q.fiftyTwoWeekHigh ?? null,
          low_52w: q.fiftyTwoWeekLow ?? null,
          exchange: q.fullExchangeName || q.exchange || null,
          market_cap: q.marketCap ?? null,
          pe_ratio: q.trailingPE ?? null,
          change_52w: q.fiftyTwoWeekChangePercent ?? null
        }));
      });

      await cacheService.set(cacheKey, result, 600); // 10 min TTL
      return result;
    } catch (error) {
      console.error(`[YAHOO TRENDING ERROR] Failed to fetch trending symbols for ${country}:`, getErrorMessage(error));
      return [];
    }
  },

  // Fetch historical financial data (5 years of Annual statements)
  getFinancials: async (symbol: string): Promise<StandardizedFinancials> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:financials:${rawSymbol}`;

    // Try cache first
    const cached = await cacheService.get<StandardizedFinancials>(cacheKey);
    if (cached) {
      cacheService.logHit('financials', rawSymbol, 'MEMCACHE_YAHOO');
      return cached;
    }

    console.log(`[YAHOO] Fetching quoteSummary for: ${rawSymbol}`);
    try {
      const financialsObj = await dedupedFetch(cacheKey, async (): Promise<StandardizedFinancials> => {
        const result = (await quoteSummaryBreaker.fire(rawSymbol, {
          modules: [
            'incomeStatementHistory',
            'balanceSheetHistory',
            'cashflowStatementHistory',
            'incomeStatementHistoryQuarterly',
            'balanceSheetHistoryQuarterly',
            'cashflowStatementHistoryQuarterly',
            'financialData',
            'defaultKeyStatistics'
          ]
        })) as YahooFinancialsQuoteSummary | null;

        if (!result) {
          throw new Error('No quoteSummary results found');
        }

        // Extract and map into standardized schema
        const mapped: StandardizedFinancials = {
          incomeStatement: result.incomeStatementHistory?.incomeStatementHistory || [],
          incomeStatementQuarterly: result.incomeStatementHistoryQuarterly?.incomeStatementHistory || [],
          balanceSheet: result.balanceSheetHistory?.balanceSheetStatements || [],
          balanceSheetQuarterly: result.balanceSheetHistoryQuarterly?.balanceSheetStatements || [],
          cashFlow: result.cashflowStatementHistory?.cashflowStatements || [],
          cashFlowQuarterly: result.cashflowStatementHistoryQuarterly?.cashflowStatements || [],
          ratios: {
            recommendationKey: result.financialData?.recommendationKey || '—',
            targetMeanPrice: result.financialData?.targetMeanPrice || null,
            profitMargins: result.financialData?.profitMargins || null,
            operatingMargins: result.financialData?.operatingMargins || null,
            returnOnAssets: result.financialData?.returnOnAssets || null,
            returnOnEquity: result.financialData?.returnOnEquity || null,
            debtToEquity: result.financialData?.debtToEquity || null,
            currentRatio: result.financialData?.currentRatio || null,
            dividendYield: result.defaultKeyStatistics?.dividendYield || null,
            pegRatio: result.defaultKeyStatistics?.pegRatio || null,
            priceToBook: result.defaultKeyStatistics?.priceToBook || null,
            enterpriseToEquity: result.defaultKeyStatistics?.enterpriseToRevenue || null
          }
        };

        // Set node-cache & save backend SQLite persistent backup
        await cacheService.set(cacheKey, mapped, CACHE_TTLS.FUNDAMENTALS);
        cacheService.saveFundamentalsBackup(rawSymbol, mapped, 'YAHOO');

        return mapped;
      });

      return financialsObj;
    } catch (error) {
      console.error(`[YAHOO ERROR] Failed to fetch financials for ${rawSymbol}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avData = await tryAlphaVantage(`financials ${rawSymbol}`, () => alphaVantageService.getFinancials(rawSymbol));
      if (avData) {
        const mappedAvData = avData as unknown as StandardizedFinancials;
        await cacheService.set(cacheKey, mappedAvData, CACHE_TTLS.FUNDAMENTALS);
        cacheService.saveFundamentalsBackup(rawSymbol, mappedAvData, 'ALPHAVANTAGE');
        return mappedAvData;
      }

      // Fallback to SQLite check
      const backup = cacheService.getFundamentalsBackup(rawSymbol);
      if (backup && backup.data) {
        console.log(`[YAHOO FALLBACK] Returned SQLite fundamental data backup for ${rawSymbol}`);
        return backup.data as unknown as StandardizedFinancials;
      }
      throw error;
    }
  },

  // Index quotes fallback (^GSPC, ^IXIC, ^DJI, ^FTSE, ^N225, ^BSESN)
  getIndexQuote: async (symbol: string): Promise<IndexQuote | null> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:index:${rawSymbol}`;

    const cached = await cacheService.get<IndexQuote>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching web-scraped quote for Index: ${rawSymbol}`);
      const mapped = await dedupedFetch(cacheKey, async (): Promise<IndexQuote> => {
        const result = (await quoteBreaker.fire(rawSymbol)) as YahooQuoteRaw | null;
        if (result && typeof result.regularMarketPrice === 'number') {
          const quoteObj: IndexQuote = {
            price: result.regularMarketPrice,
            change: result.regularMarketChange ?? 0,
            change_pct: result.regularMarketChangePercent ?? 0,
            high: result.regularMarketDayHigh || result.regularMarketPrice,
            low: result.regularMarketDayLow || result.regularMarketPrice,
            prev_close: result.regularMarketPreviousClose || result.regularMarketPrice
          };
          await cacheService.set(cacheKey, quoteObj, CACHE_TTLS.QUOTE); // 5 min TTL
          return quoteObj;
        }
        throw new Error('No index quote result found');
      });
      return mapped;
    } catch (error) {
      console.error(`[YAHOO INDEX ERROR] Failed index fetch for ${rawSymbol}`, getErrorMessage(error));
    }
    return null;
  },

  // Real-time quote
  getQuote: async (symbol: string): Promise<RealtimeQuote> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:quote:${rawSymbol}`;

    // Try cache first
    const cached = await cacheService.get<RealtimeQuote>(cacheKey);
    if (cached) {
      cacheService.logHit('quote', rawSymbol, 'MEMCACHE_YAHOO_QUOTE');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching real-time quote for: ${rawSymbol}`);
      const mapped = await dedupedFetch(cacheKey, async (): Promise<RealtimeQuote> => {
        const result = (await quoteBreaker.fire(rawSymbol)) as YahooQuoteRaw | null;
        if (result && typeof result.regularMarketPrice === 'number') {
          const quoteObj: RealtimeQuote = {
            price: result.regularMarketPrice,
            change: result.regularMarketChange ?? 0,
            change_pct: result.regularMarketChangePercent ?? 0,
            high: result.regularMarketDayHigh || result.regularMarketPrice,
            low: result.regularMarketDayLow || result.regularMarketPrice,
            open: result.regularMarketOpen || result.regularMarketPrice,
            prev_close: result.regularMarketPreviousClose || result.regularMarketPrice,
            high_52w: result.fiftyTwoWeekHigh || null,
            low_52w: result.fiftyTwoWeekLow || null,
            volume: result.regularMarketVolume || null,
            avg_volume: result.averageDailyVolume3Month || null,
            name: result.shortName || result.longName || null,
            exchange: result.exchange || null,
            epsTrailingTwelveMonths: result.epsTrailingTwelveMonths || null,
            epsForward: result.epsForward || null,
            marketCap: result.marketCap || null
          };

          // Zod validation before caching/SQLite write
          const parsed = QuoteSchema.safeParse(quoteObj);
          if (!parsed.success) {
            console.error(`[YAHOO VALIDATION] Rejected bad quote for ${rawSymbol}`, parsed.error.flatten());
            const backup = cacheService.getQuoteBackup(rawSymbol);
            if (backup) {
              console.log(`[YAHOO VALIDATION FALLBACK] Using backup quote for ${rawSymbol}`);
              return backup as unknown as RealtimeQuote;
            }
            throw new Error('Quote failed validation and no backup available');
          }

          await cacheService.set(cacheKey, quoteObj, CACHE_TTLS.QUOTE);
          cacheService.saveQuoteBackup(rawSymbol, quoteObj as SaveQuoteBackupInput);
          return quoteObj;
        }
        throw new Error('No quote results found');
      });
      return mapped;
    } catch (error) {
      console.error(`[YAHOO QUOTE ERROR] Failed to fetch quote for ${rawSymbol}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avQuote = await tryAlphaVantage(`quote ${rawSymbol}`, () => alphaVantageService.getQuote(rawSymbol));
      if (avQuote && avQuote.price !== null) {
        await cacheService.set(cacheKey, avQuote, CACHE_TTLS.QUOTE);
        cacheService.saveQuoteBackup(rawSymbol, avQuote as SaveQuoteBackupInput);
        return avQuote;
      }

      const backup = cacheService.getQuoteBackup(rawSymbol);
      if (backup) {
        console.log(`[YAHOO QUOTE FALLBACK] Returned SQLite quote backup for ${rawSymbol}`);
        return backup as unknown as RealtimeQuote;
      }
      throw error;
    }
  },

  // Company profile
  getProfile: async (symbol: string): Promise<CompanyProfile> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:profile:${rawSymbol}`;

    const cached = await cacheService.get<CompanyProfile>(cacheKey);
    if (cached) {
      cacheService.logHit('profile', rawSymbol, 'MEMCACHE_YAHOO_PROFILE');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching profile for: ${rawSymbol}`);
      const profileObj = await dedupedFetch(cacheKey, async (): Promise<CompanyProfile> => {
        const result = (await quoteSummaryBreaker.fire(rawSymbol, {
          modules: ['assetProfile', 'price']
        })) as YahooProfileQuoteSummary | null;

        if (!result) {
          throw new Error('No quoteSummary results found for profile');
        }

        const website = result.assetProfile?.website || '';
        let logoUrl = '';
        if (website) {
          try {
            const urlObj = new URL(website);
            logoUrl = `https://logo.clearbit.com/${urlObj.hostname}`;
          } catch (_) {
            /* intentionally ignored */
          }
        }

        const mapped: CompanyProfile = {
          name: result.price?.longName || result.price?.shortName || rawSymbol,
          logo: logoUrl,
          finnhubIndustry: result.assetProfile?.industry || 'Miscellaneous Industries',
          exchange: result.price?.exchangeName || result.price?.exchange || 'OTC Market',
          country: result.assetProfile?.country || 'US',
          weburl: website,
          ipo: '—',
          ceo:
            result.assetProfile?.companyOfficers?.find((o: CompanyOfficer) => {
              const title = o.title?.toLowerCase() || '';
              return title.includes('ceo') || title.includes('chief executive officer');
            })?.name || '—',
          description: result.assetProfile?.longBusinessSummary || `${rawSymbol} is a leading global enterprise.`
        };

        await cacheService.set(cacheKey, mapped, CACHE_TTLS.FUNDAMENTALS);
        return mapped;
      });

      return profileObj;
    } catch (error) {
      console.error(`[YAHOO PROFILE ERROR] Failed to fetch profile for ${rawSymbol}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avProfile = await tryAlphaVantage(`profile ${rawSymbol}`, () => alphaVantageService.getProfile(rawSymbol));
      if (avProfile) {
        await cacheService.set(cacheKey, avProfile, CACHE_TTLS.FUNDAMENTALS);
        return avProfile;
      }

      // Fallback to SQLite DB backup if available
      const backup = cacheService.getFundamentalsBackup(rawSymbol);
      if (backup && backup.data) {
        const data = backup.data as Record<string, string | undefined>;
        return {
          name: data.name || rawSymbol,
          logo: data.logo || '',
          finnhubIndustry: data.industry || data.finnhubIndustry || 'Miscellaneous Industries',
          exchange: data.exchange || 'OTC Market',
          country: data.country || 'US',
          weburl: data.weburl || '',
          ipo: data.ipo || '—',
          ceo: '—',
          description: data.description || `${rawSymbol} is a leading global enterprise.`
        };
      }
      throw error;
    }
  },

  // Basic financials (metrics)
  getBasicFinancials: async (symbol: string): Promise<BasicFinancials> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:basic:${rawSymbol}`;

    const cached = await cacheService.get<BasicFinancials>(cacheKey);
    if (cached) {
      cacheService.logHit('basic_financials', rawSymbol, 'MEMCACHE_YAHOO_BASIC');
      return cached;
    }

    // Try SQLite backup next (if within 24h) - survives server restarts
    const backup = cacheService.getRatiosBackup(rawSymbol);
    if (backup && (Date.now() - backup.updated_at < CACHE_TTLS.FUNDAMENTALS * 1000)) {
      console.log(`[YAHOO] Found fresh SQLite ratios backup for: ${rawSymbol}`);
      const data = backup.data as unknown as BasicFinancials;
      await cacheService.set(cacheKey, data, CACHE_TTLS.FUNDAMENTALS);
      return data;
    }

    try {
      console.log(`[YAHOO] Fetching basic financials for: ${rawSymbol}`);
      const basicObj = await dedupedFetch(cacheKey, async (): Promise<BasicFinancials> => {
        const summary = (await quoteSummaryBreaker.fire(rawSymbol, {
          modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail']
        })) as YahooBasicSummaryResult | null;

        const fd: YahooFinancialData = summary?.financialData || {};
        const ks: YahooDefaultKeyStatistics = summary?.defaultKeyStatistics || {};
        const sd: YahooSummaryDetail = summary?.summaryDetail || {};

        const mapped: BasicFinancials = {
          metric: {
            // Valuation
            peTrailing: ks.trailingPE || sd.trailingPE || null,
            peForward: ks.forwardPE || sd.forwardPE || null,
            pegRatio: ks.pegRatio || null,
            priceToBook: ks.priceToBook || null,
            priceToSales: sd.priceToSalesTrailing12Months || null,
            dividendYield: sd.dividendYield ? sd.dividendYield * 100 : (ks.dividendYield ? ks.dividendYield * 100 : null),

            // Ratios
            roeTTM: fd.returnOnEquity ? fd.returnOnEquity * 100 : null,
            roaTTM: fd.returnOnAssets ? fd.returnOnAssets * 100 : null,
            debtEquityAnnual: fd.debtToEquity || null,
            currentRatio: fd.currentRatio || null,

            // Income Statement
            revenueGrowth: fd.revenueGrowth ? fd.revenueGrowth * 100 : null,
            earningsGrowth: fd.earningsGrowth ? fd.earningsGrowth * 100 : null,
            grossMargins: fd.grossMargins ? fd.grossMargins * 100 : null,
            operatingMargins: fd.operatingMargins ? fd.operatingMargins * 100 : null,
            profitMargins: fd.profitMargins ? fd.profitMargins * 100 : null,

            // Balance Sheet & Popular
            freeCashflow: fd.freeCashflow || null,
            totalDebt: fd.totalDebt || null,
            marketCapitalization: ks.marketCap ? ks.marketCap / 1000000 : (ks.enterpriseValue ? ks.enterpriseValue / 1000000 : null),

            // Keep backwards-compatible fields
            peAnnual: ks.trailingPE || ks.forwardPE || null,
            pbAnnual: ks.priceToBook || null,
            roicTTM: null,
            epsBasicExclExtraItemsTTM: ks.trailingEps || ks.forwardEps || null,
            dividendYieldIndicated: sd.dividendYield ? sd.dividendYield * 100 : (ks.dividendYield ? ks.dividendYield * 100 : null),
            enterpriseValue: ks.enterpriseValue || null,
            evEbitda: ks.enterpriseToEbitda || null,
            sharesOutstanding: ks.sharesOutstanding || null,
            bookValue: ks.bookValue || null,
            totalCash: fd.totalCash || null,
            beta: ks.beta || null
          }
        };

        await cacheService.set(cacheKey, mapped, CACHE_TTLS.FUNDAMENTALS);
        cacheService.saveRatiosBackup(rawSymbol, mapped);
        return mapped;
      });

      return basicObj;
    } catch (error) {
      console.error(`[YAHOO BASIC ERROR] Failed to fetch basic financials for ${rawSymbol}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avBasic = await tryAlphaVantage(`basic financials ${rawSymbol}`, () => alphaVantageService.getBasicFinancials(rawSymbol));
      if (avBasic) {
        await cacheService.set(cacheKey, avBasic, CACHE_TTLS.FUNDAMENTALS);
        cacheService.saveRatiosBackup(rawSymbol, avBasic);
        return avBasic;
      }

      // Fallback to SQLite check (even if expired) before giving up
      if (backup && backup.data) {
        console.log(`[YAHOO BASIC FALLBACK] Returned stale SQLite ratios backup for ${rawSymbol}`);
        return backup.data as unknown as BasicFinancials;
      }

      return {
        metric: {
          peTrailing: null,
          peForward: null,
          pegRatio: null,
          priceToBook: null,
          priceToSales: null,
          dividendYield: null,
          roeTTM: null,
          roaTTM: null,
          debtEquityAnnual: null,
          currentRatio: null,
          revenueGrowth: null,
          earningsGrowth: null,
          grossMargins: null,
          operatingMargins: null,
          profitMargins: null,
          freeCashflow: null,
          totalDebt: null,
          peAnnual: null,
          pbAnnual: null,
          roicTTM: null,
          epsBasicExclExtraItemsTTM: null,
          marketCapitalization: null,
          dividendYieldIndicated: null,
          enterpriseValue: null,
          evEbitda: null,
          sharesOutstanding: null,
          bookValue: null,
          totalCash: null,
          beta: null
        }
      };
    }
  },

  // Recommended peers
  getPeers: async (symbol: string): Promise<string[]> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:peers:${rawSymbol}`;

    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) {
      cacheService.logHit('peers', rawSymbol, 'MEMCACHE_YAHOO_PEERS');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching peers for: ${rawSymbol}`);
      const peers = await dedupedFetch(cacheKey, async (): Promise<string[]> => {
        const recs = (await recommendationsBreaker.fire(rawSymbol)) as YahooRecommendationsResult | null;
        const mappedPeers = (recs?.recommendedSymbols || [])
          .map((r: YahooRecommendationItem) => r.symbol)
          .filter((sym): sym is string => Boolean(sym));
        await cacheService.set(cacheKey, mappedPeers, CACHE_TTLS.PEERS);
        return mappedPeers;
      });
      return peers;
    } catch (error) {
      console.error(`[YAHOO PEERS ERROR] Failed to fetch peers for ${rawSymbol}`, getErrorMessage(error));
      return [];
    }
  },

  // News
  getNews: async (symbol: string): Promise<NewsItem[]> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:news:${rawSymbol}`;

    const cached = await cacheService.get<NewsItem[]>(cacheKey);
    if (cached) {
      cacheService.logHit('news', rawSymbol, 'MEMCACHE_YAHOO_NEWS');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching news for symbol: ${rawSymbol}`);
      const mappedNews = await dedupedFetch(cacheKey, async (): Promise<NewsItem[]> => {
        const searchResult = (await searchBreaker.fire(rawSymbol)) as YahooSearchResult | null;
        const newsArr: NewsItem[] = (searchResult?.news || []).map((item: YahooNewsItem): NewsItem => ({
          id: item.uuid || '',
          headline: item.title || '',
          summary: item.summary || item.title || '',
          source: item.publisher || 'Yahoo Finance',
          datetime: item.providerPublishTime
            ? Math.floor(new Date(item.providerPublishTime).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          url: item.link || ''
        }));
        await cacheService.set(cacheKey, newsArr, CACHE_TTLS.NEWS);
        return newsArr;
      });
      return mappedNews;
    } catch (error) {
      console.error(`[YAHOO NEWS ERROR] Failed to fetch news for ${rawSymbol}`, getErrorMessage(error));
      return [];
    }
  },

  // General Market News
  getMarketNews: async (): Promise<NewsItem[]> => {
    const cacheKey = `yahoo:news:market`;

    const cached = await cacheService.get<NewsItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching general market news`);
      const mappedNews = await dedupedFetch(cacheKey, async (): Promise<NewsItem[]> => {
        const searchResult = (await searchBreaker.fire('market')) as YahooSearchResult | null;
        const newsArr: NewsItem[] = (searchResult?.news || []).map((item: YahooNewsItem): NewsItem => ({
          id: item.uuid || '',
          headline: item.title || '',
          summary: item.summary || item.title || '',
          source: item.publisher || 'Yahoo Finance',
          datetime: item.providerPublishTime
            ? Math.floor(new Date(item.providerPublishTime).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          url: item.link || ''
        }));
        await cacheService.set(cacheKey, newsArr, CACHE_TTLS.NEWS);
        return newsArr;
      });
      return mappedNews;
    } catch (error) {
      console.error(`[YAHOO MARKET NEWS ERROR] Failed to fetch general market news`, getErrorMessage(error));
      return [];
    }
  },

  // Search Symbol autocomplete
  searchSymbol: async (query: string): Promise<SearchSymbolResponse> => {
    try {
      console.log(`[YAHOO] Searching for query: ${query}`);
      const searchResult = (await searchBreaker.fire(query)) as YahooSearchResult | null;
      const quotes = searchResult?.quotes || [];
      const mappedResult: SearchSymbolResponse = {
        result: quotes
          .filter((q: YahooSearchQuoteItem): q is YahooSearchQuoteItem & { symbol: string } => Boolean(q && q.symbol))
          .map((q: YahooSearchQuoteItem & { symbol: string }): SearchSymbolItem => ({
            symbol: q.symbol,
            description: q.longname || q.shortname || q.symbol,
            displaySymbol: q.symbol,
            type: q.quoteType || 'Stock',
            exchange: q.exchange || 'Dynamic'
          }))
      };
      return mappedResult;
    } catch (error) {
      console.error(`[YAHOO SEARCH ERROR] Failed search for query ${query}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avSearch = await tryAlphaVantage(`search ${query}`, () => alphaVantageService.searchSymbol(query));
      if (avSearch) {
        return avSearch;
      }
      return { result: [] };
    }
  },

  // Candles (Chart data)
  getCandles: async (
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<CandlesResponse> => {
    const rawSymbol = symbol.toUpperCase();
    let interval: ChartInterval = '1d';
    if (resolution === '5') interval = '5m';
    else if (resolution === '15') interval = '15m';
    else if (resolution === 'W') interval = '1wk';
    else if (resolution === 'M') interval = '1mo';

    try {
      console.log(`[YAHOO] Fetching chart candles for ${rawSymbol} (Interval: ${interval})`);
      const chartResult = (await chartBreaker.fire(rawSymbol, {
        period1: new Date(from * 1000),
        period2: new Date(to * 1000),
        interval
      })) as YahooChartResult | null;

      const quotes = chartResult?.quotes || [];
      if (quotes.length === 0) {
        return { s: 'no_data' };
      }

      const t: number[] = [];
      const c: number[] = [];
      const o: number[] = [];
      const h: number[] = [];
      const l: number[] = [];
      const v: number[] = [];

      for (const q of quotes) {
        if (q.close === null || q.close === undefined) continue;
        const ts = Math.floor(new Date(q.date).getTime() / 1000);
        t.push(ts);
        c.push(q.close);
        o.push(q.open ?? q.close);
        h.push(q.high ?? q.close);
        l.push(q.low ?? q.close);
        v.push(q.volume ?? 0);
      }

      return {
        s: t.length > 0 ? 'ok' : 'no_data',
        t,
        c,
        o,
        h,
        l,
        v
      };
    } catch (error) {
      console.error(`[YAHOO CANDLES ERROR] Failed to fetch candles for ${rawSymbol}`, getErrorMessage(error));

      // Fallback Layer: Alpha Vantage
      const avCandles = await tryAlphaVantage(`candles ${rawSymbol}`, () => alphaVantageService.getCandles(rawSymbol, resolution));
      if (avCandles && avCandles.s === 'ok') {
        return avCandles;
      }
      return { s: 'no_data' };
    }
  },

  // Shareholding data (major holders, institutional ownership, mutual fund ownership)
  getShareholding: async (symbol: string): Promise<ShareholdingResult> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:shareholding:${rawSymbol}`;

    // Try in-memory cache first
    const cached = await cacheService.get<ShareholdingResult>(cacheKey);
    if (cached) {
      cacheService.logHit('shareholding', rawSymbol, 'MEMCACHE_YAHOO_SHAREHOLDING');
      return cached;
    }

    // Try SQLite backup next (if within 24h)
    const backup = cacheService.getShareholdingBackup(rawSymbol);
    if (backup && (Date.now() - backup.updated_at < CACHE_TTLS.FUNDAMENTALS * 1000)) {
      console.log(`[YAHOO] Found fresh SQLite shareholding backup for: ${rawSymbol}`);
      const data = backup.data as unknown as ShareholdingResult;
      await cacheService.set(cacheKey, data, CACHE_TTLS.FUNDAMENTALS);
      return data;
    }

    console.log(`[YAHOO] Fetching shareholding quoteSummary for: ${rawSymbol}`);
    try {
      const payload = await dedupedFetch(cacheKey, async (): Promise<ShareholdingResult> => {
        const result = (await quoteSummaryBreaker.fire(rawSymbol, {
          modules: ['majorHoldersBreakdown', 'institutionOwnership', 'fundOwnership']
        })) as YahooShareholdingQuoteSummary | null;

        if (!result) {
          throw new Error('No quoteSummary results found for shareholding');
        }

        const majorHolders: MajorHoldersBreakdownData = {
          insidersPercentHeld: result.majorHoldersBreakdown?.insidersPercentHeld ?? null,
          institutionsPercentHeld: result.majorHoldersBreakdown?.institutionsPercentHeld ?? null,
          institutionsFloatPercentHeld: result.majorHoldersBreakdown?.institutionsFloatPercentHeld ?? null,
          institutionsCount: result.majorHoldersBreakdown?.institutionsCount ?? null
        };

        const institutionalHolders: OwnershipHolder[] = (result.institutionOwnership?.ownershipList || []).map(
          (item: YahooOwnershipItem): OwnershipHolder => ({
            organization: item.organization || '—',
            position: item.position || null,
            reportDate: item.reportDate || null,
            pctHeld: item.pctHeld || null,
            value: item.value || null
          })
        );

        const mutualFundHolders: OwnershipHolder[] = (result.fundOwnership?.ownershipList || []).map(
          (item: YahooOwnershipItem): OwnershipHolder => ({
            organization: item.organization || '—',
            position: item.position || null,
            reportDate: item.reportDate || null,
            pctHeld: item.pctHeld || null,
            value: item.value || null
          })
        );

        const mappedPayload: ShareholdingResult = {
          majorHolders,
          institutionalHolders,
          mutualFundHolders
        };

        // Set node-cache & save backend SQLite persistent backup
        await cacheService.set(cacheKey, mappedPayload, CACHE_TTLS.FUNDAMENTALS);
        cacheService.saveShareholdingBackup(rawSymbol, mappedPayload);

        return mappedPayload;
      });

      return payload;
    } catch (error) {
      console.error(`[YAHOO ERROR] Failed to fetch shareholding for ${rawSymbol}`, getErrorMessage(error));
      
      // Fallback to SQLite check (even if expired)
      if (backup && backup.data) {
        console.log(`[YAHOO FALLBACK] Returned SQLite shareholding data backup for ${rawSymbol}`);
        return backup.data as unknown as ShareholdingResult;
      }
      throw error;
    }
  },

  getFundamentalsTimeSeries: async (
    symbol: string,
    period1: string,
    period2: string,
    type: 'annual' | 'quarterly' = 'annual'
  ): Promise<unknown> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:timeseries:${type}:${rawSymbol}`;

    const cached = await cacheService.get<unknown>(cacheKey);
    if (cached) {
      cacheService.logHit('timeseries', rawSymbol, 'MEMCACHE_YAHOO_TIMESERIES');
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching fundamentalsTimeSeries (${type}) for: ${rawSymbol}`);
      const payload = await dedupedFetch(cacheKey, async (): Promise<unknown> => {
        const result = await fundamentalsTimeSeriesBreaker.fire(rawSymbol, {
          period1,
          period2,
          type,
          module: 'all'
        });
        await cacheService.set(cacheKey, result, CACHE_TTLS.FUNDAMENTALS);
        return result;
      });
      return payload;
    } catch (error) {
      console.error(`[YAHOO TIMESERIES ERROR] Failed for ${rawSymbol}`, getErrorMessage(error));
      return [];
    }
  },

  getGrowthEstimates: async (symbol: string): Promise<GrowthEstimatesResult> => {
    const rawSymbol = symbol.toUpperCase();
    const cacheKey = `yahoo:growth:${rawSymbol}`;

    const cached = await cacheService.get<GrowthEstimatesResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`[YAHOO] Fetching growth estimates for: ${rawSymbol}`);
      const payload = await dedupedFetch(cacheKey, async (): Promise<GrowthEstimatesResult> => {
        const result = (await quoteSummaryBreaker.fire(rawSymbol, {
          modules: ['earningsTrend']
        })) as YahooGrowthQuoteSummary | null;
        const trends = result?.earningsTrend?.trend || [];
        const fiveYear = trends.find((t: YahooEarningsTrendItem) => t.period === '+5y');
        const mapped: GrowthEstimatesResult = {
          growthEstimate5yr: fiveYear?.growth || null
        };
        await cacheService.set(cacheKey, mapped, CACHE_TTLS.FUNDAMENTALS);
        return mapped;
      });
      return payload;
    } catch (error) {
      console.error(`[YAHOO GROWTH ERROR] Failed for ${rawSymbol}`, getErrorMessage(error));
      return { growthEstimate5yr: null };
    }
  }
};

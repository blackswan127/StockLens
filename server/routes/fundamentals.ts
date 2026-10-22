import { Router, Request, Response, NextFunction } from 'express';
import { yahooService } from '../services/yahoo.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import db from '../services/db.js';
import { prefetchEdgar } from '../services/edgar.js';

const router = Router();

// ==========================================
// TYPE DEFINITIONS & INTERFACES
// ==========================================

/**
 * Raw numeric value representation from Yahoo Finance, which may be a
 * primitive number or an object containing a raw number.
 */
export interface YahooNumericValue {
  raw?: number;
  fmt?: string;
}

export type YahooNumeric = number | YahooNumericValue | null | undefined;

/**
 * Safely unwraps a numeric value that may be a primitive or an object with a .raw property.
 */
function getRawNumber(value: YahooNumeric): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.raw === 'number') return value.raw;
  return 0;
}

/**
 * Company profile details from upstream providers.
 */
export interface CompanyProfile {
  name?: string;
  logo?: string;
  finnhubIndustry?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  weburl?: string;
  ipo?: string;
  description?: string;
  ceo?: string;
}

/**
 * SQLite row representation for stock metadata.
 */
export interface StockMetadataRow {
  symbol?: string;
  name?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
}

/**
 * Response payload for GET /api/profile/:symbol.
 */
export interface ProfileResponse {
  symbol: string;
  name: string;
  logo: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  weburl: string;
  ipo: string;
  description: string;
}

/**
 * Raw income statement record from upstream financial providers.
 */
export interface RawIncomeStatement {
  endDate?: string;
  fiscalDateEnding?: string;
  totalRevenue?: YahooNumeric;
  operatingRevenue?: YahooNumeric;
  grossProfit?: YahooNumeric;
  netIncome?: YahooNumeric;
  operatingIncome?: YahooNumeric;
  operatingExpense?: YahooNumeric;
  ebit?: YahooNumeric;
  basicEPS?: YahooNumeric;
  dilutedEPS?: YahooNumeric;
  [key: string]: unknown;
}

/**
 * Normalized income statement entry formatted for charts and tables.
 */
export interface NormalizedIncomeStatement extends RawIncomeStatement {
  year: number | string;
  date: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
}

/**
 * Raw balance sheet record from upstream financial providers.
 */
export interface RawBalanceSheet {
  endDate?: string;
  fiscalDateEnding?: string;
  totalAssets?: YahooNumeric;
  totalLiabilities?: YahooNumeric;
  totalStockholderEquity?: YahooNumeric;
  totalShareholderEquity?: YahooNumeric;
  inventory?: YahooNumeric;
  accountsReceivable?: YahooNumeric;
  cashAndCashEquivalents?: YahooNumeric;
  shortTermInvestments?: YahooNumeric;
  totalDebt?: YahooNumeric;
  longTermDebt?: YahooNumeric;
  currentDebt?: YahooNumeric;
  currentLiabilities?: YahooNumeric;
  [key: string]: unknown;
}

/**
 * Normalized balance sheet entry formatted for charts and tables.
 */
export interface NormalizedBalanceSheet extends RawBalanceSheet {
  year: number | string;
  date: string;
  assets: number;
  liabilities: number;
  equity: number;
}

/**
 * Raw cash flow statement record from upstream financial providers.
 */
export interface RawCashFlowStatement {
  endDate?: string;
  fiscalDateEnding?: string;
  totalCashFromOperatingActivities?: YahooNumeric;
  operatingCashflow?: YahooNumeric;
  totalCashflowsFromInvestingActivities?: YahooNumeric;
  investingCashflow?: YahooNumeric;
  totalCashFromFinancingActivities?: YahooNumeric;
  financingCashflow?: YahooNumeric;
  capitalExpenditures?: YahooNumeric;
  freeCashFlow?: YahooNumeric;
  [key: string]: unknown;
}

/**
 * Normalized cash flow statement entry formatted for charts and tables.
 */
export interface NormalizedCashFlowStatement extends RawCashFlowStatement {
  year: number | string;
  date: string;
  operating: number;
  investing: number;
  financing: number;
}

/**
 * Container for full financial history.
 */
export interface FinancialStatementsHistory {
  incomeStatement?: RawIncomeStatement[];
  balanceSheet?: RawBalanceSheet[];
  cashFlow?: RawCashFlowStatement[];
  incomeStatementQuarterly?: RawIncomeStatement[];
  balanceSheetQuarterly?: RawBalanceSheet[];
  cashFlowQuarterly?: RawCashFlowStatement[];
  ratios?: Record<string, unknown>;
}

/**
 * Response payload for GET /api/financials/:symbol.
 */
export interface FinancialsResponse {
  symbol: string;
  incomeStatement: NormalizedIncomeStatement[];
  balanceSheet: NormalizedBalanceSheet[];
  cashFlow: NormalizedCashFlowStatement[];
  quarterly: {
    incomeStatement: RawIncomeStatement[];
    balanceSheet: RawBalanceSheet[];
    cashFlow: RawCashFlowStatement[];
  };
}

/**
 * Valuation multiples and key ratios from Yahoo Finance metrics.
 */
export interface ValuationMultiples {
  peAnnual?: number | null;
  pbAnnual?: number | null;
  peTrailing?: number | null;
  peForward?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  enterpriseToEbitda?: number | null;
  roeTTM?: number | null;
  roaTTM?: number | null;
  debtEquityAnnual?: number | null;
  epsBasicExclExtraItemsTTM?: number | null;
  marketCapitalization?: number | null;
  dividendYieldIndicated?: number | null;
  dividendRate?: number | null;
  dividendYield?: number | null;
  enterpriseValue?: number | null;
  sharesOutstanding?: number | null;
  bookValue?: number | null;
  totalCash?: number | null;
  totalDebt?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  freeCashflow?: number | null;
  [key: string]: number | string | null | undefined;
}

/**
 * Basic financial metrics envelope returned by yahooService.getBasicFinancials.
 */
export interface BasicFinancialsData {
  metric?: ValuationMultiples;
  [key: string]: unknown;
}

/**
 * Historical growth rates and multi-year time-series fundamental statement.
 */
export interface HistoricalGrowthStatement {
  date: string;
  EBIT?: number | null;
  EBITDA?: number | null;
  operatingIncome?: number | null;
  totalAssets?: number | null;
  currentLiabilities?: number | null;
  totalRevenue?: number | null;
  operatingRevenue?: number | null;
  accountsReceivable?: number | null;
  basicEPS?: number | null;
  dilutedEPS?: number | null;
  grossProfit?: number | null;
  netIncome?: number | null;
  freeCashFlow?: number | null;
  investedCapital?: number | null;
  stockholdersEquity?: number | null;
  totalEquityGrossMinorityInterest?: number | null;
  totalDebt?: number | null;
  longTermDebt?: number | null;
  currentDebt?: number | null;
  cashCashEquivalentsAndShortTermInvestments?: number | null;
  cashAndCashEquivalents?: number | null;
  cashFinancial?: number | null;
  taxRateForCalcs?: number | null;
  operatingExpense?: number | null;
  inventory?: number | null;
  operatingCashFlow?: number | null;
  capitalExpenditure?: number | null;
  investingCashFlow?: number | null;
  cashFlowFromContinuingInvestingActivities?: number | null;
  [key: string]: unknown;
}

/**
 * Response payload for GET /api/ratios/:symbol.
 */
export interface RatiosResponse {
  symbol: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  debt_equity: string;
  eps: string;
  market_cap: number | null;
  dividend_yield: string;
  enterprise_value: number | null;
  shares_outstanding: number | null;
  book_value: number | null;
  total_cash: number | null;
  total_debt: number | null;
  sales_growth: string;
  profit_growth: string;
  updated_at: number;
}

/**
 * Peer comparison metric item.
 */
export interface PeerComparisonItem {
  symbol: string;
  name: string;
  price: number | null;
  mcap: number | null;
  pe: string;
  pb: string;
  roe: string;
  exchange: string;
}

/**
 * Major holders breakdown.
 */
export interface MajorHoldersBreakdown {
  insidersPercentHeld: number | null;
  institutionsPercentHeld: number | null;
  institutionsFloatPercentHeld: number | null;
  institutionsCount: number | null;
}

/**
 * Shareholder entity for institutional and mutual fund holders.
 */
export interface ShareholdingEntity {
  holder?: string;
  shares?: number;
  dateReported?: string;
  change?: number;
  value?: number;
  [key: string]: unknown;
}

/**
 * Response payload for GET /api/shareholding/:symbol.
 */
export interface ShareholdingResponse {
  majorHolders: MajorHoldersBreakdown;
  institutionalHolders: ShareholdingEntity[];
  mutualFundHolders: ShareholdingEntity[];
}

/**
 * Candle history format for price performance calculations.
 */
export interface StockCandles {
  s: string;
  c?: number[];
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  v?: number[];
}

/**
 * Compare endpoint interfaces.
 */
export interface CompareProfile {
  name: string;
  sector: string;
  industry: string;
  ceo: string;
  exchange: string;
  country: string;
  logo: string;
}

export interface CompareKeyStats {
  asOf: string;
  marketCap: number | null;
  enterpriseValue: number | null;
  peRatio: number | null;
  eps: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
}

export interface ComparePricePerformance {
  asOf: string;
  oneWeek: number | null;
  threeMonths: number | null;
  ytd: number | null;
  oneYear: number | null;
}

export interface CompareIncomeStatement {
  asOf: string;
  revenue: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  revenueGrowthYoY: number | null;
  grossProfit: number | null;
}

export interface CompareBalanceSheet {
  asOf: string;
  inventory: number | null;
  receivablesTurnover: number | null;
}

export interface CompareCashFlow {
  asOf: string;
  operatingCashFlow: number | null;
  capex: number | null;
  investingCashFlow: number | null;
  freeCashFlow: number | null;
}

export interface ComparePriceRatios {
  pe: number | null;
  forwardPe: number | null;
  pFreeCashFlow: number | null;
  pBook: number | null;
  pSales: number | null;
  evEbitda: number | null;
}

export interface CompareMargin {
  operatingMargin: number | null;
  grossMargin: number | null;
  profitMargin: number | null;
}

export interface CompareEarnings {
  eps: number | null;
  epsGrowthYoY: number | null;
}

export interface CompareEquityReturn {
  roe: number | null;
  roa: number | null;
  roic: number | null;
}

export interface CompareStockSuccess {
  symbol: string;
  profile: CompareProfile;
  keyStats: CompareKeyStats;
  pricePerformance: ComparePricePerformance;
  incomeStatement: CompareIncomeStatement;
  balanceSheet: CompareBalanceSheet;
  cashFlow: CompareCashFlow;
  priceRatios: ComparePriceRatios;
  margin: CompareMargin;
  earnings: CompareEarnings;
  equityReturn: CompareEquityReturn;
}

export interface CompareStockError {
  symbol: string;
  error: true;
  message: string;
}

export type CompareStockResult = CompareStockSuccess | CompareStockError;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function isUSSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (!upper.includes('.')) {
    return true;
  }
  const parts = upper.split('.');
  const suffix = parts[parts.length - 1];
  if (suffix.length === 1) {
    return true;
  }
  return false;
}

// 1. GET /api/profile/:symbol -> Company name, logo, sector, industry, country, website, description
router.get(
  '/profile/:symbol',
  apiLimiter,
  async (req: Request<{ symbol: string }>, res: Response<ProfileResponse>, next: NextFunction): Promise<void> => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      let profile: CompanyProfile | null = null;

      // --- LEVEL 1: YAHOO FINANCE ---
      try {
        profile = (await yahooService.getProfile(symbol)) as CompanyProfile | null;
      } catch (err) {
        console.warn(`[PROFILE ROUTE] Yahoo failed for ${symbol}:`, err instanceof Error ? err.message : String(err));
      }

      // --- LEVEL 2: FALLBACK TO SQLITE METADATA OR PLACEHOLDERS ---
      // Fetch local seeded stats if profile is empty or null
      let localMeta: StockMetadataRow | null = null;
      try {
        const stmt = db.prepare('SELECT name, exchange, sector, industry, country FROM stocks WHERE symbol = ?');
        localMeta = (stmt.get(symbol) as StockMetadataRow | undefined) ?? null;
      } catch (dbErr) {
        console.error('[PROFILE SQLITE CHECK FAIL]', dbErr);
      }

      const isUS = isUSSymbol(symbol);
      const payload: ProfileResponse = {
        symbol,
        name: profile?.name || localMeta?.name || symbol,
        logo: profile?.logo || '',
        sector: profile?.finnhubIndustry || localMeta?.sector || 'Industrial Sector',
        industry: profile?.finnhubIndustry || localMeta?.industry || 'Miscellaneous Industries',
        exchange: profile?.exchange || localMeta?.exchange || (isUS ? 'OTC Market' : 'International Exchange'),
        country: profile?.country || localMeta?.country || (isUS ? 'US' : 'International'),
        weburl: profile?.weburl || '',
        ipo: profile?.ipo || '—',
        description:
          profile?.description ||
          `${profile?.name || localMeta?.name || symbol} is a leading global enterprise registered in ${profile?.country || localMeta?.country || (isUS ? 'US markets' : 'international markets')}, specializing in ${profile?.finnhubIndustry || localMeta?.sector || 'specialized services'}.`
      };

      res.json(payload);

      // Fire-and-forget: start warming the EDGAR cache for this symbol in the background.
      // By the time the user navigates to the SEC tab (~10-30s), data will be pre-fetched.
      if (isUS) {
        setImmediate(() => prefetchEdgar(symbol));
      }
    } catch (error) {
      next(error);
    }
  }
);

// 2. GET /api/financials/:symbol -> P&L, balance sheet, cash flow history (Last 5 years annual)
router.get(
  '/financials/:symbol',
  apiLimiter,
  async (req: Request<{ symbol: string }>, res: Response<FinancialsResponse>, next: NextFunction): Promise<void> => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      let financials: FinancialStatementsHistory | null = null;

      try {
        financials = (await yahooService.getFinancials(symbol)) as FinancialStatementsHistory | null;
      } catch (yErr) {
        console.warn(`[FINANCIALS] Yahoo layer fail for ${symbol}:`, yErr instanceof Error ? yErr.message : String(yErr));
      }

      // Standardize mapping format for charts
      const result: FinancialsResponse = {
        symbol,
        incomeStatement:
          financials?.incomeStatement
            ?.map((r: RawIncomeStatement): NormalizedIncomeStatement => {
              const dateVal = r.endDate || r.fiscalDateEnding || '—';
              return {
                ...r,
                year: dateVal !== '—' ? new Date(dateVal).getFullYear() : '—',
                date: dateVal,
                revenue: getRawNumber(r.totalRevenue),
                grossProfit: getRawNumber(r.grossProfit),
                netIncome: getRawNumber(r.netIncome)
              };
            })
            ?.slice(0, 5)
            .reverse() || [],

        balanceSheet:
          financials?.balanceSheet
            ?.map((r: RawBalanceSheet): NormalizedBalanceSheet => {
              const dateVal = r.endDate || r.fiscalDateEnding || '—';
              return {
                ...r,
                year: dateVal !== '—' ? new Date(dateVal).getFullYear() : '—',
                date: dateVal,
                assets: getRawNumber(r.totalAssets),
                liabilities: getRawNumber(r.totalLiabilities),
                equity: getRawNumber(r.totalStockholderEquity) || getRawNumber(r.totalShareholderEquity)
              };
            })
            ?.slice(0, 5)
            .reverse() || [],

        cashFlow:
          financials?.cashFlow
            ?.map((r: RawCashFlowStatement): NormalizedCashFlowStatement => {
              const dateVal = r.endDate || r.fiscalDateEnding || '—';
              return {
                ...r,
                year: dateVal !== '—' ? new Date(dateVal).getFullYear() : '—',
                date: dateVal,
                operating: getRawNumber(r.totalCashFromOperatingActivities) || getRawNumber(r.operatingCashflow),
                investing: getRawNumber(r.totalCashflowsFromInvestingActivities) || getRawNumber(r.investingCashflow),
                financing: getRawNumber(r.totalCashFromFinancingActivities) || getRawNumber(r.financingCashflow)
              };
            })
            ?.slice(0, 5)
            .reverse() || [],

        quarterly: {
          incomeStatement: financials?.incomeStatementQuarterly || [],
          balanceSheet: financials?.balanceSheetQuarterly || [],
          cashFlow: financials?.cashFlowQuarterly || []
        }
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// 3. GET /api/ratios/:symbol -> P/E, P/B, ROE, ROCE, Debt/Equity, EPS, Market Cap, Dividend Yield
router.get(
  '/ratios/:symbol',
  apiLimiter,
  async (req: Request<{ symbol: string }>, res: Response<RatiosResponse>, next: NextFunction): Promise<void> => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      let metrics: BasicFinancialsData | null = null;

      try {
        metrics = (await yahooService.getBasicFinancials(symbol)) as BasicFinancialsData | null;
      } catch (err) {
        console.warn(`[RATIOS ROUTE] Yahoo basic metrics failed for ${symbol}:`, err instanceof Error ? err.message : String(err));
      }

      // Extract metrics parameters
      const m = metrics?.metric || {};

      const pe = m.peAnnual || null;
      const pb = m.pbAnnual || null;
      const roe = m.roeTTM || null;

      // Calculate real ROCE from fundamentals time series
      let roce: number | null = null;
      try {
        const timeSeries = await yahooService.getFundamentalsTimeSeries(
          symbol,
          new Date(Date.now() - 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0], // last 3 years
          new Date().toISOString().split('T')[0]
        );

        const sortedStatements = ((Array.isArray(timeSeries) ? timeSeries : []) as HistoricalGrowthStatement[]).sort(
          (a: HistoricalGrowthStatement, b: HistoricalGrowthStatement) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
        );

        const latest = sortedStatements[0];
        if (latest) {
          const ebit = latest.EBIT || latest.operatingIncome || null;
          const totalAssets = latest.totalAssets || null;
          const currentLiabilities = latest.currentLiabilities || null;
          if (ebit !== null && totalAssets !== null && currentLiabilities !== null) {
            const capEmployed = totalAssets - currentLiabilities;
            if (capEmployed > 0) {
              roce = (ebit / capEmployed) * 100;
            }
          }
        }
      } catch (tsErr) {
        console.warn(`[RATIOS ROUTE] Failed to calculate ROCE from timeseries for ${symbol}:`, tsErr instanceof Error ? tsErr.message : String(tsErr));
      }

      const de = m.debtEquityAnnual || null;
      const eps = m.epsBasicExclExtraItemsTTM || null;
      const mcap = m.marketCapitalization ? Number(m.marketCapitalization) : null;
      const divYield = m.dividendYieldIndicated || null;
      const ev = m.enterpriseValue ? Number(m.enterpriseValue) : null;
      const shares = m.sharesOutstanding ? Number(m.sharesOutstanding) : null;
      const bv = m.bookValue ? Number(m.bookValue) : null;
      const cash = m.totalCash ? Number(m.totalCash) : null;
      const debt = m.totalDebt ? Number(m.totalDebt) : null;
      const salesGrowth = m.revenueGrowth || null;
      const profitGrowth = m.earningsGrowth || null;

      const payload: RatiosResponse = {
        symbol,
        pe: pe ? Number(pe).toFixed(2) : '—',
        pb: pb ? Number(pb).toFixed(2) : '—',
        roe: roe ? `${Number(roe).toFixed(2)}%` : '—',
        roce: roce ? `${Number(roce).toFixed(2)}%` : '—',
        debt_equity: de ? Number(de).toFixed(2) : '—',
        eps: eps ? Number(eps).toFixed(2) : '—',
        market_cap: mcap ? mcap * 1000000 : null,
        dividend_yield: divYield ? `${Number(divYield).toFixed(2)}%` : '—',
        enterprise_value: ev,
        shares_outstanding: shares,
        book_value: bv,
        total_cash: cash,
        total_debt: debt,
        sales_growth: salesGrowth ? `${Number(salesGrowth).toFixed(2)}%` : '—',
        profit_growth: profitGrowth ? `${Number(profitGrowth).toFixed(2)}%` : '—',
        updated_at: Date.now()
      };

      res.json(payload);
    } catch (error) {
      next(error);
    }
  }
);

// Hardcoded curated direct-competitor maps for major tickers as tertiary fallback.
// These are carefully selected to only include companies that genuinely compete in the same market segment.
const KNOWN_COMPETITOR_MAP: Record<string, string[]> = {
  // Big Tech
  AAPL: ['MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
  MSFT: ['AAPL', 'GOOGL', 'AMZN', 'ORCL', 'IBM'],
  GOOGL: ['META', 'MSFT', 'AMZN', 'SNAP', 'TTD'],
  GOOG: ['META', 'MSFT', 'AMZN', 'SNAP', 'TTD'],
  META: ['GOOGL', 'SNAP', 'PINS', 'TWTR', 'MTCH'],
  AMZN: ['MSFT', 'GOOGL', 'WMT', 'BABA', 'SHOP'],
  NVDA: ['AMD', 'INTC', 'QCOM', 'AVGO', 'MRVL'],
  AMD: ['NVDA', 'INTC', 'QCOM', 'AVGO', 'ARM'],
  INTC: ['AMD', 'NVDA', 'QCOM', 'TSM', 'AVGO'],
  // Semiconductors
  QCOM: ['INTC', 'AMD', 'AVGO', 'MRVL', 'SWKS'],
  AVGO: ['QCOM', 'MRVL', 'INTC', 'SWKS', 'QRVO'],
  TSM: ['INTC', 'SSNLF', 'GFS', 'UMC', 'AMAT'],
  AMAT: ['LRCX', 'KLAC', 'ASML', 'TOELY', 'ONTO'],
  // E-Commerce / Retail
  WMT: ['AMZN', 'TGT', 'COST', 'KR', 'DG'],
  TGT: ['WMT', 'AMZN', 'COST', 'DG', 'DLTR'],
  COST: ['WMT', 'TGT', 'BJ', 'AMZN', 'KR'],
  // Finance
  JPM: ['BAC', 'WFC', 'C', 'GS', 'MS'],
  BAC: ['JPM', 'WFC', 'C', 'USB', 'PNC'],
  GS: ['MS', 'JPM', 'C', 'BAC', 'UBS'],
  MS: ['GS', 'JPM', 'BAC', 'C', 'SCHW'],
  V: ['MA', 'AXP', 'PYPL', 'DFS', 'SQ'],
  MA: ['V', 'AXP', 'PYPL', 'DFS', 'SQ'],
  PYPL: ['SQ', 'V', 'MA', 'AAPL', 'ADYEN'],
  // Streaming / Entertainment
  NFLX: ['DIS', 'PARA', 'WBD', 'AMZN', 'AAPL'],
  DIS: ['NFLX', 'PARA', 'WBD', 'CMCSA', 'SONY'],
  // Electric Vehicles
  TSLA: ['GM', 'F', 'RIVN', 'LCID', 'NIO'],
  RIVN: ['TSLA', 'LCID', 'GM', 'F', 'FSR'],
  // Energy
  XOM: ['CVX', 'COP', 'SLB', 'EOG', 'PXD'],
  CVX: ['XOM', 'COP', 'SLB', 'BP', 'SHEL'],
  // Healthcare / Pharma
  JNJ: ['PFE', 'ABBV', 'MRK', 'BMY', 'LLY'],
  PFE: ['JNJ', 'ABBV', 'MRK', 'BMY', 'AZN'],
  LLY: ['PFE', 'JNJ', 'ABBV', 'MRK', 'NVO'],
  // India
  RELIANCE: ['TCS', 'ONGC', 'HDFCBANK', 'INFY', 'ITC'],
  TCS: ['INFY', 'WIPRO', 'HCL', 'TECHM', 'LTI'],
  INFY: ['TCS', 'WIPRO', 'HCL', 'TECHM', 'LTI'],
  HDFCBANK: ['ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'INDUSIND'],
  ICICIBANK: ['HDFCBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'INDUSIND']
};

// 4. GET /api/peers/:symbol -> list of direct competitors only
router.get(
  '/peers/:symbol',
  apiLimiter,
  async (req: Request<{ symbol: string }>, res: Response<PeerComparisonItem[]>, next: NextFunction): Promise<void> => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      let peers: string[] = [];

      // --- LEVEL 1: YAHOO FINANCE PEERS ---
      try {
        const yahooPeers = await yahooService.getPeers(symbol);
        if (yahooPeers && yahooPeers.length > 0) {
          peers = yahooPeers.filter((p: string) => p !== symbol).slice(0, 7);
        }
      } catch (err) {
        console.warn(`[PEERS ROUTE] Yahoo peers query fail for ${symbol}:`, err instanceof Error ? err.message : String(err));
      }

      // --- LEVEL 2: KNOWN COMPETITOR MAP (curated hardcoded direct competitors) ---
      if (peers.length === 0 && KNOWN_COMPETITOR_MAP[symbol]) {
        peers = KNOWN_COMPETITOR_MAP[symbol].slice(0, 7);
      }

      // --- LEVEL 3: SQLITE PEERS FROM SAME INDUSTRY+SECTOR FALLBACK ---
      if (peers.length === 0) {
        try {
          const metaStmt = db.prepare('SELECT sector, industry FROM stocks WHERE symbol = ?');
          const stockMeta = metaStmt.get(symbol) as { sector: string; industry: string } | undefined;

          if (stockMeta?.industry) {
            // Try industry-level match first (tightest)
            const industryPeersStmt = db.prepare(
              'SELECT symbol FROM stocks WHERE industry = ? AND symbol != ? LIMIT 7'
            );
            const industryPeersList = industryPeersStmt.all(stockMeta.industry, symbol) as Array<{ symbol: string }>;
            peers = industryPeersList.map(p => p.symbol);
          }

          // If industry is too sparse, widen to sector but cap tightly
          if (peers.length < 3 && stockMeta?.sector) {
            const sectorPeersStmt = db.prepare(
              'SELECT symbol FROM stocks WHERE sector = ? AND symbol != ? LIMIT 7'
            );
            const sectorPeersList = sectorPeersStmt.all(stockMeta.sector, symbol) as Array<{ symbol: string }>;
            // Merge without duplicates
            const extra = sectorPeersList.map(p => p.symbol).filter(s => !peers.includes(s));
            peers = [...peers, ...extra].slice(0, 7);
          }
        } catch (dbErr) {
          console.error('[PEERS SQLITE FALLBACK ERROR]', dbErr);
        }
      }

      // Always ensure current company is included first in the list
      if (!peers.includes(symbol)) {
        peers.unshift(symbol);
      }

      // Construct pricing grid elements for Peers Comparison table in UI
      const peersMetrics: PeerComparisonItem[] = await Promise.all(
        peers.slice(0, 8).map(async (peerSymbol): Promise<PeerComparisonItem> => {
          // Find name / exchange in SQLite
          let profileStmt: StockMetadataRow | undefined;
          try {
            profileStmt = db.prepare('SELECT name, sector, exchange FROM stocks WHERE symbol = ?').get(peerSymbol) as StockMetadataRow | undefined;
          } catch (e) {
            console.debug(`[PEERS] Failed to fetch SQLite profile for ${peerSymbol}:`, e instanceof Error ? e.message : String(e));
          }

          let price: number | null = null;
          try {
            const q = await yahooService.getQuote(peerSymbol);
            price = q?.price ?? null;
          } catch (e) {
            console.debug(`[PEERS] Failed to fetch live quote for ${peerSymbol}:`, e instanceof Error ? e.message : String(e));
          }

          let cachedRatios: BasicFinancialsData | null = null;
          try {
            cachedRatios = (await yahooService.getBasicFinancials(peerSymbol)) as BasicFinancialsData | null;
          } catch (e) {
            console.debug(`[PEERS] Failed to fetch basic financials for ${peerSymbol}:`, e instanceof Error ? e.message : String(e));
          }

          const pe = cachedRatios?.metric?.peAnnual ?? null;
          const pb = cachedRatios?.metric?.pbAnnual ?? null;
          const roe = cachedRatios?.metric?.roeTTM ? `${Number(cachedRatios.metric.roeTTM).toFixed(2)}%` : null;
          const mcap = cachedRatios?.metric?.marketCapitalization ? Number(cachedRatios.metric.marketCapitalization) * 1000000 : null;

          return {
            symbol: peerSymbol,
            name: profileStmt?.name || `${peerSymbol} Corp`,
            price: price,
            mcap: mcap,
            pe: pe ? Number(pe).toFixed(2) : '—',
            pb: pb ? Number(pb).toFixed(2) : '—',
            roe: roe || '—',
            exchange: profileStmt?.exchange || 'NYSE'
          };
        })
      );

      res.json(peersMetrics);
    } catch (error) {
      next(error);
    }
  }
);

// 5. GET /api/shareholding/:symbol -> major holders, institutional ownership, mutual fund ownership
router.get(
  '/shareholding/:symbol',
  apiLimiter,
  async (req: Request<{ symbol: string }>, res: Response<ShareholdingResponse>, _next: NextFunction): Promise<void> => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      const data = (await yahooService.getShareholding(symbol)) as ShareholdingResponse;
      res.json(data);
    } catch (error) {
      console.warn(`[SHAREHOLDING ROUTE] Failed for ${symbol}:`, error instanceof Error ? error.message : String(error));
      const fallbackPayload: ShareholdingResponse = {
        majorHolders: {
          insidersPercentHeld: null,
          institutionsPercentHeld: null,
          institutionsFloatPercentHeld: null,
          institutionsCount: null
        },
        institutionalHolders: [],
        mutualFundHolders: []
      };
      res.json(fallbackPayload);
    }
  }
);

// 6. GET /api/compare -> Compare up to 4 stocks side-by-side
router.get(
  '/compare',
  apiLimiter,
  async (
    req: Request<Record<string, never>, CompareStockResult[] | { error: string }, Record<string, never>, { symbols?: string }>,
    res: Response<CompareStockResult[] | { error: string }>,
    next: NextFunction
  ): Promise<void> => {
    const symbolsQuery = ((req.query.symbols as string) || '').toString().trim();
    if (!symbolsQuery) {
      res.status(400).json({ error: 'Missing symbols query parameter' });
      return;
    }

    const symbols = symbolsQuery
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4);

    if (symbols.length === 0) {
      res.status(400).json({ error: 'No valid symbols provided' });
      return;
    }

    try {
      const results: CompareStockResult[] = await Promise.all(
        symbols.map(async (symbol): Promise<CompareStockResult> => {
          try {
            // 1. Fetch Profile
            const profile = (await yahooService.getProfile(symbol)) as CompanyProfile | null;

            // 2. Fetch Basic Ratios
            const basic = (await yahooService.getBasicFinancials(symbol)) as BasicFinancialsData | null;
            const m = basic?.metric || {};

            // 3. Fetch Candles to compute Price Performance
            const to = Math.floor(Date.now() / 1000);
            const from = to - (375 * 24 * 3600); // 375 days of history
            const candles = (await yahooService.getCandles(symbol, 'D', from, to)) as StockCandles | null;

            let performance: {
              oneWeek: number | null;
              threeMonths: number | null;
              ytd: number | null;
              oneYear: number | null;
            } = {
              oneWeek: null,
              threeMonths: null,
              ytd: null,
              oneYear: null
            };

            if (candles && candles.s === 'ok' && candles.c && candles.c.length > 0 && candles.t && candles.t.length > 0) {
              const prices = candles.c;
              const timestamps = candles.t;
              const count = prices.length;
              const currentPrice = prices[count - 1];

              const findClosestIndex = (targetTime: number) => {
                let closestIdx = -1;
                let minDiff = Infinity;
                for (let i = 0; i < timestamps.length; i++) {
                  const diff = Math.abs(timestamps[i] - targetTime);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                  }
                }
                // If the closest data point is more than 10 days away, reject it
                if (minDiff > 10 * 24 * 3600) return -1;
                return closestIdx;
              };

              const oneWeekAgoTarget = to - (7 * 24 * 3600);
              const threeMonthsAgoTarget = to - (90 * 24 * 3600);
              const oneYearAgoTarget = to - (365 * 24 * 3600);

              const oneWeekIdx = findClosestIndex(oneWeekAgoTarget);
              const threeMonthsIdx = findClosestIndex(threeMonthsAgoTarget);
              const oneYearIdx = findClosestIndex(oneYearAgoTarget);

              // YTD calculation
              const currentYear = new Date().getFullYear();
              let ytdIdx = -1;
              for (let i = 0; i < timestamps.length; i++) {
                const date = new Date(timestamps[i] * 1000);
                if (date.getFullYear() === currentYear) {
                  ytdIdx = i;
                  break;
                }
              }

              const calcReturn = (pastPrice: number | undefined) => {
                if (pastPrice === undefined || pastPrice === null || pastPrice === 0) return null;
                return ((currentPrice - pastPrice) / pastPrice) * 100;
              };

              performance = {
                oneWeek: oneWeekIdx !== -1 ? calcReturn(prices[oneWeekIdx]) : null,
                threeMonths: threeMonthsIdx !== -1 ? calcReturn(prices[threeMonthsIdx]) : null,
                ytd: ytdIdx !== -1 ? calcReturn(prices[ytdIdx]) : null,
                oneYear: oneYearIdx !== -1 ? calcReturn(prices[oneYearIdx]) : null
              };
            }

            // 4. Fetch Multi-Year (fundamentalsTimeSeries) for Income Statement, Balance Sheet, Cash Flow
            const timeSeries = await yahooService.getFundamentalsTimeSeries(
              symbol,
              new Date(Date.now() - 4 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0], // last 4 years
              new Date().toISOString().split('T')[0]
            );

            // Get latest and previous annual statement for growth calculations
            const sortedStatements = ((Array.isArray(timeSeries) ? timeSeries : []) as HistoricalGrowthStatement[]).sort(
              (a: HistoricalGrowthStatement, b: HistoricalGrowthStatement) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              }
            );

            const latest: Partial<HistoricalGrowthStatement> = sortedStatements[0] || {};
            const previous: Partial<HistoricalGrowthStatement> = sortedStatements[1] || {};

            const latestDate = latest.date ? new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

            // Accounts Receivable Turnover = Revenue / Accounts Receivable
            let receivablesTurnover: number | null = null;
            const rev = latest.totalRevenue || latest.operatingRevenue || null;
            const ar = latest.accountsReceivable || null;
            if (rev && ar && ar !== 0) {
              receivablesTurnover = rev / ar;
            }

            // Revenue Growth YoY
            let revenueGrowthYoY: number | null = null;
            const prevRev = previous.totalRevenue || previous.operatingRevenue || null;
            if (rev && prevRev && prevRev !== 0) {
              revenueGrowthYoY = ((rev - prevRev) / prevRev) * 100;
            }

            // EPS Growth YoY
            let epsGrowthYoY: number | null = null;
            const latestEPS = latest.basicEPS || latest.dilutedEPS || null;
            const prevEPS = previous.basicEPS || previous.dilutedEPS || null;
            if (latestEPS && prevEPS && prevEPS !== 0) {
              epsGrowthYoY = ((latestEPS - prevEPS) / prevEPS) * 100;
            }

            // Smart margin calculations & fallbacks (using annual statements if TTM modules are empty)
            let grossMargin = (m.grossMargins as number | null) || null;
            if (grossMargin === null && rev && latest.grossProfit && rev !== 0) {
              grossMargin = (latest.grossProfit / rev) * 100;
            }

            let operatingMargin = (m.operatingMargins as number | null) || null;
            if (operatingMargin === null && rev && latest.operatingIncome && rev !== 0) {
              operatingMargin = (latest.operatingIncome / rev) * 100;
            }

            let profitMargin = (m.profitMargins as number | null) || null;
            if (profitMargin === null && rev && latest.netIncome && rev !== 0) {
              profitMargin = (latest.netIncome / rev) * 100;
            }

            // Smart fallback for Free Cash Flow & P/FCF calculation
            const fcf = (m.freeCashflow as number | null) || latest.freeCashFlow || null;
            const mcapNum = m.marketCapitalization ? Number(m.marketCapitalization) : null;
            const pFreeCashFlow = fcf && mcapNum ? (mcapNum * 1000000) / fcf : null;

            // Calculate real ROIC
            let calculatedRoic: number | null = null;
            const ebitVal = latest.EBIT || latest.operatingIncome || null;
            if (ebitVal !== null) {
              let cap = latest.investedCapital || null;
              if (cap === null) {
                const eq = latest.stockholdersEquity || latest.totalEquityGrossMinorityInterest || null;
                const debt = latest.totalDebt !== undefined && latest.totalDebt !== null
                  ? latest.totalDebt
                  : ((latest.longTermDebt || 0) + (latest.currentDebt || 0));
                const cashVal = latest.cashCashEquivalentsAndShortTermInvestments || latest.cashAndCashEquivalents || latest.cashFinancial || 0;
                if (eq !== null) {
                  cap = eq + debt - cashVal;
                }
              }
              if (cap !== null && cap > 0) {
                const taxRate = latest.taxRateForCalcs !== undefined && latest.taxRateForCalcs !== null
                  ? latest.taxRateForCalcs
                  : 0.21;
                const nopat = ebitVal * (1 - taxRate);
                calculatedRoic = (nopat / cap) * 100;
              }
            }

            const payload: CompareStockSuccess = {
              symbol,
              profile: {
                name: profile?.name || symbol,
                sector: profile?.finnhubIndustry || profile?.sector || 'Industrial Sector',
                industry: profile?.finnhubIndustry || profile?.industry || 'Miscellaneous Industries',
                ceo: profile?.ceo || '—',
                exchange: profile?.exchange || 'OTC Market',
                country: profile?.country || 'US',
                logo: profile?.logo || ''
              },
              keyStats: {
                asOf: latestDate,
                marketCap: m.marketCapitalization ? Number(m.marketCapitalization) * 1000000 : null,
                enterpriseValue: (m.enterpriseValue as number | null) || null,
                peRatio: (m.peTrailing as number | null) || (m.peAnnual as number | null) || null,
                eps: (m.epsBasicExclExtraItemsTTM as number | null) || latest.basicEPS || latest.dilutedEPS || null,
                dividendRate: (m.dividendRate as number | null) || null,
                dividendYield: (m.dividendYield as number | null) || null
              },
              pricePerformance: {
                asOf: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                oneWeek: performance.oneWeek,
                threeMonths: performance.threeMonths,
                ytd: performance.ytd,
                oneYear: performance.oneYear
              },
              incomeStatement: {
                asOf: latestDate,
                revenue: rev,
                operatingExpenses: latest.operatingExpense || null,
                operatingIncome: latest.operatingIncome || null,
                revenueGrowthYoY,
                grossProfit: latest.grossProfit || null
              },
              balanceSheet: {
                asOf: latestDate,
                inventory: latest.inventory || null,
                receivablesTurnover
              },
              cashFlow: {
                asOf: latestDate,
                operatingCashFlow: latest.operatingCashFlow || null,
                capex: latest.capitalExpenditure ? Math.abs(latest.capitalExpenditure) : null,
                investingCashFlow: latest.investingCashFlow || latest.cashFlowFromContinuingInvestingActivities || null,
                freeCashFlow: fcf
              },
              priceRatios: {
                pe: (m.peTrailing as number | null) || (m.peAnnual as number | null) || null,
                forwardPe: (m.peForward as number | null) || null,
                pFreeCashFlow,
                pBook: (m.priceToBook as number | null) || null,
                pSales: (m.priceToSales as number | null) || null,
                evEbitda: (m.enterpriseToEbitda as number | null) || (m.enterpriseValue && latest.EBITDA ? Number(m.enterpriseValue) / latest.EBITDA : null)
              },
              margin: {
                operatingMargin,
                grossMargin,
                profitMargin
              },
              earnings: {
                eps: latest.basicEPS || latest.dilutedEPS || (m.epsBasicExclExtraItemsTTM as number | null) || null,
                epsGrowthYoY
              },
              equityReturn: {
                roe: (m.roeTTM as number | null) || null,
                roa: (m.roaTTM as number | null) || null,
                roic: calculatedRoic
              }
            };

            return payload;
          } catch (symError) {
            const message = symError instanceof Error ? symError.message : 'Failed to fetch comparison data';
            console.error(`[COMPARE SYMBOL ERROR] Failed for ${symbol}:`, message);
            const errPayload: CompareStockError = {
              symbol,
              error: true,
              message
            };
            return errPayload;
          }
        })
      );

      res.json(results);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

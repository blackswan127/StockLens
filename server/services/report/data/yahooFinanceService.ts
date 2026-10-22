import YahooFinance from 'yahoo-finance2';
import { yahooService } from '../../yahoo.js';

const yahooFinance = new YahooFinance();

export interface QuoteSummaryData {
  assetProfile?: {
    sector?: string;
    industry?: string;
    longBusinessSummary?: string;
    longName?: string;
    finnhubIndustry?: string;
    website?: string;
    city?: string;
    country?: string;
    fullTimeEmployees?: number;
    [key: string]: unknown;
  };
  defaultKeyStatistics?: {
    trailingPE?: number | null;
    forwardPE?: number | null;
    pegRatio?: number | null;
    priceToBook?: number | null;
    dividendYield?: number | null;
    marketCap?: number | null;
    enterpriseValue?: number | null;
    enterpriseToEbitda?: number | null;
    sharesOutstanding?: number | null;
    bookValue?: number | null;
    beta?: number | null;
    trailingEps?: number | null;
    forwardEps?: number | null;
    totalStockholderEquity?: number | null;
    stockholdersEquity?: number | null;
    totalAssets?: number | null;
    totalCurrentAssets?: number | null;
    currentAssets?: number | null;
    totalCurrentLiabilities?: number | null;
    currentLiabilities?: number | null;
    totalDebt?: number | null;
    shortLongTermDebt?: number | null;
    longTermDebt?: number | null;
    [key: string]: unknown;
  };
  financialData?: {
    currentPrice?: number | null;
    targetHighPrice?: number | null;
    targetLowPrice?: number | null;
    targetMeanPrice?: number | null;
    targetMedianPrice?: number | null;
    recommendationMean?: number | null;
    recommendationKey?: string;
    numberOfAnalystOpinions?: number;
    totalRevenue?: number | null;
    grossProfit?: number | null;
    operatingIncome?: number | null;
    netIncome?: number | null;
    netIncomeToNonControllingInterests?: number | null;
    freeCashflow?: number | null;
    operatingCashflow?: number | null;
    totalDebt?: number | null;
    totalCash?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
    returnOnAssets?: number | null;
    revenueGrowth?: number | null;
    earningsGrowth?: number | null;
    grossMargins?: number | null;
    operatingMargins?: number | null;
    profitMargins?: number | null;
    [key: string]: unknown;
  };
  recommendationTrend?: {
    trend?: Array<{
      period?: string;
      strongBuy?: number;
      buy?: number;
      hold?: number;
      sell?: number;
      strongSell?: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  earningsTrend?: {
    trend?: Array<{
      period?: string;
      growth?: number;
      earningsEstimate?: {
        avg?: number;
        low?: number;
        high?: number;
        [key: string]: unknown;
      };
      revenueEstimate?: {
        avg?: number;
        low?: number;
        high?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  price?: {
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number | null;
    regularMarketChange?: number | null;
    regularMarketChangePercent?: number | null;
    regularMarketTime?: Date | number;
    exchangeName?: string;
    marketCap?: number | null;
    currency?: string;
    [key: string]: unknown;
  };
  quoteType?: {
    symbol?: string;
    shortName?: string;
    longName?: string;
    quoteType?: string;
    exchange?: string;
    [key: string]: unknown;
  };
  summaryDetail?: {
    trailingPE?: number | null;
    forwardPE?: number | null;
    priceToSalesTrailing12Months?: number | null;
    dividendYield?: number | null;
    fiftyTwoWeekHigh?: number | null;
    fiftyTwoWeekLow?: number | null;
    marketCap?: number | null;
    fiftyDayAverage?: number | null;
    twoHundredDayAverage?: number | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HistoricalPriceQuote {
  date: Date | string;
  close: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  adjclose?: number | null;
  [key: string]: unknown;
}

export interface FundamentalTimeSeriesItem {
  date?: Date | string;
  totalRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  netIncomeToNonControllingInterests?: number | null;
  totalAssets?: number | null;
  stockholdersEquity?: number | null;
  totalStockholderEquity?: number | null;
  currentAssets?: number | null;
  totalCurrentAssets?: number | null;
  currentLiabilities?: number | null;
  totalCurrentLiabilities?: number | null;
  totalDebt?: number | null;
  shortLongTermDebt?: number | null;
  longTermDebt?: number | null;
  [key: string]: unknown;
}

export interface YFData {
  profile: QuoteSummaryData;
  quoteSummary: QuoteSummaryData;
  history: HistoricalPriceQuote[];
  fundamentals?: FundamentalTimeSeriesItem[];
  returns?: {
    oneMonth: number | null;
    threeMonth: number | null;
    oneYear: number | null;
    threeYear: number | null;
    fiveYear: number | null;
  };
}

export async function fetchYahooData(ticker: string): Promise<YFData> {
  const profileRaw = await yahooFinance.quoteSummary(ticker, { 
    modules: [
      'assetProfile', 
      'defaultKeyStatistics', 
      'financialData', 
      'recommendationTrend',
      'earningsTrend',
      'price',
      'quoteType',
      'summaryDetail'
    ] 
  });
  const profile = profileRaw as QuoteSummaryData;
  
  let fundamentals: FundamentalTimeSeriesItem[] = [];
  try {
    const to = new Date().toISOString().split('T')[0];
    // Fetch 6 years of data to ensure we get 5 full annual periods
    const from = new Date(Date.now() - 6 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    fundamentals = (await yahooService.getFundamentalsTimeSeries(ticker, from, to)) as FundamentalTimeSeriesItem[];
  } catch (err) {
    console.error(`Failed to fetch time series fundamentals for ${ticker}:`, err);
  }

  // Fetch 5 years of price history for returns calculation
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const period1 = fiveYearsAgo.toISOString().split('T')[0];
  
  let history: HistoricalPriceQuote[] = [];
  let returns: YFData['returns'] = { oneMonth: null, threeMonth: null, oneYear: null, threeYear: null, fiveYear: null };
  try {
    const historyResult = await yahooFinance.chart(ticker, { period1, interval: '1d' });
    history = historyResult.quotes as HistoricalPriceQuote[];

    // Calculate returns
    if (history.length > 0) {
      const currentPrice = history[history.length - 1].close;
      
      const getPriceAtOffset = (days: number): number | null => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - days);
        // Find closest date before or equal
        for (let i = history.length - 1; i >= 0; i--) {
          if (new Date(history[i].date) <= targetDate) {
            return history[i].close;
          }
        }
        return history[0].close; // fallback to oldest
      };

      const p1m = getPriceAtOffset(30);
      const p3m = getPriceAtOffset(90);
      const p1y = getPriceAtOffset(365);
      const p3y = getPriceAtOffset(365 * 3);
      const p5y = history[0].close;

      const calcReturn = (past: number | null | undefined): number | null => {
        if (currentPrice === null || currentPrice === undefined || past === null || past === undefined || past === 0) {
          return null;
        }
        return (currentPrice - past) / past;
      };

      returns = {
        oneMonth: calcReturn(p1m),
        threeMonth: calcReturn(p3m),
        oneYear: calcReturn(p1y),
        threeYear: calcReturn(p3y),
        fiveYear: calcReturn(p5y),
      };
    }
  } catch (err) {
    console.error(`Failed to fetch chart history for ${ticker}:`, err);
  }
  
  return {
    profile,
    quoteSummary: profile, // for convenience
    history,
    fundamentals,
    returns
  };
}

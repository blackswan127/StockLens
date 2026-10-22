export interface CompanyProfile {
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

export interface CompanyRatios {
  symbol: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  debt_equity: string;
  eps: string;
  market_cap: number;
  dividend_yield: string;
  enterprise_value?: number | null;
  shares_outstanding?: number | null;
  book_value?: number | null;
  total_cash?: number | null;
  total_debt?: number | null;
  sales_growth?: string | null;
  profit_growth?: string | null;
}

export interface Peer {
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  pe: number;
  pb: number;
  roe: string;
  exchange: string;
}

export interface StockQuote {
  price?: number | null;
  high?: number | null;
  low?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
  change?: number | null;
  changePercent?: number | null;
  updated_at?: string | null;
}

export interface MajorHolders {
  insidersPercentHeld?: number | null;
  institutionsPercentHeld?: number | null;
  institutionsFloatPercentHeld?: number | null;
  institutionsCount?: number | null;
}

export interface InstitutionalHolder {
  organization?: string | null;
  cusip?: string | null;
  position?: number | null;
  reportDate?: string | null;
  pctHeld?: number | null;
  value?: number | null;
}

export interface ShareholdingData {
  majorHolders?: MajorHolders | null;
  institutionalHolders?: InstitutionalHolder[] | null;
  mutualFundHolders?: unknown[] | null;
}

export interface CompanyNewsItem {
  id?: string | number | null;
  datetime?: number | null;
  source?: string | null;
  headline?: string | null;
  summary?: string | null;
  url?: string | null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const asStockQuote = (value: unknown): StockQuote | null =>
  isObject(value) ? (value as StockQuote) : null;

export const asShareholding = (value: unknown): ShareholdingData | null =>
  isObject(value) ? (value as ShareholdingData) : null;

export const asCompanyNews = (value: unknown): CompanyNewsItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CompanyNewsItem =>
      isObject(item) && (typeof item.headline === 'string' || typeof item.summary === 'string')
  );
};

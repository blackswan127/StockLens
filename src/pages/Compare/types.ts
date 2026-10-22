import type { ReactNode } from 'react';

export interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange: string;
  country: string;
  isLocal: boolean;
}

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

export interface CompareMargins {
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

export interface StockData {
  symbol: string;
  error?: boolean;
  message?: string;
  profile: CompareProfile;
  keyStats: CompareKeyStats;
  pricePerformance: ComparePricePerformance;
  incomeStatement: CompareIncomeStatement;
  balanceSheet: CompareBalanceSheet;
  cashFlow: CompareCashFlow;
  priceRatios: ComparePriceRatios;
  margin: CompareMargins;
  earnings: CompareEarnings;
  equityReturn: CompareEquityReturn;
}

export interface CompareColumn {
  symbol: string;
  loading: boolean;
  details: StockData | null;
}

export type SectionKey =
  | 'general'
  | 'performance'
  | 'income'
  | 'balance'
  | 'cash'
  | 'ratios'
  | 'margin'
  | 'earnings'
  | 'return';

export type CollapsedSections = Record<SectionKey, boolean>;

export type CurrencyMode = 'USD' | 'LCL';

export type BetterDirection = 'high' | 'low';

export interface MetricRowOptions {
  commonSize: boolean;
}

export interface CompareMetricRow {
  id: string;
  label: string;
  better: BetterDirection;
  getRawValue: (stock: StockData, options: MetricRowOptions) => number | null;
  render: (stock: StockData, options: MetricRowOptions) => ReactNode;
}

export interface CompareSectionsProps {
  columns: CompareColumn[];
  collapsedSections: CollapsedSections;
  onToggleSection: (section: SectionKey) => void;
  highlightHighLow: boolean;
  commonSize: boolean;
}

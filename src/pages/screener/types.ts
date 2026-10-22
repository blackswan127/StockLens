export interface ScreenerStock {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  country: string;
  price: number | null;
  change_pct: number | null;
  market_cap: number | null;

  // Valuation
  peTrailing: number | null;
  peForward: number | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  dividend: number | null;

  // Ratios
  roe: number | null;
  roa: number | null;
  debt_equity: number | null;
  current_ratio: number | null;

  // Income Statement
  rev_growth: number | null;
  eps_growth: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;

  // Balance Sheet
  fcf: number | null;
  total_debt: number | null;
}

export interface SectorStat {
  name: string;
  proxy: string;
  performance: number;
}

export type MetricType = 'categorical' | 'numeric';

export interface PresetRange {
  id: string;
  label: string;
}

export type MetricCategory =
  | 'Popular'
  | 'Valuation'
  | 'Ratios'
  | 'Financials - Income Statement'
  | 'Financials - Balance Sheet';

export interface Metric {
  id: string;
  name: string;
  category: MetricCategory;
  description: string;
  type: MetricType;
  unit?: string;
  placeholder?: string;
  presets?: PresetRange[];
  options?: string[];
}

export type Operator = 'more' | 'less' | 'equal' | 'between';

export interface NumericCustomRange {
  operator: Operator;
  value1: string;
  value2: string;
}

export interface NumericFilterValue {
  kind: 'numeric';
  preset?: string;
  custom?: NumericCustomRange;
}

export interface CategoricalFilterValue {
  kind: 'categorical';
  selected: string[];
}

export type FilterValue = NumericFilterValue | CategoricalFilterValue;
export type FilterState = Record<string, FilterValue>;

export type SortOrder = 'asc' | 'desc';

export interface ScreenerResponse {
  results: ScreenerStock[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MarketMoverStock {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  change_pct: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  change_52w: number | null;
}

export interface MarketMoversResponse {
  most_active: MarketMoverStock[];
  trending: MarketMoverStock[];
  gainers: MarketMoverStock[];
  losers: MarketMoverStock[];
  highs_52w: MarketMoverStock[];
  lows_52w: MarketMoverStock[];
}

export type ActivityTabId =
  | 'most_active'
  | 'trending'
  | 'gainers'
  | 'losers'
  | 'highs_52w'
  | 'lows_52w';

export interface ActivityTab {
  id: ActivityTabId;
  label: string;
}

export interface ScreenerQueryInput {
  filters: FilterState;
  searchQuery: string;
  sortBy: string;
  sortOrder: SortOrder;
  page: number;
}

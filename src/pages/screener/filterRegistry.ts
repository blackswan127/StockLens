import {
  Star,
  Percent,
  Wallet,
  Building2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type {
  FilterValue,
  Metric,
  MetricCategory,
  Operator,
} from './types';

export const CATEGORIES = [
  'Popular',
  'Valuation',
  'Ratios',
  'Financials - Income Statement',
  'Financials - Balance Sheet',
] as const satisfies readonly MetricCategory[];

export const CATEGORY_ICONS: Record<MetricCategory, LucideIcon> = {
  Popular: Star,
  Valuation: Wallet,
  Ratios: Percent,
  'Financials - Income Statement': TrendingUp,
  'Financials - Balance Sheet': Building2,
};

export const METRIC_REGISTRY: Metric[] = [
  // --- Popular ---------------------------------------------------------
  {
    id: 'market_cap',
    name: 'Market Cap',
    category: 'Popular',
    description: 'Total market value of a company\'s outstanding shares.',
    type: 'numeric',
    unit: '$',
    placeholder: 'e.g. 10B',
    presets: [
      { id: 'small', label: 'Small Cap (Under $2B)' },
      { id: 'mid', label: 'Mid Cap ($2B - $10B)' },
      { id: 'large', label: 'Large Cap ($10B - $200B)' },
      { id: 'mega', label: 'Mega Cap (Above $200B)' },
    ],
  },
  {
    id: 'exchange',
    name: 'Exchange',
    category: 'Popular',
    description: 'The stock exchange a security is primarily listed on.',
    type: 'categorical',
    options: ['NASDAQ', 'NYSE', 'NSE', 'LSE', 'XETRA', 'TSE'],
  },
  {
    id: 'sector',
    name: 'Sector',
    category: 'Popular',
    description: 'The broad industry sector a company is classified under.',
    type: 'categorical',
    options: [
      'Technology',
      'Healthcare',
      'Financial Services',
      'Consumer Cyclical',
      'Consumer Defensive',
      'Industrials',
      'Energy',
      'Utilities',
      'Real Estate',
      'Communication Services',
      'Basic Materials',
    ],
  },

  // --- Valuation ---------------------------------------------------------
  {
    id: 'trailing_pe',
    name: 'Trailing P/E',
    category: 'Valuation',
    description: 'P/E ratio using earnings from the last 12 months.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 20',
    presets: [
      { id: 'below0', label: 'Below 0' },
      { id: '0to20', label: '0 to 20' },
      { id: '20to50', label: '20 to 50' },
      { id: '50to80', label: '50 to 80' },
      { id: 'above80', label: 'Above 80' },
    ],
  },
  {
    id: 'forward_pe',
    name: 'Forward P/E',
    category: 'Valuation',
    description: 'P/E ratio using analyst-estimated earnings for the next 12 months.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 18',
    presets: [
      { id: 'below0', label: 'Below 0' },
      { id: '0to15', label: '0 to 15' },
      { id: '15to30', label: '15 to 30' },
      { id: 'above30', label: 'Above 30' },
    ],
  },
  {
    id: 'peg_ratio',
    name: 'PEG Ratio',
    category: 'Valuation',
    description: 'P/E ratio divided by expected earnings growth rate.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 1.5',
    presets: [
      { id: 'below1', label: 'Below 1' },
      { id: '1to2', label: '1 to 2' },
      { id: '2to3', label: '2 to 3' },
      { id: 'above3', label: 'Above 3' },
    ],
  },
  {
    id: 'price_book',
    name: 'Price / Book Value (P/B)',
    category: 'Valuation',
    description: 'Share price relative to book value per share.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 3',
    presets: [
      { id: 'below1', label: 'Below 1' },
      { id: '1to3', label: '1 to 3' },
      { id: '3to6', label: '3 to 6' },
      { id: 'above6', label: 'Above 6' },
    ],
  },
  {
    id: 'price_sales',
    name: 'Price / Sales (P/S)',
    category: 'Valuation',
    description: 'Share price relative to revenue per share.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 4',
    presets: [
      { id: 'below1', label: 'Below 1' },
      { id: '1to5', label: '1 to 5' },
      { id: '5to10', label: '5 to 10' },
      { id: 'above10', label: 'Above 10' },
    ],
  },
  {
    id: 'dividend_yield',
    name: 'Dividend Yield',
    category: 'Valuation',
    description: 'Annual dividends paid per share as a percent of share price.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 2',
    presets: [
      { id: 'none', label: 'No Dividend' },
      { id: '0to2', label: '0% to 2%' },
      { id: '2to4', label: '2% to 4%' },
      { id: 'above4', label: 'Above 4%' },
    ],
  },

  // --- Ratios ---------------------------------------------------------
  {
    id: 'roe',
    name: 'Return on Equity (ROE)',
    category: 'Ratios',
    description: 'Net income as a percent of shareholders\' equity.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 15',
    presets: [
      { id: 'below0', label: 'Below 0%' },
      { id: '0to10', label: '0% to 10%' },
      { id: '10to20', label: '10% to 20%' },
      { id: 'above20', label: 'Above 20%' },
    ],
  },
  {
    id: 'roa',
    name: 'Return on Assets (ROA)',
    category: 'Ratios',
    description: 'Net income as a percent of total assets.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 8',
    presets: [
      { id: 'below0', label: 'Below 0%' },
      { id: '0to5', label: '0% to 5%' },
      { id: '5to10', label: '5% to 10%' },
      { id: 'above10', label: 'Above 10%' },
    ],
  },
  {
    id: 'debt_equity',
    name: 'Total Debt / Equity',
    category: 'Ratios',
    description: 'Total debt relative to shareholders\' equity.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 1',
    presets: [
      { id: 'below0.5', label: 'Below 0.5' },
      { id: '0.5to1', label: '0.5 to 1' },
      { id: '1to2', label: '1 to 2' },
      { id: 'above2', label: 'Above 2' },
    ],
  },
  {
    id: 'current_ratio',
    name: 'Current Ratio',
    category: 'Ratios',
    description: 'Current assets divided by current liabilities; short-term liquidity.',
    type: 'numeric',
    unit: 'x',
    placeholder: 'e.g. 2',
    presets: [
      { id: 'below1', label: 'Below 1' },
      { id: '1to2', label: '1 to 2' },
      { id: '2to3', label: '2 to 3' },
      { id: 'above3', label: 'Above 3' },
    ],
  },

  // --- Financials - Income Statement -------------------------------------
  {
    id: 'revenue_growth',
    name: 'Revenue Growth (YoY)',
    category: 'Financials - Income Statement',
    description: 'Year-over-year change in total revenue.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 10',
    presets: [
      { id: 'negative', label: 'Negative' },
      { id: '0to10', label: '0% to 10%' },
      { id: '10to25', label: '10% to 25%' },
      { id: 'above25', label: 'Above 25%' },
    ],
  },
  {
    id: 'eps_growth',
    name: 'EPS Growth (YoY)',
    category: 'Financials - Income Statement',
    description: 'Year-over-year change in earnings per share.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 15',
    presets: [
      { id: 'negative', label: 'Negative' },
      { id: '0to10', label: '0% to 10%' },
      { id: '10to25', label: '10% to 25%' },
      { id: 'above25', label: 'Above 25%' },
    ],
  },
  {
    id: 'gross_margin',
    name: 'Gross Margin',
    category: 'Financials - Income Statement',
    description: 'Gross profit as a percent of total revenue.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 45',
    presets: [
      { id: 'below20', label: 'Below 20%' },
      { id: '20to40', label: '20% to 40%' },
      { id: '40to60', label: '40% to 60%' },
      { id: 'above60', label: 'Above 60%' },
    ],
  },
  {
    id: 'operating_margin',
    name: 'Operating Margin',
    category: 'Financials - Income Statement',
    description: 'Operating income as a percent of total revenue.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 18',
    presets: [
      { id: 'below0', label: 'Below 0%' },
      { id: '0to10', label: '0% to 10%' },
      { id: '10to20', label: '10% to 20%' },
      { id: 'above20', label: 'Above 20%' },
    ],
  },
  {
    id: 'net_margin',
    name: 'Net Income Margin',
    category: 'Financials - Income Statement',
    description: 'Net income as a percent of total revenue.',
    type: 'numeric',
    unit: '%',
    placeholder: 'e.g. 12',
    presets: [
      { id: 'below0', label: 'Below 0%' },
      { id: '0to10', label: '0% to 10%' },
      { id: '10to20', label: '10% to 20%' },
      { id: 'above20', label: 'Above 20%' },
    ],
  },

  // --- Financials - Balance Sheet -------------------------------------
  {
    id: 'free_cash_flow',
    name: 'Free Cash Flow (TTM)',
    category: 'Financials - Balance Sheet',
    description: 'Cash generated after capital expenditures, trailing 12 months.',
    type: 'numeric',
    unit: '$',
    placeholder: 'e.g. 500M',
    presets: [
      { id: 'negative', label: 'Negative' },
      { id: '0to100m', label: '$0 to $100M' },
      { id: '100mto1b', label: '$100M to $1B' },
      { id: 'above1b', label: 'Above $1B' },
    ],
  },
  {
    id: 'total_debt',
    name: 'Total Debt',
    category: 'Financials - Balance Sheet',
    description: 'Sum of short- and long-term debt on the balance sheet.',
    type: 'numeric',
    unit: '$',
    placeholder: 'e.g. 1B',
    presets: [
      { id: 'under100m', label: 'Under $100M' },
      { id: '100mto1b', label: '$100M to $1B' },
      { id: '1bto10b', label: '$1B to $10B' },
      { id: 'above10b', label: 'Above $10B' },
    ],
  },
];

export const OPERATORS: { id: Operator; label: string }[] = [
  { id: 'more', label: 'More than' },
  { id: 'less', label: 'Less than' },
  { id: 'equal', label: 'Equal' },
  { id: 'between', label: 'Between' },
];

export function isFilterActive(value: FilterValue | undefined): boolean {
  if (!value) return false;
  if (value.kind === 'categorical') return value.selected.length > 0;
  if (value.preset) return true;
  if (value.custom) {
    const { operator, value1, value2 } = value.custom;
    if (operator === 'between') return value1.trim() !== '' || value2.trim() !== '';
    return value1.trim() !== '';
  }
  return false;
}

export function summarizeFilter(metric: Metric, value: FilterValue | undefined): string | null {
  if (!isFilterActive(value)) return null;
  if (!value) return null;
  if (value.kind === 'categorical') {
    if (value.selected.length === 1) return value.selected[0];
    return `${value.selected.length} selected`;
  }
  if (value.preset) {
    const preset = metric.presets?.find((p) => p.id === value.preset);
    return preset?.label ?? null;
  }
  if (value.custom) {
    const { operator, value1, value2 } = value.custom;
    const u = metric.unit === '%' ? '%' : '';
    const prefix = metric.unit === '$' ? '$' : '';
    if (operator === 'between') return `${prefix}${value1}${u} \u2013 ${prefix}${value2}${u}`;
    const opLabel = operator === 'more' ? '>' : operator === 'less' ? '<' : '=';
    return `${opLabel} ${prefix}${value1}${u}`;
  }
  return null;
}

export function getMetricsInCategory(category: MetricCategory): Metric[] {
  return METRIC_REGISTRY.filter((metric) => metric.category === category);
}

export function getFirstMetricInCategory(category: MetricCategory): Metric | undefined {
  return METRIC_REGISTRY.find((metric) => metric.category === category);
}

export function getMetricById(metricId: string): Metric | undefined {
  return METRIC_REGISTRY.find((metric) => metric.id === metricId);
}

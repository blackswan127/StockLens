import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient.js';
import { Table, Column } from '../components/Table.jsx';
import { getCountryFlagUrl, getExchangeBadge } from '../utils/symbolHelper.js';
import { formatPrice, formatPercentChange, formatMarketCap } from '../utils/formatters.js';
import { usePrefetchCompany } from '../hooks/usePrefetchCompany.js';
import {
  ChevronRight,
  Search,
  X,
  RotateCcw,
  Star,
  Percent,
  Wallet,
  Building2,
  TrendingUp,
  ChevronLeft,
  Layers,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

// ----------------------------------------------------------------------------
// 1. DATA MODEL & TYPES FOR FILTER REGISTRY
// ----------------------------------------------------------------------------

interface ScreenerStock {
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

interface SectorStat {
  name: string;
  proxy: string;
  performance: number;
}

type MetricType = 'categorical' | 'numeric';

interface PresetRange {
  id: string;
  label: string;
}

interface Metric {
  id: string;
  name: string;
  category: string;
  description: string;
  type: MetricType;
  unit?: string; // e.g. '%', '$', 'x'
  placeholder?: string;
  presets?: PresetRange[];
  options?: string[]; // for categorical fields
}

type Operator = 'more' | 'less' | 'equal' | 'between';

interface NumericFilterValue {
  kind: 'numeric';
  preset?: string;
  custom?: {
    operator: Operator;
    value1: string;
    value2: string;
  };
}

interface CategoricalFilterValue {
  kind: 'categorical';
  selected: string[];
}

type FilterValue = NumericFilterValue | CategoricalFilterValue;
type FilterState = Record<string, FilterValue>;

const CATEGORIES = [
  'Popular',
  'Valuation',
  'Ratios',
  'Financials - Income Statement',
  'Financials - Balance Sheet',
] as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Popular: Star,
  Valuation: Wallet,
  Ratios: Percent,
  'Financials - Income Statement': TrendingUp,
  'Financials - Balance Sheet': Building2,
};

const METRIC_REGISTRY: Metric[] = [
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

// ----------------------------------------------------------------------------
// 2. HELPER UTILITY FUNCTIONS
// ----------------------------------------------------------------------------

function isFilterActive(value: FilterValue | undefined): boolean {
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

function summarizeFilter(metric: Metric, value: FilterValue | undefined): string | null {
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

const OPERATORS: { id: Operator; label: string }[] = [
  { id: 'more', label: 'More than' },
  { id: 'less', label: 'Less than' },
  { id: 'equal', label: 'Equal' },
  { id: 'between', label: 'Between' },
];

function parseAbbreviatedNumber(valStr: string): number | null {
  const clean = valStr.toUpperCase().replace(/[$,]/g, '').trim();
  if (!clean) return null;
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  if (clean.endsWith('B')) return num * 1000; // in millions
  if (clean.endsWith('M')) return num;
  if (clean.endsWith('T')) return num * 1000000;
  if (clean.endsWith('K')) return num / 1000;
  return num; // assume already in millions or simple number
}

function getApiParamsFromFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Exchange
  const exchangeVal = filters['exchange'] as CategoricalFilterValue | undefined;
  if (exchangeVal && exchangeVal.selected.length > 0) {
    params.append('exchange', exchangeVal.selected.join(','));
  } else {
    params.append('exchange', 'ALL');
  }

  // Sector
  const sectorVal = filters['sector'] as CategoricalFilterValue | undefined;
  if (sectorVal && sectorVal.selected.length > 0) {
    params.append('sector', sectorVal.selected.join(','));
  } else {
    params.append('sector', 'ALL');
  }

  // Helper numeric serializer
  const serializeNumeric = (fieldId: string, minParam: string, maxParam: string, isPercent = false, isCurrency = false) => {
    const fVal = filters[fieldId] as NumericFilterValue | undefined;
    if (!fVal) return;

    if (fVal.preset) {
      if (fieldId === 'market_cap') {
        if (fVal.preset === 'small') params.append(maxParam, '2000');
        else if (fVal.preset === 'mid') { params.append(minParam, '2000'); params.append(maxParam, '10000'); }
        else if (fVal.preset === 'large') { params.append(minParam, '10000'); params.append(maxParam, '200000'); }
        else if (fVal.preset === 'mega') params.append(minParam, '200000');
      } else if (fieldId === 'trailing_pe' || fieldId === 'forward_pe') {
        if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === '0to20') { params.append(minParam, '0'); params.append(maxParam, '20'); }
        else if (fVal.preset === '0to15') { params.append(minParam, '0'); params.append(maxParam, '15'); }
        else if (fVal.preset === '15to30') { params.append(minParam, '15'); params.append(maxParam, '30'); }
        else if (fVal.preset === '20to50') { params.append(minParam, '20'); params.append(maxParam, '50'); }
        else if (fVal.preset === '50to80') { params.append(minParam, '50'); params.append(maxParam, '80'); }
        else if (fVal.preset === 'above80') params.append(minParam, '80');
        else if (fVal.preset === 'above30') params.append(minParam, '30');
      } else if (fieldId === 'peg_ratio' || fieldId === 'price_book' || fieldId === 'price_sales') {
        if (fVal.preset === 'below1') params.append(maxParam, '1');
        else if (fVal.preset === '1to2') { params.append(minParam, '1'); params.append(maxParam, '2'); }
        else if (fVal.preset === '1to3') { params.append(minParam, '1'); params.append(maxParam, '3'); }
        else if (fVal.preset === '1to5') { params.append(minParam, '1'); params.append(maxParam, '5'); }
        else if (fVal.preset === '2to3') { params.append(minParam, '2'); params.append(maxParam, '3'); }
        else if (fVal.preset === '3to6') { params.append(minParam, '3'); params.append(maxParam, '6'); }
        else if (fVal.preset === '5to10') { params.append(minParam, '5'); params.append(maxParam, '10'); }
        else if (fVal.preset === 'above3') params.append(minParam, '3');
        else if (fVal.preset === 'above6') params.append(minParam, '6');
        else if (fVal.preset === 'above10') params.append(minParam, '10');
      } else if (fieldId === 'dividend_yield') {
        if (fVal.preset === 'none') params.append(maxParam, '0');
        else if (fVal.preset === '0to2') { params.append(minParam, '0'); params.append(maxParam, '2'); }
        else if (fVal.preset === '2to4') { params.append(minParam, '2'); params.append(maxParam, '4'); }
        else if (fVal.preset === 'above4') params.append(minParam, '4');
      } else if (fieldId === 'roe' || fieldId === 'roa') {
        if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === '0to10') { params.append(minParam, '0'); params.append(maxParam, '10'); }
        else if (fVal.preset === '0to5') { params.append(minParam, '0'); params.append(maxParam, '5'); }
        else if (fVal.preset === '5to10') { params.append(minParam, '5'); params.append(maxParam, '10'); }
        else if (fVal.preset === '10to20') { params.append(minParam, '10'); params.append(maxParam, '20'); }
        else if (fVal.preset === 'above10') params.append(minParam, '10');
        else if (fVal.preset === 'above20') params.append(minParam, '20');
      } else if (fieldId === 'debt_equity' || fieldId === 'current_ratio') {
        if (fVal.preset === 'below0.5') params.append(maxParam, '0.5');
        else if (fVal.preset === 'below1') params.append(maxParam, '1.0');
        else if (fVal.preset === '0.5to1') { params.append(minParam, '0.5'); params.append(maxParam, '1.0'); }
        else if (fVal.preset === '1to2') { params.append(minParam, '1.0'); params.append(maxParam, '2.0'); }
        else if (fVal.preset === '2to3') { params.append(minParam, '2.0'); params.append(maxParam, '3.0'); }
        else if (fVal.preset === 'above2') params.append(minParam, '2.0');
        else if (fVal.preset === 'above3') params.append(minParam, '3.0');
      } else if (fieldId === 'revenue_growth' || fieldId === 'eps_growth' || fieldId === 'gross_margin' || fieldId === 'operating_margin' || fieldId === 'net_margin') {
        if (fVal.preset === 'negative') params.append(maxParam, '0');
        else if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === 'below20') params.append(maxParam, '20');
        else if (fVal.preset === '0to10') { params.append(minParam, '0'); params.append(maxParam, '10'); }
        else if (fVal.preset === '10to25') { params.append(minParam, '10'); params.append(maxParam, '25'); }
        else if (fVal.preset === '20to40') { params.append(minParam, '20'); params.append(maxParam, '40'); }
        else if (fVal.preset === '10to20') { params.append(minParam, '10'); params.append(maxParam, '20'); }
        else if (fVal.preset === '40to60') { params.append(minParam, '40'); params.append(maxParam, '60'); }
        else if (fVal.preset === 'above25') params.append(minParam, '25');
        else if (fVal.preset === 'above20') params.append(minParam, '20');
        else if (fVal.preset === 'above60') params.append(minParam, '60');
      } else if (fieldId === 'free_cash_flow' || fieldId === 'total_debt') {
        if (fVal.preset === 'negative') params.append(maxParam, '0');
        else if (fVal.preset === 'under100m') params.append(maxParam, '100');
        else if (fVal.preset === '0to100m') { params.append(minParam, '0'); params.append(maxParam, '100'); }
        else if (fVal.preset === '100mto1b') { params.append(minParam, '100'); params.append(maxParam, '1000'); }
        else if (fVal.preset === '1bto10b') { params.append(minParam, '1000'); params.append(maxParam, '10000'); }
        else if (fVal.preset === 'above1b') params.append(minParam, '1000');
        else if (fVal.preset === 'above10b') params.append(minParam, '10000');
      }
    } else if (fVal.custom) {
      const { operator, value1, value2 } = fVal.custom;
      const cleanFloat = (v: string) => {
        const clean = v.replace(/[$,%]/g, '').trim();
        return clean ? parseFloat(clean) : NaN;
      };
      const num1 = isCurrency ? parseAbbreviatedNumber(value1) : cleanFloat(value1);
      const num2 = isCurrency ? parseAbbreviatedNumber(value2) : cleanFloat(value2);
      if (operator === 'more' && num1 !== null && !isNaN(num1)) params.append(minParam, num1.toString());
      else if (operator === 'less' && num1 !== null && !isNaN(num1)) params.append(maxParam, num1.toString());
      else if (operator === 'equal' && num1 !== null && !isNaN(num1)) {
        params.append(minParam, num1.toString());
        params.append(maxParam, num1.toString());
      } else if (operator === 'between') {
        if (num1 !== null && !isNaN(num1)) params.append(minParam, num1.toString());
        if (num2 !== null && !isNaN(num2)) params.append(maxParam, num2.toString());
      }
    }
  };

  // Map all 20 metrics parameters
  serializeNumeric('market_cap', 'minMcap', 'maxMcap', false, true);
  serializeNumeric('trailing_pe', 'minPeTrailing', 'maxPeTrailing');
  serializeNumeric('forward_pe', 'minPeForward', 'maxPeForward');
  serializeNumeric('peg_ratio', 'minPeg', 'maxPeg');
  serializeNumeric('price_book', 'minPb', 'maxPb');
  serializeNumeric('price_sales', 'minPs', 'maxPs');
  serializeNumeric('dividend_yield', 'minDiv', 'maxDiv', true);

  serializeNumeric('roe', 'minRoe', 'maxRoe', true);
  serializeNumeric('roa', 'minRoa', 'maxRoa', true);
  serializeNumeric('debt_equity', 'minDe', 'maxDe');
  serializeNumeric('current_ratio', 'minCurrentRatio', 'maxCurrentRatio');

  serializeNumeric('revenue_growth', 'minRevGrowth', 'maxRevGrowth', true);
  serializeNumeric('eps_growth', 'minEpsGrowth', 'maxEpsGrowth', true);
  serializeNumeric('gross_margin', 'minGrossMargin', 'maxGrossMargin', true);
  serializeNumeric('operating_margin', 'minOpMargin', 'maxOpMargin', true);
  serializeNumeric('net_margin', 'minNetMargin', 'maxNetMargin', true);

  serializeNumeric('free_cash_flow', 'minFcf', 'maxFcf', false, true);
  serializeNumeric('total_debt', 'minTotalDebt', 'maxTotalDebt', false, true);

  return params;
}

// ----------------------------------------------------------------------------
// 3. MAIN COMPONENT: SCREENER PAGE
// ----------------------------------------------------------------------------

export const ScreenerPage: React.FC = () => {
  const navigate = useNavigate();
  const prefetch = usePrefetchCompany();

  // Advanced filters state
  const [filters, setFilters] = useState<FilterState>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Activity state
  const [activeActivityTab, setActiveActivityTab] = useState<'most_active' | 'trending' | 'gainers' | 'losers' | 'highs_52w' | 'lows_52w'>('most_active');

  const ACTIVITY_TABS = [
    { id: 'most_active', label: 'Most Active' },
    { id: 'trending', label: 'Trending Now' },
    { id: 'gainers', label: 'Top Gainers' },
    { id: 'losers', label: 'Top Losers' },
    { id: 'highs_52w', label: '52 Week Gainers' },
    { id: 'lows_52w', label: '52 Week Losers' }
  ] as const;

  // Helper to render a visual mini-chart sparkline using inline SVG
  const renderSparkline = (symbol: string, isUp: boolean) => {
    if (!symbol) return null;
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);

    const points: number[] = [];
    let currentVal = 50;
    points.push(currentVal);

    const changeDir = isUp ? 1 : -1;
    for (let i = 1; i <= 8; i++) {
      const step = Math.sin(seed + i) * 15;
      const trend = (i / 8) * 18 * changeDir;
      points.push(currentVal + step + trend);
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    const width = 80;
    const height = 24;
    const padding = 2;
    
    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - padding - ((p - min) / range) * (height - 2 * padding);
      return { x, y };
    });

    const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
    
    const strokeColor = isUp ? '#10b981' : '#ef4444'; // emerald-500 or rose-500
    const gradientId = `spark-grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${isUp ? 'up' : 'down'}`;

    return (
      <svg width={width} height={height} className="overflow-visible select-none pointer-events-none mx-auto">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2" fill={strokeColor} />
      </svg>
    );
  };

  // Editor states
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [activeMetricId, setActiveMetricId] = useState<string>(
    METRIC_REGISTRY.find((m) => m.category === CATEGORIES[0])?.id ?? METRIC_REGISTRY[0].id
  );
  const [customOpen, setCustomOpen] = useState<boolean>(false);
  const [categoricalSearch, setCategoricalSearch] = useState<string>('');

  const activeMetric = useMemo(
    () => METRIC_REGISTRY.find((m) => m.id === activeMetricId)!,
    [activeMetricId]
  );

  const metricsInCategory = useMemo(
    () => METRIC_REGISTRY.filter((m) => m.category === activeCategory),
    [activeCategory]
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(isFilterActive).length,
    [filters]
  );

  // 1. Fetch Sector Stats for Heatmap
  const { data: sectorSummary, isPending: isSectorPending } = useQuery<SectorStat[]>({
    queryKey: ['marketSectors'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/sectors');
      return resp.data || [];
    }
  });

  // Fetch Movers for Stock Activity Widget
  const { data: moversData, isPending: isMoversPending } = useQuery<{
    most_active: any[];
    trending: any[];
    gainers: any[];
    losers: any[];
    highs_52w: any[];
    lows_52w: any[];
  }>({
    queryKey: ['marketMovers'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/movers');
      return resp.data || { most_active: [], trending: [], gainers: [], losers: [], highs_52w: [], lows_52w: [] };
    }
  });

  // 2. Fetch Filtered Stocks from `/api/screener`
  const { data: sData, isPending: isScreenerPending } = useQuery<{
    results: ScreenerStock[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['screener', searchQuery, filters, sortBy, sortOrder, page],
    queryFn: async () => {
      const params = getApiParamsFromFilters(filters);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());

      if (searchQuery.trim()) {
        params.append('q', searchQuery);
      }
      const resp = await apiClient.get(`/screener?${params.toString()}`);
      return resp.data;
    },
    placeholderData: (previousData) => previousData
  });

  // Handle Sector Heatmap card toggle (synced with advanced filters sector)
  const handleSectorCardClick = (sectorName: string) => {
    setFilters((prev) => {
      const current = prev['sector'] as CategoricalFilterValue | undefined;
      const selected = current?.selected ?? [];
      const isSelected = selected.includes(sectorName);
      const next = isSelected ? [] : [sectorName]; // single selection toggle
      return {
        ...prev,
        ['sector']: { kind: 'categorical', selected: next } as CategoricalFilterValue,
      };
    });
    setPage(1);
  };

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
    const firstMetric = METRIC_REGISTRY.find((m) => m.category === category);
    if (firstMetric) {
      setActiveMetricId(firstMetric.id);
      setCustomOpen(false);
      setCategoricalSearch('');
    }
  };

  const handleSelectMetric = (metricId: string) => {
    setActiveMetricId(metricId);
    setCustomOpen(false);
    setCategoricalSearch('');
  };

  const updateNumericPreset = (presetId: string) => {
    setFilters((prev) => {
      const current = prev[activeMetricId] as NumericFilterValue | undefined;
      const isSame = current?.preset === presetId;
      return {
        ...prev,
        [activeMetricId]: {
          kind: 'numeric',
          preset: isSame ? undefined : presetId,
          custom: current?.custom,
        },
      };
    });
    setPage(1);
  };

  const updateNumericCustom = (partial: Partial<NumericFilterValue['custom']>) => {
    setFilters((prev) => {
      const current = prev[activeMetricId] as NumericFilterValue | undefined;
      const base = current?.custom ?? { operator: 'more' as Operator, value1: '', value2: '' };
      return {
        ...prev,
        [activeMetricId]: {
          kind: 'numeric',
          preset: undefined,
          custom: { ...base, ...partial },
        },
      };
    });
    setPage(1);
  };

  const toggleCategoricalOption = (option: string) => {
    setFilters((prev) => {
      const current = prev[activeMetricId] as CategoricalFilterValue | undefined;
      const selected = current?.selected ?? [];
      const next = selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option];
      return {
        ...prev,
        [activeMetricId]: { kind: 'categorical', selected: next },
      };
    });
    setPage(1);
  };

  const resetAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSortBy('market_cap');
    setSortOrder('desc');
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const selectedSector = useMemo(() => {
    const sFilter = filters['sector'] as CategoricalFilterValue | undefined;
    return sFilter?.selected?.[0] || 'ALL';
  }, [filters]);

  // Setup Column specifications for reusable data Table matches
  const columns: Column<ScreenerStock>[] = [
    {
      key: 'symbol',
      label: 'Equities Symbol',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <img
            src={getCountryFlagUrl(row.exchange)}
            alt="Flag"
            referrerPolicy="no-referrer"
            className="h-3 w-4 rounded-sm object-cover shrink-0 shadow-sm opacity-90"
          />
          <div className="flex flex-col">
            <span className="font-mono font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
              {row.symbol}
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase -mt-0.5">
              {getExchangeBadge(row.exchange)}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'name',
      label: 'Company Name',
      sortable: true,
      render: (row) => (
        <div className="font-sans font-medium text-slate-200 max-w-[150px] sm:max-w-xs truncate">
          {row.name}
        </div>
      )
    },
    {
      key: 'sector',
      label: 'Sector Category',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/80">
          {row.sector}
        </span>
      )
    },
    {
      key: 'peTrailing',
      label: 'P/E (TTM)',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-200 tabular-nums">
          {row.peTrailing !== null ? `${row.peTrailing.toFixed(1)}x` : '—'}
        </span>
      )
    },
    {
      key: 'roe',
      label: 'ROE',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-200 tabular-nums">
          {row.roe !== null ? `${row.roe.toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      key: 'debt_equity',
      label: 'D/E',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-200 tabular-nums">
          {row.debt_equity !== null ? `${row.debt_equity.toFixed(2)}x` : '—'}
        </span>
      )
    },
    {
      key: 'price',
      label: 'Last Price',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-slate-100 tabular-nums">
          {formatPrice(row.price, row.exchange)}
        </span>
      )
    },
    {
      key: 'change_pct',
      label: 'Market Change',
      align: 'right',
      sortable: true,
      render: (row) => {
        const isUp = (row.change_pct ?? 0) >= 0;
        return (
          <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-1.5 py-0.5 rounded border tabular-nums ${
            isUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          }`}>
            {formatPercentChange(row.change_pct)}
          </span>
        );
      }
    },
    {
      key: 'market_cap',
      label: 'Market Cap',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-200 font-bold tabular-nums">
          {formatMarketCap(row.market_cap, row.exchange)}
        </span>
      )
    }
  ];

  const stocks = sData?.results || [];
  const total = sData?.total || 0;
  const totalPages = sData?.totalPages || 1;

  const currentValue = filters[activeMetricId];
  const currentNumeric = currentValue?.kind === 'numeric' ? currentValue : undefined;
  const currentCategorical = currentValue?.kind === 'categorical' ? currentValue : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Page Title Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600 animate-pulse" />
            <h1 className="font-sans text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent tracking-tight drop-shadow-sm">Equities Stock Screener</h1>
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-3xs transition-all ${
              showAdvancedFilters
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-gray-705 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}</span>
          </button>
        </div>
        <p className="font-mono text-xs text-slate-400 max-w-2xl">
          Instantly filter through institutional multi-factor data for S&P 500 and global equities.
        </p>
      </div>

      {/* 1. Sector Heatmap Widget Grid (Actions Toggle) - PRESERVED */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="font-sans text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <span>Market Sector Heatmap</span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold normal-case">
              (Tap card to filter stock table)
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isSectorPending ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-800" />
            ))
          ) : (
            sectorSummary?.map((s) => {
              const isSelected = selectedSector === s.name;
              const isUp = s.performance >= 0;
              return (
                <button
                  key={s.name}
                  onClick={() => handleSectorCardClick(s.name)}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer border ${
                    isSelected 
                      ? 'bg-[#141A26] border-emerald-500/60 shadow-lg shadow-emerald-500/10' 
                      : 'bg-[#0D111A] border-slate-800 hover:border-slate-700 hover:bg-[#141A26]'
                  }`}
                >
                  <div className="font-sans font-bold text-sm sm:text-base text-slate-100 truncate tracking-tight">
                    {s.name}
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {s.proxy}
                    </span>
                    <span className={`font-mono text-xs font-bold ml-auto px-2 py-0.5 rounded border tabular-nums ${
                      isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {isUp ? '+' : ''}{s.performance.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 1.5. Stock Activity Widget */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="font-sans text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <span>Stock Activity</span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold normal-case">
              (Top market dynamics and breakouts)
            </span>
          </h3>
        </div>

        {/* Tab switcher bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 border-b border-slate-800/80 scrollbar-none">
          {ACTIVITY_TABS.map((tab) => {
            const isActive = activeActivityTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveActivityTab(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table showing stocks for the active tab in a vertical list layout */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0D111A] shadow-xl">
          <table className="min-w-full divide-y divide-slate-800/80 border-collapse">
            <thead className="bg-[#080B11] border-b border-slate-800 text-left">
              <tr>
                <th className="w-24 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="w-24 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">Trend</th>
                <th className="w-28 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Price</th>
                <th className="w-28 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Change %</th>
                <th className="w-32 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">Market Cap</th>
                <th className="w-32 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">P/E Ratio</th>
                <th className="w-36 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-right">52 Wk Change %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-transparent">
              {isMoversPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="w-24 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-24 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-28 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-28 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-32 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-32 px-4 py-3 bg-[#0D111A] h-10" />
                    <td className="w-36 px-4 py-3 bg-[#0D111A] h-10" />
                  </tr>
                ))
              ) : (
                (() => {
                  const list = moversData?.[activeActivityTab] || [];
                  if (list.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs font-mono text-slate-500 font-medium">
                          No active stocks found for this category.
                        </td>
                      </tr>
                    );
                  }
                  return list.map((stock: any) => {
                    const isUp = (stock.change_pct ?? 0) >= 0;
                    const is52wUp = (stock.change_52w ?? 0) >= 0;
                    return (
                      <tr 
                        key={stock.symbol}
                        onClick={() => navigate(`/company/${encodeURIComponent(stock.symbol.toUpperCase())}`)}
                        onMouseEnter={() => prefetch(stock.symbol)}
                        className="hover:bg-[#141A26] cursor-pointer transition-colors duration-150 group"
                      >
                        <td className="w-24 px-4 py-3.5 text-left">
                          <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-200 border border-slate-700 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-colors">
                            {stock.symbol}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-300 truncate max-w-[150px] sm:max-w-md font-sans font-medium">
                          {stock.name}
                        </td>
                        <td className="w-24 px-4 py-3.5 text-center">
                          {renderSparkline(stock.symbol, isUp)}
                        </td>
                        <td className="w-28 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                          {formatPrice(stock.price, stock.exchange)}
                        </td>
                        <td className={`w-28 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums ${
                          isUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {formatPercentChange(stock.change_pct)}
                        </td>
                        <td className="w-32 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-300 tabular-nums">
                          {typeof stock.market_cap === 'number' ? formatMarketCap(stock.market_cap, stock.exchange) : '—'}
                        </td>
                        <td className="w-32 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold text-slate-300 tabular-nums">
                          {typeof stock.pe_ratio === 'number' ? `${stock.pe_ratio.toFixed(2)}` : '—'}
                        </td>
                        <td className={`w-36 px-4 py-3.5 text-right font-mono text-xs sm:text-sm font-bold tabular-nums ${
                          is52wUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {typeof stock.change_52w === 'number' ? `${stock.change_52w >= 0 ? '+' : ''}${stock.change_52w.toFixed(2)}%` : '—'}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Interactive Multi-Factor Filters Builder Panel */}
      {showAdvancedFilters && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D111A] shadow-2xl">
          {/* Filters Builder Title Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#080B11] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Filter Builder</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                20-Factor Curated Screen
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[10px] font-mono font-bold ${
                  activeFilterCount > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeFilterCount} Active
              </span>
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Clear All
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row h-[480px] overflow-hidden">
            {/* L1: Categories (25%) */}
            <div className="w-full md:w-1/4 border-r border-slate-800 bg-[#080B11]/60 p-3 overflow-y-auto">
              <nav className="space-y-1">
                {CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category];
                  const isActive = category === activeCategory;
                  const countInCategory = METRIC_REGISTRY.filter(
                    (m) => m.category === category && isFilterActive(filters[m.id])
                  ).length;
                  return (
                    <button
                      key={category}
                      onClick={() => handleSelectCategory(category)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-mono font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                        />
                        <span className="truncate">{category}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 ml-1">
                        {countInCategory > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                        <ChevronRight
                          className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                        />
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* L2: Metrics (35%) */}
            <div className="w-full md:w-[35%] border-r border-slate-800 bg-[#0A0E17]/60 p-3 overflow-y-auto">
              <div className="space-y-1">
                {metricsInCategory.map((metric) => {
                  const isActive = metric.id === activeMetricId;
                  const summary = summarizeFilter(metric, filters[metric.id]);
                  return (
                    <button
                      key={metric.id}
                      onClick={() => handleSelectMetric(metric.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#141A26] border border-slate-700 shadow-sm' 
                          : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`truncate text-xs font-mono ${
                            isActive ? 'font-bold text-slate-100' : 'font-medium text-slate-300'
                          }`}
                        >
                          {metric.name}
                        </div>
                        {summary && (
                          <div className="mt-0.5 truncate text-[11px] font-mono font-bold text-emerald-400">
                            {summary}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-3.5 w-3.5 flex-shrink-0 ${
                          isActive ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* L3: Editors (40%) */}
            <div className="w-full md:w-[40%] bg-[#0D111A] p-5 overflow-y-auto flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold font-sans text-slate-100">{activeMetric.name}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 font-sans">
                  {activeMetric.description}
                </p>
                <div className="mt-4">
                  {activeMetric.type === 'categorical' ? (
                    <CategoricalEditor
                      metric={activeMetric}
                      search={categoricalSearch}
                      onSearchChange={setCategoricalSearch}
                      selected={currentCategorical?.selected ?? []}
                      onToggle={toggleCategoricalOption}
                    />
                  ) : (
                    <NumericEditor
                      metric={activeMetric}
                      value={currentNumeric}
                      customOpen={customOpen}
                      onCustomOpenChange={setCustomOpen}
                      onPresetToggle={updateNumericPreset}
                      onCustomChange={updateNumericCustom}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search and Dynamic Columns Table */}
      <div className="space-y-4">
        {/* Simple Search bar overlay on results */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search ticker symbol or company name..."
            className="w-full rounded-xl border border-slate-800 bg-[#0D111A] py-2 pl-9 pr-8 text-xs font-mono font-medium text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Table<ScreenerStock>
          columns={columns}
          data={stocks}
          isPending={isScreenerPending}
          sortKey={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={(row) => navigate(`/company/${encodeURIComponent(row.symbol.toUpperCase())}`)}
          onRowHover={(row) => prefetch(row.symbol)}
        />

        {/* 4. Elegant Pagination Controls & Rows Stats */}
        {!isScreenerPending && total > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800/80 pt-4">
            <span className="font-mono text-xs text-slate-400">
              Showing <span className="font-bold text-slate-200">{Math.min((page - 1) * itemsPerPage + 1, total)}</span> to <span className="font-bold text-slate-200">{Math.min(page * itemsPerPage, total)}</span> of <span className="font-bold text-slate-200">{total}</span> Equities
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-800 rounded-lg bg-[#0D111A] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0D111A] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-slate-300" />
              </button>

              <div className="flex items-center gap-1 font-mono text-xs">
                {Array.from({ length: totalPages }).map((_, pIdx) => {
                  const pNum = pIdx + 1;
                  if (pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 1) {
                    return (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`h-7 w-7 rounded-lg font-bold transition-colors cursor-pointer ${
                          page === pNum
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold'
                            : 'border border-slate-800 bg-[#0D111A] text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  if (pNum === 2 || pNum === totalPages - 1) {
                    return <span key={pNum} className="px-1 text-slate-600">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-800 rounded-lg bg-[#0D111A] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0D111A] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 4. SUB-COMPONENTS: CAT EDITORS & NUM EDITORS
// ----------------------------------------------------------------------------

function CategoricalEditor({
  metric,
  search,
  onSearchChange,
  selected,
  onToggle,
}: {
  metric: Metric;
  search: string;
  onSearchChange: (v: string) => void;
  selected: string[];
  onToggle: (option: string) => void;
}) {
  const filteredOptions = (metric.options ?? []).filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${metric.name.toLowerCase()}...`}
          className="w-full rounded-xl border border-slate-800 bg-[#080B11] py-2.5 pl-9 pr-8 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="max-h-[240px] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#080B11]/50 p-2">
        {filteredOptions.length === 0 && (
          <p className="px-3 py-4 text-center text-xs font-mono text-slate-500">No matches found.</p>
        )}
        {filteredOptions.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-300 hover:bg-[#141A26] hover:text-slate-100 transition-colors"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function NumericEditor({
  metric,
  value,
  customOpen,
  onCustomOpenChange,
  onPresetToggle,
  onCustomChange,
}: {
  metric: Metric;
  value: NumericFilterValue | undefined;
  customOpen: boolean;
  onCustomOpenChange: (open: boolean) => void;
  onPresetToggle: (presetId: string) => void;
  onCustomChange: (partial: Partial<NonNullable<NumericFilterValue['custom']>>) => void;
}) {
  const operator = value?.custom?.operator ?? 'more';
  const value1 = value?.custom?.value1 ?? '';
  const value2 = value?.custom?.value2 ?? '';
  const placeholder = metric.placeholder ?? 'e.g. 10';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {metric.presets?.map((preset) => {
          const checked = value?.preset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onPresetToggle(preset.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer ${
                checked
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-slate-800 text-slate-300 bg-[#080B11] hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <span className="truncate">{preset.label}</span>
              <span className={`h-3 w-3 rounded-full border border-slate-700 shrink-0 ml-1 ${
                checked ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Custom toggle */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#080B11]">
        <button
          onClick={() => onCustomOpenChange(!customOpen)}
          className={`flex w-full items-center justify-between px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer ${
            customOpen ? 'bg-slate-800/80 text-slate-100' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
          }`}
        >
          <span>Custom Numeric Bounds</span>
          <ChevronRight
            className={`h-4 w-4 text-slate-400 transition-transform ${
              customOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {customOpen && (
          <div className="space-y-3 border-t border-slate-800/80 bg-[#0D111A]/80 p-3">
            {/* Operator button group */}
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#080B11] p-1 border border-slate-800">
              {OPERATORS.map((op) => (
                <button
                  key={op.id}
                  onClick={() => onCustomChange({ operator: op.id })}
                  className={`rounded-lg px-2 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                    operator === op.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            {operator === 'between' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={value1}
                  onChange={(e) => onCustomChange({ value1: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
                />
                <span className="text-xs text-slate-500 font-mono font-bold">and</span>
                <input
                  type="text"
                  value={value2}
                  onChange={(e) => onCustomChange({ value2: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
                />
              </div>
            ) : (
              <input
                type="text"
                value={value1}
                onChange={(e) => onCustomChange({ value1: e.target.value })}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

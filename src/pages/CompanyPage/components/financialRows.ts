export type StatementTab = 'quarterly' | 'pnl' | 'balance' | 'cash';

export interface FinancialPeriodRecord {
  quarter?: string | number | null;
  year?: string | number | null;
  date?: string | number | null;
  revenue?: number | null;
  grossProfit?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  assets?: number | null;
  liabilities?: number | null;
  equity?: number | null;
  operating?: number | null;
  investing?: number | null;
  financing?: number | null;
}

export interface FinancialStatements {
  quarterly?: FinancialPeriodRecord[];
  incomeStatement?: FinancialPeriodRecord[];
  balanceSheet?: FinancialPeriodRecord[];
  cashFlow?: FinancialPeriodRecord[];
}

export interface FinancialStatementRow {
  particulars: string;
  periods: string[];
  values: string[];
  emphasized: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asRecords = (value: unknown): FinancialPeriodRecord[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isObject) as FinancialPeriodRecord[];
};

export const asFinancialStatements = (value: unknown): FinancialStatements | null => {
  if (!isObject(value)) return null;
  return {
    quarterly: asRecords(value.quarterly),
    incomeStatement: asRecords(value.incomeStatement),
    balanceSheet: asRecords(value.balanceSheet),
    cashFlow: asRecords(value.cashFlow),
  };
};

const formatPeriod = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

const formatAmount = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num === 0) return '—';
  return num.toLocaleString();
};

const formatEps = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toFixed(2);
};

interface MetricDefinition {
  particulars: string;
  field: keyof FinancialPeriodRecord;
  formatter: (value: unknown) => string;
  emphasized: boolean;
}

const buildRows = (
  records: FinancialPeriodRecord[] | undefined,
  metrics: MetricDefinition[],
  getPeriod: (record: FinancialPeriodRecord) => string
): FinancialStatementRow[] => {
  if (!records || records.length === 0) return [];
  const periods = records.map(getPeriod);
  return metrics.map((metric) => ({
    particulars: metric.particulars,
    periods,
    values: records.map((record) => metric.formatter(record[metric.field])),
    emphasized: metric.emphasized,
  }));
};

const quarterlyMetrics: MetricDefinition[] = [
  { particulars: 'Revenue', field: 'revenue', formatter: formatAmount, emphasized: true },
  {
    particulars: 'Net Profit / Net Income',
    field: 'netIncome',
    formatter: formatAmount,
    emphasized: true,
  },
  { particulars: 'Adjusted EPS', field: 'eps', formatter: formatEps, emphasized: false },
];

const incomeMetrics: MetricDefinition[] = [
  { particulars: 'Revenue', field: 'revenue', formatter: formatAmount, emphasized: true },
  { particulars: 'Gross Profit', field: 'grossProfit', formatter: formatAmount, emphasized: true },
  {
    particulars: 'Net Profit / Net Income',
    field: 'netIncome',
    formatter: formatAmount,
    emphasized: true,
  },
];

const balanceSheetMetrics: MetricDefinition[] = [
  { particulars: 'Total Assets', field: 'assets', formatter: formatAmount, emphasized: true },
  {
    particulars: 'Total Liabilities',
    field: 'liabilities',
    formatter: formatAmount,
    emphasized: true,
  },
  {
    particulars: "Shareholders' Equity",
    field: 'equity',
    formatter: formatAmount,
    emphasized: true,
  },
];

const cashFlowMetrics: MetricDefinition[] = [
  {
    particulars: 'Operating Cash Flow',
    field: 'operating',
    formatter: formatAmount,
    emphasized: true,
  },
  {
    particulars: 'Investing Cash Flow',
    field: 'investing',
    formatter: formatAmount,
    emphasized: false,
  },
  {
    particulars: 'Financing Cash Flow',
    field: 'financing',
    formatter: formatAmount,
    emphasized: false,
  },
];

const formatQuarterlyPeriod = (record: FinancialPeriodRecord): string =>
  formatPeriod(record.quarter ?? record.date);

const formatAnnualPeriod = (record: FinancialPeriodRecord): string =>
  formatPeriod(record.year ?? record.date);

export const buildStatementRows = (
  financials: FinancialStatements | null,
  tab: StatementTab
): FinancialStatementRow[] => {
  if (!financials) return [];
  switch (tab) {
    case 'quarterly':
      return buildRows(financials.quarterly, quarterlyMetrics, formatQuarterlyPeriod);
    case 'pnl':
      return buildRows(financials.incomeStatement, incomeMetrics, formatAnnualPeriod);
    case 'balance':
      return buildRows(financials.balanceSheet, balanceSheetMetrics, formatAnnualPeriod);
    case 'cash':
      return buildRows(financials.cashFlow, cashFlowMetrics, formatAnnualPeriod);
    default:
      return [];
  }
};

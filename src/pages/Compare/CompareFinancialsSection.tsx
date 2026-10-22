import {
  formatMarketCap,
  formatPercentChange,
} from '../../utils/formatters.js';
import { CompareSection } from './CompareSection.js';
import type { CompareMetricRow, CompareSectionsProps } from './types.js';

const INCOME_ROWS: CompareMetricRow[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    better: 'high',
    render: (d, { commonSize }) =>
      commonSize && d.incomeStatement.revenue
        ? '100.00%'
        : formatMarketCap(d.incomeStatement.revenue, d.profile.exchange, d.symbol),
    getRawValue: (d, { commonSize }) =>
      commonSize && d.incomeStatement.revenue ? 100 : d.incomeStatement.revenue,
  },
  {
    id: 'operatingExpenses',
    label: 'Operating Expenses',
    better: 'low',
    render: (d, { commonSize }) => {
      if (commonSize) {
        if (!d.incomeStatement.revenue || !d.incomeStatement.operatingExpenses)
          return '—';
        return `${(
          (d.incomeStatement.operatingExpenses / d.incomeStatement.revenue) *
          100
        ).toFixed(2)}%`;
      }
      return formatMarketCap(
        d.incomeStatement.operatingExpenses,
        d.profile.exchange,
        d.symbol
      );
    },
    getRawValue: (d, { commonSize }) =>
      commonSize
        ? d.incomeStatement.operatingExpenses && d.incomeStatement.revenue
          ? (d.incomeStatement.operatingExpenses / d.incomeStatement.revenue) * 100
          : null
        : d.incomeStatement.operatingExpenses,
  },
  {
    id: 'operatingIncome',
    label: 'Operating Income',
    better: 'high',
    render: (d, { commonSize }) => {
      if (commonSize) {
        if (!d.incomeStatement.revenue || d.incomeStatement.operatingIncome === null)
          return '—';
        return `${(
          (d.incomeStatement.operatingIncome / d.incomeStatement.revenue) *
          100
        ).toFixed(2)}%`;
      }
      return formatMarketCap(
        d.incomeStatement.operatingIncome,
        d.profile.exchange,
        d.symbol
      );
    },
    getRawValue: (d, { commonSize }) =>
      commonSize
        ? d.incomeStatement.operatingIncome !== null && d.incomeStatement.revenue
          ? (d.incomeStatement.operatingIncome / d.incomeStatement.revenue) * 100
          : null
        : d.incomeStatement.operatingIncome,
  },
  {
    id: 'revenueGrowth',
    label: 'Revenue Growth (YoY)',
    better: 'high',
    render: (d) => (
      <span
        className={
          Number(d.incomeStatement.revenueGrowthYoY) >= 0
            ? 'text-emerald-600'
            : 'text-rose-600'
        }
      >
        {formatPercentChange(d.incomeStatement.revenueGrowthYoY)}
      </span>
    ),
    getRawValue: (d) => d.incomeStatement.revenueGrowthYoY,
  },
  {
    id: 'grossProfit',
    label: 'Gross Profit',
    better: 'high',
    render: (d, { commonSize }) => {
      if (commonSize) {
        if (!d.incomeStatement.revenue || d.incomeStatement.grossProfit === null)
          return '—';
        return `${(
          (d.incomeStatement.grossProfit / d.incomeStatement.revenue) *
          100
        ).toFixed(2)}%`;
      }
      return formatMarketCap(
        d.incomeStatement.grossProfit,
        d.profile.exchange,
        d.symbol
      );
    },
    getRawValue: (d, { commonSize }) =>
      commonSize
        ? d.incomeStatement.grossProfit !== null && d.incomeStatement.revenue
          ? (d.incomeStatement.grossProfit / d.incomeStatement.revenue) * 100
          : null
        : d.incomeStatement.grossProfit,
  },
];

const BALANCE_ROWS: CompareMetricRow[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    better: 'low',
    render: (d) =>
      formatMarketCap(d.balanceSheet.inventory, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.balanceSheet.inventory,
  },
  {
    id: 'receivablesTurnover',
    label: 'Account Receivables Turnover',
    better: 'high',
    render: (d) =>
      d.balanceSheet.receivablesTurnover
        ? `${Number(d.balanceSheet.receivablesTurnover).toFixed(2)}x`
        : '—',
    getRawValue: (d) => d.balanceSheet.receivablesTurnover,
  },
];

const CASH_FLOW_ROWS: CompareMetricRow[] = [
  {
    id: 'operatingCashFlow',
    label: 'Cash Flow from Operations',
    better: 'high',
    render: (d) =>
      formatMarketCap(d.cashFlow.operatingCashFlow, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.cashFlow.operatingCashFlow,
  },
  {
    id: 'capex',
    label: 'Capital Expenditures',
    better: 'low',
    render: (d) => formatMarketCap(d.cashFlow.capex, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.cashFlow.capex,
  },
  {
    id: 'investingCashFlow',
    label: 'Cash from Investing Activities',
    better: 'high',
    render: (d) =>
      formatMarketCap(d.cashFlow.investingCashFlow, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.cashFlow.investingCashFlow,
  },
  {
    id: 'freeCashFlow',
    label: 'Free Cash Flow',
    better: 'high',
    render: (d) =>
      formatMarketCap(d.cashFlow.freeCashFlow, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.cashFlow.freeCashFlow,
  },
];

export function CompareFinancialsSection(props: CompareSectionsProps) {
  return (
    <>
      <CompareSection
        {...props}
        sectionKey="income"
        title="Income Statement"
        rows={INCOME_ROWS}
      />
      <CompareSection
        {...props}
        sectionKey="balance"
        title="Balance Sheet"
        rows={BALANCE_ROWS}
      />
      <CompareSection
        {...props}
        sectionKey="cash"
        title="Cash Flow"
        rows={CASH_FLOW_ROWS}
      />
    </>
  );
}

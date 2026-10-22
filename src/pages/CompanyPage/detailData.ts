import { formatMarketCap, formatShares } from '../../utils/formatters.js';
import type {
  CompanyDetailData,
  CompanyFinancials,
  CompanyProfile,
  FinancialStatementRow,
  FinancialTableRow,
  Ratios,
} from './types';

const DASH = '—';

function formatNumber(value: number | null | undefined): string {
  return value !== undefined && value !== null ? value.toLocaleString() : DASH;
}

function buildIncomeStatementRows(rows: FinancialStatementRow[]): FinancialTableRow[] {
  if (rows.length === 0) return [];
  const periods = rows.map((row) => String(row.year || DASH));
  return [
    { particulars: 'Revenue', periods, values: [rows.map((row) => formatNumber(row.revenue))] },
    {
      particulars: 'Gross Profit',
      periods,
      values: [rows.map((row) => formatNumber(row.grossProfit))],
    },
    {
      particulars: 'Net Profit / Net Income',
      periods,
      values: [rows.map((row) => formatNumber(row.netIncome))],
    },
  ];
}

function buildBalanceSheetRows(rows: FinancialStatementRow[]): FinancialTableRow[] {
  if (rows.length === 0) return [];
  const periods = rows.map((row) => String(row.year || DASH));
  return [
    { particulars: 'Total Assets', periods, values: [rows.map((row) => formatNumber(row.assets))] },
    {
      particulars: 'Total Liabilities',
      periods,
      values: [rows.map((row) => formatNumber(row.liabilities))],
    },
    {
      particulars: "Shareholders' Equity",
      periods,
      values: [rows.map((row) => formatNumber(row.equity))],
    },
  ];
}

function buildCashFlowRows(rows: FinancialStatementRow[]): FinancialTableRow[] {
  if (rows.length === 0) return [];
  const periods = rows.map((row) => String(row.year || DASH));
  return [
    {
      particulars: 'Operating Cash Flow',
      periods,
      values: [rows.map((row) => formatNumber(row.operating))],
    },
    {
      particulars: 'Investing Cash Flow',
      periods,
      values: [rows.map((row) => formatNumber(row.investing))],
    },
    {
      particulars: 'Financing Cash Flow',
      periods,
      values: [rows.map((row) => formatNumber(row.financing))],
    },
    {
      particulars: 'Free Cash Flow (FCF)',
      periods,
      values: [
        rows.map((row) => ((row.operating || 0) + (row.investing || 0)).toLocaleString()),
      ],
    },
  ];
}

export function buildCompanyDetailData({
  financials,
  ratios,
  profile,
}: {
  financials: CompanyFinancials | undefined;
  ratios: Ratios | undefined;
  profile: CompanyProfile | undefined;
}): CompanyDetailData {
  const incomeStatement = financials?.incomeStatement ?? [];
  const balanceSheetSource = financials?.balanceSheet ?? [];
  const cashFlowSource = financials?.cashFlow ?? [];

  return {
    essentials: {
      marketCapCr:
        ratios?.market_cap && profile
          ? formatMarketCap(ratios.market_cap, profile.exchange)
          : DASH,
      enterpriseValue:
        ratios?.enterprise_value && profile
          ? formatMarketCap(ratios.enterprise_value, profile.exchange)
          : DASH,
      pe: ratios?.pe || DASH,
      pb: ratios?.pb || DASH,
      roe: ratios?.roe || DASH,
      roce: ratios?.roce || DASH,
      epsTTM: ratios?.eps || DASH,
      debt:
        ratios?.total_debt && profile
          ? formatMarketCap(ratios.total_debt, profile.exchange)
          : DASH,
      cash:
        ratios?.total_cash && profile
          ? formatMarketCap(ratios.total_cash, profile.exchange)
          : DASH,
      sharesOutstanding:
        ratios?.shares_outstanding && profile
          ? formatShares(ratios.shares_outstanding, profile.exchange, profile.symbol)
          : DASH,
      salesGrowth: ratios?.sales_growth || DASH,
      profitGrowth: ratios?.profit_growth || DASH,
    },
    ratiosHistorical: {
      salesGrowth: { yr1: DASH, yr3: DASH, yr5: DASH },
      profitGrowth: { yr1: DASH, yr3: DASH, yr5: DASH },
      roe: { yr1: DASH, yr3: DASH, yr5: DASH, history: [] },
      roce: { yr1: DASH, yr3: DASH, yr5: DASH, history: [] },
    },
    annualPnL: buildIncomeStatementRows(incomeStatement),
    balanceSheet: buildBalanceSheetRows(balanceSheetSource),
    cashFlows: buildCashFlowRows(cashFlowSource),
  };
}

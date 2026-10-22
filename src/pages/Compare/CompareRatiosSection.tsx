import { formatPrice, formatPercentChange } from '../../utils/formatters.js';
import { CompareSection } from './CompareSection.js';
import type { CompareMetricRow, CompareSectionsProps } from './types.js';

const RATIO_ROWS: CompareMetricRow[] = [
  {
    id: 'pe',
    label: 'Price to Earnings Per Share (P/E)',
    better: 'low',
    render: (d) => (d.priceRatios.pe ? `${Number(d.priceRatios.pe).toFixed(2)}x` : '—'),
    getRawValue: (d) => d.priceRatios.pe,
  },
  {
    id: 'forwardPe',
    label: 'Forward Price to Earnings (Forward P/E)',
    better: 'low',
    render: (d) =>
      d.priceRatios.forwardPe ? `${Number(d.priceRatios.forwardPe).toFixed(2)}x` : '—',
    getRawValue: (d) => d.priceRatios.forwardPe,
  },
  {
    id: 'pFreeCashFlow',
    label: 'Price to Free Cash Flow (P/FCF)',
    better: 'low',
    render: (d) =>
      d.priceRatios.pFreeCashFlow
        ? `${Number(d.priceRatios.pFreeCashFlow).toFixed(2)}x`
        : '—',
    getRawValue: (d) => d.priceRatios.pFreeCashFlow,
  },
  {
    id: 'pBook',
    label: 'Price to Book Value Per Share (P/B)',
    better: 'low',
    render: (d) =>
      d.priceRatios.pBook ? `${Number(d.priceRatios.pBook).toFixed(2)}x` : '—',
    getRawValue: (d) => d.priceRatios.pBook,
  },
  {
    id: 'pSales',
    label: 'Price to Sales Ratio (P/S)',
    better: 'low',
    render: (d) =>
      d.priceRatios.pSales ? `${Number(d.priceRatios.pSales).toFixed(2)}x` : '—',
    getRawValue: (d) => d.priceRatios.pSales,
  },
  {
    id: 'evEbitda',
    label: 'EV/EBITDA',
    better: 'low',
    render: (d) =>
      d.priceRatios.evEbitda ? `${Number(d.priceRatios.evEbitda).toFixed(2)}x` : '—',
    getRawValue: (d) => d.priceRatios.evEbitda,
  },
];

const MARGIN_ROWS: CompareMetricRow[] = [
  {
    id: 'operatingMargin',
    label: 'Operating Margin',
    better: 'high',
    render: (d) =>
      d.margin.operatingMargin
        ? `${Number(d.margin.operatingMargin).toFixed(2)}%`
        : '—',
    getRawValue: (d) => d.margin.operatingMargin,
  },
  {
    id: 'grossMargin',
    label: 'Gross Margin',
    better: 'high',
    render: (d) =>
      d.margin.grossMargin ? `${Number(d.margin.grossMargin).toFixed(2)}%` : '—',
    getRawValue: (d) => d.margin.grossMargin,
  },
  {
    id: 'profitMargin',
    label: 'Profit Margin',
    better: 'high',
    render: (d) =>
      d.margin.profitMargin ? `${Number(d.margin.profitMargin).toFixed(2)}%` : '—',
    getRawValue: (d) => d.margin.profitMargin,
  },
];

const EARNINGS_ROWS: CompareMetricRow[] = [
  {
    id: 'basicEps',
    label: 'Basic Earnings Per Share (Basic EPS)',
    better: 'high',
    render: (d) => formatPrice(d.earnings.eps, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.earnings.eps,
  },
  {
    id: 'epsGrowth',
    label: 'EPS YoY Growth',
    better: 'high',
    render: (d) => (
      <span
        className={
          Number(d.earnings.epsGrowthYoY) >= 0 ? 'text-emerald-600' : 'text-rose-600'
        }
      >
        {formatPercentChange(d.earnings.epsGrowthYoY)}
      </span>
    ),
    getRawValue: (d) => d.earnings.epsGrowthYoY,
  },
];

const RETURN_ROWS: CompareMetricRow[] = [
  {
    id: 'roe',
    label: 'Return on Equity (ROE)',
    better: 'high',
    render: (d) =>
      d.equityReturn.roe ? `${Number(d.equityReturn.roe).toFixed(2)}%` : '—',
    getRawValue: (d) => d.equityReturn.roe,
  },
  {
    id: 'roa',
    label: 'Return on Assets (ROA)',
    better: 'high',
    render: (d) =>
      d.equityReturn.roa ? `${Number(d.equityReturn.roa).toFixed(2)}%` : '—',
    getRawValue: (d) => d.equityReturn.roa,
  },
  {
    id: 'roic',
    label: 'Return on Invested Capital (ROIC)',
    better: 'high',
    render: (d) =>
      d.equityReturn.roic ? `${Number(d.equityReturn.roic).toFixed(2)}%` : '—',
    getRawValue: (d) => d.equityReturn.roic,
  },
];

export function CompareRatiosSection(props: CompareSectionsProps) {
  return (
    <>
      <CompareSection
        {...props}
        sectionKey="ratios"
        title="Price Ratios / Valuation Multiples"
        rows={RATIO_ROWS}
      />
      <CompareSection
        {...props}
        sectionKey="margin"
        title="Margins"
        rows={MARGIN_ROWS}
      />
      <CompareSection
        {...props}
        sectionKey="earnings"
        title="Earnings"
        rows={EARNINGS_ROWS}
      />
      <CompareSection
        {...props}
        sectionKey="return"
        title="Equity Returns"
        rows={RETURN_ROWS}
      />
    </>
  );
}

import {
  formatMarketCap,
  formatPrice,
} from '../../utils/formatters.js';
import { CompareSection } from './CompareSection.js';
import type { CompareMetricRow, CompareSectionsProps } from './types.js';

const STATS_ROWS: CompareMetricRow[] = [
  {
    id: 'asOf',
    label: 'As of Latest Statements',
    better: 'high',
    render: (d) => d.keyStats.asOf || '—',
    getRawValue: () => null,
  },
  {
    id: 'marketCap',
    label: 'Market Value (Market Cap)',
    better: 'high',
    render: (d) => formatMarketCap(d.keyStats.marketCap, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.keyStats.marketCap,
  },
  {
    id: 'enterpriseValue',
    label: 'Enterprise Value',
    better: 'high',
    render: (d) =>
      formatMarketCap(d.keyStats.enterpriseValue, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.keyStats.enterpriseValue,
  },
  {
    id: 'peTrailing',
    label: 'Price to Earnings (Trailing P/E)',
    better: 'low',
    render: (d) => (d.keyStats.peRatio ? Number(d.keyStats.peRatio).toFixed(2) : '—'),
    getRawValue: (d) => d.keyStats.peRatio,
  },
  {
    id: 'epsDiluted',
    label: 'Diluted Earnings Per Share (EPS)',
    better: 'high',
    render: (d) => formatPrice(d.keyStats.eps, d.profile.exchange, d.symbol),
    getRawValue: (d) => d.keyStats.eps,
  },
  {
    id: 'dividend',
    label: 'Forward Dividend & Yield',
    better: 'high',
    render: (d) => {
      const rate = d.keyStats.dividendRate;
      const yld = d.keyStats.dividendYield;
      if (!rate && !yld) return '—';
      return `${rate ? formatPrice(rate, d.profile.exchange, d.symbol) : '—'} (${
        yld ? Number(yld).toFixed(2) + '%' : '—'
      })`;
    },
    getRawValue: (d) => d.keyStats.dividendYield,
  },
  {
    id: 'sector',
    label: 'Sector',
    better: 'high',
    render: (d) => d.profile.sector || '—',
    getRawValue: () => null,
  },
  {
    id: 'industry',
    label: 'Industry',
    better: 'high',
    render: (d) => d.profile.industry || '—',
    getRawValue: () => null,
  },
  {
    id: 'ceo',
    label: 'CEO',
    better: 'high',
    render: (d) => d.profile.ceo || '—',
    getRawValue: () => null,
  },
];

export function CompareStatsSection(props: CompareSectionsProps) {
  return (
    <CompareSection
      {...props}
      sectionKey="general"
      title="General Key Statistics"
      description="profile & capitalization metadata"
      rows={STATS_ROWS}
      variant="emerald"
    />
  );
}

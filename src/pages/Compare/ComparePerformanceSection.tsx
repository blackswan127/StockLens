import { formatPercentChange } from '../../utils/formatters.js';
import { CompareSection } from './CompareSection.js';
import type { CompareMetricRow, CompareSectionsProps } from './types.js';

const performanceValue = (value: number | null) => (
  <span className={Number(value) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
    {formatPercentChange(value)}
  </span>
);

const PERFORMANCE_ROWS: CompareMetricRow[] = [
  {
    id: 'oneWeek',
    label: '1 Week',
    better: 'high',
    render: (d) => performanceValue(d.pricePerformance.oneWeek),
    getRawValue: (d) => d.pricePerformance.oneWeek,
  },
  {
    id: 'threeMonths',
    label: '3 Months',
    better: 'high',
    render: (d) => performanceValue(d.pricePerformance.threeMonths),
    getRawValue: (d) => d.pricePerformance.threeMonths,
  },
  {
    id: 'ytd',
    label: 'YTD Return',
    better: 'high',
    render: (d) => performanceValue(d.pricePerformance.ytd),
    getRawValue: (d) => d.pricePerformance.ytd,
  },
  {
    id: 'oneYear',
    label: '1 Year',
    better: 'high',
    render: (d) => performanceValue(d.pricePerformance.oneYear),
    getRawValue: (d) => d.pricePerformance.oneYear,
  },
];

export function ComparePerformanceSection(props: CompareSectionsProps) {
  return (
    <CompareSection
      {...props}
      sectionKey="performance"
      title="Price Performance"
      rows={PERFORMANCE_ROWS}
    />
  );
}

import { getCellHighlight } from './highlight.js';
import type { CompareColumn, CompareMetricRow, MetricRowOptions } from './types.js';

interface CompareRowProps {
  row: CompareMetricRow;
  columns: CompareColumn[];
  options: MetricRowOptions;
  highlightHighLow: boolean;
}

export function CompareRow({ row, columns, options, highlightHighLow }: CompareRowProps) {
  const rawValues = columns.map((column) =>
    column.details && !column.details.error
      ? row.getRawValue(column.details, options)
      : null
  );

  return (
    <tr className="border-b border-slate-800/80 hover:bg-[#141A26] transition-colors">
      <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-400 bg-[#0D111A] w-[240px] sticky left-0 z-10 border-r border-slate-800 backdrop-blur-xs">
        {row.label}
      </td>
      {columns.map((column, index) => {
        const cellKey = `${row.id}-${column.symbol || 'empty'}-${index}`;

        if (!column.symbol) {
          return (
            <td
              key={cellKey}
              className="py-3 px-4 text-center text-slate-600 font-mono text-xs"
            >
              —
            </td>
          );
        }
        if (column.loading) {
          return (
            <td key={cellKey} className="py-3 px-4 text-center" aria-hidden="true">
              <div className="h-4 w-12 bg-slate-800 rounded animate-pulse mx-auto" />
            </td>
          );
        }
        if (column.details?.error) {
          return (
            <td
              key={cellKey}
              className="py-3 px-4 text-center text-rose-400 font-mono text-[11px]"
            >
              Error
            </td>
          );
        }

        const rawValue = column.details
          ? row.getRawValue(column.details, options)
          : null;
        const highlightClass = getCellHighlight(
          rawValues,
          rawValue,
          row.better,
          highlightHighLow
        );

        return (
          <td
            key={cellKey}
            className={`py-3 px-4 text-xs font-medium text-slate-200 text-right font-mono transition-all tabular-nums ${highlightClass}`}
          >
            {column.details ? row.render(column.details, options) : '—'}
          </td>
        );
      })}
    </tr>
  );
}

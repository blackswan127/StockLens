import { ChevronDown } from 'lucide-react';
import { CompareRow } from './CompareRow.js';
import type { CompareMetricRow, CompareSectionsProps, SectionKey } from './types.js';

interface CompareSectionProps extends CompareSectionsProps {
  sectionKey: SectionKey;
  title: string;
  description?: string;
  rows: CompareMetricRow[];
  variant?: 'default' | 'emerald';
}

export function CompareSection({
  sectionKey,
  title,
  description,
  rows,
  variant = 'default',
  columns,
  collapsedSections,
  onToggleSection,
  highlightHighLow,
  commonSize,
}: CompareSectionProps) {
  const isCollapsed = collapsedSections[sectionKey];
  const isEmerald = variant === 'emerald';

  return (
    <>
      <tr
        onClick={() => onToggleSection(sectionKey)}
        className={
          isEmerald
            ? 'bg-[#080B11] border-b border-slate-800 cursor-pointer select-none font-mono'
            : 'bg-gray-50/50 border-b border-gray-200 cursor-pointer select-none font-sans'
        }
      >
        <th
          colSpan={5}
          scope="colgroup"
          className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-between text-left ${
            isEmerald ? 'text-slate-300' : 'text-gray-700'
          }`}
        >
          <span
            className={`flex items-center gap-1.5 ${isEmerald ? 'text-emerald-400' : ''}`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isEmerald ? 'text-emerald-400' : 'text-gray-400'
              } ${isCollapsed ? '-rotate-90' : ''}`}
            />
            <h2 className="text-xs font-bold uppercase tracking-wider">{title}</h2>
          </span>
          {description && (
            <span className="text-[10px] text-slate-500 lowercase font-normal tracking-normal font-mono">
              ({description})
            </span>
          )}
        </th>
      </tr>

      {!isCollapsed &&
        rows.map((row) => (
          <CompareRow
            key={row.id}
            row={row}
            columns={columns}
            options={{ commonSize }}
            highlightHighLow={highlightHighLow}
          />
        ))}
    </>
  );
}

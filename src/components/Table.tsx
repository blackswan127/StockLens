import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableRowSkeleton } from './Skeleton.jsx';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isPending?: boolean;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  id?: string;
}

export function Table<T extends { id?: string | number; symbol?: string }>({
  columns,
  data,
  isPending = false,
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  onRowHover,
  id = 'interactive-data-table'
}: TableProps<T>) {

  const handleHeaderClick = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-[#0D111A] border border-slate-800 shadow-xl">
      <table id={id} className="min-w-full divide-y divide-slate-800 border-collapse">
        
        {/* Table header */}
        <thead className="bg-[#080B11] border-b border-slate-800">
          <tr>
            {columns.map((col) => {
              const matchesSort = sortKey === col.key;
              const alignClass = 
                col.align === 'right' ? 'text-right justify-end' : 
                col.align === 'center' ? 'text-center justify-center' : 
                'text-left justify-start';

              return (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={`px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 ${
                    col.sortable ? 'cursor-pointer select-none hover:text-emerald-400 transition-colors' : ''
                  }`}
                >
                  <div className={`flex items-center gap-1.5 ${alignClass}`}>
                    <span>{col.label}</span>
                    {col.sortable && onSort && (
                      <span className="text-slate-500">
                        {matchesSort ? (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-400" /> : <ArrowDown className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 hover:text-slate-300" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Table body */}
        <tbody className="divide-y divide-slate-800/60 bg-transparent">
          {isPending ? (
            Array.from({ length: 8 }).map((_, rIdx) => (
              <TableRowSkeleton key={rIdx} columns={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <p className="font-sans text-sm text-slate-400 font-medium">No results found matching search parameters</p>
                <p className="font-mono text-xs text-slate-500 mt-1">Try resetting your screener search filters</p>
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr
                key={row.id || row.symbol || rIdx}
                onClick={() => onRowClick && onRowClick(row)}
                onMouseEnter={() => onRowHover && onRowHover(row)}
                className={`transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-[#141A26]' : 'hover:bg-[#141A26]/50'
                }`}
              >
                {columns.map((col) => {
                  const alignClass = 
                    col.align === 'right' ? 'text-right' : 
                    col.align === 'center' ? 'text-center' : 
                    'text-left';

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-xs font-sans font-medium text-slate-300 whitespace-nowrap ${alignClass}`}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>

      </table>
    </div>
  );
}

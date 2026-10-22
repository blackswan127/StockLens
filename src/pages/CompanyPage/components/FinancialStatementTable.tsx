import React from 'react';
import type { FinancialStatementRow } from './financialRows.js';

interface FinancialStatementTableProps {
  rows: FinancialStatementRow[];
}

export const FinancialStatementTable = React.memo(function FinancialStatementTable({
  rows,
}: FinancialStatementTableProps) {
  if (rows.length === 0) return null;
  const periods = rows[0]?.periods ?? [];

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#080B11]">
      <table className="min-w-full divide-y divide-slate-800 text-xs font-sans">
        <thead>
          <tr className="bg-[#0D111A] text-slate-400 border-b border-slate-800 text-left font-mono font-bold uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-4 font-bold text-left whitespace-nowrap">
              Particulars
            </th>
            {periods.map((period, index) => (
              <th
                key={`period-${period}-${index}`}
                scope="col"
                className="text-right py-3.5 px-4 font-bold pl-4 whitespace-nowrap"
              >
                {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {rows.map((row) => (
            <tr
              key={row.particulars}
              className={`${
                row.emphasized
                  ? 'font-bold text-slate-100 bg-[#0D111A]/80'
                  : 'hover:bg-[#141A26]'
              } transition-colors`}
            >
              <th
                scope="row"
                className="py-3 px-4 font-sans font-medium text-slate-200 text-left flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{row.particulars}</span>
              </th>
              {row.values.map((value, index) => (
                <td
                  key={`${row.particulars}-${index}`}
                  className="text-right py-3 px-4 pl-4 font-mono font-medium whitespace-nowrap text-slate-100 tabular-nums"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

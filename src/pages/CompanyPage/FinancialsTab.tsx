import React, { useMemo, useState } from 'react';
import { FinancialStatementTable } from './components/FinancialStatementTable.js';
import {
  asFinancialStatements,
  buildStatementRows,
  type FinancialPeriodRecord,
  type FinancialStatements,
  type StatementTab,
} from './components/financialRows.js';
import type { CompanyFinancials } from './types.js';

export type StatementViewMode = 'annual' | 'quarterly';
export type FinancialLineItemKey = keyof FinancialPeriodRecord;
export type FinancialRecord = FinancialPeriodRecord;

export interface FinancialsTabProps {
  symbol: string;
  financials: CompanyFinancials | FinancialStatements | null | undefined;
  isFinancialsPending: boolean;
  financialsErr: unknown;
  currencySuffixLabel: string;
}

const STATEMENT_TABS: { id: StatementTab; label: string }[] = [
  { id: 'quarterly', label: 'Quarterly Results' },
  { id: 'pnl', label: 'Profit & Loss (P&L)' },
  { id: 'balance', label: 'Balance Sheet' },
  { id: 'cash', label: 'Cash Flows' },
];

export const FinancialsTab: React.FC<FinancialsTabProps> = ({
  financials,
  isFinancialsPending,
  financialsErr,
}) => {
  const [activeStatementTab, setActiveStatementTab] = useState<StatementTab>('pnl');

  const statements = useMemo(() => asFinancialStatements(financials), [financials]);
  const currentStatementData = useMemo(
    () => buildStatementRows(statements, activeStatementTab),
    [statements, activeStatementTab]
  );

  if (isFinancialsPending) {
    return (
      <div
        id="financials"
        className="bg-[#0D111A] border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl"
        role="status"
        aria-live="polite"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
        <p className="font-mono text-xs text-slate-400">Loading fundamental financial statements...</p>
      </div>
    );
  }

  if (financialsErr) {
    return (
      <div
        id="financials"
        className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-8 text-center text-rose-300 font-mono text-xs shadow-xl"
        aria-live="polite"
      >
        Failed to load financial statement data.
      </div>
    );
  }

  return (
    <div id="financials" className="space-y-6 scroll-mt-20 animate-fade-in">
      <div
        id="statements-sect"
        className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Financial Results & Accounting Statements
            </h3>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Consolidated metrics from quarterly and annual SEC / Exchange filings.
            </p>
          </div>

          <div
            className="flex bg-[#080B11] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0 gap-1 font-mono text-xs"
            role="group"
            aria-label="Financial statement selector"
          >
            {STATEMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStatementTab(tab.id)}
                aria-pressed={activeStatementTab === tab.id}
                className={`flex-1 lg:flex-none px-3.5 py-1.5 font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeStatementTab === tab.id
                    ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {currentStatementData.length === 0 ? (
          <div
            className="py-12 text-center font-mono text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl"
            aria-live="polite"
          >
            {activeStatementTab === 'quarterly'
              ? 'Quarterly data unavailable for this company'
              : 'Annual financial statement data unavailable for this company'}
          </div>
        ) : (
          <FinancialStatementTable rows={currentStatementData} />
        )}
      </div>
    </div>
  );
};

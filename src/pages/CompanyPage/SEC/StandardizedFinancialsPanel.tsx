import React from 'react';
import type {
  EdgarFinancials,
  Peer,
  QuerySection,
  SecStatement,
} from '../types.js';

const SEC_STATEMENT_OPTIONS: ReadonlyArray<{ id: SecStatement; label: string }> = [
  { id: 'income', label: 'Income Statement' },
  { id: 'balance', label: 'Balance Sheet' },
  { id: 'cash', label: 'Cash Flow' },
];

const BOLD_ROWS = [
  'Total Revenue',
  'Gross Profit',
  'Operating Income',
  'Net Income',
  'Total Assets',
  'Total Liabilities',
  'Total Stockholders Equity',
  'Operating Cash Flow',
  'Free Cash Flow',
];

const formatValue = (
  value: number | string | null | undefined,
  label: string
): string => {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') {
    if (label.includes('EPS')) {
      return `$${value.toFixed(2)}`;
    }
    return `$${value.toLocaleString()}M`;
  }
  return value;
};

export interface StandardizedFinancialsPanelProps {
  financials: QuerySection<EdgarFinancials>;
  compareFinancials: QuerySection<EdgarFinancials>;
  peers: Peer[];
  upperSymbol: string;
  statement: SecStatement;
  onStatementChange: (statement: SecStatement) => void;
  comparePeer: string;
  onComparePeerChange: (peer: string) => void;
}

export type FilingsPanelProps = StandardizedFinancialsPanelProps;

export const StandardizedFinancialsPanel: React.FC<StandardizedFinancialsPanelProps> = ({
  financials,
  compareFinancials,
  peers,
  upperSymbol,
  statement,
  onStatementChange,
  comparePeer,
  onComparePeerChange,
}) => {
  const { data: edgarFinancials, isPending, isError } = financials;

  if (isPending) {
    return (
      <div className="space-y-4 animate-fade-in">
        <StatementToolbar
          peers={peers}
          upperSymbol={upperSymbol}
          statement={statement}
          onStatementChange={onStatementChange}
          comparePeer={comparePeer}
          onComparePeerChange={onComparePeerChange}
        />
        <div className="py-12 text-center space-y-2">
          <div className="text-emerald-400 animate-pulse text-sm font-mono font-medium">
            Fetching SEC EDGAR XBRL data…
          </div>
          <div className="text-slate-500 text-xs font-mono">
            Parsing SEC company facts JSON taxonomy
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <StatementToolbar
        peers={peers}
        upperSymbol={upperSymbol}
        statement={statement}
        onStatementChange={onStatementChange}
        comparePeer={comparePeer}
        onComparePeerChange={onComparePeerChange}
      />

      {isError ? (
        <div className="py-8 text-center text-rose-400 text-sm font-mono bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
          ⚠️ Could not load SEC financials for {upperSymbol}. The company may not be
          SEC-registered or EDGAR data is unavailable right now.
        </div>
      ) : edgarFinancials ? (
        <FilingsTable
          financials={edgarFinancials}
          compareFinancials={compareFinancials.data}
          statement={statement}
          upperSymbol={upperSymbol}
          comparePeer={comparePeer}
        />
      ) : (
        <div className="py-6 text-center text-slate-500 font-mono text-xs">
          No standardized statement data returned.
        </div>
      )}
    </div>
  );
};

export const FilingsPanel = StandardizedFinancialsPanel;

interface StatementToolbarProps {
  peers: Peer[];
  upperSymbol: string;
  statement: SecStatement;
  onStatementChange: (statement: SecStatement) => void;
  comparePeer: string;
  onComparePeerChange: (peer: string) => void;
}

const StatementToolbar: React.FC<StatementToolbarProps> = ({
  peers,
  upperSymbol,
  statement,
  onStatementChange,
  comparePeer,
  onComparePeerChange,
}) => (
  <div className="bg-[#080B11] rounded-xl p-3.5 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
      {SEC_STATEMENT_OPTIONS.map((stmt) => (
        <button
          key={stmt.id}
          onClick={() => onStatementChange(stmt.id)}
          className={`px-3 py-1.5 font-semibold rounded-lg border transition-all cursor-pointer ${
            statement === stmt.id
              ? 'bg-[#141A26] border-emerald-500/50 text-emerald-400 shadow-xs font-bold'
              : 'bg-[#0D111A] border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {stmt.label}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-2.5 w-full md:w-auto font-mono text-xs">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
        Compare Peer:
      </span>
      <div className="relative flex-1 md:flex-none">
        <select
          value={comparePeer}
          onChange={(e) => onComparePeerChange(e.target.value)}
          className="w-full md:w-48 bg-[#0D111A] border border-slate-800 rounded-lg py-1.5 px-3 text-xs font-mono font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">None (Select Ticker)</option>
          {peers &&
            peers
              .filter((p) => p.symbol !== upperSymbol)
              .map((peer) => (
                <option key={peer.symbol} value={peer.symbol}>
                  {peer.symbol} - {peer.name}
                </option>
              ))}
        </select>
      </div>
      {comparePeer && (
        <button
          onClick={() => onComparePeerChange('')}
          className="px-2.5 py-1.5 text-[10px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg font-bold uppercase transition cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  </div>
);

interface FilingsTableProps {
  financials: EdgarFinancials;
  compareFinancials: EdgarFinancials | undefined;
  statement: SecStatement;
  upperSymbol: string;
  comparePeer: string;
}

const FilingsTable: React.FC<FilingsTableProps> = ({
  financials,
  compareFinancials,
  statement,
  upperSymbol,
  comparePeer,
}) => {
  const statementKey =
    statement === 'income'
      ? 'incomeStatement'
      : statement === 'balance'
        ? 'balanceSheet'
        : 'cashFlow';

  const activeRows = financials[statementKey] || [];
  const peerRows = compareFinancials ? compareFinancials[statementKey] || [] : [];

  const years = Array.from(
    new Set([
      ...activeRows.flatMap((row) => Object.keys(row.values || {})),
      ...peerRows.flatMap((row) => Object.keys(row.values || {})),
    ])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0B0F19]">
      <table className="min-w-full divide-y divide-slate-800 text-[13px] font-sans">
        <thead>
          <tr className="bg-[#0D111A] text-emerald-400 border-b border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider font-mono">
            <th className="py-3 px-4 font-bold whitespace-nowrap">
              Standardized Item (USD in Millions)
            </th>
            {comparePeer ? (
              years.flatMap((year) => [
                <th
                  key={`${upperSymbol}-${year}`}
                  className="py-3 px-4 text-right font-bold whitespace-nowrap text-slate-200"
                >
                  {upperSymbol} ({year})
                </th>,
                <th
                  key={`${comparePeer}-${year}`}
                  className="py-3 px-4 text-right font-bold whitespace-nowrap text-blue-400"
                >
                  {comparePeer} ({year})
                </th>,
              ])
            ) : (
              years.map((year) => (
                <th
                  key={year}
                  className="py-3 px-4 text-right font-bold whitespace-nowrap"
                >
                  FY {year}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {activeRows.map((row, rowIndex) => {
            const peerRow = peerRows.find((pr) => pr.label === row.label);
            const isBoldRow = BOLD_ROWS.includes(row.label);

            return (
              <tr
                key={row.label}
                className={`${
                  isBoldRow
                    ? 'font-bold text-slate-100 bg-emerald-500/5'
                    : rowIndex % 2 === 1
                      ? 'bg-[#111827]/40'
                      : 'bg-[#0D111A]'
                } hover:bg-slate-800/30 transition`}
              >
                <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                  {row.label}
                </td>
                {comparePeer ? (
                  years.flatMap((year) => [
                    <td
                      key={`${upperSymbol}-${year}`}
                      className="py-3 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap"
                    >
                      {formatValue(row.values[year], row.label)}
                    </td>,
                    <td
                      key={`${comparePeer}-${year}`}
                      className="py-3 px-4 text-right font-mono text-blue-300 whitespace-nowrap"
                    >
                      {formatValue(peerRow?.values[year], row.label)}
                    </td>,
                  ])
                ) : (
                  years.map((year, index) => (
                    <td
                      key={year}
                      className={`py-3 px-4 text-right font-mono whitespace-nowrap ${
                        index === 0 ? 'font-bold text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {formatValue(row.values[year], row.label)}
                    </td>
                  ))
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

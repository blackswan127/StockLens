import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Table, type Column } from '../../components/Table.jsx';
import {
  formatMarketCap,
  formatPercentChange,
  formatPrice,
} from '../../utils/formatters.js';
import { getCountryFlagUrl, getExchangeBadge } from '../../utils/symbolHelper.js';
import type { ScreenerStock, SortOrder } from './types';

const COLUMNS: Column<ScreenerStock>[] = [
  {
    key: 'symbol',
    label: 'Equities Symbol',
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <img
          src={getCountryFlagUrl(row.exchange)}
          alt="Flag"
          referrerPolicy="no-referrer"
          className="h-3 w-4 rounded-sm object-cover shrink-0 shadow-sm opacity-90"
        />
        <div className="flex flex-col">
          <span className="font-mono font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
            {row.symbol}
          </span>
          <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase -mt-0.5">
            {getExchangeBadge(row.exchange)}
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'name',
    label: 'Company Name',
    sortable: true,
    render: (row) => (
      <div className="font-sans font-medium text-slate-200 max-w-[150px] sm:max-w-xs truncate">
        {row.name}
      </div>
    ),
  },
  {
    key: 'sector',
    label: 'Sector Category',
    sortable: true,
    render: (row) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/80">
        {row.sector}
      </span>
    ),
  },
  {
    key: 'peTrailing',
    label: 'P/E (TTM)',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono font-bold text-slate-200 tabular-nums">
        {row.peTrailing !== null ? `${row.peTrailing.toFixed(1)}x` : '—'}
      </span>
    ),
  },
  {
    key: 'roe',
    label: 'ROE',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono font-bold text-slate-200 tabular-nums">
        {row.roe !== null ? `${row.roe.toFixed(1)}%` : '—'}
      </span>
    ),
  },
  {
    key: 'debt_equity',
    label: 'D/E',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono font-bold text-slate-200 tabular-nums">
        {row.debt_equity !== null ? `${row.debt_equity.toFixed(2)}x` : '—'}
      </span>
    ),
  },
  {
    key: 'price',
    label: 'Last Price',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono font-bold text-slate-100 tabular-nums">
        {formatPrice(row.price, row.exchange)}
      </span>
    ),
  },
  {
    key: 'change_pct',
    label: 'Market Change',
    align: 'right',
    sortable: true,
    render: (row) => {
      const isUp = (row.change_pct ?? 0) >= 0;
      return (
        <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold px-1.5 py-0.5 rounded border tabular-nums ${
          isUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        }`}>
          {formatPercentChange(row.change_pct)}
        </span>
      );
    },
  },
  {
    key: 'market_cap',
    label: 'Market Cap',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono text-xs text-slate-200 font-bold tabular-nums">
        {formatMarketCap(row.market_cap, row.exchange)}
      </span>
    ),
  },
];

interface ScreenerResultsTableProps {
  stocks: ScreenerStock[];
  total: number;
  totalPages: number;
  page: number;
  itemsPerPage: number;
  isPending: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSort: (key: string) => void;
  onPageChange: (page: number) => void;
  onRowClick: (row: ScreenerStock) => void;
  onRowHover: (row: ScreenerStock) => void;
}

export function ScreenerResultsTable({
  stocks,
  total,
  totalPages,
  page,
  itemsPerPage,
  isPending,
  sortBy,
  sortOrder,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onSort,
  onPageChange,
  onRowClick,
  onRowHover,
}: ScreenerResultsTableProps) {
  return (
    <div className="space-y-4">
      {/* Simple Search bar overlay on results */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search ticker symbol or company name..."
          className="w-full rounded-xl border border-slate-800 bg-[#0D111A] py-2 pl-9 pr-8 text-xs font-mono font-medium text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
        />
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Table<ScreenerStock>
        columns={COLUMNS}
        data={stocks}
        isPending={isPending}
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        onRowClick={onRowClick}
        onRowHover={onRowHover}
      />

      {/* 4. Elegant Pagination Controls & Rows Stats */}
      {!isPending && total > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800/80 pt-4">
          <span className="font-mono text-xs text-slate-400">
            Showing <span className="font-bold text-slate-200">{Math.min((page - 1) * itemsPerPage + 1, total)}</span> to <span className="font-bold text-slate-200">{Math.min(page * itemsPerPage, total)}</span> of <span className="font-bold text-slate-200">{total}</span> Equities
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 border border-slate-800 rounded-lg bg-[#0D111A] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0D111A] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-slate-300" />
            </button>

            <div className="flex items-center gap-1 font-mono text-xs">
              {Array.from({ length: totalPages }).map((_, pIdx) => {
                const pNum = pIdx + 1;
                if (pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 1) {
                  return (
                    <button
                      key={pNum}
                      onClick={() => onPageChange(pNum)}
                      className={`h-7 w-7 rounded-lg font-bold transition-colors cursor-pointer ${
                        page === pNum
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold'
                          : 'border border-slate-800 bg-[#0D111A] text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === 2 || pNum === totalPages - 1) {
                  return <span key={pNum} className="px-1 text-slate-600">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-slate-800 rounded-lg bg-[#0D111A] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0D111A] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

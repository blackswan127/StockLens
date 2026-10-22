import type { CurrencyMode } from './types.js';

interface CompareToolbarProps {
  highlightHighLow: boolean;
  onToggleHighlightHighLow: () => void;
  commonSize: boolean;
  onToggleCommonSize: () => void;
  currencyMode: CurrencyMode;
  onCurrencyModeChange: (mode: CurrencyMode) => void;
}

export function CompareToolbar({
  highlightHighLow,
  onToggleHighlightHighLow,
  commonSize,
  onToggleCommonSize,
  currencyMode,
  onCurrencyModeChange,
}: CompareToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="compare-highlight-toggle"
        className="inline-flex items-center cursor-pointer bg-[#0D111A] px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors"
      >
        <input
          id="compare-highlight-toggle"
          type="checkbox"
          checked={highlightHighLow}
          onChange={onToggleHighlightHighLow}
          className="sr-only peer"
        />
        <div className="relative w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
        <span className="ms-2 text-xs font-mono font-bold text-slate-300 select-none">
          Highlight High/Low
        </span>
      </label>

      <label
        htmlFor="compare-common-size-toggle"
        className="inline-flex items-center cursor-pointer bg-[#0D111A] px-3.5 py-2 rounded-xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors"
      >
        <input
          id="compare-common-size-toggle"
          type="checkbox"
          checked={commonSize}
          onChange={onToggleCommonSize}
          className="sr-only peer"
        />
        <div className="relative w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
        <span className="ms-2 text-xs font-mono font-bold text-slate-300 select-none">
          Common Size %
        </span>
      </label>

      <div className="relative bg-[#0D111A] px-3 py-2 rounded-xl border border-slate-800 shadow-sm flex items-center gap-1.5 font-mono text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-500">Currency:</span>
        <select
          value={currencyMode}
          onChange={(e) => onCurrencyModeChange(e.target.value as CurrencyMode)}
          aria-label="Currency"
          className="text-xs font-bold text-slate-200 outline-none cursor-pointer bg-transparent"
        >
          <option value="USD" className="bg-[#0D111A]">
            USD ($)
          </option>
          <option value="LCL" className="bg-[#0D111A]">
            Reported Currency
          </option>
        </select>
      </div>
    </div>
  );
}

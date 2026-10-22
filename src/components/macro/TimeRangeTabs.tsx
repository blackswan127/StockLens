import React from "react";
import { TimeRange } from "../../utils/macroHelpers";

interface TimeRangeTabsProps {
  ranges: TimeRange[];
  activeRange: TimeRange;
  onChange: (range: TimeRange) => void;
  label?: string;
}

export const TimeRangeTabs: React.FC<TimeRangeTabsProps> = ({
  ranges,
  activeRange,
  onChange,
  label = "Chart time range",
}) => {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 bg-[#080B11] p-1 rounded-xl border border-slate-800"
    >
      {ranges.map((range) => {
        const isActive = activeRange === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            aria-pressed={isActive}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              isActive
                ? "text-emerald-400 bg-[#141A26] border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
};

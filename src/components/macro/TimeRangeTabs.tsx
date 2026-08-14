import React from "react";
import { TimeRange } from "../../utils/macroHelpers";

interface TimeRangeTabsProps {
  ranges: TimeRange[];
  activeRange: TimeRange;
  onChange: (range: TimeRange) => void;
}

export const TimeRangeTabs: React.FC<TimeRangeTabsProps> = ({ ranges, activeRange, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-[#080B11] p-1 rounded-xl border border-slate-800">
      {ranges.map((range) => {
        const isActive = activeRange === range;
        return (
          <button
            key={range}
            onClick={() => onChange(range)}
            className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
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

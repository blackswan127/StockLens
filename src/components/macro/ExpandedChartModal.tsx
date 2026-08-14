import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Observation, TimeRange, filterByRange } from "../../utils/macroHelpers";
import { TimeRangeTabs } from "./TimeRangeTabs";

interface ExpandedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentValue: string;
  observations: Observation[];
  interpretation?: string;
}

export const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  isOpen,
  onClose,
  title,
  currentValue,
  observations,
  interpretation,
}) => {
  const [activeRange, setActiveRange] = useState<TimeRange>("1Y");

  if (!isOpen) return null;

  const filteredData = filterByRange(observations, activeRange);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-[800px] bg-[#0D111A] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="max-w-[80%]">
            <h2 className="text-xl font-bold font-sans text-slate-100">{title}</h2>
            <div className="text-3xl font-black font-mono text-slate-100 mt-1 tabular-nums">{currentValue}</div>
            {interpretation && (
              <div className="mt-3 p-3 bg-[#080B11] border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-sans">
                {interpretation}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <TimeRangeTabs
            ranges={["1M", "6M", "1Y", "5Y", "10Y", "Max"]}
            activeRange={activeRange}
            onChange={setActiveRange}
          />
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
                }}
                tickMargin={10}
                stroke="#334155"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono" }}
                tickFormatter={(val) => val.toString()}
                stroke="#334155"
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0D111A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "#F8FAFC", fontFamily: "JetBrains Mono" }}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={2}
                fill="rgba(16,185,129,0.15)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

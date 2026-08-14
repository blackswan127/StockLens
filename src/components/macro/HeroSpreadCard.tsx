import React, { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Observation, TimeRange, filterByRange, formatSpreadValue } from "../../utils/macroHelpers";
import { TimeRangeTabs } from "./TimeRangeTabs";

interface HeroSpreadCardProps {
  spreadData: Observation[];
}

export const HeroSpreadCard: React.FC<HeroSpreadCardProps> = ({ spreadData }) => {
  const [activeRange, setActiveRange] = useState<TimeRange>("1Y");

  if (!spreadData || spreadData.length === 0) return null;

  const filteredData = filterByRange(spreadData, activeRange);
  const latestValue = spreadData[spreadData.length - 1].value;
  const isNormal = latestValue >= 0;

  const strokeColor = isNormal ? "#10B981" : "#F43F5E";
  const fillColor = isNormal ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)";

  return (
    <div 
      className="border border-slate-800 bg-[#0D111A] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-xl transition-all duration-200"
      style={{ borderLeftWidth: "4px", borderLeftColor: strokeColor }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold font-sans text-slate-100">Yield Curve Spread (10Y − 2Y)</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono text-slate-100 tracking-tight tabular-nums">
              {formatSpreadValue(latestValue)}
            </span>
            <div 
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center border ${
                isNormal ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {isNormal ? "● Normal Slope" : "⚠ Inverted — Recession Watch"}
            </div>
          </div>
        </div>
        
        <div className="z-10">
          <TimeRangeTabs
            ranges={["1M", "6M", "1Y", "5Y", "10Y", "Max"]}
            activeRange={activeRange}
            onChange={setActiveRange}
          />
        </div>
      </div>

      <div className="h-[160px] w-full -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <Tooltip
              contentStyle={{ backgroundColor: "#0D111A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "#F8FAFC", fontFamily: "JetBrains Mono" }}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(val: any) => [formatSpreadValue(Number(val)), "Spread"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill={fillColor}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

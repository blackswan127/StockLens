import React, { useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { MacroSeriesConfig } from "../../constants/macroConfig";
import { Observation } from "../../utils/macroHelpers";
import { ExpandedChartModal } from "./ExpandedChartModal";

interface IndicatorCardProps {
  config: MacroSeriesConfig;
  observations: Observation[];
  error?: boolean;
  onRetry: () => void;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({ config, observations, error, onRetry }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (error) {
    return (
      <div className="border border-slate-800 bg-[#0D111A] rounded-2xl p-5 h-[160px] flex flex-col justify-center items-center shadow-xl">
        <div className="text-slate-200 font-sans font-bold mb-2 text-sm">{config.name}</div>
        <div className="text-rose-400 mb-3 text-xs font-mono flex items-center gap-1">
          <span>⚠</span> Failed to load
        </div>
        <button
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!observations || observations.length === 0) return null;

  const latestObs = observations[observations.length - 1];
  const prevObs = observations.length > 1 ? observations[observations.length - 2] : null;

  const currentValueStr = config.formatter(latestObs.value);
  let changeStr = "—";
  let changeColor = "text-slate-500";
  let changeIcon = "";

  if (prevObs) {
    const diff = latestObs.value - prevObs.value;
    if (Math.abs(diff) > 0.0001) {
      const isPositive = diff > 0;
      changeIcon = isPositive ? "▲" : "▼";
      
      // Handle inverse logic for UNRATE and ICSA (lower is better, so red for up)
      const isInverse = config.id === "UNRATE" || config.id === "ICSA";
      if (isPositive) {
        changeColor = isInverse ? "text-rose-400" : "text-emerald-400";
      } else {
        changeColor = isInverse ? "text-emerald-400" : "text-rose-400";
      }

      // Format diff roughly
      const formattedDiff = config.id === "GDPC1" 
        ? `$${Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`
        : config.id === "ICSA"
        ? `${(Math.abs(diff) / 1000).toFixed(1)}K`
        : Math.abs(diff).toFixed(2);
        
      changeStr = `${changeIcon} ${formattedDiff}`;
    }
  }

  // Sparkline data (last 30 obs)
  const sparkData = observations.slice(-30);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="border border-slate-800 bg-[#0D111A] rounded-2xl p-5 cursor-pointer hover:border-slate-700 hover:bg-[#111723] transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between group h-full shadow-xl"
      >
        <div>
          <div className="font-mono text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{config.id}</div>
          <div className="font-bold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
            {config.name}
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-3">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tabular-nums leading-none">
              {currentValueStr}
            </div>
            <div className={`text-xs font-mono font-bold mt-1.5 tabular-nums ${changeColor}`}>
              {changeStr}
            </div>
          </div>
          
          <div className="h-[48px] w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ExpandedChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={config.name}
        currentValue={currentValueStr}
        observations={observations}
        interpretation={config.interpretation}
      />
    </>
  );
};

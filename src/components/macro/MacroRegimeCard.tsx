import React from "react";
import { Observation } from "../../utils/macroHelpers";
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MacroRegimeCardProps {
  t10y2y: Observation[];
  unrate: Observation[];
  baml: Observation[];
  cpi: Observation[];
}

export const MacroRegimeCard: React.FC<MacroRegimeCardProps> = ({ t10y2y, unrate, baml, cpi }) => {
  if (!t10y2y.length || !unrate.length || !baml.length) return null;

  const currentYieldSpread = t10y2y[t10y2y.length - 1].value;
  const currentUnemployment = unrate[unrate.length - 1].value;
  const unrate6moAgo = unrate.length > 6 ? unrate[unrate.length - 6].value : currentUnemployment;
  const currentSpread = baml[baml.length - 1].value;
  
  // Sahm rule proxy
  const sahmTriggered = (currentUnemployment - unrate6moAgo) >= 0.5;
  const yieldInverted = currentYieldSpread < 0;
  const highStress = currentSpread > 5.0;

  // Determine Regime
  let regime = "Expansionary Growth";
  let color = "text-emerald-400";
  let bg = "bg-[#0D111A]";
  let border = "border-emerald-500/30";
  let icon = <TrendingUp className="h-7 w-7 text-emerald-400" />;
  let description = "Economic growth is solid, credit stress is low, and the Treasury yield curve is positively sloped. Broadly bullish environment for risk assets.";

  if (sahmTriggered && highStress) {
    regime = "Contraction / Recession";
    color = "text-rose-400";
    border = "border-rose-500/30";
    icon = <TrendingDown className="h-7 w-7 text-rose-400" />;
    description = "Unemployment is rising rapidly and credit markets are stressed. Defensive allocation and capital preservation recommended.";
  } else if (yieldInverted && !sahmTriggered) {
    regime = "Late Cycle / Slowdown Warning";
    color = "text-amber-400";
    border = "border-amber-500/30";
    icon = <AlertTriangle className="h-7 w-7 text-amber-400" />;
    description = "The Treasury yield curve is inverted, historically signaling an impending slowdown. Monitor labor and credit telemetry closely.";
  } else if (!yieldInverted && sahmTriggered) {
    regime = "Early Recovery";
    color = "text-sky-400";
    border = "border-sky-500/30";
    icon = <Activity className="h-7 w-7 text-sky-400" />;
    description = "The yield curve has un-inverted while monetary policy transitions. Historically precedes the inception of a new expansion cycle.";
  } else if (highStress && !sahmTriggered) {
    regime = "Financial Stress / Volatility Shock";
    color = "text-amber-400";
    border = "border-amber-500/30";
    icon = <AlertTriangle className="h-7 w-7 text-amber-400" />;
    description = "High-yield credit spreads are elevated despite steady employment. Elevated macro volatility expected.";
  }

  return (
    <div className={`p-6 rounded-2xl border ${bg} ${border} mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-xl`}>
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AI Macro Regime Identifier
        </h3>
        <h2 className={`text-xl sm:text-2xl font-black font-sans ${color} mb-1.5`}>
          Current Phase: {regime}
        </h2>
        <p className="text-slate-300 font-medium text-xs sm:text-sm leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full md:w-[260px] bg-[#080B11] p-4 rounded-xl border border-slate-800 font-mono">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Yield Curve (10Y-2Y)</span>
          <span className={`font-bold tabular-nums ${yieldInverted ? 'text-rose-400' : 'text-emerald-400'}`}>
            {currentYieldSpread > 0 ? '+' : ''}{currentYieldSpread.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Sahm Rule (6M Δ)</span>
          <span className={`font-bold tabular-nums ${sahmTriggered ? 'text-rose-400' : 'text-emerald-400'}`}>
            {((currentUnemployment - unrate6moAgo) > 0 ? '+' : '')}{(currentUnemployment - unrate6moAgo).toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Credit Spread</span>
          <span className={`font-bold tabular-nums ${highStress ? 'text-rose-400' : 'text-emerald-400'}`}>
            {currentSpread.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

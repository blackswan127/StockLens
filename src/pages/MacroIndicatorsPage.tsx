import React from "react";
import { useFredSeries } from "../hooks/useFredSeries";
import { MACRO_CONFIG, MacroSeriesId } from "../constants/macroConfig";
import { calcSpread } from "../utils/macroHelpers";
import { HeroSpreadCard } from "../components/macro/HeroSpreadCard";
import { MacroRegimeCard } from "../components/macro/MacroRegimeCard";
import { IndicatorCard } from "../components/macro/IndicatorCard";
import { MacroSkeleton } from "../components/macro/MacroSkeleton";
import { Globe } from "lucide-react";

const ALL_SERIES: MacroSeriesId[] = [
  "FEDFUNDS",
  "DGS10",
  "DGS2",
  "T10Y2Y",
  "BAMLH0A0HYM2",
  "CPIAUCSL",
  "PCEPI",
  "UNRATE",
  "PAYEMS",
  "GDPC1",
  "ICSA",
  "M2SL",
  "RSAFS",
  "HOUST",
  "UMCSENT"
];

export const MacroIndicatorsPage: React.FC = () => {
  const { data, loading, errors, refetch } = useFredSeries(ALL_SERIES);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-6 w-6 text-emerald-400" />
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-slate-100 tracking-tight">
              Macro Indicators
            </h1>
          </div>
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 mt-1">
            <p>Key U.S. economic data · Source: Federal Reserve (FRED)</p>
            <p>Sync status: Active</p>
          </div>
        </div>
        <MacroSkeleton />
      </div>
    );
  }

  // Calculate yield curve spread if both DGS10 and DGS2 are loaded
  const dgs10 = data?.DGS10 || [];
  const dgs2 = data?.DGS2 || [];
  const spreadData = dgs10.length > 0 && dgs2.length > 0 ? calcSpread(dgs10, dgs2) : [];

  const SectionHeader = ({ title, icon }: { title: string; icon?: string }) => (
    <h3 className="font-bold font-sans text-slate-200 mb-4 flex items-center gap-2 text-base">
      {icon && <span>{icon}</span>} {title}
    </h3>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-black font-sans text-slate-100 tracking-tight">
            Macro Indicators
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono text-slate-500 gap-1 mt-1">
          <p>Key U.S. macroeconomic telemetry · Source: Federal Reserve (FRED)</p>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* HERO CARD */}
      {spreadData.length > 0 && <HeroSpreadCard spreadData={spreadData} />}

      {/* MACRO REGIME IDENTIFIER */}
      <MacroRegimeCard 
        t10y2y={data?.T10Y2Y || []}
        unrate={data?.UNRATE || []}
        baml={data?.BAMLH0A0HYM2 || []}
        cpi={data?.CPIAUCSL || []}
      />

      {/* INDICATOR CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        
        {/* Section A */}
        <div className="p-6 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl">
          <SectionHeader title="Rates & Yields" icon="📈" />
          <div className="grid grid-cols-1 gap-3.5">
            {(["FEDFUNDS", "DGS10", "DGS2", "T10Y2Y", "BAMLH0A0HYM2"] as MacroSeriesId[]).map((id) => (
              <IndicatorCard
                key={id}
                config={MACRO_CONFIG[id]}
                observations={data?.[id] || []}
                error={errors[id]}
                onRetry={() => refetch(id)}
              />
            ))}
          </div>
        </div>

        {/* Section B & C Column */}
        <div className="space-y-8">
          <div className="p-6 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl">
            <SectionHeader title="Inflation & Growth" icon="💹" />
            <div className="grid grid-cols-1 gap-3.5">
              {(["CPIAUCSL", "PCEPI", "GDPC1", "M2SL"] as MacroSeriesId[]).map((id) => (
                <IndicatorCard
                  key={id}
                  config={MACRO_CONFIG[id]}
                  observations={data?.[id] || []}
                  error={errors[id]}
                  onRetry={() => refetch(id)}
                />
              ))}
            </div>
          </div>

          <div className="p-6 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl">
            <SectionHeader title="Labor Market" icon="👷" />
            <div className="grid grid-cols-1 gap-3.5">
              {(["UNRATE", "PAYEMS", "ICSA"] as MacroSeriesId[]).map((id) => (
                <IndicatorCard
                  key={id}
                  config={MACRO_CONFIG[id]}
                  observations={data?.[id] || []}
                  error={errors[id]}
                  onRetry={() => refetch(id)}
                />
              ))}
            </div>
          </div>

          <div className="p-6 border border-slate-800 bg-[#0D111A]/95 rounded-2xl shadow-xl">
            <SectionHeader title="Consumer & Housing" icon="🛍️" />
            <div className="grid grid-cols-1 gap-3.5">
              {(["RSAFS", "HOUST", "UMCSENT"] as MacroSeriesId[]).map((id) => (
                <IndicatorCard
                  key={id}
                  config={MACRO_CONFIG[id]}
                  observations={data?.[id] || []}
                  error={errors[id]}
                  onRetry={() => refetch(id)}
                />
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

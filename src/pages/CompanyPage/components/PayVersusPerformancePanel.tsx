import React from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface EdgarPvPFactValue {
  fy: number | null;
  fp: string | null;
  end: string | null;
  start: string | null;
  val: number;
  accn: string;
  form: string;
}

interface EdgarPvPConcept {
  tag: string;
  label: string;
  unit: string;
  values: EdgarPvPFactValue[];
}

interface EdgarPayVsPerformance {
  symbol: string;
  cik: string;
  available: boolean;
  reason?: string;
  concepts: EdgarPvPConcept[];
  sourceUrl: string;
}

interface PayVersusPerformancePanelProps {
  data: EdgarPayVsPerformance | null;
  isPending: boolean;
  isError: boolean;
  upperSymbol: string;
}

export const PayVersusPerformancePanel: React.FC<PayVersusPerformancePanelProps> = ({
  data,
  isPending,
  isError,
  upperSymbol,
}) => {
  if (isPending) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-slate-800/50 rounded-xl border border-slate-800 w-full" />
        <div className="h-36 bg-slate-800/40 rounded-xl border border-slate-800 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 font-mono">
        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
        <span>Could not load structured Pay versus Performance data for {upperSymbol}.</span>
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="p-4 bg-[#111827]/70 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-400 font-medium">
        <div className="flex items-center gap-2 text-slate-200">
          <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="font-bold">No structured PvP disclosure available</span>
        </div>
        <p className="text-[11px] leading-relaxed max-w-xl text-slate-400">
          {data.reason || `No 'ecd' taxonomy facts found. This company might be exempt (e.g. Foreign Private Issuer or Emerging Growth Company).`}
        </p>
        {data.sourceUrl && (
          <div className="pt-1">
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[10.5px] font-mono font-bold"
            >
              <span>Verify Raw SEC Company Facts JSON</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  // 1. Gather all unique years from all concepts, sorted descending
  const yearsSet = new Set<number>();
  data.concepts.forEach((concept) => {
    concept.values.forEach((v) => {
      if (typeof v.fy === 'number') {
        yearsSet.add(v.fy);
      }
    });
  });
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  // 2. Format function depending on concept unit
  const formatVal = (val: number | null, unit: string) => {
    if (val === null || val === undefined) return '—';
    if (unit === 'USD') {
      return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    if (unit === 'pure') {
      return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return `${val.toLocaleString()} (${unit})`;
  };

  // Helper to extract value for a concept and year
  const getValueForYear = (concept: EdgarPvPConcept, year: number) => {
    const matches = concept.values.filter((v) => v.fy === year);
    if (matches.length === 0) return null;
    const def14aMatch = matches.find((v) => v.form === 'DEF 14A');
    const match = def14aMatch || matches[0];
    return match.val;
  };

  // 3. Remove concepts that have no values at all for our years list
  const activeConcepts = data.concepts.filter((concept) => {
    return years.some((yr) => getValueForYear(concept, yr) !== null);
  });

  if (activeConcepts.length === 0) {
    return (
      <div className="p-4 bg-[#111827]/70 border border-slate-800 rounded-xl text-xs text-slate-400 text-center font-mono">
        Filer has ecd taxonomy data, but no entries could be aligned to a fiscal year.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0B0F19]">
        <table className="min-w-full divide-y divide-slate-800 text-[13px] font-sans">
          <thead>
            <tr className="bg-[#0D111A] text-emerald-400 border-b border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider font-mono">
              <th className="py-3 px-4 font-bold whitespace-nowrap">SEC Tagged Concept</th>
              {years.map((year) => (
                <th key={year} className="py-3 px-4 text-right font-bold whitespace-nowrap">
                  FY {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {activeConcepts.map((concept, idx) => {
              const isHighlight =
                concept.tag.toLowerCase().includes('peo') ||
                concept.tag.toLowerCase().includes('nonpeo');

              return (
                <tr
                  key={concept.tag}
                  className={`hover:bg-slate-800/30 transition ${
                    isHighlight ? 'bg-emerald-500/10 font-medium' : idx % 2 === 1 ? 'bg-[#111827]/40' : 'bg-[#0D111A]'
                  }`}
                >
                  <td className="py-3 px-4 text-slate-200 whitespace-nowrap max-w-sm truncate" title={concept.label}>
                    <div className="font-semibold text-slate-100 leading-snug">{concept.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{concept.tag}</div>
                  </td>
                  {years.map((year) => {
                    const rawVal = getValueForYear(concept, year);
                    return (
                      <td key={year} className="py-3 px-4 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                        {formatVal(rawVal, concept.unit)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

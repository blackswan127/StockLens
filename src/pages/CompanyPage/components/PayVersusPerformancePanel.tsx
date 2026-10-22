import React, { useMemo } from 'react';
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
  data: EdgarPayVsPerformance | null | undefined;
  isPending: boolean;
  isError: boolean;
  upperSymbol: string;
}

const formatValue = (value: number | null, unit: string): string => {
  if (value === null || value === undefined) return '—';
  if (unit === 'USD') {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (unit === 'pure') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return `${value.toLocaleString()} (${unit})`;
};

const getConceptValues = (concept: EdgarPvPConcept): EdgarPvPFactValue[] =>
  Array.isArray(concept.values) ? concept.values : [];

const getValueForYear = (concept: EdgarPvPConcept, year: number): number | null => {
  const matches = getConceptValues(concept).filter((value) => value.fy === year);
  if (matches.length === 0) return null;
  const annualReportMatch = matches.find((value) => value.form === 'DEF 14A');
  return (annualReportMatch ?? matches[0]).val;
};

export const PayVersusPerformancePanel = React.memo(function PayVersusPerformancePanel({
  data,
  isPending,
  isError,
  upperSymbol,
}: PayVersusPerformancePanelProps) {
  const { years, activeConcepts } = useMemo(() => {
    if (!data || !data.available || !Array.isArray(data.concepts)) {
      return { years: [] as number[], activeConcepts: [] as EdgarPvPConcept[] };
    }
    const yearSet = new Set<number>();
    data.concepts.forEach((concept) => {
      getConceptValues(concept).forEach((value) => {
        if (typeof value.fy === 'number') yearSet.add(value.fy);
      });
    });
    const fiscalYears = Array.from(yearSet).sort((a, b) => b - a);
    const concepts = data.concepts.filter((concept) =>
      fiscalYears.some((year) => getValueForYear(concept, year) !== null)
    );
    return { years: fiscalYears, activeConcepts: concepts };
  }, [data]);

  if (isPending) {
    return (
      <div className="space-y-3 animate-pulse" role="status" aria-live="polite">
        <div className="h-10 bg-slate-800/50 rounded-xl border border-slate-800 w-full" />
        <div className="h-36 bg-slate-800/40 rounded-xl border border-slate-800 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 font-mono"
        aria-live="polite"
      >
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
          {data.reason ||
            `No 'ecd' taxonomy facts found. This company might be exempt (e.g. Foreign Private Issuer or Emerging Growth Company).`}
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

  if (activeConcepts.length === 0) {
    return (
      <div
        className="p-4 bg-[#111827]/70 border border-slate-800 rounded-xl text-xs text-slate-400 text-center font-mono"
        aria-live="polite"
      >
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
              <th scope="col" className="py-3 px-4 font-bold whitespace-nowrap">
                SEC Tagged Concept
              </th>
              {years.map((year) => (
                <th key={year} scope="col" className="py-3 px-4 text-right font-bold whitespace-nowrap">
                  FY {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {activeConcepts.map((concept, index) => {
              const isHighlight =
                concept.tag.toLowerCase().includes('peo') ||
                concept.tag.toLowerCase().includes('nonpeo');

              return (
                <tr
                  key={`${concept.tag}-${concept.unit}`}
                  className={`hover:bg-slate-800/30 transition ${
                    isHighlight
                      ? 'bg-emerald-500/10 font-medium'
                      : index % 2 === 1
                        ? 'bg-[#111827]/40'
                        : 'bg-[#0D111A]'
                  }`}
                >
                  <td
                    className="py-3 px-4 text-slate-200 whitespace-nowrap max-w-sm truncate"
                    title={concept.label}
                  >
                    <div className="font-semibold text-slate-100 leading-snug">{concept.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{concept.tag}</div>
                  </td>
                  {years.map((year) => (
                    <td
                      key={year}
                      className="py-3 px-4 text-right font-mono font-semibold text-slate-200 whitespace-nowrap"
                    >
                      {formatValue(getValueForYear(concept, year), concept.unit)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

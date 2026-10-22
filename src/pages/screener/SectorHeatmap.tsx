import type { SectorStat } from './types';

interface SectorHeatmapProps {
  sectors: SectorStat[] | undefined;
  isPending: boolean;
  selectedSector: string;
  onSectorClick: (sectorName: string) => void;
}

export function SectorHeatmap({
  sectors,
  isPending,
  selectedSector,
  onSectorClick,
}: SectorHeatmapProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <h3 className="font-sans text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <span>Market Sector Heatmap</span>
          <span className="text-[10px] font-mono text-slate-500 font-semibold normal-case">
            (Tap card to filter stock table)
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isPending ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-800" />
          ))
        ) : (
          sectors?.map((s) => {
            const isSelected = selectedSector === s.name;
            const isUp = s.performance >= 0;
            return (
              <button
                key={s.name}
                onClick={() => onSectorClick(s.name)}
                className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#141A26] border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#0D111A] border-slate-800 hover:border-slate-700 hover:bg-[#141A26]'
                }`}
              >
                <div className="font-sans font-bold text-sm sm:text-base text-slate-100 truncate tracking-tight">
                  {s.name}
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {s.proxy}
                  </span>
                  <span className={`font-mono text-xs font-bold ml-auto px-2 py-0.5 rounded border tabular-nums ${
                    isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {isUp ? '+' : ''}{s.performance.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

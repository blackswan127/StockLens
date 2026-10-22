import { Info } from 'lucide-react';

interface ProvenanceData {
  source: string;
  fallbackApplied: boolean;
  timestamp?: string;
}

export const ProvenanceTooltip = ({ provenanceData }: { provenanceData?: ProvenanceData }) => {
  if (!provenanceData) return null;
  return (
    <div className="relative group flex items-center ml-1 z-10">
      <Info className={`w-3.5 h-3.5 cursor-help ${provenanceData.fallbackApplied ? 'text-amber-500' : 'text-[#1A6EFF]/80'}`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 p-2 bg-slate-800 text-white text-[10.5px] rounded shadow-lg pointer-events-none">
        <p><strong className="text-slate-300 font-semibold uppercase tracking-wider text-[9px]">Source:</strong> {provenanceData.source}</p>
        {provenanceData.fallbackApplied && <p className="text-amber-300 mt-0.5">Fallback Mechanism Applied</p>}
        {provenanceData.timestamp && <p className="text-slate-400 mt-0.5 font-mono truncate">As of: {provenanceData.timestamp.split('T')[0]}</p>}
      </div>
    </div>
  );
};

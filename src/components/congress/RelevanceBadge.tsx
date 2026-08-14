import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const RelevanceBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
      <AlertTriangle className="h-3 w-3" />
      <span>Sits on relevant oversight committee</span>
    </span>
  );
};

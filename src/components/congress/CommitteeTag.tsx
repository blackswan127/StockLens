import React from 'react';

interface CommitteeTagProps {
  label: string;
}

export const CommitteeTag: React.FC<CommitteeTagProps> = ({ label }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[10px] font-mono font-medium whitespace-nowrap">
      {label}
    </span>
  );
};

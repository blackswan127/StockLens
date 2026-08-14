import React from "react";

export const MacroSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero Spread Card Skeleton */}
      <div className="w-full bg-[#0D111A] border border-slate-800 rounded-2xl shadow-xl p-6 h-[300px]">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-800 rounded-lg"></div>
            <div className="h-10 w-32 bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-8 w-24 bg-slate-800 rounded-full"></div>
        </div>
        <div className="mt-8 h-[160px] w-full bg-[#080B11] rounded-xl border border-slate-800/60"></div>
      </div>

      {/* Grid Sections Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-xl p-5 h-[160px]">
            <div className="flex justify-between mb-4">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-800 rounded"></div>
                <div className="h-5 w-40 bg-slate-800 rounded"></div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="h-7 w-24 bg-slate-800 rounded"></div>
                <div className="h-3 w-16 bg-slate-800/60 rounded"></div>
              </div>
              <div className="h-[48px] w-24 bg-[#080B11] rounded-lg border border-slate-800/60"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', style }) => {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-800/70 ${className}`} style={style} />
  );
};

// Layout Specific Shimmer Grids for Stock Card
export const CardSkeleton: React.FC = () => {
  return (
    <div className="border border-slate-800 rounded-2xl p-5 bg-[#0D111A] space-y-4 shadow-xl">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
};

// Shimmer lines for tables
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      {Array.from({ length: columns }).map((_, cIdx) => (
        <td key={cIdx} className="px-4 py-4 whitespace-nowrap">
          <Skeleton className={`h-4 ${cIdx === 0 ? 'w-24' : 'w-16 ml-auto'}`} />
        </td>
      ))}
    </tr>
  );
};

// Shimmer layouts for charts
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="border border-slate-800 rounded-2xl p-5 bg-[#0D111A] space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-6 w-10" />
          ))}
        </div>
      </div>
      <div className="h-64 flex items-end justify-between gap-1 pt-6 px-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-full bg-slate-800" 
            style={{ height: `${20 + Math.sin(i)*40 + Math.cos(i)*20}%` }} 
          />
        ))}
      </div>
    </div>
  );
};

// Full Page Skeleton for CompanyPage load and searches
export const CompanyPageSkeleton: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* 1. Breadcrumbs Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 2. Primary Ticker Summary Box Skeleton */}
      <div className="border border-slate-800 bg-[#0D111A] rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="space-y-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <Skeleton className="h-8 w-60" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 w-full md:w-auto">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* 3. Tab Navigation Skeleton */}
      <div className="bg-white border border-gray-150 rounded-xl p-1.5 flex gap-2 overflow-x-auto scrollbar-none">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg shrink-0" />
        ))}
      </div>

      {/* 4. Two-Column Grid (Price Summary + Company Essentials) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Price Summary Skeleton */}
        <div className="lg:col-span-4 border border-gray-150 bg-white rounded-2xl p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Company Essentials Skeleton */}
        <div className="lg:col-span-8 border border-gray-150 bg-white rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="space-y-1.5 pb-2 border-b border-gray-100">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. FinStar Ratings Panel Skeleton */}
      <div className="border border-gray-150 bg-white rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4.5 w-64" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border border-gray-150 bg-gray-50/50 rounded-xl space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Chart Section Skeleton */}
      <ChartSkeleton />

      {/* 7. Peer Comparison Section Skeleton */}
      <div className="border border-gray-150 bg-white rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      {/* 8. Detailed Ratios Table Skeleton */}
      <div className="border border-gray-150 bg-white rounded-2xl p-6 space-y-5">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. Shareholding Pattern Skeleton */}
      <div className="border border-gray-150 bg-white rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>

      {/* 10. Financial Statements Tab Skeleton */}
      <div className="border border-gray-150 bg-white rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-64 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

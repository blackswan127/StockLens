import React from 'react';
import { ArrowLeft, RefreshCw, SearchX, ShieldAlert } from 'lucide-react';
import { CompanyPageSkeleton } from '../../../../components/Skeleton.jsx';

export interface CompanyConnectionErrorProps {
  onRetry?: () => void;
  onBack?: () => void;
}

export const CompanyConnectionError: React.FC<CompanyConnectionErrorProps> = ({
  onRetry = () => window.location.reload(),
  onBack,
}) => {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center space-y-6 animate-in fade-in duration-200">
      <div className="w-16 h-16 bg-rose-50 border border-rose-155 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-3xs">
        <ShieldAlert className="h-8 w-8 text-[#DC2626]" />
      </div>
      <div className="space-y-2">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          API Connection Timeout
        </h2>
        <p className="font-mono text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          Our data provider queries timed out, or client rate limits have been exceeded. Please
          reload the dashboard shortly to resume.
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#059669] font-sans text-xs font-bold text-white rounded-xl hover:bg-[#059669]/90 transition shadow-3xs cursor-pointer"
        >
          <RefreshCw className="h-4 w-4 animate-spin-hover" />
          <span>Retry Connection</span>
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-700 bg-[#141A26] font-mono text-xs font-bold text-slate-200 hover:bg-slate-800 rounded-xl transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
        )}
      </div>
    </div>
  );
};

export interface CompanyNotFoundErrorProps {
  upperSymbol: string;
  onBack?: () => void;
}

export const CompanyNotFoundError: React.FC<CompanyNotFoundErrorProps> = ({
  upperSymbol,
  onBack,
}) => {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center space-y-6 animate-in fade-in duration-200">
      <div className="w-16 h-16 bg-amber-50 border border-amber-155 rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
        <SearchX className="h-8 w-8 text-[#F59E0B]" />
      </div>
      <div className="space-y-2">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Ticker Not Found
        </h2>
        <p className="font-mono text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          The symbol{' '}
          <span className="font-bold text-[#DC2626] bg-rose-50 px-1.5 py-0.5 rounded">
            "{upperSymbol}"
          </span>{' '}
          could not be mapped to any listed corporation in our local indices or international
          exchange registries.
        </p>
      </div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#059669] font-sans text-xs font-bold text-white rounded-xl hover:bg-[#059669]/90 transition mx-auto shadow-3xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Search Another Ticker</span>
        </button>
      )}
    </div>
  );
};

export const CompanySkeletonState: React.FC = () => {
  return <CompanyPageSkeleton />;
};

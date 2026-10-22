import React from 'react';
import { isPrimaryTab } from '../../types';
import type { PrimaryTab } from '../../types';

interface CompanyMobileTabSelectProps {
  activeTab: PrimaryTab;
  isUSStock: boolean;
  onSelect: (tab: PrimaryTab) => void;
}

export const CompanyMobileTabSelect: React.FC<CompanyMobileTabSelectProps> = ({
  activeTab,
  isUSStock,
  onSelect,
}) => {
  return (
    <div className="block sm:hidden relative w-full">
      <select
        value={activeTab}
        onChange={(event) => {
          if (isPrimaryTab(event.target.value)) {
            onSelect(event.target.value);
          }
        }}
        className="w-full bg-[#080B11] border border-slate-800 rounded-xl py-2 px-3 text-xs font-sans font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="overview">Overview</option>
        <option value="analysis">Valuation & DCF Analysis</option>
        <option value="info">Company Profile</option>
        <option value="financials">Financial Statements</option>
        {isUSStock && <option value="sec">SEC EDGAR Filings</option>}
      </select>
    </div>
  );
};

import React from 'react';
import type { SecSubTab } from '../types.js';

export const SEC_SUB_TAB_OPTIONS: ReadonlyArray<{ id: SecSubTab; label: string }> = [
  { id: 'standardized', label: '📊 Standardized Statements' },
  { id: 'insiders', label: '👥 Insider Activities' },
  { id: 'holdings', label: '🏢 Institutional Holdings' },
  { id: 'tenk', label: '📄 10-K Analysis' },
  { id: 'proxy', label: '📋 Proxy Statement' },
];

interface SecSubTabsProps {
  activeSubTab: SecSubTab;
  onSelect: (tab: SecSubTab) => void;
}

export const SecSubTabs: React.FC<SecSubTabsProps> = ({ activeSubTab, onSelect }) => (
  <div className="flex bg-[#080B11] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0 gap-1 font-mono text-xs">
    {SEC_SUB_TAB_OPTIONS.map((subTab) => (
      <button
        key={subTab.id}
        onClick={() => onSelect(subTab.id)}
        className={`flex-1 lg:flex-none px-3.5 py-1.5 font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
          activeSubTab === subTab.id
            ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }`}
      >
        {subTab.label}
      </button>
    ))}
  </div>
);

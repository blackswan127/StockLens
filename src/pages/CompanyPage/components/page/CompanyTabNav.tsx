import React, { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { PrimaryTab } from '../../types';
import { CompanyMobileTabSelect } from './CompanyMobileTabSelect.js';

export interface PrimaryTabDefinition {
  id: PrimaryTab;
  label: string;
  icon: LucideIcon;
}

interface CompanyTabNavProps {
  tabs: PrimaryTabDefinition[];
  activeTab: PrimaryTab;
  isUSStock: boolean;
  onSelect: (tab: PrimaryTab) => void;
}

export const CompanyTabNav: React.FC<CompanyTabNavProps> = ({
  tabs,
  activeTab,
  isUSStock,
  onSelect,
}) => {
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    onSelect(nextTab.id);
    tabButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="border border-slate-800 bg-[#0D111A]/95 backdrop-blur-2xl rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-1 z-30">
      <div className="flex items-center gap-2">
        <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg shrink-0 select-none flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          INTELLIGENCE HUB
        </div>
        <div className="h-4 w-px bg-slate-800 hidden sm:block" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest hidden md:inline">
          SECTIONS:
        </span>
      </div>

      <CompanyMobileTabSelect activeTab={activeTab} isUSStock={isUSStock} onSelect={onSelect} />

      {/* Desktop Segmented Buttons */}
      <div
        role="tablist"
        aria-label="Company sections"
        className="hidden sm:flex items-center gap-1 bg-[#080B11] p-1 rounded-xl border border-slate-800"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`company-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`company-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              ref={(element) => {
                tabButtonRefs.current[index] = element;
              }}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

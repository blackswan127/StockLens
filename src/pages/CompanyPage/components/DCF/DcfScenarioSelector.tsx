import type { FC } from 'react';
import type { DcfScenario } from './dcfTypes.js';
import { DCF_SCENARIO_OPTIONS } from './DcfScenarioPresets.js';

interface DcfScenarioSelectorProps {
  scenario: DcfScenario;
  onSelect: (scenario: DcfScenario) => void;
}

export const DcfScenarioSelector: FC<DcfScenarioSelectorProps> = ({
  scenario,
  onSelect,
}) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0D111A] border border-slate-800 p-4 rounded-xl">
    <div>
      <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
        Valuation Scenario Presets
      </span>
      <span className="text-[11px] text-slate-400 font-mono">
        Select Bear, Base, or Bull to load calibrated projection bounds.
      </span>
    </div>

    <div
      role="radiogroup"
      aria-label="Valuation scenario presets"
      className="flex bg-[#080B11] p-1 rounded-xl border border-slate-800 shrink-0 gap-1 text-xs font-mono font-semibold"
    >
      {DCF_SCENARIO_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.id}
          role="radio"
          aria-checked={scenario === option.id}
          onClick={() => onSelect(option.id)}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            scenario === option.id
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

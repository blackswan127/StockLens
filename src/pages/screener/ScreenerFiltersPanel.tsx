import { useId } from 'react';
import { ChevronRight, RotateCcw, Search, X } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  METRIC_REGISTRY,
  OPERATORS,
  isFilterActive,
  summarizeFilter,
} from './filterRegistry';
import type {
  CategoricalFilterValue,
  FilterState,
  Metric,
  MetricCategory,
  NumericCustomRange,
  NumericFilterValue,
} from './types';

interface ScreenerFiltersPanelProps {
  filters: FilterState;
  activeFilterCount: number;
  activeCategory: MetricCategory;
  activeMetric: Metric;
  activeMetricId: string;
  metricsInCategory: Metric[];
  currentNumeric: NumericFilterValue | undefined;
  currentCategorical: CategoricalFilterValue | undefined;
  customOpen: boolean;
  categoricalSearch: string;
  onSelectCategory: (category: MetricCategory) => void;
  onSelectMetric: (metricId: string) => void;
  onPresetToggle: (presetId: string) => void;
  onCustomChange: (partial: Partial<NumericCustomRange>) => void;
  onCustomOpenChange: (open: boolean) => void;
  onCategoricalSearchChange: (value: string) => void;
  onToggleCategoricalOption: (option: string) => void;
  onReset: () => void;
}

export function ScreenerFiltersPanel({
  filters,
  activeFilterCount,
  activeCategory,
  activeMetric,
  activeMetricId,
  metricsInCategory,
  currentNumeric,
  currentCategorical,
  customOpen,
  categoricalSearch,
  onSelectCategory,
  onSelectMetric,
  onPresetToggle,
  onCustomChange,
  onCustomOpenChange,
  onCategoricalSearchChange,
  onToggleCategoricalOption,
  onReset,
}: ScreenerFiltersPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D111A] shadow-2xl">
      {/* Filters Builder Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#080B11] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Filter Builder</span>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
            20-Factor Curated Screen
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[10px] font-mono font-bold ${
              activeFilterCount > 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {activeFilterCount} Active
          </span>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Clear All
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[480px] overflow-hidden">
        {/* L1: Categories (25%) */}
        <div className="w-full md:w-1/4 border-r border-slate-800 bg-[#080B11]/60 p-3 overflow-y-auto">
          <nav className="space-y-1">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const isActive = category === activeCategory;
              const countInCategory = METRIC_REGISTRY.filter(
                (m) => m.category === category && isFilterActive(filters[m.id])
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-mono font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span className="truncate">{category}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0 ml-1">
                    {countInCategory > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* L2: Metrics (35%) */}
        <div className="w-full md:w-[35%] border-r border-slate-800 bg-[#0A0E17]/60 p-3 overflow-y-auto">
          <div className="space-y-1">
            {metricsInCategory.map((metric) => {
              const isActive = metric.id === activeMetricId;
              const summary = summarizeFilter(metric, filters[metric.id]);
              return (
                <button
                  key={metric.id}
                  onClick={() => onSelectMetric(metric.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#141A26] border border-slate-700 shadow-sm'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div
                      className={`truncate text-xs font-mono ${
                        isActive ? 'font-bold text-slate-100' : 'font-medium text-slate-300'
                      }`}
                    >
                      {metric.name}
                    </div>
                    {summary && (
                      <div className="mt-0.5 truncate text-[11px] font-mono font-bold text-emerald-400">
                        {summary}
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* L3: Editors (40%) */}
        <div className="w-full md:w-[40%] bg-[#0D111A] p-5 overflow-y-auto flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold font-sans text-slate-100">{activeMetric.name}</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 font-sans">
              {activeMetric.description}
            </p>
            <div className="mt-4">
              {activeMetric.type === 'categorical' ? (
                <CategoricalEditor
                  metric={activeMetric}
                  search={categoricalSearch}
                  onSearchChange={onCategoricalSearchChange}
                  selected={currentCategorical?.selected ?? []}
                  onToggle={onToggleCategoricalOption}
                />
              ) : (
                <NumericEditor
                  metric={activeMetric}
                  value={currentNumeric}
                  customOpen={customOpen}
                  onCustomOpenChange={onCustomOpenChange}
                  onPresetToggle={onPresetToggle}
                  onCustomChange={onCustomChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoricalEditorProps {
  metric: Metric;
  search: string;
  onSearchChange: (value: string) => void;
  selected: string[];
  onToggle: (option: string) => void;
}

function CategoricalEditor({
  metric,
  search,
  onSearchChange,
  selected,
  onToggle,
}: CategoricalEditorProps) {
  const optionIdPrefix = useId();
  const filteredOptions = (metric.options ?? []).filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${metric.name.toLowerCase()}...`}
          className="w-full rounded-xl border border-slate-800 bg-[#080B11] py-2.5 pl-9 pr-8 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="max-h-[240px] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#080B11]/50 p-2">
        {filteredOptions.length === 0 && (
          <p className="px-3 py-4 text-center text-xs font-mono text-slate-500">No matches found.</p>
        )}
        {filteredOptions.map((option, optionIndex) => {
          const checked = selected.includes(option);
          const optionId = `${optionIdPrefix}-option-${optionIndex}`;
          return (
            <label
              key={option}
              htmlFor={optionId}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-300 hover:bg-[#141A26] hover:text-slate-100 transition-colors"
            >
              <input
                id={optionId}
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-1 focus:ring-emerald-500/30 cursor-pointer"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface NumericEditorProps {
  metric: Metric;
  value: NumericFilterValue | undefined;
  customOpen: boolean;
  onCustomOpenChange: (open: boolean) => void;
  onPresetToggle: (presetId: string) => void;
  onCustomChange: (partial: Partial<NumericCustomRange>) => void;
}

function NumericEditor({
  metric,
  value,
  customOpen,
  onCustomOpenChange,
  onPresetToggle,
  onCustomChange,
}: NumericEditorProps) {
  const operator = value?.custom?.operator ?? 'more';
  const value1 = value?.custom?.value1 ?? '';
  const value2 = value?.custom?.value2 ?? '';
  const placeholder = metric.placeholder ?? 'e.g. 10';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {metric.presets?.map((preset) => {
          const checked = value?.preset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onPresetToggle(preset.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer ${
                checked
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-slate-800 text-slate-300 bg-[#080B11] hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <span className="truncate">{preset.label}</span>
              <span className={`h-3 w-3 rounded-full border border-slate-700 shrink-0 ml-1 ${
                checked ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Custom toggle */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#080B11]">
        <button
          onClick={() => onCustomOpenChange(!customOpen)}
          className={`flex w-full items-center justify-between px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer ${
            customOpen ? 'bg-slate-800/80 text-slate-100' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
          }`}
        >
          <span>Custom Numeric Bounds</span>
          <ChevronRight
            className={`h-4 w-4 text-slate-400 transition-transform ${
              customOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        {customOpen && (
          <div className="space-y-3 border-t border-slate-800/80 bg-[#0D111A]/80 p-3">
            {/* Operator button group */}
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#080B11] p-1 border border-slate-800">
              {OPERATORS.map((op) => (
                <button
                  key={op.id}
                  onClick={() => onCustomChange({ operator: op.id })}
                  className={`rounded-lg px-2 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                    operator === op.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            {operator === 'between' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={value1}
                  onChange={(e) => onCustomChange({ value1: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
                />
                <span className="text-xs text-slate-500 font-mono font-bold">and</span>
                <input
                  type="text"
                  value={value2}
                  onChange={(e) => onCustomChange({ value2: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
                />
              </div>
            ) : (
              <input
                type="text"
                value={value1}
                onChange={(e) => onCustomChange({ value1: e.target.value })}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-800 bg-[#080B11] px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

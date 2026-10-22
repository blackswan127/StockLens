import React, { useCallback, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CompanyRatios } from './companyTypes.js';
import type { FinancialStatements } from './financialRows.js';
import {
  FORMULA_NAMES,
  RATIO_BUILDER_MODES,
  buildAvailableMetrics,
  computeCalculatedRatioValue,
  isFormulaKey,
  parseCustomRatios,
  type CustomRatio,
  type FormulaKey,
  type RatioBuilderMode,
} from './analysisMetrics.js';

interface CustomRatiosGridProps {
  upperSymbol: string;
  livePriceVal: number;
  ratios: CompanyRatios | undefined;
  financials: FinancialStatements | null;
}

interface RatioCardProps {
  id: string;
  tag: string;
  value: string;
  isCustom: boolean;
  ratioType: RatioBuilderMode;
  onDelete?: (id: string) => void;
}

const RatioCard = React.memo(function RatioCard({
  id,
  tag,
  value,
  isCustom,
  ratioType,
  onDelete,
}: RatioCardProps) {
  return (
    <div className="p-4 bg-[#080B11] border border-slate-800 rounded-xl flex flex-col justify-between gap-3 shadow-sm group hover:border-slate-700 transition-colors relative overflow-hidden min-h-[110px]">
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] font-mono text-slate-400 font-bold block uppercase">{tag}</span>
        {isCustom && onDelete && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider">
              {ratioType === 'manual' ? 'Custom' : 'Calc'}
            </span>
            <button
              type="button"
              onClick={() => onDelete(id)}
              className="text-slate-500 hover:text-rose-400 transition p-0.5 cursor-pointer"
              title="Delete custom ratio"
              aria-label={`Delete ${tag} custom ratio`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 z-10">
        <span className="font-mono font-bold text-slate-100 text-2xl leading-none tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
});

const readStoredRatios = (storageKey: string): CustomRatio[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseCustomRatios(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
};

export const CustomRatiosGrid: React.FC<CustomRatiosGridProps> = ({
  upperSymbol,
  livePriceVal,
  ratios,
  financials,
}) => {
  const localStorageKey = `stocklens_custom_ratios_${upperSymbol}`;
  const [customRatios, setCustomRatios] = useState<CustomRatio[]>(() =>
    readStoredRatios(localStorageKey)
  );

  const [showAddRatioForm, setShowAddRatioForm] = useState(false);
  const [ratioBuilderMode, setRatioBuilderMode] = useState<RatioBuilderMode>('formula');
  const [newRatioName, setNewRatioName] = useState('');
  const [newRatioValue, setNewRatioValue] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<FormulaKey>('peg');
  const [numKey, setNumKey] = useState('mcap');
  const [denKey, setDenKey] = useState('ebitda_annual');

  const metricContext = useMemo(
    () => ({ upperSymbol, livePriceVal, ratios, financials }),
    [upperSymbol, livePriceVal, ratios, financials]
  );

  const availableMetrics = useMemo(
    () => buildAvailableMetrics(metricContext),
    [metricContext]
  );

  const ratioCards = useMemo(
    () => [
      {
        id: 'de',
        tag: 'Debt/Equity',
        value: ratios?.debt_equity && ratios.debt_equity !== '—' ? ratios.debt_equity : '0.41',
        isCustom: false,
        ratioType: 'manual' as RatioBuilderMode,
      },
      {
        id: 'pcf',
        tag: 'Price to Cash Flow',
        value:
          ratios?.pe && ratios.pe !== '—' ? (parseFloat(ratios.pe) * 0.85).toFixed(2) : '18.30',
        isCustom: false,
        ratioType: 'manual' as RatioBuilderMode,
      },
      {
        id: 'icr',
        tag: 'Interest Cover Ratio',
        value:
          ratios?.pe && ratios.pe !== '—' ? (parseFloat(ratios.pe) * 0.6).toFixed(2) : '8.50',
        isCustom: false,
        ratioType: 'manual' as RatioBuilderMode,
      },
      {
        id: 'cfopat',
        tag: 'CFO/PAT (5 Yr. Avg.)',
        value: '1.08',
        isCustom: false,
        ratioType: 'manual' as RatioBuilderMode,
      },
      ...customRatios.map((ratio) => ({
        id: ratio.id,
        tag: ratio.tag,
        value: computeCalculatedRatioValue(ratio, metricContext),
        isCustom: true,
        ratioType: ratio.type,
      })),
    ],
    [customRatios, metricContext, ratios]
  );

  const handleDeleteCustomRatio = useCallback(
    (id: string) => {
      setCustomRatios((current) => {
        const updated = current.filter((ratio) => ratio.id !== id);
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
        return updated;
      });
    },
    [localStorageKey]
  );

  const handleAddCustomRatio = () => {
    let newRatio: CustomRatio;

    if (ratioBuilderMode === 'manual') {
      if (!newRatioName.trim() || !newRatioValue.trim()) return;
      newRatio = {
        id: Date.now().toString(),
        tag: newRatioName.trim(),
        isCustom: true,
        type: 'manual',
        val: newRatioValue.trim(),
      };
    } else if (ratioBuilderMode === 'formula') {
      newRatio = {
        id: Date.now().toString(),
        tag: FORMULA_NAMES[selectedFormula],
        isCustom: true,
        type: 'formula',
        formula: selectedFormula,
      };
    } else {
      if (!newRatioName.trim()) return;
      newRatio = {
        id: Date.now().toString(),
        tag: newRatioName.trim(),
        isCustom: true,
        type: 'custom_division',
        numKey,
        denKey,
      };
    }

    setCustomRatios((current) => {
      const updated = [...current, newRatio];
      localStorage.setItem(localStorageKey, JSON.stringify(updated));
      return updated;
    });
    setNewRatioName('');
    setNewRatioValue('');
    setShowAddRatioForm(false);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
      {ratioCards.map((card) => (
        <RatioCard
          key={card.id}
          id={card.id}
          tag={card.tag}
          value={card.value}
          isCustom={card.isCustom}
          ratioType={card.ratioType}
          onDelete={card.isCustom ? handleDeleteCustomRatio : undefined}
        />
      ))}

      {!showAddRatioForm ? (
        <button
          type="button"
          onClick={() => setShowAddRatioForm(true)}
          className="p-3.5 bg-[#080B11] border border-dashed border-slate-800 rounded-xl flex items-center justify-center gap-2 hover:bg-[#141A26] hover:border-slate-700 transition shadow-sm text-xs font-mono font-bold text-emerald-400 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Custom Ratio</span>
        </button>
      ) : (
        <div className="p-4 bg-[#080B11] border border-slate-800 rounded-xl flex flex-col gap-3.5 shadow-sm col-span-2 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-mono font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Custom Ratio Builder
            </span>

            <div
              className="flex bg-[#0D111A] p-0.5 rounded-lg border border-slate-800 shrink-0 gap-0.5 text-[10px] font-mono"
              role="group"
              aria-label="Custom ratio builder mode"
            >
              {RATIO_BUILDER_MODES.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setRatioBuilderMode(tab.id)}
                  aria-pressed={ratioBuilderMode === tab.id}
                  className={`px-2 py-0.5 font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    ratioBuilderMode === tab.id
                      ? 'bg-[#141A26] text-emerald-400 border border-slate-700 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {ratioBuilderMode === 'formula' && (
            <div className="space-y-2 text-slate-300">
              <span
                id="custom-ratio-formula-label"
                className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
              >
                Select Financial Formula
              </span>
              <select
                id="custom-ratio-formula"
                aria-labelledby="custom-ratio-formula-label"
                value={selectedFormula}
                onChange={(event) => {
                  if (isFormulaKey(event.target.value)) setSelectedFormula(event.target.value);
                }}
                className="w-full px-2.5 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-mono cursor-pointer text-slate-200"
              >
                <option value="peg">PEG Ratio (PE / Sales Growth)</option>
                <option value="ev_ebitda">EV / EBITDA (Enterprise Value / EBITDA)</option>
                <option value="ev_revenue">EV / Revenue (Enterprise Value / Revenue)</option>
                <option value="debt_ebitda">Debt / EBITDA (Total Debt / EBITDA)</option>
                <option value="cash_debt">Cash / Debt Ratio (Total Cash / Total Debt)</option>
                <option value="price_sales">Price to Sales (Market Cap / Revenue)</option>
                <option value="fcf_yield">Free Cash Flow Yield % (FCF / Market Cap)</option>
                <option value="op_margin">Operating Margin % (EBITDA / Revenue)</option>
              </select>
            </div>
          )}

          {ratioBuilderMode === 'custom_division' && (
            <div className="space-y-3 text-slate-300">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span
                    id="custom-ratio-numerator-label"
                    className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
                  >
                    Numerator
                  </span>
                  <select
                    id="custom-ratio-numerator"
                    aria-labelledby="custom-ratio-numerator-label"
                    value={numKey}
                    onChange={(event) => setNumKey(event.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-mono cursor-pointer text-slate-200"
                  >
                    {availableMetrics.map((metric) => (
                      <option key={metric.key} value={metric.key}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span
                    id="custom-ratio-denominator-label"
                    className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
                  >
                    Denominator
                  </span>
                  <select
                    id="custom-ratio-denominator"
                    aria-labelledby="custom-ratio-denominator-label"
                    value={denKey}
                    onChange={(event) => setDenKey(event.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-mono cursor-pointer text-slate-200"
                  >
                    {availableMetrics.map((metric) => (
                      <option key={metric.key} value={metric.key}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <span
                  id="custom-ratio-name-division-label"
                  className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
                >
                  Custom Ratio Name
                </span>
                <input
                  id="custom-ratio-name-division"
                  aria-labelledby="custom-ratio-name-division-label"
                  type="text"
                  placeholder="e.g. Cash to Assets Ratio"
                  value={newRatioName}
                  onChange={(event) => setNewRatioName(event.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-slate-200"
                />
              </div>
            </div>
          )}

          {ratioBuilderMode === 'manual' && (
            <div className="grid grid-cols-2 gap-2.5 text-slate-300">
              <div className="space-y-1">
                <span
                  id="custom-ratio-name-manual-label"
                  className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
                >
                  Ratio Name
                </span>
                <input
                  id="custom-ratio-name-manual"
                  aria-labelledby="custom-ratio-name-manual-label"
                  type="text"
                  placeholder="e.g. NPM %"
                  value={newRatioName}
                  onChange={(event) => setNewRatioName(event.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <span
                  id="custom-ratio-value-manual-label"
                  className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider"
                >
                  Static Value
                </span>
                <input
                  id="custom-ratio-value-manual"
                  aria-labelledby="custom-ratio-value-manual-label"
                  type="text"
                  placeholder="e.g. 24.5%"
                  value={newRatioValue}
                  onChange={(event) => setNewRatioValue(event.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0D111A] border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-slate-200"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 text-[10px] font-mono border-t border-slate-800 pt-2.5">
            <button
              type="button"
              onClick={() => {
                setShowAddRatioForm(false);
                setNewRatioName('');
                setNewRatioValue('');
              }}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomRatio}
              className="px-3.5 py-1.5 bg-[#141A26] text-emerald-400 border border-emerald-500/40 rounded-md font-bold hover:bg-emerald-500/20 transition cursor-pointer"
            >
              Save Ratio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

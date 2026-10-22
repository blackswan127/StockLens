import { useState } from 'react';
import type { FC } from 'react';
import {
  Activity,
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useDCFData } from './hooks/useDCFData.js';
import { useDcfInputs } from './hooks/useDcfInputs.js';
import { useDcfModel } from './hooks/useDcfModel.js';
import { useDcfCsvExport } from './hooks/useDcfCsvExport.js';
import { isFinancialSectorProfile } from './hooks/dcfGuardrails.js';
import { formatPrice } from '../../utils/formatters.js';
import { DCFProjectedCashFlows } from './components/DCF/DCFProjectedCashFlows.js';
import { DCFValuationBridge } from './components/DCF/DCFValuationBridge.js';
import { DcfScenarioSelector } from './components/DCF/DcfScenarioSelector.js';
import { DcfWarnings } from './components/DCF/DcfWarnings.js';
import { DcfResultsPanel } from './components/DCF/DcfResultsPanel.js';
import { DcfInputPanel } from './components/DCF/DcfInputPanel.js';
import { DcfSensitivityGrid } from './components/DCF/DcfSensitivityGrid.js';
import { DcfMonteCarloPanel } from './components/DCF/DcfMonteCarloPanel.js';

interface DCFCalculatorProps {
  symbol: string;
  exchange: string;
  profile: {
    sector?: string;
    industry?: string;
    name?: string;
    country?: string;
  };
}

export const DCFCalculator: FC<DCFCalculatorProps> = ({ symbol, exchange, profile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, isError, error } = useDCFData(symbol);

  const { inputs, dispatch, applyScenario, resetToDefaults } = useDcfInputs(data);
  const isFinancialSector = isFinancialSectorProfile(profile);
  const { dcfResult, dcfError, monteCarloResult, sensitivity, guardrails } = useDcfModel(
    data,
    inputs,
    isFinancialSector
  );
  const exportToCsv = useDcfCsvExport(symbol, data, inputs, dcfResult);

  if (isLoading) {
    return (
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl animate-pulse flex items-center justify-center min-h-[100px]">
        <div className="text-slate-400 font-mono text-xs flex items-center gap-2">
          <Activity className="h-4 w-4 animate-spin text-emerald-400" />
          <span>Calibrating intrinsic DCF valuation models...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 shadow-xl flex items-center gap-3 text-rose-300 font-sans text-xs">
        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
        <span>Failed to fetch DCF data: {error?.message || 'Data unavailable.'}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0D111A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:border-slate-700">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#141A26] transition-colors cursor-pointer text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-bold text-slate-100 uppercase tracking-wider">
                Discounted Cash Flow (DCF) Valuation Suite
              </h3>
              <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                CAPM + Damodaran
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-400 mt-0.5">
              Intrinsic valuation, Monte Carlo simulations &amp; 2D sensitivity matrices for{' '}
              {data.companyName || symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.dataConfidence && (
            <div
              className="max-sm:hidden flex items-center"
              title="Cross-validation confidence vs SEC EDGAR filings"
            >
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border ${
                  data.dataConfidence === 'high'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : data.dataConfidence === 'medium'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {data.dataConfidence === 'high'
                  ? '● SEC Validated'
                  : data.dataConfidence === 'medium'
                    ? '● SEC Diverged'
                    : '○ Unvalidated'}
              </span>
            </div>
          )}
          {dcfResult && !dcfError && (
            <div className="max-sm:hidden flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Fair Value:</span>
              <span
                className={`font-black text-sm tabular-nums ${dcfResult.upsidePercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {formatPrice(dcfResult.fairValuePerShare, exchange, symbol)}
              </span>
            </div>
          )}
          <div className="p-1 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-slate-200">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-slate-800 space-y-6 text-slate-300 font-sans text-sm animate-fade-in bg-[#090D15]/90">
          <DcfScenarioSelector scenario={inputs.scenario} onSelect={applyScenario} />

          <DcfWarnings
            guardrails={guardrails}
            dcfResult={dcfResult}
            taxRate={inputs.taxRate}
            onAcknowledgeFinancial={() =>
              dispatch({ type: 'SET_ACKNOWLEDGED_FINANCIAL', value: true })
            }
          />

          <DcfResultsPanel
            dcfResult={dcfResult}
            dcfError={dcfError}
            data={data}
            exchange={exchange}
            symbol={symbol}
            projectionYears={inputs.projectionYears}
          />

          <DcfInputPanel
            inputs={inputs}
            dispatch={dispatch}
            data={data}
            exchange={exchange}
            symbol={symbol}
            dcfResult={dcfResult}
          />

          {dcfResult && (
            <DCFProjectedCashFlows
              dcfResult={dcfResult}
              exchange={exchange}
              symbol={symbol}
            />
          )}

          {dcfResult && (
            <DCFValuationBridge
              dcfResult={dcfResult}
              cashAndEquivalents={inputs.cashAndEquivalents}
              totalDebt={inputs.totalDebt}
              sharesOutstanding={inputs.sharesOutstanding}
              exchange={exchange}
              symbol={symbol}
            />
          )}

          {dcfResult && sensitivity && (
            <DcfSensitivityGrid
              sensitivity={sensitivity}
              activeGrid={inputs.activeGrid}
              onGridChange={(grid) =>
                dispatch({ type: 'SET_ACTIVE_GRID', value: grid })
              }
              dcfResult={dcfResult}
              terminalGrowth={inputs.terminalGrowth}
              revenueGrowth={inputs.revenueGrowth}
              fcfMargin={inputs.fcfMargin}
              exchange={exchange}
              symbol={symbol}
            />
          )}

          {monteCarloResult && !dcfError && (
            <DcfMonteCarloPanel
              monteCarloResult={monteCarloResult}
              exchange={exchange}
              symbol={symbol}
            />
          )}

          <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-400 font-mono text-[10.5px]">
              Data freshness:{' '}
              {data.dataFreshness
                ? new Date(data.dataFreshness).toLocaleString()
                : new Date().toLocaleString()}
            </span>

            <div className="flex items-center gap-2">
              {dcfResult && !dcfError && (
                <button
                  type="button"
                  onClick={exportToCsv}
                  className="px-3 py-1.5 bg-[#059669]/10 hover:bg-[#059669]/15 border border-[#059669]/15 rounded-lg font-semibold text-[#059669] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export model (CSV)</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetToDefaults}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-[#E5E8EF] rounded-lg font-semibold text-slate-600 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

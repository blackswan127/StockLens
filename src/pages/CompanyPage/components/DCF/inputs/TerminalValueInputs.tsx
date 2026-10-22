import type { FC } from 'react';
import type { DCFData } from '../../../hooks/useDCFData.js';
import type { DcfInputState } from '../dcfTypes.js';
import { formatMarketCap, formatShares } from '../../../../../utils/formatters.js';
import { InputSection } from './InputSection.js';
import { FINANCE_INPUT_CLASS, NumberField } from './NumberField.js';
import { SliderField } from './SliderField.js';
import {
  formatPercentInput,
  parseNonNegativeInput,
  parsePercentInput,
} from './inputValues.js';
import type { DcfNumericSetter, FieldIdFactory } from './types.js';

export interface TerminalValueInputsProps {
  inputs: DcfInputState;
  data: DCFData;
  exchange: string;
  symbol: string;
  fieldId: FieldIdFactory;
  setNumber: DcfNumericSetter;
  includePerpetualGrowth?: boolean;
}

export const TerminalValueInputs: FC<TerminalValueInputsProps> = ({
  inputs,
  data,
  exchange,
  symbol,
  fieldId,
  setNumber,
  includePerpetualGrowth = true,
}) => {
  const latestRevenueSource =
    data.historicalRevenue?.[data.historicalRevenue.length - 1]?.source ||
    'Yahoo Annual';

  return (
    <InputSection
      title="Finances & Share Structure Assumptions"
      className="border border-[#E5E8EF] rounded-xl p-4 space-y-4"
      titleClassName="font-sans font-bold text-[11.5px] text-slate-500 uppercase tracking-wider"
    >
      {includePerpetualGrowth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
          <SliderField
            id={fieldId('terminal-growth')}
            labelText="Terminal Growth Rate (g)"
            helpTitle="Long-term growth rate after projection period. Typically proxy for long-run GDP growth (2-3%)."
            min={0}
            max={0.05}
            step={0.001}
            rangeValue={inputs.terminalGrowth}
            numberValue={formatPercentInput(inputs.terminalGrowth, 1)}
            unit="%"
            onRangeChange={(rawValue) =>
              setNumber('terminalGrowth', parseFloat(rawValue))
            }
            onNumberChange={(rawValue) =>
              setNumber('terminalGrowth', parsePercentInput(rawValue))
            }
          />
          <div className="p-3 bg-white border border-[#E5E8EF] rounded-lg flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Exit Multiple Benchmark
            </span>
            <span className="font-mono text-xs text-slate-700 mt-1 flex items-center gap-1.5">
              <span className="font-bold text-slate-900">
                {data.peerMedianPE
                  ? `${data.peerMedianPE.toFixed(1)}x P/E`
                  : 'Gordon Growth'}
              </span>
              <span className="text-[11px] text-slate-400">
                {data.peerMedianPE
                  ? '(Peer Median Multiple)'
                  : '(Perpetual Growth Model)'}
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <NumberField
          id={fieldId('latest-revenue')}
          labelText="Latest Revenue"
          provenanceData={{
            source: latestRevenueSource,
            fallbackApplied: false,
          }}
          min={1}
          value={inputs.latestRevenue || ''}
          onChange={(rawValue) =>
            setNumber('latestRevenue', parseNonNegativeInput(rawValue))
          }
          helperText={formatMarketCap(inputs.latestRevenue, exchange, symbol)}
          inputClassName={FINANCE_INPUT_CLASS}
        />

        <NumberField
          id={fieldId('total-debt')}
          labelText="Total Debt"
          provenanceData={data.provenance?.totalDebt}
          min={0}
          value={inputs.totalDebt || ''}
          onChange={(rawValue) => setNumber('totalDebt', parseNonNegativeInput(rawValue))}
          helperText={formatMarketCap(inputs.totalDebt, exchange, symbol)}
          inputClassName={FINANCE_INPUT_CLASS}
        />

        <NumberField
          id={fieldId('cash-and-equivalents')}
          labelText="Cash & Equivalents"
          provenanceData={data.provenance?.cashAndEquivalents}
          min={0}
          value={inputs.cashAndEquivalents || ''}
          onChange={(rawValue) =>
            setNumber('cashAndEquivalents', parseNonNegativeInput(rawValue))
          }
          helperText={formatMarketCap(inputs.cashAndEquivalents, exchange, symbol)}
          inputClassName={FINANCE_INPUT_CLASS}
        />

        <NumberField
          id={fieldId('shares-outstanding')}
          labelText="Shares Outstanding"
          provenanceData={data.provenance?.sharesOutstanding}
          min={1}
          value={inputs.sharesOutstanding || ''}
          onChange={(rawValue) =>
            setNumber('sharesOutstanding', parseNonNegativeInput(rawValue))
          }
          helperText={formatShares(inputs.sharesOutstanding, exchange, symbol)}
          inputClassName={FINANCE_INPUT_CLASS}
        />
      </div>
    </InputSection>
  );
};

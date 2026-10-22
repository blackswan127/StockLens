import type { Dispatch, FC } from 'react';
import { HelpCircle, Sliders } from 'lucide-react';
import type { DCFResult } from '../../../../../utils/dcfCalculator.js';
import type { DCFData } from '../../../hooks/useDCFData.js';
import type { DcfInputAction, DcfInputState } from '../dcfTypes.js';
import { InputSection } from './InputSection.js';
import { NumberField } from './NumberField.js';
import {
  formatDecimalInput,
  formatPercentInput,
  parseNumberInput,
  parsePercentInput,
} from './inputValues.js';
import type { DcfNumericSetter, FieldIdFactory } from './types.js';

export interface WaccInputsProps {
  inputs: DcfInputState;
  data: DCFData;
  dcfResult: DCFResult | null;
  dispatch: Dispatch<DcfInputAction>;
  fieldId: FieldIdFactory;
  setNumber: DcfNumericSetter;
}

export const WaccInputs: FC<WaccInputsProps> = ({
  inputs,
  data,
  dcfResult,
  dispatch,
  fieldId,
  setNumber,
}) => (
  <InputSection
    title="Discount Rate (WACC)"
    icon={Sliders}
    iconClassName="h-4.5 w-4.5 text-[#1A6EFF]"
  >
    <div className="grid grid-cols-2 gap-4">
      <NumberField
        id={fieldId('risk-free-rate')}
        labelText="Risk-Free Rate"
        provenanceData={data.provenance?.riskFreeRate}
        step="0.001"
        value={formatPercentInput(inputs.riskFreeRate, 2)}
        onChange={(rawValue) => setNumber('riskFreeRate', parsePercentInput(rawValue))}
      />

      <NumberField
        id={fieldId('beta')}
        labelText="Beta (Volatility)"
        provenanceData={data.provenance?.beta}
        step="0.01"
        value={formatDecimalInput(inputs.beta, 2)}
        onChange={(rawValue) => setNumber('beta', parseNumberInput(rawValue, 1.0))}
      />

      <NumberField
        id={fieldId('equity-risk-premium')}
        labelText="Equity Risk Premium"
        helpTitle="Excess return required over risk-free rate for stocks (5.5% US, 7.5% India country risk)."
        step="0.01"
        value={formatPercentInput(inputs.equityRiskPremium, 2)}
        onChange={(rawValue) =>
          setNumber('equityRiskPremium', parsePercentInput(rawValue))
        }
      />

      <NumberField
        id={fieldId('cost-of-debt')}
        labelText="Cost of Debt"
        provenanceData={data.provenance?.interestExpense}
        step="0.01"
        value={formatPercentInput(inputs.costOfDebt, 2)}
        onChange={(rawValue) => setNumber('costOfDebt', parsePercentInput(rawValue))}
      />

      <NumberField
        id={fieldId('tax-rate')}
        labelText="Effective Tax Rate"
        provenanceData={data.provenance?.taxRate}
        step="0.01"
        value={formatPercentInput(inputs.taxRate, 2)}
        onChange={(rawValue) => setNumber('taxRate', parsePercentInput(rawValue))}
      />

      <div className="p-3 bg-white border border-[#E5E8EF] rounded-lg flex flex-col justify-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Computed WACC
        </span>
        <span className="font-mono font-extrabold text-slate-900 text-lg leading-none mt-1">
          {dcfResult ? `${(dcfResult.wacc * 100).toFixed(2)}%` : 'N/A'}
        </span>
      </div>

      <label
        htmlFor={fieldId('mid-year')}
        className="p-3 bg-white border border-[#E5E8EF] rounded-lg flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
          Mid-Year Discounting
          <span
            className="text-slate-400 cursor-help"
            title="Discount cash flows at mid-year (period − 0.5) instead of year-end, assuming cash arrives evenly through the year. Slightly increases fair value and is standard in professional models."
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </span>
        <input
          id={fieldId('mid-year')}
          type="checkbox"
          aria-label="Mid-Year Discounting"
          checked={inputs.midYearConvention}
          onChange={(event) =>
            dispatch({ type: 'SET_MID_YEAR', value: event.target.checked })
          }
          className="h-4 w-4 accent-[#059669] cursor-pointer"
        />
      </label>
    </div>
  </InputSection>
);

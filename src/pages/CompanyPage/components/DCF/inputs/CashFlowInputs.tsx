import type { FC } from 'react';
import { Sliders } from 'lucide-react';
import type { DCFData } from '../../../hooks/useDCFData.js';
import type { DcfInputState } from '../dcfTypes.js';
import { InputSection } from './InputSection.js';
import { SliderField } from './SliderField.js';
import { formatPercentInput, parsePercentInput } from './inputValues.js';
import type { DcfNumericSetter, FieldIdFactory } from './types.js';

export interface CashFlowInputsProps {
  inputs: DcfInputState;
  data: DCFData;
  fieldId: FieldIdFactory;
  setNumber: DcfNumericSetter;
  includeTerminalGrowth?: boolean;
}

export const CashFlowInputs: FC<CashFlowInputsProps> = ({
  inputs,
  data,
  fieldId,
  setNumber,
  includeTerminalGrowth = false,
}) => {
  const autoRevenueGrowth =
    data.historicalRevenue && data.historicalRevenue.length >= 2
      ? (
          (Math.pow(
            data.historicalRevenue[data.historicalRevenue.length - 1].value /
              data.historicalRevenue[0].value,
            1 / (data.historicalRevenue.length - 1)
          ) -
            1) *
          100
        ).toFixed(1)
      : '8.0';

  return (
    <InputSection
      title="Growth & Projections"
      icon={Sliders}
      iconClassName="h-4.5 w-4.5 text-[#059669]"
    >
      <SliderField
        id={fieldId('revenue-growth')}
        labelText="Revenue Growth Rate (Stage 1)"
        helpTitle="High-growth revenue CAGR. Fades linearly to terminal rate in years 6-10 if projection period is > 5 years."
        autoLabel={`Auto: ${autoRevenueGrowth}%`}
        min={-0.2}
        max={0.5}
        step={0.005}
        rangeValue={inputs.revenueGrowth}
        numberValue={formatPercentInput(inputs.revenueGrowth, 1)}
        unit="%"
        onRangeChange={(rawValue) => setNumber('revenueGrowth', parseFloat(rawValue))}
        onNumberChange={(rawValue) =>
          setNumber('revenueGrowth', parsePercentInput(rawValue))
        }
      />

      <SliderField
        id={fieldId('fcf-margin')}
        labelText="FCF Margin (Initial Year 1)"
        helpTitle="Unlevered free cash flow (FCFF) margin for Year 1 — auto-seeded from historical FCFF (reported FCF + after-tax interest) so it is consistent with WACC discounting. Linearly transitions to the Target Margin in the final year."
        autoLabel={`Auto: ${data.historicalFCF && data.historicalFCF.length > 0 ? 'historical avg' : '15%'}`}
        min={0}
        max={0.6}
        step={0.005}
        rangeValue={inputs.fcfMargin}
        numberValue={formatPercentInput(inputs.fcfMargin, 1)}
        unit="%"
        onRangeChange={(rawValue) => setNumber('fcfMargin', parseFloat(rawValue))}
        onNumberChange={(rawValue) =>
          setNumber('fcfMargin', parsePercentInput(rawValue))
        }
      />

      <SliderField
        id={fieldId('target-fcf-margin')}
        labelText={`FCF Margin (Target Year ${inputs.projectionYears})`}
        helpTitle="Unlevered free cash flow (FCFF) margin reached in the final projection year. Useful for scaling businesses with operating leverage."
        min={0}
        max={0.6}
        step={0.005}
        rangeValue={inputs.targetFcfMargin}
        numberValue={formatPercentInput(inputs.targetFcfMargin, 1)}
        unit="%"
        onRangeChange={(rawValue) => setNumber('targetFcfMargin', parseFloat(rawValue))}
        onNumberChange={(rawValue) =>
          setNumber('targetFcfMargin', parsePercentInput(rawValue))
        }
      />

      <SliderField
        id={fieldId('projection-years')}
        labelText="Projection Period"
        helpTitle="Years of high-growth cash flows to project before terminal value."
        min={3}
        max={10}
        step={1}
        rangeValue={inputs.projectionYears}
        numberValue={inputs.projectionYears}
        unit="Yrs"
        unitClassName="w-4"
        onRangeChange={(rawValue) => setNumber('projectionYears', parseInt(rawValue))}
        onNumberChange={(rawValue) => setNumber('projectionYears', parseInt(rawValue))}
      />

      {includeTerminalGrowth && (
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
          onRangeChange={(rawValue) => setNumber('terminalGrowth', parseFloat(rawValue))}
          onNumberChange={(rawValue) =>
            setNumber('terminalGrowth', parsePercentInput(rawValue))
          }
        />
      )}
    </InputSection>
  );
};

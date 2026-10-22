import { useId } from 'react';
import type { Dispatch, FC } from 'react';
import type { DCFResult } from '../../../../utils/dcfCalculator.js';
import type { DCFData } from '../../hooks/useDCFData.js';
import type { DcfInputAction, DcfInputState } from './dcfTypes.js';
import { CashFlowInputs } from './inputs/CashFlowInputs.js';
import { TerminalValueInputs } from './inputs/TerminalValueInputs.js';
import { WaccInputs } from './inputs/WaccInputs.js';
import type { DcfNumericSetter, FieldIdFactory } from './inputs/types.js';

interface DcfInputPanelProps {
  inputs: DcfInputState;
  dispatch: Dispatch<DcfInputAction>;
  data: DCFData;
  exchange: string;
  symbol: string;
  dcfResult: DCFResult | null;
}

export const DcfInputPanel: FC<DcfInputPanelProps> = ({
  inputs,
  dispatch,
  data,
  exchange,
  symbol,
  dcfResult,
}) => {
  const idPrefix = useId();
  const fieldId: FieldIdFactory = (name) => `${idPrefix}-${name}`;

  const setNumber: DcfNumericSetter = (field, value) =>
    dispatch({ type: 'SET_NUMBER', field, value });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CashFlowInputs
          inputs={inputs}
          data={data}
          fieldId={fieldId}
          setNumber={setNumber}
        />
        <WaccInputs
          inputs={inputs}
          data={data}
          dcfResult={dcfResult}
          dispatch={dispatch}
          fieldId={fieldId}
          setNumber={setNumber}
        />
      </div>

      <TerminalValueInputs
        inputs={inputs}
        data={data}
        exchange={exchange}
        symbol={symbol}
        fieldId={fieldId}
        setNumber={setNumber}
        includePerpetualGrowth={true}
      />
    </>
  );
};

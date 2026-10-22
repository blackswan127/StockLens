import type { FC } from 'react';
import { CashFlowInputs, type CashFlowInputsProps } from './CashFlowInputs.js';

export type GrowthProjectionsSectionProps = CashFlowInputsProps;

export const GrowthProjectionsSection: FC<GrowthProjectionsSectionProps> = (props) => (
  <CashFlowInputs {...props} includeTerminalGrowth={true} />
);

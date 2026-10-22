import type { FC } from 'react';
import { TerminalValueInputs, type TerminalValueInputsProps } from './TerminalValueInputs.js';

export type FinanceSectionProps = TerminalValueInputsProps;

export const FinanceSection: FC<FinanceSectionProps> = (props) => (
  <TerminalValueInputs {...props} includePerpetualGrowth={false} />
);

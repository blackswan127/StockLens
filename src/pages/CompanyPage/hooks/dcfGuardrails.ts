import type { DCFResult } from '../../../utils/dcfCalculator.js';
import type { DCFData } from './useDCFData.js';
import type { DcfInputState } from '../components/DCF/dcfTypes.js';

export interface DcfProfile {
  sector?: string;
  industry?: string;
}

export interface DcfGuardrails {
  isNegativeFcf: boolean;
  isRevenueZero: boolean;
  isTaxRateAtypical: boolean;
  isWaccLow: boolean;
  isWaccHigh: boolean;
  needsFinancialAcknowledgement: boolean;
}

export function isFinancialSectorProfile(profile: DcfProfile | undefined): boolean {
  return (
    !!profile?.sector?.toLowerCase().includes('financial') ||
    !!profile?.industry?.toLowerCase().includes('bank') ||
    !!profile?.industry?.toLowerCase().includes('insurance')
  );
}

export function getDcfValidationError(
  inputs: Pick<
    DcfInputState,
    'sharesOutstanding' | 'latestRevenue' | 'terminalGrowth' | 'hasAcknowledgedFinancial'
  >,
  isFinancialSector: boolean
): string | null {
  if (inputs.sharesOutstanding <= 0) {
    return 'Shares outstanding must be greater than zero.';
  }
  if (inputs.latestRevenue < 0) {
    return 'Latest revenue cannot be negative.';
  }
  if (inputs.terminalGrowth >= 0.045) {
    return `Terminal growth rate (${(inputs.terminalGrowth * 100).toFixed(1)}%) is excessively high. It cannot exceed long-term GDP growth (~4.5%).`;
  }
  if (isFinancialSector && !inputs.hasAcknowledgedFinancial) {
    return 'DCF valuation is blocked for Financial Sector stocks. Please acknowledge the warning below to proceed.';
  }
  return null;
}

interface DeriveDcfGuardrailsArgs {
  inputs: Pick<
    DcfInputState,
    'latestRevenue' | 'taxRate' | 'hasAcknowledgedFinancial'
  >;
  data: DCFData | null | undefined;
  dcfResult: Pick<DCFResult, 'wacc'> | null;
  isFinancialSector: boolean;
}

export function deriveDcfGuardrails({
  inputs,
  data,
  dcfResult,
  isFinancialSector,
}: DeriveDcfGuardrailsArgs): DcfGuardrails {
  const historicalFcf = data?.historicalFCF;
  return {
    isNegativeFcf:
      !!historicalFcf &&
      historicalFcf.length > 0 &&
      historicalFcf.every((entry) => entry.value <= 0),
    isRevenueZero: inputs.latestRevenue === 0,
    isTaxRateAtypical: inputs.taxRate < 0.1 || inputs.taxRate > 0.4,
    isWaccLow: !!dcfResult && dcfResult.wacc < 0.05,
    isWaccHigh: !!dcfResult && dcfResult.wacc > 0.2,
    needsFinancialAcknowledgement:
      isFinancialSector && !inputs.hasAcknowledgedFinancial,
  };
}

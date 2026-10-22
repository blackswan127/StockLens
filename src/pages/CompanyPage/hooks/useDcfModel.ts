import { useMemo } from 'react';
import {
  computeDCF,
  type DCFInputs,
  type DCFResult,
} from '../../../utils/dcfCalculator.js';
import {
  runMonteCarloSimulation,
  type MonteCarloResult,
} from '../../../utils/monteCarlo.js';
import type { DCFData } from './useDCFData.js';
import type { DcfInputState } from '../components/DCF/dcfTypes.js';
import {
  deriveDcfGuardrails,
  getDcfValidationError,
  type DcfGuardrails,
} from './dcfGuardrails.js';
import {
  buildSensitivityData,
  type DcfSensitivityData,
} from './dcfSensitivity.js';

export function buildDcfInputs(inputs: DcfInputState, data: DCFData): DCFInputs {
  return {
    revenueGrowthRate: inputs.revenueGrowth,
    fcfMargin: inputs.fcfMargin,
    targetFcfMargin: inputs.targetFcfMargin,
    projectionYears: inputs.projectionYears,
    terminalGrowthRate: inputs.terminalGrowth,
    midYearConvention: inputs.midYearConvention,
    riskFreeRate: inputs.riskFreeRate,
    equityRiskPremium: inputs.equityRiskPremium,
    beta: inputs.beta,
    costOfDebt: inputs.costOfDebt,
    taxRate: inputs.taxRate,
    marketCap: inputs.marketCap || inputs.sharesOutstanding * data.currentPrice,
    totalDebt: inputs.totalDebt,
    latestRevenue: inputs.latestRevenue,
    cashAndEquivalents: inputs.cashAndEquivalents,
    sharesOutstanding: inputs.sharesOutstanding,
  };
}

export interface DcfModelResult {
  dcfResult: DCFResult | null;
  dcfError: string | null;
  monteCarloResult: MonteCarloResult | null;
  sensitivity: DcfSensitivityData | null;
  guardrails: DcfGuardrails;
}

export function useDcfModel(
  data: DCFData | null | undefined,
  inputs: DcfInputState,
  isFinancialSector: boolean
): DcfModelResult {
  const {
    revenueGrowth,
    fcfMargin,
    targetFcfMargin,
    projectionYears,
    terminalGrowth,
    midYearConvention,
    riskFreeRate,
    equityRiskPremium,
    beta,
    costOfDebt,
    taxRate,
    sharesOutstanding,
    totalDebt,
    cashAndEquivalents,
    latestRevenue,
    marketCap,
  } = inputs;

  const dcfInputs = useMemo<DCFInputs | null>(() => {
    if (!data) return null;
    return {
      revenueGrowthRate: revenueGrowth,
      fcfMargin,
      targetFcfMargin,
      projectionYears,
      terminalGrowthRate: terminalGrowth,
      midYearConvention,
      riskFreeRate,
      equityRiskPremium,
      beta,
      costOfDebt,
      taxRate,
      marketCap: marketCap || sharesOutstanding * data.currentPrice,
      totalDebt,
      latestRevenue,
      cashAndEquivalents,
      sharesOutstanding,
    };
  }, [
    data,
    revenueGrowth,
    fcfMargin,
    targetFcfMargin,
    projectionYears,
    terminalGrowth,
    midYearConvention,
    riskFreeRate,
    equityRiskPremium,
    beta,
    costOfDebt,
    taxRate,
    sharesOutstanding,
    totalDebt,
    cashAndEquivalents,
    latestRevenue,
    marketCap,
  ]);

  const validationError = useMemo(
    () => getDcfValidationError(inputs, isFinancialSector),
    [inputs, isFinancialSector]
  );

  const model = useMemo<{ dcfResult: DCFResult | null; dcfError: string | null }>(() => {
    if (!data || !dcfInputs) {
      return { dcfResult: null, dcfError: null };
    }
    if (validationError) {
      return { dcfResult: null, dcfError: validationError };
    }
    try {
      return {
        dcfResult: computeDCF(dcfInputs, data.currentPrice),
        dcfError: null,
      };
    } catch (err) {
      return {
        dcfResult: null,
        dcfError: err instanceof Error ? err.message : 'Error computing DCF model',
      };
    }
  }, [data, dcfInputs, validationError]);

  const sensitivity = useMemo<DcfSensitivityData | null>(() => {
    if (!model.dcfResult || !dcfInputs || !data) return null;
    return buildSensitivityData(dcfInputs, data.currentPrice, model.dcfResult.wacc);
  }, [model.dcfResult, dcfInputs, data]);

  const monteCarloResult = useMemo<MonteCarloResult | null>(() => {
    if (!model.dcfResult || !data || !dcfInputs || !latestRevenue || sharesOutstanding <= 0) {
      return null;
    }
    return runMonteCarloSimulation(
      {
        baseInputs: dcfInputs,
        currentPrice: data.currentPrice,
        baseWacc: model.dcfResult.wacc,
        revenueGrowthStdDev: Math.abs(revenueGrowth * 0.2) || 0.02,
        targetFcfMarginStdDev: Math.abs(targetFcfMargin * 0.1) || 0.01,
        fcfMarginStdDev: Math.abs(fcfMargin * 0.1) || 0.01,
        waccStdDev: model.dcfResult.wacc * 0.1 || 0.005,
        terminalGrowthStdDev: Math.abs(terminalGrowth * 0.2) || 0.0025,
      },
      10000
    );
  }, [
    model.dcfResult,
    data,
    dcfInputs,
    latestRevenue,
    sharesOutstanding,
    revenueGrowth,
    fcfMargin,
    targetFcfMargin,
    terminalGrowth,
  ]);

  const guardrails = useMemo(
    () =>
      deriveDcfGuardrails({
        inputs,
        data,
        dcfResult: model.dcfResult,
        isFinancialSector,
      }),
    [inputs, data, model.dcfResult, isFinancialSector]
  );

  return {
    ...model,
    monteCarloResult,
    sensitivity,
    guardrails,
  };
}

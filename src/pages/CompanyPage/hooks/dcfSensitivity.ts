import {
  computeDCF,
  computeSensitivityTable,
  type DCFInputs,
} from '../../../utils/dcfCalculator.js';

export interface DcfSensitivityData {
  waccSteps: number[];
  growthSteps: number[];
  waccGrowthTable: number[][];
  revenueGrowthSteps: number[];
  fcfMarginSteps: number[];
  revenueMarginTable: number[][];
}

function computeRevenueMarginSensitivityTable(
  baseInputs: DCFInputs,
  currentPrice: number,
  growthRange: number[],
  marginRange: number[]
): number[][] {
  const table: number[][] = [];
  for (const growthValue of growthRange) {
    const row: number[] = [];
    for (const marginValue of marginRange) {
      try {
        const result = computeDCF(
          {
            ...baseInputs,
            revenueGrowthRate: growthValue,
            fcfMargin: marginValue,
            targetFcfMargin: marginValue,
          },
          currentPrice
        );
        row.push(result.fairValuePerShare);
      } catch {
        row.push(NaN);
      }
    }
    table.push(row);
  }
  return table;
}

export function buildSensitivityData(
  baseInputs: DCFInputs,
  currentPrice: number,
  baseWacc: number
): DcfSensitivityData {
  const waccSteps = [
    baseWacc - 0.02,
    baseWacc - 0.01,
    baseWacc,
    baseWacc + 0.01,
    baseWacc + 0.02,
  ];

  const growthSteps = [
    baseInputs.terminalGrowthRate - 0.01,
    baseInputs.terminalGrowthRate - 0.005,
    baseInputs.terminalGrowthRate,
    baseInputs.terminalGrowthRate + 0.005,
    baseInputs.terminalGrowthRate + 0.01,
  ];

  const revenueGrowthSteps = [
    baseInputs.revenueGrowthRate - 0.04,
    baseInputs.revenueGrowthRate - 0.02,
    baseInputs.revenueGrowthRate,
    baseInputs.revenueGrowthRate + 0.02,
    baseInputs.revenueGrowthRate + 0.04,
  ];

  const fcfMarginSteps = Array.from(
    new Set([
      Math.max(baseInputs.fcfMargin - 0.04, 0),
      Math.max(baseInputs.fcfMargin - 0.02, 0),
      baseInputs.fcfMargin,
      baseInputs.fcfMargin + 0.02,
      baseInputs.fcfMargin + 0.04,
    ])
  );

  return {
    waccSteps,
    growthSteps,
    waccGrowthTable: computeSensitivityTable(
      baseInputs,
      currentPrice,
      waccSteps,
      growthSteps
    ),
    revenueGrowthSteps,
    fcfMarginSteps,
    revenueMarginTable: computeRevenueMarginSensitivityTable(
      baseInputs,
      currentPrice,
      revenueGrowthSteps,
      fcfMarginSteps
    ),
  };
}

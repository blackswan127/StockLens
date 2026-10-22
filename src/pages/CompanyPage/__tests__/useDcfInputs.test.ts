import { describe, expect, it } from 'vitest';
import {
  dcfInputsReducer,
  initialDcfInputState,
} from '../hooks/useDcfInputs.js';
import {
  deriveResetDefaults,
  deriveScenarioDefaults,
} from '../hooks/dcfInputDefaults.js';
import {
  deriveDcfGuardrails,
  getDcfValidationError,
  isFinancialSectorProfile,
} from '../hooks/dcfGuardrails.js';
import type { DCFData } from '../hooks/useDCFData.js';

const fixture: DCFData = {
  symbol: 'TEST',
  companyName: 'Test Corp',
  currentPrice: 100,
  sharesOutstanding: 1_000,
  historicalFCF: [{ year: 2023, value: 120 }],
  historicalFCFF: [{ year: 2023, value: 120 }],
  historicalRevenue: [
    { year: 2022, value: 800 },
    { year: 2023, value: 1_000 },
  ],
  totalDebt: 200,
  cashAndEquivalents: 100,
  beta: 1.3,
  riskFreeRate: 0.04,
  marketCap: 5_000,
  interestExpense: 10,
  taxRate: 0.21,
  analystGrowthEstimate5yr: 0.2,
  currency: 'INR',
  lastFiscalYear: 2023,
  dataFreshness: '2024-01-01T00:00:00.000Z',
  high_52w: 120,
  low_52w: 80,
  syntheticCostOfDebt: 0.055,
};

const defaults = {
  revCAGR: 0.1,
  fcfMargin: 0.2,
  beta: 1.2,
  erp: 0.06,
  debtCost: 0.05,
};

describe('dcfInputsReducer', () => {
  it('applies bear, base, and bull presets as data-driven defaults', () => {
    const bear = dcfInputsReducer(initialDcfInputState, {
      type: 'APPLY_SCENARIO',
      scenario: 'bear',
      defaults,
    });
    expect(bear.scenario).toBe('bear');
    expect(bear.revenueGrowth).toBeCloseTo(0.05);
    expect(bear.fcfMargin).toBeCloseTo(0.17);
    expect(bear.targetFcfMargin).toBeCloseTo(0.15);
    expect(bear.beta).toBeCloseTo(1.4);
    expect(bear.equityRiskPremium).toBeCloseTo(0.065);

    const base = dcfInputsReducer(initialDcfInputState, {
      type: 'APPLY_SCENARIO',
      scenario: 'base',
      defaults,
    });
    expect(base.scenario).toBe('base');
    expect(base.revenueGrowth).toBeCloseTo(0.1);
    expect(base.fcfMargin).toBeCloseTo(0.2);
    expect(base.targetFcfMargin).toBeCloseTo(0.2);
    expect(base.beta).toBeCloseTo(1.2);
    expect(base.equityRiskPremium).toBeCloseTo(0.06);

    const bull = dcfInputsReducer(initialDcfInputState, {
      type: 'APPLY_SCENARIO',
      scenario: 'bull',
      defaults,
    });
    expect(bull.scenario).toBe('bull');
    expect(bull.revenueGrowth).toBeCloseTo(0.15);
    expect(bull.fcfMargin).toBeCloseTo(0.23);
    expect(bull.targetFcfMargin).toBeCloseTo(0.26);
    expect(bull.beta).toBeCloseTo(1.1);
    expect(bull.equityRiskPremium).toBeCloseTo(0.055);
  });

  it('marks manual valuation overrides as base while leaving other fields on the active preset', () => {
    const bear = dcfInputsReducer(initialDcfInputState, {
      type: 'APPLY_SCENARIO',
      scenario: 'bear',
      defaults,
    });

    const manuallyGrown = dcfInputsReducer(bear, {
      type: 'SET_NUMBER',
      field: 'revenueGrowth',
      value: 0.12,
    });
    expect(manuallyGrown.revenueGrowth).toBe(0.12);
    expect(manuallyGrown.scenario).toBe('base');
    expect(manuallyGrown.fcfMargin).toBeCloseTo(0.17);

    const manuallyRiskFree = dcfInputsReducer(bear, {
      type: 'SET_NUMBER',
      field: 'riskFreeRate',
      value: 0.05,
    });
    expect(manuallyRiskFree.riskFreeRate).toBe(0.05);
    expect(manuallyRiskFree.scenario).toBe('bear');
  });

  it('resets valuation inputs without clearing acknowledgement, grid, or mid-year convention', () => {
    const dirty = {
      ...initialDcfInputState,
      scenario: 'bull' as const,
      hasAcknowledgedFinancial: true,
      activeGrid: 'rev_margin' as const,
      midYearConvention: true,
      revenueGrowth: 0.9,
      latestRevenue: 1,
    };

    const reset = dcfInputsReducer(dirty, {
      type: 'RESET',
      defaults: deriveResetDefaults(fixture),
    });

    expect(reset.scenario).toBe('base');
    expect(reset.hasAcknowledgedFinancial).toBe(true);
    expect(reset.activeGrid).toBe('rev_margin');
    expect(reset.midYearConvention).toBe(true);
    expect(reset.revenueGrowth).toBeCloseTo(0.25);
    expect(reset.fcfMargin).toBeCloseTo(0.12);
    expect(reset.targetFcfMargin).toBeCloseTo(0.12);
    expect(reset.projectionYears).toBe(5);
    expect(reset.terminalGrowth).toBeCloseTo(0.03);
    expect(reset.riskFreeRate).toBeCloseTo(0.04);
    expect(reset.equityRiskPremium).toBeCloseTo(0.075);
    expect(reset.beta).toBeCloseTo(1.3);
    expect(reset.costOfDebt).toBeCloseTo(0.055);
    expect(reset.taxRate).toBeCloseTo(0.21);
    expect(reset.sharesOutstanding).toBe(1_000);
    expect(reset.totalDebt).toBe(200);
    expect(reset.cashAndEquivalents).toBe(100);
    expect(reset.latestRevenue).toBe(1_000);
    expect(reset.marketCap).toBe(5_000);
  });
});

describe('dcfInputDefaults', () => {
  it('derives CAGR, unlevered margin, beta, ERP, and debt cost from company data', () => {
    const scenarioDefaults = deriveScenarioDefaults(fixture);
    expect(scenarioDefaults.revCAGR).toBeCloseTo(0.25);
    expect(scenarioDefaults.fcfMargin).toBeCloseTo(0.12);
    expect(scenarioDefaults.beta).toBeCloseTo(1.3);
    expect(scenarioDefaults.erp).toBeCloseTo(0.075);
    expect(scenarioDefaults.debtCost).toBeCloseTo(0.055);

    const resetDefaults = deriveResetDefaults(fixture);
    expect(resetDefaults.terminalGrowth).toBeCloseTo(0.03);
    expect(resetDefaults.latestRevenue).toBe(1_000);
    expect(resetDefaults.marketCap).toBe(5_000);
  });
});

describe('dcfGuardrails', () => {
  it('flags negative FCF, zero revenue, atypical tax, low WACC, and blocked financials', () => {
    const guardrails = deriveDcfGuardrails({
      inputs: {
        ...initialDcfInputState,
        latestRevenue: 0,
        taxRate: 0.5,
      },
      data: { ...fixture, historicalFCF: [{ year: 2023, value: -5 }] },
      dcfResult: { wacc: 0.03 },
      isFinancialSector: true,
    });

    expect(guardrails.isNegativeFcf).toBe(true);
    expect(guardrails.isRevenueZero).toBe(true);
    expect(guardrails.isTaxRateAtypical).toBe(true);
    expect(guardrails.isWaccLow).toBe(true);
    expect(guardrails.isWaccHigh).toBe(false);
    expect(guardrails.needsFinancialAcknowledgement).toBe(true);
  });

  it('flags high WACC and clears the financial block once acknowledged', () => {
    const guardrails = deriveDcfGuardrails({
      inputs: {
        ...initialDcfInputState,
        latestRevenue: 1_000,
        hasAcknowledgedFinancial: true,
      },
      data: fixture,
      dcfResult: { wacc: 0.25 },
      isFinancialSector: true,
    });

    expect(guardrails.isWaccHigh).toBe(true);
    expect(guardrails.isWaccLow).toBe(false);
    expect(guardrails.needsFinancialAcknowledgement).toBe(false);
    expect(guardrails.isNegativeFcf).toBe(false);
    expect(guardrails.isTaxRateAtypical).toBe(false);
  });

  it('detects financial-sector profiles from sector and industry', () => {
    expect(isFinancialSectorProfile({ sector: 'Financial Services' })).toBe(true);
    expect(isFinancialSectorProfile({ industry: 'Regional Banks' })).toBe(true);
    expect(isFinancialSectorProfile({ industry: 'Insurance' })).toBe(true);
    expect(isFinancialSectorProfile({ sector: 'Technology', industry: 'Software' })).toBe(
      false
    );
    expect(isFinancialSectorProfile(undefined)).toBe(false);
  });

  it('returns validation errors in the same precedence as the calculator', () => {
    expect(
      getDcfValidationError(
        {
          ...initialDcfInputState,
          sharesOutstanding: 0,
          latestRevenue: -1,
        },
        false
      )
    ).toBe('Shares outstanding must be greater than zero.');

    expect(
      getDcfValidationError(
        {
          ...initialDcfInputState,
          sharesOutstanding: 100,
          latestRevenue: -1,
        },
        false
      )
    ).toBe('Latest revenue cannot be negative.');

    expect(
      getDcfValidationError(
        {
          ...initialDcfInputState,
          sharesOutstanding: 100,
          latestRevenue: 1_000,
          terminalGrowth: 0.05,
        },
        false
      )
    ).toMatch(/excessively high/);

    expect(
      getDcfValidationError(
        {
          ...initialDcfInputState,
          sharesOutstanding: 100,
          latestRevenue: 1_000,
          terminalGrowth: 0.03,
        },
        true
      )
    ).toMatch(/Financial Sector stocks/);

    expect(
      getDcfValidationError(
        {
          ...initialDcfInputState,
          sharesOutstanding: 100,
          latestRevenue: 1_000,
          terminalGrowth: 0.03,
          hasAcknowledgedFinancial: true,
        },
        true
      )
    ).toBeNull();
  });
});

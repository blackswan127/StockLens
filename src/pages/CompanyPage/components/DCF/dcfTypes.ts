export type DcfScenario = 'bear' | 'base' | 'bull';

export type DcfSensitivityGridId = 'wacc_g' | 'rev_margin';

export interface DcfInputState {
  scenario: DcfScenario;
  hasAcknowledgedFinancial: boolean;

  revenueGrowth: number;
  fcfMargin: number;
  targetFcfMargin: number;
  projectionYears: number;
  terminalGrowth: number;
  midYearConvention: boolean;

  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;

  sharesOutstanding: number;
  totalDebt: number;
  cashAndEquivalents: number;
  latestRevenue: number;
  marketCap: number;

  activeGrid: DcfSensitivityGridId;
}

export type DcfNumericField =
  | 'revenueGrowth'
  | 'fcfMargin'
  | 'targetFcfMargin'
  | 'projectionYears'
  | 'terminalGrowth'
  | 'riskFreeRate'
  | 'equityRiskPremium'
  | 'beta'
  | 'costOfDebt'
  | 'taxRate'
  | 'sharesOutstanding'
  | 'totalDebt'
  | 'cashAndEquivalents'
  | 'latestRevenue'
  | 'marketCap';

export type DcfScenarioPatch = Pick<
  DcfInputState,
  'revenueGrowth' | 'fcfMargin' | 'targetFcfMargin' | 'beta' | 'equityRiskPremium'
>;

export type DcfResetDefaults = Pick<
  DcfInputState,
  | 'revenueGrowth'
  | 'fcfMargin'
  | 'targetFcfMargin'
  | 'projectionYears'
  | 'terminalGrowth'
  | 'riskFreeRate'
  | 'equityRiskPremium'
  | 'beta'
  | 'costOfDebt'
  | 'taxRate'
  | 'sharesOutstanding'
  | 'totalDebt'
  | 'cashAndEquivalents'
  | 'latestRevenue'
  | 'marketCap'
>;

export interface DcfScenarioDefaults {
  revCAGR: number;
  fcfMargin: number;
  beta: number;
  erp: number;
  debtCost: number;
}

export type DcfInputAction =
  | { type: 'SET_NUMBER'; field: DcfNumericField; value: number }
  | { type: 'SET_MID_YEAR'; value: boolean }
  | { type: 'SET_ACKNOWLEDGED_FINANCIAL'; value: boolean }
  | { type: 'SET_ACTIVE_GRID'; value: DcfSensitivityGridId }
  | { type: 'APPLY_SCENARIO'; scenario: DcfScenario; defaults: DcfScenarioDefaults }
  | { type: 'RESET'; defaults: DcfResetDefaults };

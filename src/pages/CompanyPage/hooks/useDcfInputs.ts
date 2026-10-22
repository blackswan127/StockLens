import { useCallback, useEffect, useReducer } from 'react';
import type { Dispatch } from 'react';
import type { DCFData } from './useDCFData.js';
import type {
  DcfInputAction,
  DcfInputState,
  DcfNumericField,
  DcfScenario,
} from '../components/DCF/dcfTypes.js';
import { DCF_SCENARIO_PRESETS } from '../components/DCF/DcfScenarioPresets.js';
import { deriveResetDefaults, deriveScenarioDefaults } from './dcfInputDefaults.js';

export const initialDcfInputState: DcfInputState = {
  scenario: 'base',
  hasAcknowledgedFinancial: false,

  revenueGrowth: 0.08,
  fcfMargin: 0.15,
  targetFcfMargin: 0.15,
  projectionYears: 5,
  terminalGrowth: 0.025,
  midYearConvention: false,

  riskFreeRate: 0.0425,
  equityRiskPremium: 0.055,
  beta: 1.0,
  costOfDebt: 0.05,
  taxRate: 0.21,

  sharesOutstanding: 0,
  totalDebt: 0,
  cashAndEquivalents: 0,
  latestRevenue: 0,
  marketCap: 0,

  activeGrid: 'wacc_g',
};

const MANUAL_SCENARIO_FIELDS: ReadonlySet<DcfNumericField> = new Set([
  'revenueGrowth',
  'fcfMargin',
  'targetFcfMargin',
  'beta',
  'equityRiskPremium',
]);

export function dcfInputsReducer(
  state: DcfInputState,
  action: DcfInputAction
): DcfInputState {
  switch (action.type) {
    case 'SET_NUMBER': {
      const numericPatch = { [action.field]: action.value } as Pick<
        DcfInputState,
        DcfNumericField
      >;
      return {
        ...state,
        ...numericPatch,
        ...(MANUAL_SCENARIO_FIELDS.has(action.field) ? { scenario: 'base' as const } : {}),
      };
    }
    case 'SET_MID_YEAR':
      return { ...state, midYearConvention: action.value };
    case 'SET_ACKNOWLEDGED_FINANCIAL':
      return { ...state, hasAcknowledgedFinancial: action.value };
    case 'SET_ACTIVE_GRID':
      return state.activeGrid === action.value
        ? state
        : { ...state, activeGrid: action.value };
    case 'APPLY_SCENARIO':
      return {
        ...state,
        scenario: action.scenario,
        ...DCF_SCENARIO_PRESETS[action.scenario].apply(action.defaults),
      };
    case 'RESET':
      return { ...state, scenario: 'base', ...action.defaults };
    default:
      return state;
  }
}

export interface UseDcfInputsResult {
  inputs: DcfInputState;
  dispatch: Dispatch<DcfInputAction>;
  applyScenario: (scenario: DcfScenario) => void;
  resetToDefaults: () => void;
}

export function useDcfInputs(data: DCFData | null | undefined): UseDcfInputsResult {
  const [inputs, dispatch] = useReducer(dcfInputsReducer, initialDcfInputState);

  useEffect(() => {
    if (data) {
      dispatch({ type: 'RESET', defaults: deriveResetDefaults(data) });
    }
  }, [data]);

  const applyScenario = useCallback(
    (scenario: DcfScenario) => {
      if (!data) return;
      dispatch({
        type: 'APPLY_SCENARIO',
        scenario,
        defaults: deriveScenarioDefaults(data),
      });
    },
    [data]
  );

  const resetToDefaults = useCallback(() => {
    if (!data) return;
    dispatch({ type: 'RESET', defaults: deriveResetDefaults(data) });
  }, [data]);

  return { inputs, dispatch, applyScenario, resetToDefaults };
}

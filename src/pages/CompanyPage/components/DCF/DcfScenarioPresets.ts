import type { DcfScenario, DcfScenarioDefaults, DcfScenarioPatch } from './dcfTypes.js';

export interface DcfScenarioPreset {
  id: DcfScenario;
  label: string;
  apply: (defaults: DcfScenarioDefaults) => DcfScenarioPatch;
}

export const DCF_SCENARIO_PRESETS: Record<DcfScenario, DcfScenarioPreset> = {
  bear: {
    id: 'bear',
    label: 'Bear 🐻',
    apply: (defaults) => ({
      revenueGrowth: defaults.revCAGR * 0.5,
      fcfMargin: Math.max(defaults.fcfMargin - 0.03, 0),
      targetFcfMargin: Math.max(defaults.fcfMargin - 0.05, 0),
      beta: defaults.beta + 0.2,
      equityRiskPremium: defaults.erp + 0.005,
    }),
  },
  base: {
    id: 'base',
    label: 'Base 📊',
    apply: (defaults) => ({
      revenueGrowth: defaults.revCAGR,
      fcfMargin: defaults.fcfMargin,
      targetFcfMargin: defaults.fcfMargin,
      beta: defaults.beta,
      equityRiskPremium: defaults.erp,
    }),
  },
  bull: {
    id: 'bull',
    label: 'Bull 🐂',
    apply: (defaults) => ({
      revenueGrowth: Math.min(defaults.revCAGR * 1.5, 0.5),
      fcfMargin: defaults.fcfMargin + 0.03,
      targetFcfMargin: defaults.fcfMargin + 0.06,
      beta: Math.max(defaults.beta - 0.1, 0.4),
      equityRiskPremium: defaults.erp - 0.005,
    }),
  },
};

export const DCF_SCENARIO_OPTIONS: readonly DcfScenarioPreset[] = [
  DCF_SCENARIO_PRESETS.bear,
  DCF_SCENARIO_PRESETS.base,
  DCF_SCENARIO_PRESETS.bull,
];

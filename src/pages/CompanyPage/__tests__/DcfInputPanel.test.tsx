import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../test/utils';
import { DcfInputPanel } from '../components/DCF/DcfInputPanel.js';
import { initialDcfInputState } from '../hooks/useDcfInputs.js';
import type { DCFData } from '../hooks/useDCFData.js';

const data: DCFData = {
  symbol: 'TEST',
  companyName: 'Test Corp',
  currentPrice: 100,
  sharesOutstanding: 1_000_000_000,
  historicalFCF: [{ year: 2023, value: 1_500_000_000, source: 'Yahoo Annual' }],
  historicalFCFF: [{ year: 2023, value: 1_500_000_000, source: 'Yahoo Annual' }],
  historicalRevenue: [
    { year: 2022, value: 8_000_000_000, source: 'Yahoo Annual' },
    { year: 2023, value: 10_000_000_000, source: 'Yahoo Annual' },
  ],
  totalDebt: 2_000_000_000,
  cashAndEquivalents: 1_000_000_000,
  beta: 1.1,
  riskFreeRate: 0.0425,
  marketCap: 100_000_000_000,
  interestExpense: 100_000_000,
  taxRate: 0.21,
  analystGrowthEstimate5yr: 0.2,
  currency: 'USD',
  lastFiscalYear: 2023,
  dataFreshness: '2024-01-01T00:00:00.000Z',
  high_52w: 120,
  low_52w: 80,
  dataConfidence: 'high',
  peerMedianPE: 20,
  companyEPS: 5,
  syntheticCostOfDebt: 0.05,
  provenance: {
    riskFreeRate: { source: 'FRED', fallbackApplied: false },
    beta: { source: 'Yahoo', fallbackApplied: false },
    totalDebt: { source: 'Yahoo', fallbackApplied: false },
    cashAndEquivalents: { source: 'Yahoo', fallbackApplied: false },
    sharesOutstanding: { source: 'Yahoo', fallbackApplied: false },
    interestExpense: { source: 'Yahoo', fallbackApplied: false },
    taxRate: { source: 'Yahoo', fallbackApplied: false },
  },
};

function renderPanel(dispatch = vi.fn()) {
  render(
    <DcfInputPanel
      inputs={{
        ...initialDcfInputState,
        latestRevenue: 10_000_000_000,
        totalDebt: 2_000_000_000,
        cashAndEquivalents: 1_000_000_000,
        sharesOutstanding: 1_000_000_000,
      }}
      dispatch={dispatch}
      data={data}
      exchange="NASDAQ"
      symbol="TEST"
      dcfResult={null}
    />
  );
  return dispatch;
}

describe('DcfInputPanel', () => {
  it('renders all input sections with formatted values', () => {
    renderPanel();

    expect(screen.getByText('Growth & Projections')).toBeInTheDocument();
    expect(screen.getByText('Discount Rate (WACC)')).toBeInTheDocument();
    expect(screen.getByText('Finances & Share Structure Assumptions')).toBeInTheDocument();

    expect(
      screen.getByRole('spinbutton', { name: 'Revenue Growth Rate (Stage 1)' })
    ).toHaveValue(8);
    expect(screen.getByText('Computed WACC')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('dispatches SET_NUMBER with a decimal value when a percent field changes', () => {
    const dispatch = renderPanel();

    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Revenue Growth Rate (Stage 1)' }),
      { target: { value: '20' } }
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_NUMBER',
      field: 'revenueGrowth',
      value: 0.2,
    });
  });

  it('dispatches SET_MID_YEAR when the mid-year toggle changes', () => {
    const dispatch = renderPanel();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mid-Year Discounting' }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MID_YEAR', value: true });
  });
});

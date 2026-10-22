import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test/utils';
import { DCFCalculator } from '../DCFCalculator.js';
import { computeDCF, type DCFInputs } from '../../../utils/dcfCalculator.js';
import { runMonteCarloSimulation } from '../../../utils/monteCarlo.js';
import { formatMarketCap, formatPrice } from '../../../utils/formatters.js';

const testData = vi.hoisted(() => ({
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
}));

vi.mock('../hooks/useDCFData.js', () => ({
  useDCFData: () => ({
    data: testData,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../../../utils/monteCarlo.js', () => ({
  runMonteCarloSimulation: vi.fn(() => ({
    iterations: 10_000,
    percentiles: { p10: 30, p25: 40, p50: 50, p75: 60, p90: 70 },
    histogram: [
      { min: 30, max: 40, count: 10 },
      { min: 40, max: 50, count: 20 },
    ],
  })),
}));

const expectedInputs: DCFInputs = {
  revenueGrowthRate: 0.25,
  fcfMargin: 0.15,
  targetFcfMargin: 0.15,
  projectionYears: 5,
  terminalGrowthRate: 0.03,
  midYearConvention: false,
  riskFreeRate: 0.0425,
  equityRiskPremium: 0.055,
  beta: 1.1,
  costOfDebt: 0.05,
  taxRate: 0.21,
  marketCap: 100_000_000_000,
  totalDebt: 2_000_000_000,
  latestRevenue: 10_000_000_000,
  cashAndEquivalents: 1_000_000_000,
  sharesOutstanding: 1_000_000_000,
};

const expected = computeDCF(expectedInputs, testData.currentPrice);
const expectedFairValue = formatPrice(expected.fairValuePerShare, 'NASDAQ', 'TEST');

async function renderExpandedCalculator() {
  renderWithProviders(
    <DCFCalculator
      symbol="TEST"
      exchange="NASDAQ"
      profile={{ sector: 'Technology', industry: 'Software' }}
    />
  );

  const header = await screen.findByRole('button', { name: /DCF\) Valuation Suite/ });
  fireEvent.click(header);
  return header;
}

describe('DCFCalculator', () => {
  it('renders deterministic fair value, terminal value, and accessible regions', async () => {
    await renderExpandedCalculator();

    await waitFor(() => {
      expect(screen.getAllByText(expectedFairValue).length).toBeGreaterThan(1);
    });

    expect(
      screen.getByText(formatMarketCap(expected.terminalValue, 'NASDAQ', 'TEST'))
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(formatMarketCap(expected.pvTerminalValue, 'NASDAQ', 'TEST')).length
    ).toBeGreaterThan(1);
    expect(screen.getByText(`${(expected.wacc * 100).toFixed(2)}%`)).toBeInTheDocument();

    expect(
      screen.getByRole('radiogroup', { name: 'Valuation scenario presets' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Monte Carlo distribution histogram/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: 'Revenue Growth Rate (Stage 1) slider' })
    ).toBeInTheDocument();

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveTextContent(expectedFairValue);
  });

  it('recomputes the fair value when a scenario preset is selected', async () => {
    await renderExpandedCalculator();

    fireEvent.click(screen.getByRole('radio', { name: /Bear/ }));

    const bearExpected = computeDCF(
      {
        ...expectedInputs,
        revenueGrowthRate: 0.125,
        fcfMargin: 0.12,
        targetFcfMargin: 0.1,
        beta: 1.3,
        equityRiskPremium: 0.06,
      },
      testData.currentPrice
    );

    const bearFairValue = formatPrice(bearExpected.fairValuePerShare, 'NASDAQ', 'TEST');
    await waitFor(() => {
      expect(screen.getAllByText(bearFairValue).length).toBeGreaterThan(1);
    });
    expect(screen.getByRole('radio', { name: /Bear/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('only recomputes Monte Carlo when valuation inputs change', async () => {
    vi.mocked(runMonteCarloSimulation).mockClear();
    await renderExpandedCalculator();

    const callsAfterMount = vi.mocked(runMonteCarloSimulation).mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole('radio', { name: 'Revenue Growth vs. FCF Margin' })
    );
    expect(vi.mocked(runMonteCarloSimulation).mock.calls.length).toBe(callsAfterMount);

    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Revenue Growth Rate (Stage 1)' }),
      { target: { value: '20' } }
    );

    await waitFor(() => {
      expect(vi.mocked(runMonteCarloSimulation).mock.calls.length).toBe(
        callsAfterMount + 1
      );
    });
  });

  it('exports the computed model as a CSV download', async () => {
    await renderExpandedCalculator();

    const downloads: { download: string; href: string }[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({
          download: this.download,
          href: this.getAttribute('href') ?? '',
        });
      });

    fireEvent.click(screen.getByRole('button', { name: /Export model \(CSV\)/ }));
    clickSpy.mockRestore();

    expect(downloads).toHaveLength(1);
    expect(downloads[0].download).toBe('DCF_Model_TEST.csv');
    const csv = decodeURI(downloads[0].href);
    expect(csv).toContain('DCF Fair Value per Share');
    expect(csv).toContain('Test Corp');
    expect(csv).toContain(`Intrinsic Fair Value per Share,${expected.fairValuePerShare.toFixed(2)}`);
  });
});

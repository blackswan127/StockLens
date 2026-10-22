import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, renderWithProviders, screen } from '../../../test/utils';
import { AnalysisTab } from '../AnalysisTab';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  LineChart: ({ children }: { children?: ReactNode }) => (
    <div data-testid="recharts-line-chart">{children}</div>
  ),
  Line: () => <div data-testid="recharts-line" />,
}));

vi.mock('../../../components/Chart.jsx', () => ({
  Chart: () => <div data-testid="price-chart" />,
}));

vi.mock('../DCFCalculator.js', () => ({
  DCFCalculator: () => <div data-testid="dcf-calculator">DCF Calculator</div>,
}));

const profile = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  logo: '',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  exchange: 'NASDAQ',
  country: 'US',
  weburl: 'https://apple.com',
  ipo: '1980',
  description: 'Apple Inc. designs consumer electronics.',
};

const ratios = {
  symbol: 'AAPL',
  pe: '31.20',
  pb: '48.10',
  roe: '147.00%',
  roce: '58.00%',
  debt_equity: '1.87',
  eps: '6.13',
  market_cap: 3_200_000_000_000,
  dividend_yield: '0.45%',
};

const peers = [
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 420.25,
    mcap: 3_100_000_000_000,
    pe: 35.1,
    pb: 12.2,
    roe: '38.00%',
    exchange: 'NASDAQ',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 190.5,
    mcap: 3_200_000_000_000,
    pe: 31.2,
    pb: 48.1,
    roe: '147.00%',
    exchange: 'NASDAQ',
  },
];

const baseProps = {
  upperSymbol: 'AAPL',
  profile,
  livePriceVal: 190.5,
  detailData: null,
  currencySuffixLabel: '$',
  mcapSuffixLabel: 'B',
  isPeersPending: false,
  peers,
  ratios,
  isNasdaq: true,
  financials: {
    incomeStatement: [
      { year: 2023, revenue: 383_000, netIncome: 97_000 },
      { year: 2024, revenue: 391_000, netIncome: 101_000 },
    ],
  },
};

describe('AnalysisTab', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the price chart and mocked DCF calculator', () => {
    renderWithProviders(<AnalysisTab {...baseProps} handlePeerClick={vi.fn()} />);

    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
    expect(screen.getByTestId('dcf-calculator')).toBeInTheDocument();
    expect(screen.getByText('Multi-Period Growth Rates & Solvency Trends')).toBeInTheDocument();
  });

  it('renders peer rows and navigates when a peer is selected', () => {
    const handlePeerClick = vi.fn();
    renderWithProviders(<AnalysisTab {...baseProps} handlePeerClick={handlePeerClick} />);

    expect(screen.getByText('Apple Inc. (Primary)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Microsoft Corp.' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$420.25' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Microsoft Corp.' }));
    expect(handlePeerClick).toHaveBeenCalledWith('MSFT');
  });

  it('opens the side-by-side comparison panel', () => {
    renderWithProviders(<AnalysisTab {...baseProps} handlePeerClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    expect(
      screen.getByText('Interactive Side-by-Side Duopoly Analysis')
    ).toBeInTheDocument();
    expect(screen.getByText('Return on Capital (ROCE)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }));
    expect(
      screen.queryByText('Interactive Side-by-Side Duopoly Analysis')
    ).not.toBeInTheDocument();
  });

  it('shows the peers empty state and the growth cards', () => {
    renderWithProviders(
      <AnalysisTab {...baseProps} peers={[]} handlePeerClick={vi.fn()} />
    );

    expect(screen.getByText('No peers loaded.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sales Growth historical trend chart' })).toBeInTheDocument();
    expect(screen.getAllByText('ROE %').length).toBeGreaterThan(0);
    expect(screen.getByText('Debt/Equity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Custom Ratio/ })).toBeInTheDocument();
  });
});

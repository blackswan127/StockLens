import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test/utils';
import { ComparePage } from '../ComparePage';
import type { SearchResult, StockData } from '../Compare/types';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

const AS_OF = '2026-06-30';

function makeStock(
  symbol: string,
  name: string,
  marketCap: number,
  revenue: number
): StockData {
  return {
    symbol,
    profile: {
      name,
      sector: 'Technology',
      industry: 'Consumer Electronics',
      ceo: 'Jane Doe',
      exchange: 'NASDAQ',
      country: 'US',
      logo: '',
    },
    keyStats: {
      asOf: AS_OF,
      marketCap,
      enterpriseValue: marketCap + 50_000_000_000,
      peRatio: 20,
      eps: 6,
      dividendRate: 1,
      dividendYield: 0.5,
    },
    pricePerformance: {
      asOf: AS_OF,
      oneWeek: 1.5,
      threeMonths: 5,
      ytd: 10,
      oneYear: 20,
    },
    incomeStatement: {
      asOf: AS_OF,
      revenue,
      operatingExpenses: revenue * 0.1,
      operatingIncome: revenue * 0.3,
      revenueGrowthYoY: 8,
      grossProfit: revenue * 0.45,
    },
    balanceSheet: {
      asOf: AS_OF,
      inventory: 1_000_000_000,
      receivablesTurnover: 12,
    },
    cashFlow: {
      asOf: AS_OF,
      operatingCashFlow: 100_000_000_000,
      capex: 10_000_000_000,
      investingCashFlow: -50_000_000_000,
      freeCashFlow: 90_000_000_000,
    },
    priceRatios: {
      pe: 20,
      forwardPe: 18,
      pFreeCashFlow: 25,
      pBook: 10,
      pSales: 5,
      evEbitda: 15,
    },
    margin: {
      operatingMargin: 30,
      grossMargin: 45,
      profitMargin: 25,
    },
    earnings: {
      eps: 6,
      epsGrowthYoY: 7,
    },
    equityReturn: {
      roe: 40,
      roa: 20,
      roic: 25,
    },
  };
}

const aapl = makeStock('AAPL', 'Apple Inc.', 3_000_000_000_000, 400_000_000_000);
const msft = makeStock('MSFT', 'Microsoft Corporation', 2_800_000_000_000, 300_000_000_000);

const searchResults: SearchResult[] = [
  {
    symbol: 'AAPL',
    description: 'Apple Inc.',
    displaySymbol: 'AAPL',
    type: 'Equity',
    exchange: 'NASDAQ',
    country: 'US',
    isLocal: false,
  },
];

function mockGet({
  compare = {},
  search = searchResults,
}: {
  compare?: Record<string, StockData>;
  search?: SearchResult[];
} = {}) {
  apiMocks.get.mockImplementation((url: string) => {
    if (url.startsWith('/compare?')) {
      const parsed = new URL(url, 'http://localhost');
      const symbols = (parsed.searchParams.get('symbols') ?? '')
        .split(',')
        .filter(Boolean);
      return Promise.resolve({ data: symbols.map((symbol) => compare[symbol]) });
    }
    if (url.startsWith('/search?')) {
      return Promise.resolve({ data: search });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('ComparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state and opens the ticker input from an open slot', async () => {
    mockGet();

    renderWithProviders(<ComparePage />, { route: '/compare' });

    expect(
      screen.getByRole('heading', { name: 'Cross-Company Benchmarking Matrix' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No securities selected for comparison' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(apiMocks.get).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Stock' })[0]);

    expect(
      screen.getByRole('textbox', { name: 'Search ticker for column 1' })
    ).toBeInTheDocument();
  });

  it('adds a ticker through search and renders its comparison', async () => {
    mockGet({ compare: { AAPL: aapl } });

    renderWithProviders(<ComparePage />, { route: '/compare' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Stock' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search ticker for column 1' }), {
      target: { value: 'AAP' },
    });

    const result = await screen.findByRole('button', { name: /AAPL/ }, { timeout: 3000 });
    expect(apiMocks.get).toHaveBeenCalledWith('/search?q=AAP');
    fireEvent.click(result);

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith('/compare?symbols=AAPL');
    });

    expect(await screen.findByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByText('Market Value (Market Cap)')).toBeInTheDocument();
    expect(screen.getByText('$3.00T')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Added AAPL to comparison');
  });

  it('renders profile, stats and financials rows for two mocked tickers', async () => {
    mockGet({ compare: { AAPL: aapl, MSFT: msft } });

    renderWithProviders(<ComparePage />, {
      route: '/compare?symbols=AAPL,MSFT',
    });

    expect(await screen.findByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'General Key Statistics' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Price Performance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income Statement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Balance Sheet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cash Flow' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Price Ratios / Valuation Multiples' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Margins' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Earnings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Equity Returns' })).toBeInTheDocument();

    expect(screen.getByText('$3.00T')).toBeInTheDocument();
    expect(screen.getByText('$2.80T')).toBeInTheDocument();
    expect(screen.getByText('$400.00B')).toBeInTheDocument();
    expect(screen.getByText('$300.00B')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const columnHeaders = table.querySelectorAll('th[scope="col"]');
    expect(columnHeaders).toHaveLength(5);
    expect(columnHeaders[1]).toHaveTextContent('AAPL');
    expect(columnHeaders[2]).toHaveTextContent('MSFT');
  });

  it('removes a ticker and updates the comparison table', async () => {
    mockGet({ compare: { AAPL: aapl, MSFT: msft } });

    renderWithProviders(<ComparePage />, {
      route: '/compare?symbols=AAPL,MSFT',
    });

    await screen.findByText('Apple Inc.');

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove AAPL from comparison' })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('columnheader', { name: 'AAPL' })
      ).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Microsoft Corporation')).toBeInTheDocument();
    expect(screen.queryByText('Apple Inc.')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Removed AAPL from comparison'
    );

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith('/compare?symbols=MSFT');
    });
  });

  it('keeps rendering when one ticker returns an error payload', async () => {
    const errored = {
      symbol: 'BAD',
      error: true,
      message: 'No data available',
    } as StockData;

    mockGet({ compare: { AAPL: aapl, BAD: errored } });

    renderWithProviders(<ComparePage />, {
      route: '/compare?symbols=AAPL,BAD',
    });

    expect(await screen.findByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income Statement' })).toBeInTheDocument();
    expect(screen.getByText('Overall Winner')).toBeInTheDocument();
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });
});

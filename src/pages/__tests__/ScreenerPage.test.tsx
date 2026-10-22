import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../test/utils';
import { ScreenerPage } from '../ScreenerPage';
import type {
  MarketMoverStock,
  MarketMoversResponse,
  ScreenerResponse,
  ScreenerStock,
  SectorStat,
} from '../screener/types';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

function makeStock(overrides: Partial<ScreenerStock> = {}): ScreenerStock {
  return {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    country: 'United States',
    price: 190.5,
    change_pct: 1.2,
    market_cap: 3_000_000_000_000,
    peTrailing: 28.45,
    peForward: 26.1,
    peg: 2.1,
    pb: 45.2,
    ps: 7.8,
    dividend: 0.55,
    roe: 147.9,
    roa: 28.3,
    debt_equity: 1.87,
    current_ratio: 1.04,
    rev_growth: 2.1,
    eps_growth: 5.4,
    gross_margin: 44.1,
    operating_margin: 29.8,
    net_margin: 24.5,
    fcf: 90_000_000_000,
    total_debt: 106_000_000_000,
    ...overrides,
  };
}

function makeMover(overrides: Partial<MarketMoverStock> = {}): MarketMoverStock {
  return {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    exchange: 'NASDAQ',
    price: 125.25,
    change_pct: 3.4,
    market_cap: 3_100_000_000_000,
    pe_ratio: 62.5,
    change_52w: 182.5,
    ...overrides,
  };
}

const SECTORS: SectorStat[] = [
  { name: 'Technology', proxy: 'XLK', performance: 1.25 },
  { name: 'Healthcare', proxy: 'XLV', performance: -0.42 },
];

interface ApiFixture {
  sectors?: SectorStat[];
  movers?: Partial<MarketMoversResponse>;
  screener?: Partial<ScreenerResponse>;
}

function setupApi({
  sectors = SECTORS,
  movers = {},
  screener = {},
}: ApiFixture = {}) {
  const moversResponse: MarketMoversResponse = {
    most_active: [makeMover()],
    trending: [],
    gainers: [],
    losers: [],
    highs_52w: [],
    lows_52w: [],
    ...movers,
  };
  const screenerResponse: ScreenerResponse = {
    results: [
      makeStock(),
      makeStock({ symbol: 'MSFT', name: 'Microsoft Corp', price: 430.25, change_pct: -0.35 }),
    ],
    total: 42,
    page: 1,
    totalPages: 3,
    ...screener,
  };

  apiMocks.get.mockImplementation((url: string) => {
    if (url === '/market/sectors') return Promise.resolve({ data: sectors });
    if (url === '/market/movers') return Promise.resolve({ data: moversResponse });
    if (url.startsWith('/screener?')) return Promise.resolve({ data: screenerResponse });
    return Promise.resolve({ data: [] });
  });
}

function screenerCalls(): string[] {
  return apiMocks.get.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/screener?'));
}

function latestScreenerParams(): URLSearchParams {
  const calls = screenerCalls();
  const lastUrl = calls[calls.length - 1];
  return new URL(lastUrl, 'http://localhost').searchParams;
}

function getResultsTable(): HTMLTableElement {
  const table = document.getElementById('interactive-data-table');
  if (!table) throw new Error('Results table not rendered');
  return table as HTMLTableElement;
}

async function waitForResults() {
  await waitFor(() => {
    expect(within(getResultsTable()).getByText('Apple Inc.')).toBeInTheDocument();
  });
}

describe('ScreenerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.post.mockResolvedValue({ data: {} });
    apiMocks.delete.mockResolvedValue({ data: {} });
  });

  it('renders the page shell and the resolved results table', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });

    expect(screen.getByText('Equities Stock Screener')).toBeInTheDocument();
    expect(screen.getByText('Market Sector Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Stock Activity')).toBeInTheDocument();

    await waitForResults();

    const resultsTable = getResultsTable();
    expect(within(resultsTable).getByText('AAPL')).toBeInTheDocument();
    expect(within(resultsTable).getByText('MSFT')).toBeInTheDocument();
    expect(within(resultsTable).getByText('Microsoft Corp')).toBeInTheDocument();
    expect(within(resultsTable).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 20 of 42 Equities');
  });

  it('shows loading skeletons while the requests are pending', () => {
    apiMocks.get.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithProviders(<ScreenerPage />, { route: '/' });

    expect(screen.getByText('Equities Stock Screener')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('No results found matching search parameters')).not.toBeInTheDocument();
  });

  it('serializes a numeric market-cap preset into the screener query string', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });
    await waitForResults();

    fireEvent.click(screen.getByRole('button', { name: /Mid Cap \(\$2B - \$10B\)/ }));

    await waitFor(() => {
      const params = latestScreenerParams();
      expect(params.get('minMcap')).toBe('2000');
      expect(params.get('maxMcap')).toBe('10000');
      expect(params.get('exchange')).toBe('ALL');
      expect(params.get('sector')).toBe('ALL');
      expect(params.get('sortBy')).toBe('market_cap');
      expect(params.get('sortOrder')).toBe('desc');
      expect(params.get('page')).toBe('1');
      expect(params.get('limit')).toBe('20');
    });
  });

  it('serializes a categorical sector selection from the filter builder', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });
    await waitForResults();

    fireEvent.click(screen.getByRole('button', { name: 'Sector' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Technology' }));

    await waitFor(() => {
      expect(latestScreenerParams().get('sector')).toBe('Technology');
    });
  });

  it('serializes a sector selection from the heatmap card toggles', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });
    await waitForResults();

    fireEvent.click(screen.getByRole('button', { name: /Technology\s*XLK/ }));

    await waitFor(() => {
      expect(latestScreenerParams().get('sector')).toBe('Technology');
    });

    fireEvent.click(screen.getByRole('button', { name: /Technology\s*XLK/ }));

    await waitFor(() => {
      expect(latestScreenerParams().get('sector')).toBe('ALL');
    });
  });

  it('renders the empty state and hides pagination when there are no matches', async () => {
    setupApi({ screener: { results: [], total: 0, totalPages: 1 } });

    renderWithProviders(<ScreenerPage />, { route: '/' });

    expect(
      await screen.findByText('No results found matching search parameters')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('toggles sorting and resets pagination when a result header is clicked', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });
    await waitForResults();

    fireEvent.click(
      within(getResultsTable()).getByRole('button', { name: /Sort by Market Cap/ })
    );

    await waitFor(() => {
      const params = latestScreenerParams();
      expect(params.get('sortBy')).toBe('market_cap');
      expect(params.get('sortOrder')).toBe('asc');
      expect(params.get('page')).toBe('1');
    });
  });

  it('requests the next page from the pagination controls', async () => {
    setupApi();

    renderWithProviders(<ScreenerPage />, { route: '/' });
    await waitForResults();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(latestScreenerParams().get('page')).toBe('2');
    });
  });
});

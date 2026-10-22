import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SearchBar } from '../components/SearchBar';
import { Table, type Column } from '../components/Table';
import { NotFound } from '../pages/NotFound';
import { WatchlistPage } from '../pages/WatchlistPage';
import { expectNoA11yViolations } from './a11y';
import { act, renderWithProviders, screen } from './utils';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

interface Row {
  id: number;
  symbol: string;
  price: number;
}

const columns: Column<Row>[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price', align: 'right', render: (row) => `$${row.price.toFixed(2)}` },
];

const rows: Row[] = [
  { id: 1, symbol: 'AAPL', price: 190.5 },
  { id: 2, symbol: 'MSFT', price: 420.25 },
];

interface WatchItem {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  change: number;
  change_pct: number;
}

interface IndexQuote {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
}

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Bomb(): never {
  throw new Error('kaboom');
}

describe('accessibility smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.post.mockResolvedValue({ data: {} });
    apiMocks.delete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SearchBar exposes accessible combobox semantics', async () => {
    const { container } = renderWithProviders(
      <main aria-label="Search">
        <SearchBar placeholder="Search tickers" />
      </main>,
      { route: '/' }
    );

    const combobox = screen.getByRole('combobox', { name: 'Search tickers' });
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');

    await expectNoA11yViolations(container);
  });

  it('Table exposes labeled column headers and data rows', async () => {
    const { container } = renderWithProviders(
      <main aria-label="Holdings">
        <Table columns={columns} data={rows} />
      </main>
    );

    expect(screen.getByRole('table', { name: 'Data table' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(3);

    await expectNoA11yViolations(container);
  });

  it('ErrorBoundary fallback is announced as an alert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = renderWithProviders(
      <main aria-label="Application">
        <ErrorBoundary name="Watchlist">
          <Bomb />
        </ErrorBoundary>
      </main>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });

  it('NotFound provides a named region and a focused page heading', async () => {
    const { container } = renderWithProviders(
      <main aria-label="Application">
        <NotFound />
      </main>,
      { route: '/missing' }
    );

    expect(screen.getByRole('region', { name: /signal not found/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /signal not found/i })).toHaveFocus();

    await expectNoA11yViolations(container);
  });

  it('WatchlistPage is accessible while loading and once populated', async () => {
    const watchlistRequest = createDeferred<{ data: WatchItem[] }>();
    const indicesRequest = createDeferred<{ data: IndexQuote[] }>();
    const newsRequest = createDeferred<{ data: NewsItem[] }>();

    apiMocks.get.mockImplementation((url: string) => {
      switch (url) {
        case '/watchlist':
          return watchlistRequest.promise;
        case '/market/indices':
          return indicesRequest.promise;
        case '/news/market':
          return newsRequest.promise;
        default:
          return Promise.resolve({ data: [] });
      }
    });

    const { container } = renderWithProviders(<WatchlistPage />, { route: '/' });

    expect(
      await screen.findByRole('heading', { name: /financial terminal/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Loading watchlist')).toBeInTheDocument();

    await expectNoA11yViolations(container);

    await act(async () => {
      watchlistRequest.resolve({
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            exchange: 'NASDAQ',
            price: 190.5,
            change: 1.2,
            change_pct: 0.63,
          },
        ],
      });
      indicesRequest.resolve({
        data: [
          {
            name: 'S&P 500',
            symbol: '^GSPC',
            price: 4500,
            change: 10,
            change_pct: 0.22,
          },
        ],
      });
      newsRequest.resolve({
        data: [
          {
            id: 'news-1',
            headline: 'Markets rally on earnings',
            source: 'Reuters',
            summary: 'Broad gains across sectors.',
            url: 'https://example.com/news-1',
            datetime: 1_700_000_000,
          },
        ],
      });
    });

    expect(await screen.findByRole('link', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('Markets rally on earnings')).toBeInTheDocument();

    await expectNoA11yViolations(container);
  });
});

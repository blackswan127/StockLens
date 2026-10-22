import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test/utils';
import { WatchlistPage } from '../WatchlistPage';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

const watchlist = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    price: 190.5,
    change: 1.2,
    change_pct: 0.63,
  },
];

function mockMarketFeed(watchlistData: typeof watchlist) {
  apiMocks.get.mockImplementation((url: string) => {
    switch (url) {
      case '/watchlist':
        return Promise.resolve({ data: watchlistData });
      case '/market/indices':
        return Promise.resolve({
          data: [
            { name: 'S&P 500', symbol: '^GSPC', price: 4500, change: 10, change_pct: 0.22 },
          ],
        });
      case '/news/market':
        return Promise.resolve({
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
      default:
        return Promise.resolve({ data: [] });
    }
  });
}

describe('WatchlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.post.mockResolvedValue({ data: {} });
    apiMocks.delete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows loading skeletons while the watchlist request is pending', () => {
    apiMocks.get.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithProviders(<WatchlistPage />, { route: '/' });

    expect(screen.getByText('Active Portfolio Watchlist')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('Watchlist is currently empty')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /AAPL/ })).not.toBeInTheDocument();
  });

  it('renders populated watchlist tickers once the queries resolve', async () => {
    mockMarketFeed(watchlist);

    renderWithProviders(<WatchlistPage />, { route: '/' });

    expect(await screen.findByRole('link', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('Markets rally on earnings')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh market indices/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Watchlist is currently empty')).not.toBeInTheDocument();
  });

  it('shows the empty state with seeding suggestions and adds a suggested stock', async () => {
    mockMarketFeed([]);

    renderWithProviders(<WatchlistPage />, { route: '/' });

    expect(await screen.findByText('Watchlist is currently empty')).toBeInTheDocument();
    expect(screen.getByText(/popular high-volume instruments/)).toBeInTheDocument();

    const suggestApple = screen.getByRole('button', { name: /add AAPL to watchlist/i });
    fireEvent.click(suggestApple);

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/watchlist/add', { symbol: 'AAPL' });
    });
  });

  it('removes a starred stock through the watchlist mutation', async () => {
    mockMarketFeed(watchlist);

    renderWithProviders(<WatchlistPage />, { route: '/' });

    const starButton = await screen.findByTitle('Remove from Watchlist');
    fireEvent.click(starButton);

    await waitFor(() => {
      expect(apiMocks.delete).toHaveBeenCalledWith('/watchlist/AAPL');
    });
  });

  it('sends the authorization bearer token on POST and DELETE when VITE_WATCHLIST_TOKEN is configured', async () => {
    vi.stubEnv('VITE_WATCHLIST_TOKEN', 'secret-test-token-456');

    // 1. Verify DELETE sends Authorization header
    mockMarketFeed(watchlist);
    const { unmount } = renderWithProviders(<WatchlistPage />, { route: '/' });

    const starButton = await screen.findByTitle('Remove from Watchlist');
    fireEvent.click(starButton);

    await waitFor(() => {
      expect(apiMocks.delete).toHaveBeenCalledWith('/watchlist/AAPL', {
        headers: { Authorization: 'Bearer secret-test-token-456' },
      });
    });

    unmount();

    // 2. Verify POST sends Authorization header
    mockMarketFeed([]);
    renderWithProviders(<WatchlistPage />, { route: '/' });

    const suggestApple = await screen.findByRole('button', { name: /add AAPL to watchlist/i });
    fireEvent.click(suggestApple);

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/watchlist/add',
        { symbol: 'AAPL' },
        { headers: { Authorization: 'Bearer secret-test-token-456' } }
      );
    });
  });
});

import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../../test/utils';
import { useLocation, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyPage } from '../index';

vi.mock('../OverviewTab.jsx', () => ({
  OverviewTab: () => <div>OVERVIEW_PANEL</div>,
}));

vi.mock('../AnalysisTab.jsx', () => ({
  AnalysisTab: () => <div>ANALYSIS_PANEL</div>,
}));

vi.mock('../InfoTab.jsx', () => ({
  InfoTab: () => <div>INFO_PANEL</div>,
}));

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

const edgarMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../../utils/apiClient.js', () => ({
  default: {
    get: apiMocks.get,
    post: apiMocks.post,
    delete: apiMocks.delete,
  },
  edgarApiClient: {
    get: edgarMocks.get,
  },
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
  ipo: '1980-12-12',
  description: 'Apple designs consumer electronics.',
};

const ratios = {
  symbol: 'AAPL',
  pe: '30.1',
  pb: '45.2',
  roe: '150.0%',
  roce: '55.0%',
  debt_equity: '1.2',
  eps: '6.1',
  market_cap: 3_000_000_000_000,
};

const edgarFinancials = {
  incomeStatement: [{ label: 'Total Revenue', values: { '2024': 383_285 } }],
};

const financialsData = {
  incomeStatement: [
    { year: 2024, revenue: 383_285, grossProfit: 180_000, netIncome: 97_000 },
    { year: 2023, revenue: 350_000, grossProfit: 165_000, netIncome: 90_000 },
  ],
};

function mockApi(options: { financials?: Promise<unknown> } = {}) {
  apiMocks.get.mockImplementation((url: string) => {
    switch (url) {
      case '/profile/AAPL':
        return Promise.resolve({ data: profile });
      case '/ratios/AAPL':
        return Promise.resolve({ data: ratios });
      case '/quote/AAPL':
        return Promise.resolve({
          data: { price: 190.5, change: 1.2, changePercent: 0.63 },
        });
      case '/peers/AAPL':
        return Promise.resolve({ data: [] });
      case '/news/AAPL':
        return Promise.resolve({ data: [] });
      case '/financials/AAPL':
        return options.financials ?? Promise.resolve({ data: financialsData });
      case '/shareholding/AAPL':
        return Promise.resolve({ data: null });
      case '/watchlist':
        return Promise.resolve({ data: [] });
      default:
        return Promise.resolve({ data: null });
    }
  });

  edgarMocks.get.mockImplementation((url: string) => {
    if (url.includes('/edgar/financials/')) return Promise.resolve({ data: edgarFinancials });
    if (url.includes('/edgar/insiders/')) return Promise.resolve({ data: { transactions: [] } });
    if (url.includes('/edgar/holdings/'))
      return Promise.resolve({
        data: {
          managerName: 'Berkshire Hathaway',
          portfolioDate: '2026-06-30',
          holdings: [],
        },
      });
    if (url.includes('/edgar/section/')) return Promise.resolve({ data: { title: '', paragraphs: [] } });
    if (url.includes('/edgar/risk-diff/')) return Promise.resolve({ data: { paragraphs: [] } });
    if (url.includes('/edgar/proxy/')) return Promise.resolve({ data: null });
    if (url.includes('/edgar/pay-vs-performance/'))
      return Promise.resolve({
        data: { available: false, concepts: [], symbol: 'AAPL', cik: '', sourceUrl: '' },
      });
    return Promise.resolve({ data: null });
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(route: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/company/:symbol" element={<CompanyPage />} />
      </Routes>
      <LocationProbe />
    </>,
    { route }
  );
}

describe('CompanyPage tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.post.mockResolvedValue({ data: {} });
    apiMocks.delete.mockResolvedValue({ data: {} });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ results: [] }) })
    );
    mockApi();
  });

  it('renders the SEC tab from a deep link', async () => {
    renderPage('/company/AAPL?tab=sec');

    const secTab = await screen.findByRole('tab', { name: /SEC Filings/ });

    expect(secTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('tab=sec');
    expect(await screen.findByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('OVERVIEW_PANEL')).toBeInTheDocument();
  });

  it('renders the Financials tab from a deep link', async () => {
    renderPage('/company/AAPL?tab=financials');

    const financialsTab = await screen.findByRole('tab', { name: /^Financials$/ });

    expect(financialsTab).toHaveAttribute('aria-selected', 'true');
    expect(financialsTab).toHaveAttribute('aria-controls', 'company-panel-financials');
    expect(screen.getByTestId('location')).toHaveTextContent('tab=financials');

    const panel = screen.getByRole('tabpanel', { name: 'Financials' });
    expect(panel).toHaveAttribute('id', 'company-panel-financials');
    expect(await within(panel).findByRole('rowheader', { name: 'Revenue' })).toBeInTheDocument();
    expect(within(panel).getByRole('columnheader', { name: '2024' })).toBeInTheDocument();
    expect(within(panel).getByRole('rowheader', { name: 'Gross Profit' })).toBeInTheDocument();
  });

  it('syncs a Financials tab click with the URL and shows the income statement', async () => {
    renderPage('/company/AAPL');

    const financialsTab = await screen.findByRole('tab', { name: /^Financials$/ });
    fireEvent.click(financialsTab);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=financials');
      expect(screen.getByRole('tab', { name: /^Financials$/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    const panel = screen.getByRole('tabpanel', { name: 'Financials' });
    expect(
      await within(panel).findByText('Financial Results & Accounting Statements')
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('rowheader', { name: 'Net Profit / Net Income' })
    ).toBeInTheDocument();
  });

  it('shows the financials loading state while statements are pending', async () => {
    let resolveFinancials!: (value: { data: typeof financialsData }) => void;
    const financialsPromise = new Promise<{ data: typeof financialsData }>((resolve) => {
      resolveFinancials = resolve;
    });
    mockApi({ financials: financialsPromise });

    renderPage('/company/AAPL?tab=financials');

    const financialsTab = await screen.findByRole('tab', { name: /^Financials$/ });
    expect(financialsTab).toHaveAttribute('aria-selected', 'true');

    expect(
      within(screen.getByRole('tabpanel', { name: 'Financials' })).getByRole('status')
    ).toHaveTextContent('Loading fundamental financial statements...');

    resolveFinancials({ data: financialsData });

    expect(
      await within(screen.getByRole('tabpanel', { name: 'Financials' })).findByRole('rowheader', {
        name: 'Revenue',
      })
    ).toBeInTheDocument();
  });

  it('syncs primary tab clicks with the URL', async () => {
    renderPage('/company/AAPL');

    const overviewTab = await screen.findByRole('tab', { name: /Overview/ });
    const analysisTab = screen.getByRole('tab', { name: /Valuation & DCF/ });
    const infoTab = screen.getByRole('tab', { name: /Company Info/ });

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('');

    fireEvent.click(analysisTab);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=analysis');
      expect(screen.getByRole('tab', { name: /Valuation & DCF/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.click(infoTab);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=info');
      expect(screen.getByRole('tab', { name: /Company Info/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  it('supports keyboard navigation between primary tabs', async () => {
    renderPage('/company/AAPL');

    const overviewTab = await screen.findByRole('tab', { name: /Overview/ });
    overviewTab.focus();

    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=analysis');
      expect(screen.getByRole('tab', { name: /Valuation & DCF/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: /Valuation & DCF/ }), { key: 'End' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /SEC Filings/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: /SEC Filings/ }), { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=financials');
      expect(screen.getByRole('tab', { name: /^Financials$/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: /^Financials$/ }), { key: 'Home' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: /Overview/ }), { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /SEC Filings/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  it('drives SEC sub-tabs through the URL and clears them on primary tab change', async () => {
    renderPage('/company/AAPL?tab=sec&sub=holdings');

    expect((await screen.findAllByText('Berkshire Hathaway')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('location')).toHaveTextContent('tab=sec&sub=holdings');

    fireEvent.click(screen.getByRole('button', { name: /Insider Activities/ }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('tab=sec&sub=insiders');
    });
    expect(screen.getByText('Recent Form 4 Insider Filings (AAPL)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Company Info/ }));

    await waitFor(() => {
      const search = screen.getByTestId('location').textContent ?? '';
      expect(search).toContain('tab=info');
      expect(search).not.toContain('sub=');
    });
  });
});

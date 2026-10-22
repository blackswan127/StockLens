import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompanyData } from '../hooks/useCompanyData';
import type {
  CompanyFinancials,
  CompanyProfile,
  CompanyQuote,
  CompanyShareholding,
  EdgarFinancials,
  EdgarHoldings,
  EdgarInsiders,
  EdgarPayVersusPerformance,
  EdgarProxyData,
  EdgarRiskDiff,
  EdgarSection,
  Peer,
  Ratios,
} from '../types';

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

const profile: CompanyProfile = {
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

const ratios: Ratios = {
  symbol: 'AAPL',
  pe: '30.1',
  pb: '45.2',
  roe: '150.0%',
  roce: '55.0%',
  debt_equity: '1.2',
  eps: '6.1',
  market_cap: 3_000_000_000_000,
  dividend_yield: '0.5%',
};

const peers: Peer[] = [
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 420,
    mcap: 3_100_000_000_000,
    pe: 35,
    pb: 12,
    roe: '40%',
    exchange: 'NASDAQ',
  },
];

const quote: CompanyQuote = {
  price: 190.5,
  change: 1.2,
  changePercent: 0.63,
  updated_at: '2026-10-21T12:00:00.000Z',
};

const financials: CompanyFinancials = {
  incomeStatement: [{ year: 2024, revenue: 383_285, grossProfit: 180_683, netIncome: 97_000 }],
  balanceSheet: [{ year: 2024, assets: 350_000, liabilities: 250_000, equity: 100_000 }],
  cashFlow: [{ year: 2024, operating: 110_000, investing: -10_000, financing: -20_000 }],
};

const shareholding: CompanyShareholding = {
  majorHolders: {
    insidersPercentHeld: 0.05,
    institutionsPercentHeld: 0.6,
    institutionsFloatPercentHeld: 0.63,
    institutionsCount: 5000,
  },
  institutionalHolders: [
    { organization: 'Vanguard Group', position: 1_000_000, value: 190_000_000, pctHeld: 0.08 },
  ],
};

const edgarFinancials: EdgarFinancials = {
  incomeStatement: [
    {
      label: 'Total Revenue',
      values: { '2024': 383_285, '2023': 383_100 },
    },
  ],
};

const edgarInsiders: EdgarInsiders = {
  transactions: [
    {
      name: 'Jane Doe',
      relationship: 'SVP',
      date: '2026-01-15',
      action: 'Sell',
      code: 'S',
      shares: 1000,
      price: 190.5,
      value: 190_500,
      secLink: 'https://sec.gov/example',
    },
  ],
};

const edgarHoldings: EdgarHoldings = {
  managerName: 'Berkshire Hathaway',
  portfolioDate: '2026-06-30',
  holdings: [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      value: 12_000_000,
      shares: 60_000,
      option: null,
      qoqChange: 'New',
    },
  ],
};

const edgarSection: EdgarSection = {
  title: 'Item 1. Business',
  paragraphs: ['Apple designs and sells consumer electronics.'],
};

const edgarRiskDiff: EdgarRiskDiff = {
  paragraphs: [{ text: 'A new risk factor.', status: 'added' }],
};

const edgarProxy: EdgarProxyData = {
  symbol: 'AAPL',
  filedDate: '2026-01-10',
  periodOfReport: '2025',
  secUrl: 'https://sec.gov/proxy',
  annualMeeting: {
    meetingDate: '2026-02-25',
    recordDate: '2026-01-05',
    meetingType: 'virtual',
    location: null,
  },
  executiveCompensation: [
    {
      year: '2025',
      executives: [
        {
          name: 'Alice Executive',
          title: 'CEO',
          salary: 1_000_000,
          bonus: 0,
          stockAwards: 5_000_000,
          optionAwards: 0,
          nonEquityIncentive: 2_000_000,
          otherCompensation: 10_000,
          total: 8_010_000,
        },
      ],
    },
  ],
  boardOfDirectors: { directors: [] },
  auditFees: [],
  shareholderProposals: [],
};

const edgarPayVersusPerformance: EdgarPayVersusPerformance = {
  symbol: 'AAPL',
  cik: '0000320193',
  available: true,
  concepts: [
    {
      tag: 'ecd:PeoTotalCompAmt',
      label: 'PEO Total Comp',
      unit: 'USD',
      values: [
        {
          fy: 2025,
          fp: 'FY',
          end: '2025-09-30',
          start: '2024-10-01',
          val: 8_010_000,
          accn: '0000320193-26-000010',
          form: 'DEF 14A',
        },
      ],
    },
  ],
  sourceUrl: 'https://sec.gov/pvp',
};

function mockSuccess() {
  apiMocks.get.mockImplementation((url: string) => {
    switch (url) {
      case '/profile/AAPL':
        return Promise.resolve({ data: profile });
      case '/ratios/AAPL':
        return Promise.resolve({ data: ratios });
      case '/news/AAPL':
        return Promise.resolve({ data: [] });
      case '/peers/AAPL':
        return Promise.resolve({ data: peers });
      case '/quote/AAPL':
        return Promise.resolve({ data: quote });
      case '/financials/AAPL':
        return Promise.resolve({ data: financials });
      case '/shareholding/AAPL':
        return Promise.resolve({ data: shareholding });
      case '/watchlist':
        return Promise.resolve({ data: [{ symbol: 'AAPL' }] });
      default:
        return Promise.resolve({ data: null });
    }
  });

  edgarMocks.get.mockImplementation((url: string) => {
    if (url.includes('/edgar/financials/')) return Promise.resolve({ data: edgarFinancials });
    if (url.includes('/edgar/insiders/')) return Promise.resolve({ data: edgarInsiders });
    if (url.includes('/edgar/holdings/')) return Promise.resolve({ data: edgarHoldings });
    if (url.includes('/edgar/section/')) return Promise.resolve({ data: edgarSection });
    if (url.includes('/edgar/risk-diff/')) return Promise.resolve({ data: edgarRiskDiff });
    if (url.includes('/edgar/proxy/')) return Promise.resolve({ data: edgarProxy });
    if (url.includes('/edgar/pay-vs-performance/'))
      return Promise.resolve({ data: edgarPayVersusPerformance });
    return Promise.resolve({ data: null });
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const hookProps = {
  upperSymbol: 'AAPL',
  secComparePeer: '',
  holdingsQuery: '0001067983',
  showRiskDiff: false,
};

describe('useCompanyData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.post.mockResolvedValue({ data: {} });
    apiMocks.delete.mockResolvedValue({ data: {} });
  });

  it('exposes pending section state while requests are in flight', () => {
    apiMocks.get.mockReturnValue(new Promise(() => {}));
    edgarMocks.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCompanyData(hookProps), {
      wrapper: createWrapper(),
    });

    expect(result.current.isProfilePending).toBe(true);
    expect(result.current.isFinancialsPending).toBe(true);
    expect(result.current.isCompanyNewsPending).toBe(true);
    expect(result.current.peers).toBeUndefined();
    expect(result.current.quote).toBeUndefined();
    expect(result.current.sec.financials.isPending).toBe(true);
    expect(result.current.sec.insiders.isPending).toBe(true);
    expect(result.current.sec.holdings.isPending).toBe(true);
    expect(result.current.sec.section1.isPending).toBe(true);
    expect(result.current.sec.proxy.isPending).toBe(true);
    expect(result.current.sec.payVersusPerformance.isPending).toBe(true);
  });

  it('composes core and SEC data into a typed facade', async () => {
    mockSuccess();

    const { result } = renderHook(() => useCompanyData(hookProps), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.profile).toEqual(profile);
      expect(result.current.sec.proxy.data).toEqual(edgarProxy);
    });

    expect(result.current.ratios).toEqual(ratios);
    expect(result.current.companyNews).toEqual([]);
    expect(result.current.peers).toEqual(peers);
    expect(result.current.quote).toEqual(quote);
    expect(result.current.financials).toEqual(financials);
    expect(result.current.shareholding).toEqual(shareholding);
    expect(result.current.isUSStock).toBe(true);
    expect(result.current.isStarred).toBe(true);
    expect(result.current.sec.financials.data).toEqual(edgarFinancials);
    expect(result.current.sec.insiders.data).toEqual(edgarInsiders);
    expect(result.current.sec.holdings.data).toEqual(edgarHoldings);
    expect(result.current.sec.section1.data).toEqual(edgarSection);
    expect(result.current.sec.payVersusPerformance.data).toEqual(edgarPayVersusPerformance);
    expect(result.current.sec.financials.isPending).toBe(false);
    expect(result.current.sec.financials.isError).toBe(false);
  });

  it('surfaces errors per section without throwing', async () => {
    const notFound = { response: { status: 404 } };

    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/profile/AAPL') return Promise.reject(notFound);
      if (url === '/financials/AAPL') return Promise.reject(notFound);
      return Promise.resolve({ data: [] });
    });

    edgarMocks.get.mockImplementation((url: string) => {
      if (url.includes('/edgar/financials/')) return Promise.reject(notFound);
      if (url.includes('/edgar/proxy/')) return Promise.reject(notFound);
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useCompanyData(hookProps), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.profileErr).toBeTruthy();
      expect(result.current.financialsErr).toBeTruthy();
      expect(result.current.sec.financials.isError).toBe(true);
      expect(result.current.sec.proxy.isError).toBe(true);
    });

    expect(result.current.profile).toBeUndefined();
    expect(result.current.financials).toBeUndefined();
    expect(result.current.sec.financials.isPending).toBe(false);
  });
});

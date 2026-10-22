import { useState } from 'react';
import { fireEvent, renderWithProviders, screen } from '../../../test/utils';
import { describe, expect, it, vi } from 'vitest';
import { SECTab } from '../SECTab';
import { SECProvider } from '../SECContext';
import { FilingsPanel } from '../SEC/FilingsPanel';
import { InsidersPanel } from '../SEC/InsidersPanel';
import { HoldingsPanel } from '../SEC/HoldingsPanel';
import { ProxyPanels } from '../SEC/ProxyPanels';
import type {
  CompanySecData,
  EdgarFinancials,
  EdgarHoldings,
  EdgarInsiders,
  EdgarPayVersusPerformance,
  EdgarProxyData,
  Peer,
  QuerySection,
  SecSubTab,
} from '../types';

function section<T>(data: T | undefined, isPending = false, isError = false): QuerySection<T> {
  return { data, isPending, isError };
}

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

const proxyData: EdgarProxyData = {
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

const pvpData: EdgarPayVersusPerformance = {
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

const populatedData: CompanySecData = {
  financials: section({
    incomeStatement: [{ label: 'Total Revenue', values: { '2024': 383_285 } }],
    balanceSheet: [{ label: 'Total Assets', values: { '2024': 350_000 } }],
    cashFlow: [{ label: 'Operating Cash Flow', values: { '2024': 110_000 } }],
  }),
  compareFinancials: section<EdgarFinancials>(undefined),
  insiders: section({
    transactions: [
      {
        name: 'Jane Doe',
        relationship: 'SVP',
        date: '2026-01-15',
        action: 'Sell',
        code: 'S',
        shares: 1_000,
        price: 190.5,
        value: 190_500,
        secLink: 'https://sec.gov/example',
      },
    ],
  }),
  holdings: section({
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
  }),
  section1: section({ title: 'Item 1. Business', paragraphs: ['Apple business overview.'] }),
  section1A: section({ title: 'Item 1A. Risk Factors', paragraphs: ['Apple risk overview.'] }),
  section7: section({ title: 'Item 7. MD&A', paragraphs: ['Apple MD&A overview.'] }),
  riskDiff: section({ paragraphs: [{ text: 'A new risk factor.', status: 'added' }] }),
  proxy: section(proxyData),
  payVersusPerformance: section(pvpData),
};

const emptyData: CompanySecData = {
  financials: section<EdgarFinancials>(undefined),
  compareFinancials: section<EdgarFinancials>(undefined),
  insiders: section<EdgarInsiders>(undefined),
  holdings: section({ managerName: '', portfolioDate: '', holdings: [] }),
  section1: section({ title: '', paragraphs: [] }),
  section1A: section({ title: '', paragraphs: [] }),
  section7: section({ title: '', paragraphs: [] }),
  riskDiff: section({ paragraphs: [] }),
  proxy: section<EdgarProxyData>(undefined),
  payVersusPerformance: section({ ...pvpData, available: false, concepts: [] }),
};

function Harness({
  data,
  initialSubTab = 'standardized',
}: {
  data: CompanySecData;
  initialSubTab?: SecSubTab;
}) {
  const [subTab, setSubTab] = useState<SecSubTab>(initialSubTab);
  const [comparePeer, setComparePeer] = useState('');
  const [statement, setStatement] = useState<'income' | 'balance' | 'cash'>('income');
  const [holdingsQuery, setHoldingsQuery] = useState('0001067983');
  const [holdingsSearchInput, setHoldingsSearchInput] = useState('');
  const [tenKTab, setTenKTab] = useState<'business' | 'risk' | 'mda'>('business');
  const [showRiskDiff, setShowRiskDiff] = useState(false);

  return (
    <SECProvider
      value={{
        upperSymbol: 'AAPL',
        peers,
        controls: {
          subTab,
          setSubTab,
          comparePeer,
          setComparePeer,
          statement,
          setStatement,
          holdingsQuery,
          setHoldingsQuery,
          holdingsSearchInput,
          setHoldingsSearchInput,
          tenKTab,
          setTenKTab,
          showRiskDiff,
          setShowRiskDiff,
        },
        data,
      }}
    >
      <SECTab />
    </SECProvider>
  );
}

describe('SECTab', () => {
  it('renders populated standardized, insiders, holdings and proxy panels', async () => {
    renderWithProviders(<Harness data={populatedData} />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$383,285M')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Insider Activities/ }));
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Sell (S)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Institutional Holdings/ }));
    expect((await screen.findAllByText('Berkshire Hathaway')).length).toBeGreaterThan(0);
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Proxy Statement/ }));
    expect(await screen.findByText('Annual Meeting & Proxy Statement Details')).toBeInTheDocument();
    expect(screen.getByText('Alice Executive')).toBeInTheDocument();
    expect(screen.getByText('PEO Total Comp')).toBeInTheDocument();
  });

  it('renders empty states for standardized, insiders, holdings and proxy panels', async () => {
    renderWithProviders(<Harness data={emptyData} />);

    expect(screen.getByText('No standardized statement data returned.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Insider Activities/ }));
    expect(await screen.findByText('No insider transactions found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Institutional Holdings/ }));
    expect(await screen.findByText('No portfolio assets returned.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Proxy Statement/ }));
    expect(await screen.findByText('Proxy Statement Unavailable')).toBeInTheDocument();
    expect(screen.getByText('No structured PvP disclosure available')).toBeInTheDocument();
  });

  it('opens the sub-tab requested by the URL state', async () => {
    renderWithProviders(<Harness data={populatedData} initialSubTab="insiders" />);

    expect(screen.getByText('Recent Form 4 Insider Filings (AAPL)')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});

describe('FilingsPanel', () => {
  const props = {
    financials: populatedData.financials,
    compareFinancials: populatedData.compareFinancials,
    peers,
    upperSymbol: 'AAPL',
    statement: 'income' as const,
    onStatementChange: vi.fn(),
    comparePeer: '',
    onComparePeerChange: vi.fn(),
  };

  it('renders the populated standardized statement', () => {
    renderWithProviders(<FilingsPanel {...props} />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$383,285M')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'MSFT - Microsoft Corp.' })
    ).toBeInTheDocument();
  });

  it('renders the empty state without statement data', () => {
    renderWithProviders(
      <FilingsPanel {...props} financials={section<EdgarFinancials>(undefined)} />
    );

    expect(screen.getByText('No standardized statement data returned.')).toBeInTheDocument();
  });
});

describe('InsidersPanel', () => {
  it('renders populated Form 4 transactions', () => {
    renderWithProviders(
      <InsidersPanel insiders={populatedData.insiders} upperSymbol="AAPL" />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Sell (S)')).toBeInTheDocument();
    expect(screen.getByTitle('View SEC Source Form 4')).toHaveAttribute(
      'href',
      'https://sec.gov/example'
    );
  });

  it('renders the empty state without transactions', () => {
    renderWithProviders(
      <InsidersPanel insiders={section<EdgarInsiders>(undefined)} upperSymbol="AAPL" />
    );

    expect(screen.getByText('No insider transactions found.')).toBeInTheDocument();
  });
});

describe('HoldingsPanel', () => {
  const props = {
    holdings: populatedData.holdings,
    holdingsQuery: '0001067983',
    onHoldingsQueryChange: vi.fn(),
    holdingsSearchInput: '',
    onHoldingsSearchInputChange: vi.fn(),
  };

  it('renders a populated 13F portfolio', () => {
    renderWithProviders(<HoldingsPanel {...props} />);

    expect(screen.getAllByText('Berkshire Hathaway').length).toBeGreaterThan(0);
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('renders the empty state when no holdings report is loaded', () => {
    renderWithProviders(
      <HoldingsPanel {...props} holdings={section<EdgarHoldings>(undefined)} />
    );

    expect(screen.getByText('No holdings report loaded.')).toBeInTheDocument();
  });
});

describe('ProxyPanels', () => {
  it('renders populated proxy and pay-versus-performance data', () => {
    renderWithProviders(
      <ProxyPanels
        proxy={populatedData.proxy}
        payVersusPerformance={populatedData.payVersusPerformance}
        upperSymbol="AAPL"
      />
    );

    expect(
      screen.getByText('Annual Meeting & Proxy Statement Details')
    ).toBeInTheDocument();
    expect(screen.getByText('Alice Executive')).toBeInTheDocument();
    expect(screen.getByText('PEO Total Comp')).toBeInTheDocument();
  });

  it('renders the empty states when proxy data is unavailable', () => {
    renderWithProviders(
      <ProxyPanels
        proxy={section<EdgarProxyData>(undefined)}
        payVersusPerformance={section({ ...pvpData, available: false, concepts: [] })}
        upperSymbol="AAPL"
      />
    );

    expect(screen.getByText('Proxy Statement Unavailable')).toBeInTheDocument();
    expect(screen.getByText('No structured PvP disclosure available')).toBeInTheDocument();
  });
});

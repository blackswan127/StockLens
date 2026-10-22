import { beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { fireEvent, renderWithProviders, screen } from '../../test/utils';
import { Ticker } from '../Ticker';
import { StockCard } from '../StockCard';
import { CardSkeleton, CompanyPageSkeleton } from '../Skeleton';
import { ExpandedChartModal } from '../macro/ExpandedChartModal';
import { TimeRangeTabs } from '../macro/TimeRangeTabs';
import { Table, type Column } from '../Table';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

describe('Ticker accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.get.mockResolvedValue({
      data: [
        { name: 'S&P 500', symbol: '^GSPC', price: 4500, change: 10, change_pct: 0.22 },
        { name: 'NASDAQ', symbol: '^IXIC', price: null, change: null, change_pct: null },
      ],
    });
  });

  it('names the region and the icon-only refresh control', async () => {
    renderWithProviders(<Ticker />);

    expect(screen.getByRole('region', { name: /global market indices/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh market indices/i })
    ).toBeInTheDocument();
    expect(await screen.findByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});

describe('StockCard accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels the add-to-watchlist icon button with the ticker', () => {
    renderWithProviders(
      <StockCard symbol="AAPL" name="Apple Inc." exchange="NASDAQ" price={190.5} />,
      { route: '/' }
    );

    expect(
      screen.getByRole('button', { name: /add AAPL to watchlist/i })
    ).toBeInTheDocument();
  });

  it('labels the remove-from-watchlist icon button with the ticker', () => {
    renderWithProviders(
      <StockCard
        symbol="AAPL"
        name="Apple Inc."
        exchange="NASDAQ"
        price={190.5}
        isStarred
      />,
      { route: '/' }
    );

    expect(
      screen.getByRole('button', { name: /remove AAPL from watchlist/i })
    ).toBeInTheDocument();
  });
});

describe('Skeleton accessibility', () => {
  it('hides individual shimmer blocks and announces page-level loading once', () => {
    const { container } = renderWithProviders(<CardSkeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');

    renderWithProviders(<CompanyPageSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading company profile')).toBeInTheDocument();
  });
});

describe('Macro chart accessibility', () => {
  const observations = [
    { date: '2024-01-01', value: 310 },
    { date: '2024-02-01', value: 314.5 },
  ];

  it('exposes the expanded chart as a labeled dialog and image', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ExpandedChartModal
        isOpen
        onClose={onClose}
        title="CPI"
        currentValue="314.50"
        observations={observations}
        interpretation="Consumer price index"
      />
    );

    expect(screen.getByRole('dialog', { name: 'CPI' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /CPI chart\. Latest value 314\.50/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close modal/i })).toHaveFocus();
  });

  it('closes the dialog on Escape', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ExpandedChartModal
        isOpen
        onClose={onClose}
        title="CPI"
        currentValue="314.50"
        observations={observations}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard focus inside the dialog', () => {
    renderWithProviders(
      <ExpandedChartModal
        isOpen
        onClose={() => {}}
        title="CPI"
        currentValue="314.50"
        observations={observations}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    const lastRange = screen.getByRole('button', { name: 'Max' });
    lastRange.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('exposes time range buttons as pressed toggles within a named group', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TimeRangeTabs
        ranges={['1M', '1Y']}
        activeRange="1Y"
        onChange={onChange}
        label="CPI time range"
      />
    );

    expect(screen.getByRole('group', { name: 'CPI time range' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '1M' }));
    expect(onChange).toHaveBeenCalledWith('1M');
  });
});

interface TestRow {
  id: number;
  symbol: string;
  price: number;
}

const auditColumns: Column<TestRow>[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price', align: 'right', render: (row) => `$${row.price.toFixed(2)}` },
];

const auditRows: TestRow[] = [
  { id: 1, symbol: 'AAPL', price: 190.5 },
  { id: 2, symbol: 'MSFT', price: 420.25 },
];

describe('Automated axe-core accessibility audit', () => {
  it('verifies rendered modal and table components have 0 severe or critical a11y violations', async () => {
    // 1. Audit rendered modal component
    const modalObservations = [
      { date: '2024-01-01', value: 310 },
      { date: '2024-02-01', value: 314.5 },
    ];

    const { container: modalContainer } = renderWithProviders(
      <ExpandedChartModal
        isOpen
        onClose={vi.fn()}
        title="CPI"
        currentValue="314.50"
        observations={modalObservations}
        interpretation="Consumer price index"
      />
    );

    const modalResults = await axe.run(modalContainer, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const modalSevereOrCritical = modalResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(modalSevereOrCritical).toHaveLength(0);
    expect(modalResults.violations).toHaveLength(0);

    // 2. Audit rendered table component
    const { container: tableContainer } = renderWithProviders(
      <main aria-label="Interactive Holdings">
        <Table columns={auditColumns} data={auditRows} />
      </main>
    );

    const tableResults = await axe.run(tableContainer, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const tableSevereOrCritical = tableResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(tableSevereOrCritical).toHaveLength(0);
    expect(tableResults.violations).toHaveLength(0);
  });
});

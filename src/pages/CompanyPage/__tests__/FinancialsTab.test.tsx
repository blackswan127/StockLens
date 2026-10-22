import { describe, expect, it } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../../../test/utils';
import { FinancialsTab } from '../FinancialsTab';

const baseProps = {
  symbol: 'AAPL',
  currencySuffixLabel: '$',
};

const incomeStatement = [
  {
    year: 2024,
    revenue: 1_000_000,
    grossProfit: 400_000,
    netIncome: 200_000,
  },
  {
    year: 2023,
    revenue: 800_000,
    grossProfit: 320_000,
    netIncome: 150_000,
  },
];

describe('FinancialsTab', () => {
  it('renders the loading state while statements are pending', () => {
    renderWithProviders(
      <FinancialsTab {...baseProps} financials={undefined} isFinancialsPending financialsErr={null} />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading fundamental financial statements...'
    );
  });

  it('renders the error state when the request fails', () => {
    renderWithProviders(
      <FinancialsTab
        {...baseProps}
        financials={undefined}
        isFinancialsPending={false}
        financialsErr={new Error('boom')}
      />
    );

    expect(screen.getByText('Failed to load financial statement data.')).toBeInTheDocument();
  });

  it('renders the empty state when no annual statements are available', () => {
    renderWithProviders(
      <FinancialsTab
        {...baseProps}
        financials={{ incomeStatement: [] }}
        isFinancialsPending={false}
        financialsErr={null}
      />
    );

    expect(
      screen.getByText('Annual financial statement data unavailable for this company')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders populated annual rows and switches to quarterly rows', () => {
    renderWithProviders(
      <FinancialsTab
        {...baseProps}
        financials={{
          incomeStatement,
          quarterly: [
            { quarter: 'Q4 2024', revenue: 260_000, netIncome: 55_000, eps: 1.84 },
            { quarter: 'Q3 2024', revenue: 240_000, netIncome: 50_000, eps: 1.71 },
          ],
        }}
        isFinancialsPending={false}
        financialsErr={null}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Particulars' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2023' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Gross Profit' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: (1_000_000).toLocaleString() })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quarterly Results' }));

    expect(screen.getByRole('columnheader', { name: 'Q4 2024' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Adjusted EPS' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1.84' })).toBeInTheDocument();
  });

  it('shows the quarterly empty state for a symbol without quarterly data', () => {
    renderWithProviders(
      <FinancialsTab
        {...baseProps}
        financials={{ incomeStatement }}
        isFinancialsPending={false}
        financialsErr={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quarterly Results' }));

    expect(
      screen.getByText('Quarterly data unavailable for this company')
    ).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../../../test/utils';
import { formatMarketCap, formatPrice } from '../../../utils/formatters';
import { OverviewTab } from '../OverviewTab';

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
  pe: '18.00',
  pb: '12.00',
  roe: '22.50%',
  roce: '30.00%',
  debt_equity: '0.40',
  eps: '6.13',
  market_cap: 2_500_000_000_000,
  dividend_yield: '0.45%',
  enterprise_value: 2_600_000_000_000,
  shares_outstanding: 15_000_000_000,
  book_value: 4.2,
  total_cash: 60_000_000_000,
  total_debt: 100_000_000_000,
  sales_growth: '+8.10%',
  profit_growth: '+11.20%',
};

const quote = {
  high: 192.5,
  low: 188.1,
  high_52w: 220.2,
  low_52w: 164.1,
};

const shareholding = {
  majorHolders: {
    insidersPercentHeld: 0.0712,
    institutionsPercentHeld: 0.6123,
    institutionsFloatPercentHeld: 0.6011,
    institutionsCount: 5123,
  },
  institutionalHolders: [
    {
      organization: 'Vanguard Group Inc',
      cusip: '037833100',
      position: 1_300_000_000,
      reportDate: '2024-09-30',
      pctHeld: 0.084,
      value: 250_000_000_000,
    },
  ],
};

describe('OverviewTab', () => {
  it('renders price extremes, fundamental stats, and the FinStar scorecard', () => {
    renderWithProviders(
      <OverviewTab
        detailData={null}
        profile={profile}
        ratios={ratios}
        quote={quote}
        handleScrollToSection={() => {}}
        shareholding={shareholding}
        isShareholdingPending={false}
      />
    );

    expect(screen.getByText('Price Range Extremes')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(quote.high, profile.exchange))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(quote.low_52w, profile.exchange))).toBeInTheDocument();

    expect(screen.getByText('Company Fundamental Essentials')).toBeInTheDocument();
    expect(
      screen.getByText(formatMarketCap(ratios.market_cap, profile.exchange))
    ).toBeInTheDocument();
    expect(screen.getByText('MARKET CAP')).toBeInTheDocument();
    expect(screen.getByText('FinStar Quantitative Scorecard')).toBeInTheDocument();
    expect(screen.getByText('Composite Score: 4 / 5')).toBeInTheDocument();
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('renders shareholding disclosures with scoped table headers', () => {
    renderWithProviders(
      <OverviewTab
        detailData={null}
        profile={profile}
        ratios={ratios}
        quote={quote}
        handleScrollToSection={() => {}}
        shareholding={shareholding}
        isShareholdingPending={false}
      />
    );

    expect(screen.getByText('Shareholding Structure & Institutional Claims')).toBeInTheDocument();
    expect(screen.getByText('Major Holders Split')).toBeInTheDocument();
    expect(screen.getByText('Top Institutional 13F Holders')).toBeInTheDocument();
    expect(screen.getByText('Vanguard Group Inc')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Institution' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Reported Date' })).toBeInTheDocument();
    expect(screen.getByText('7.12%')).toBeInTheDocument();
  });

  it('renders the shareholding pending state', () => {
    renderWithProviders(
      <OverviewTab
        detailData={null}
        profile={profile}
        ratios={ratios}
        quote={quote}
        handleScrollToSection={() => {}}
        shareholding={null}
        isShareholdingPending
      />
    );

    expect(
      screen.getByText('Syncing shareholding pattern disclosures...')
    ).toBeInTheDocument();
    expect(screen.queryByText('Major Holders Split')).not.toBeInTheDocument();
  });

  it('falls back to unavailable states when ratios and holdings are missing', () => {
    renderWithProviders(
      <OverviewTab
        detailData={null}
        profile={profile}
        ratios={undefined}
        quote={undefined}
        handleScrollToSection={() => {}}
        shareholding={null}
        isShareholdingPending={false}
      />
    );

    expect(screen.getByText('Rating data unavailable for this company')).toBeInTheDocument();
    expect(
      screen.getByText('Shareholding pattern data unavailable for this company')
    ).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

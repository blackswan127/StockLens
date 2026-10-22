import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../../../test/utils';
import { InfoTab } from '../InfoTab';

describe('InfoTab', () => {
  it('renders newsletter skeletons while pending', () => {
    const { container } = renderWithProviders(
      <InfoTab detailData={null} companyNews={undefined} isCompanyNewsPending />
    );

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
    expect(
      screen.queryByText('No corporate news bulletins available at this time.')
    ).not.toBeInTheDocument();
  });

  it('renders the empty bulletin state', () => {
    renderWithProviders(
      <InfoTab detailData={null} companyNews={[]} isCompanyNewsPending={false} />
    );

    expect(
      screen.getByText('No corporate news bulletins available at this time.')
    ).toBeInTheDocument();
  });

  it('renders bulletins with external links and metadata', () => {
    renderWithProviders(
      <InfoTab
        detailData={null}
        isCompanyNewsPending={false}
        companyNews={[
          {
            id: 'news-1',
            datetime: 1_700_000_000,
            source: 'Reuters',
            headline: 'Apple beats quarterly estimates',
            summary: 'Services revenue drove the beat.',
            url: 'https://example.com/apple',
          },
          {
            id: 'news-2',
            datetime: 1_700_100_000,
            source: 'Bloomberg',
            headline: 'Analysts raise targets',
            summary: 'Street sees further upside.',
            url: '#',
          },
        ]}
      />
    );

    expect(
      screen.getByRole('link', { name: 'Apple beats quarterly estimates' })
    ).toHaveAttribute('href', 'https://example.com/apple');
    expect(screen.getByText('Analysts raise targets')).toBeInTheDocument();
    expect(screen.getByText(/Reuters/)).toBeInTheDocument();
    expect(screen.getAllByText(/Continue Reading/)).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: 'Analysts raise targets' })
    ).not.toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderWithProviders, screen } from '../../test/utils';
import { SearchBar } from '../SearchBar';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../utils/apiClient.js', () => ({
  default: apiMocks,
  edgarApiClient: { get: vi.fn() },
}));

const searchResults = [
  {
    symbol: 'AAPL',
    description: 'Apple Inc.',
    displaySymbol: 'AAPL',
    type: 'Equity',
    exchange: 'NASDAQ',
    country: 'US',
    isLocal: false,
  },
];

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMocks.get.mockReset();
    apiMocks.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the search input with the provided placeholder and combobox semantics', () => {
    renderWithProviders(<SearchBar placeholder="Search tickers" />, { route: '/' });

    const input = screen.getByRole('combobox', { name: 'Search tickers' });
    expect(input).toHaveAttribute('placeholder', 'Search tickers');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('triggers the debounced search once after 280ms', async () => {
    renderWithProviders(<SearchBar />, { route: '/' });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'AAPL' } });

    expect(apiMocks.get).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(279);
    });
    expect(apiMocks.get).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(apiMocks.get).toHaveBeenCalledTimes(1);
    expect(apiMocks.get).toHaveBeenCalledWith('/search?q=AAPL');
  });

  it('cancels the pending search when the input is cleared', async () => {
    renderWithProviders(<SearchBar />, { route: '/' });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'NVDA' } });
    fireEvent.change(input, { target: { value: '' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(apiMocks.get).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('exposes an expanded listbox with option roles once results arrive', async () => {
    apiMocks.get.mockResolvedValue({ data: searchResults });
    renderWithProviders(<SearchBar />, { route: '/' });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls');
    expect(screen.getByRole('listbox', { name: /ticker search suggestions/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /AAPL/ })).toBeInTheDocument();
  });

  it('selects a result and clears the input', async () => {
    apiMocks.get.mockResolvedValue({ data: searchResults });
    const onSelect = vi.fn();
    renderWithProviders(<SearchBar onSelect={onSelect} />, { route: '/' });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    fireEvent.click(screen.getByRole('option', { name: /AAPL/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('AAPL');
    expect(input).toHaveValue('');
  });

  it('supports ArrowDown and Enter to select the active option', async () => {
    apiMocks.get.mockResolvedValue({ data: searchResults });
    const onSelect = vi.fn();
    renderWithProviders(<SearchBar onSelect={onSelect} />, { route: '/' });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant');
    expect(screen.getByRole('option', { name: /AAPL/ })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('AAPL');
  });

  it('closes the listbox on Escape', async () => {
    apiMocks.get.mockResolvedValue({ data: searchResults });
    renderWithProviders(<SearchBar />, { route: '/' });

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'AAPL' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

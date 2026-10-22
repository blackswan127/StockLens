import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/utils';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>All systems nominal</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All systems nominal')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('renders the default fallback when a child throws', () => {
    renderWithProviders(
      <ErrorBoundary name="Watchlist">
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/Error in Watchlist:/)).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('renders a custom fallback when provided', () => {
    renderWithProviders(
      <ErrorBoundary fallback={<p>Section unavailable</p>}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Section unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
  });
});

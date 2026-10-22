import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../../test/utils';
import { NotFound } from '../NotFound';

describe('NotFound accessibility', () => {
  it('moves focus to the page heading and offers a back link', () => {
    renderWithProviders(<NotFound />, { route: '/missing' });

    expect(screen.getByRole('heading', { name: /signal not found/i })).toHaveFocus();
    expect(screen.getByRole('link', { name: /return to terminal/i })).toHaveAttribute(
      'href',
      '/'
    );
  });
});

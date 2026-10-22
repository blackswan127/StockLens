import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../fred.js', () => ({
  fredService: {
    getSeries: vi.fn(),
  },
}));

import { fetchFredData } from '../fredService.js';
import { fredService } from '../../../fred.js';

const getSeriesMock = vi.mocked(fredService.getSeries);

beforeEach(() => {
  getSeriesMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchFredData', () => {
  it('computes the latest fed funds rate and GDP growth', async () => {
    getSeriesMock.mockImplementation(async (seriesId: string) => {
      if (seriesId === 'FEDFUNDS') {
        return {
          observations: [
            { date: '2026-01-01', value: '4.00' },
            { date: '2026-02-01', value: '4.50' },
            { date: '2026-03-01', value: '5.00' },
          ],
        };
      }
      if (seriesId === 'GDPC1') {
        return {
          observations: [
            { date: '2025-10-01', value: '20000' },
            { date: '2026-01-01', value: '21000' },
          ],
        };
      }
      throw new Error(`Unexpected series: ${seriesId}`);
    });

    const result = await fetchFredData();

    expect(result).toEqual({ fedFundsRate: 5, gdpGrowth: 5 });
    expect(getSeriesMock).toHaveBeenCalledWith('FEDFUNDS');
    expect(getSeriesMock).toHaveBeenCalledWith('GDPC1');
  });

  it('returns null values instead of placeholders when FRED fails', async () => {
    getSeriesMock.mockRejectedValue(new Error('FRED API is down'));

    const result = await fetchFredData();

    expect(result).toEqual({ fedFundsRate: null, gdpGrowth: null });
    expect(console.warn).toHaveBeenCalled();
  });

  it('skips "." observations when picking the latest values', async () => {
    getSeriesMock.mockImplementation(async (seriesId: string) => {
      if (seriesId === 'FEDFUNDS') {
        return {
          observations: [
            { date: '2026-01-01', value: '5.25' },
            { date: '2026-02-01', value: '.' },
          ],
        };
      }
      if (seriesId === 'GDPC1') {
        return {
          observations: [
            { date: '2025-07-01', value: '100' },
            { date: '2025-10-01', value: '.' },
            { date: '2026-01-01', value: '110' },
            { date: '2026-04-01', value: '.' },
          ],
        };
      }
      throw new Error(`Unexpected series: ${seriesId}`);
    });

    const result = await fetchFredData();

    expect(result.fedFundsRate).toBe(5.25);
    expect(result.gdpGrowth).toBeCloseTo(10);
  });

  it('returns null GDP growth when fewer than two valid observations exist', async () => {
    getSeriesMock.mockImplementation(async (seriesId: string) => {
      if (seriesId === 'FEDFUNDS') {
        return { observations: [{ date: '2026-01-01', value: '5.25' }] };
      }
      return { observations: [{ date: '2026-01-01', value: '21000' }] };
    });

    const result = await fetchFredData();

    expect(result.fedFundsRate).toBe(5.25);
    expect(result.gdpGrowth).toBeNull();
  });
});

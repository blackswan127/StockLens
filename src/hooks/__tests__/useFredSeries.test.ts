import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFredSeries } from '../useFredSeries';

const mockFetch = vi.fn();

function okResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

function nonOkResponse(status = 503) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useFredSeries', () => {
  it('maps FRED observations and skips "." values', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        available: true,
        observations: [
          { date: '2026-01-01', value: '4.25' },
          { date: '2026-02-01', value: '.' },
          { date: '2026-03-01', value: '4.75' },
        ],
      })
    );

    const { result } = renderHook(() => useFredSeries(['FEDFUNDS']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/macro/FEDFUNDS');
    expect(result.current.errors.FEDFUNDS).toBe(false);
    expect(result.current.data?.FEDFUNDS).toEqual([
      { date: '2026-01-01', value: 4.25 },
      { date: '2026-03-01', value: 4.75 },
    ]);
  });

  it('marks a series unavailable without fabricating data when available is false', async () => {
    mockFetch.mockResolvedValue(okResponse({ available: false, observations: [] }));

    const { result } = renderHook(() => useFredSeries(['FEDFUNDS']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errors.FEDFUNDS).toBe(true);
    expect(result.current.data?.FEDFUNDS).toBeUndefined();
    expect(result.current.data?.FEDFUNDS ?? []).toHaveLength(0);
  });

  it('marks a series unavailable when observations are empty', async () => {
    mockFetch.mockResolvedValue(okResponse({ available: true, observations: [] }));

    const { result } = renderHook(() => useFredSeries(['GDPC1']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errors.GDPC1).toBe(true);
    expect(result.current.data?.GDPC1).toBeUndefined();
  });

  it('marks a series unavailable on a non-OK response without fabricating data', async () => {
    mockFetch.mockResolvedValue(nonOkResponse(500));

    const { result } = renderHook(() => useFredSeries(['DGS10']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errors.DGS10).toBe(true);
    expect(result.current.data?.DGS10).toBeUndefined();
  });

  it('marks a series unavailable on a network rejection without fabricating data', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useFredSeries(['UNRATE']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errors.UNRATE).toBe(true);
    expect(result.current.data?.UNRATE).toBeUndefined();
  });

  it('keeps successful series when another series in the same load fails', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/macro/FEDFUNDS') {
        return okResponse({
          available: true,
          observations: [{ date: '2026-01-01', value: '5.33' }],
        });
      }
      throw new Error('network down');
    });

    const { result } = renderHook(() => useFredSeries(['FEDFUNDS', 'DGS10']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.errors.FEDFUNDS).toBe(false);
    expect(result.current.errors.DGS10).toBe(true);
    expect(result.current.data?.FEDFUNDS).toEqual([{ date: '2026-01-01', value: 5.33 }]);
    expect(result.current.data?.DGS10).toBeUndefined();
  });

  it('recovers on refetch and clears the error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useFredSeries(['FEDFUNDS']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errors.FEDFUNDS).toBe(true);

    mockFetch.mockResolvedValueOnce(
      okResponse({
        available: true,
        observations: [{ date: '2026-04-01', value: '4.9' }],
      })
    );

    await act(async () => {
      await result.current.refetch('FEDFUNDS');
    });

    expect(result.current.errors.FEDFUNDS).toBe(false);
    expect(result.current.data?.FEDFUNDS).toEqual([{ date: '2026-04-01', value: 4.9 }]);
  });

  it('keeps existing data when a refetch fails and marks the error', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        available: true,
        observations: [{ date: '2026-04-01', value: '4.9' }],
      })
    );

    const { result } = renderHook(() => useFredSeries(['FEDFUNDS']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.FEDFUNDS).toEqual([{ date: '2026-04-01', value: 4.9 }]);

    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await act(async () => {
      await result.current.refetch('FEDFUNDS');
    });

    expect(result.current.errors.FEDFUNDS).toBe(true);
    expect(result.current.data?.FEDFUNDS).toEqual([{ date: '2026-04-01', value: 4.9 }]);
  });
});

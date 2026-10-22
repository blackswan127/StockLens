import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import chartsRouter from '../charts.js';
import { yahooService } from '../../services/yahoo.js';

// Mock YahooService completely to prevent network side effects
vi.mock('../../services/yahoo.js', () => ({
  yahooService: {
    getCandles: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/chart', chartsRouter);

describe('Charts Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/chart/:symbol', () => {
    it('returns {s: "no_data"} when the live candle fetch returns no data', async () => {
      vi.mocked(yahooService.getCandles).mockResolvedValue({ s: 'no_data' });

      const response = await request(app).get('/api/chart/EMPTY_SYMBOL_TEST');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ s: 'no_data' });
    });

    it('returns {s: "no_data"} when the live fetch succeeds with zero candles', async () => {
      vi.mocked(yahooService.getCandles).mockResolvedValue({
        s: 'ok',
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: []
      });

      const response = await request(app).get('/api/chart/NOCANDLES');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ s: 'no_data' });
    });

    it('maps live candle data onto the chart payload', async () => {
      vi.mocked(yahooService.getCandles).mockResolvedValue({
        s: 'ok',
        t: [1700000000],
        o: [10.123],
        h: [11.456],
        l: [9.789],
        c: [10.987],
        v: [12345]
      });

      const response = await request(app).get('/api/chart/TEST?period=1Y');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          timestamp: 1700000000,
          open: 10.12,
          high: 11.46,
          low: 9.79,
          close: 10.99,
          volume: 12345
        })
      ]);
      expect(typeof response.body[0].date).toBe('string');
    });

    it('calculates the correct from timestamp and resolution for different periods relative to Date.now()', async () => {
      // Freeze time at exactly 2026-06-23T00:00:00.000Z
      const mockDate = new Date('2026-06-23T00:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
      vi.mocked(yahooService.getCandles).mockResolvedValue({ s: 'no_data' });

      const toTimestamp = Math.floor(mockDate.getTime() / 1000);

      const periodTests = [
        { period: '1D', expectedFrom: toTimestamp - 24 * 3600, expectedResolution: '5' },
        { period: '5D', expectedFrom: toTimestamp - 5 * 24 * 3600, expectedResolution: '15' },
        { period: '1M', expectedFrom: toTimestamp - 30 * 24 * 3600, expectedResolution: 'D' },
        { period: '6M', expectedFrom: toTimestamp - 180 * 24 * 3600, expectedResolution: 'D' },
        {
          period: 'YTD',
          expectedFrom: Math.floor(new Date(mockDate.getFullYear(), 0, 1).getTime() / 1000),
          expectedResolution: 'D'
        },
        { period: '1Y', expectedFrom: toTimestamp - 365 * 24 * 3600, expectedResolution: 'W' },
        { period: '5Y', expectedFrom: toTimestamp - 5 * 365 * 24 * 3600, expectedResolution: 'M' },
        { period: 'MAX', expectedFrom: toTimestamp - 15 * 365 * 24 * 3600, expectedResolution: 'M' }
      ];

      for (const testCase of periodTests) {
        vi.mocked(yahooService.getCandles).mockClear();
        await request(app).get(`/api/chart/TEST?period=${testCase.period}`);
        expect(yahooService.getCandles).toHaveBeenCalledWith(
          'TEST',
          testCase.expectedResolution,
          testCase.expectedFrom,
          toTimestamp
        );
      }
    });
  });
});

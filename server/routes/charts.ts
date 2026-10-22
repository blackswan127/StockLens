import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { yahooService } from '../services/yahoo.js';

const router = Router();


// GET /api/chart/:symbol?period=1Y -> historical candle points
router.get('/:symbol', apiLimiter, async (req, res, next) => {
  const symbol = req.params.symbol.toUpperCase();
  const period = (req.query.period || '1Y').toString().toUpperCase();

  try {
    const to = Math.floor(Date.now() / 1000);
    let from = to - (365 * 24 * 3600); // default 1Y
    let resolution = 'D';

    // Parse period and resolution according to specifications
    switch (period) {
      case '1D':
        from = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
        resolution = '5'; // 5min
        break;
      case '5D':
        from = Math.floor((Date.now() - 5 * 24 * 3600 * 1000) / 1000);
        resolution = '15'; // 15min
        break;
      case '1M':
        from = Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000);
        resolution = 'D'; // 1day
        break;
      case '6M':
        from = Math.floor((Date.now() - 180 * 24 * 3600 * 1000) / 1000);
        resolution = 'D'; // 1day
        break;
      case 'YTD': {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        from = Math.floor(startOfYear.getTime() / 1000);
        resolution = 'D'; // 1day
        break;
      }
      case '1Y':
        from = Math.floor((Date.now() - 365 * 24 * 3600 * 1000) / 1000);
        resolution = 'W'; // 1week
        break;
      case '5Y':
        from = Math.floor((Date.now() - 5 * 365 * 24 * 3600 * 1000) / 1000);
        resolution = 'M'; // 1month
        break;
      case 'MAX':
        from = Math.floor((Date.now() - 15 * 365 * 24 * 3600 * 1000) / 1000);
        resolution = 'M'; // 1month
        break;
      default:
        from = Math.floor((Date.now() - 365 * 24 * 3600 * 1000) / 1000);
        resolution = 'D';
        break;
    }

    interface CandlePoint { date: string; timestamp: number; close: number; open: number; high: number; low: number; volume: number; }
    let chartData: CandlePoint[] = [];

    const liveChartData = await yahooService.getCandles(symbol, resolution, from, to);
    if (liveChartData && liveChartData.s === 'ok' && liveChartData.t) {
      chartData = liveChartData.t.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: period === '5Y' || period === 'MAX' ? '2-digit' : undefined
        }),
        timestamp: ts,
        close: Number(liveChartData.c?.[i]?.toFixed(2) || 0),
        open: Number(liveChartData.o?.[i]?.toFixed(2) || 0),
        high: Number(liveChartData.h?.[i]?.toFixed(2) || 0),
        low: Number(liveChartData.l?.[i]?.toFixed(2) || 0),
        volume: Number(liveChartData.v?.[i] || 0)
      }));
    }

    if (chartData.length === 0) {
      return res.json({ s: 'no_data' });
    }

    res.json(chartData);
  } catch (error) {
    next(error);
  }
});

export default router;

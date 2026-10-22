import { Router } from 'express';
import { yahooService } from '../services/yahoo.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

export interface RawNewsArticle {
  id?: string;
  headline?: string;
  title?: string;
  summary?: string;
  source?: string;
  datetime?: number;
  url?: string;
  image?: string;
}

export interface MarketNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
  image: string;
}

export interface CompanyNewsItem {
  id: string;
  headline: string | undefined;
  summary: string | undefined;
  source: string;
  datetime: number;
  url: string;
}

// 1. GET /api/news/market -> top 15 market general news items
router.get('/market', apiLimiter, async (_req, res, next) => {
  try {
    let news: RawNewsArticle[] = [];
    try {
      const resp = await yahooService.getMarketNews();
      if (resp && Array.isArray(resp)) {
        news = resp as RawNewsArticle[];
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[NEWS ROUTE] Market news general fetch fail:', msg);
    }

    const formatted: MarketNewsItem[] = news.slice(0, 15).map(item => ({
      id: item.id || Math.random().toString(36).substring(2, 9),
      headline: item.headline || '',
      summary: item.summary || '',
      source: item.source || 'Financial Wire',
      datetime: item.datetime || Math.floor(Date.now() / 1000),
      url: item.url || '#',
      image: item.image || ''
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/news/:symbol -> Last 10 company news items
router.get('/:symbol', apiLimiter, async (req, res, next) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    let news: RawNewsArticle[] = [];
    try {
      const resp = await yahooService.getNews(symbol);
      if (resp && Array.isArray(resp)) {
        news = resp as RawNewsArticle[];
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[NEWS ROUTE] News fetch for ${symbol} failed:`, msg);
    }

    const formatted: CompanyNewsItem[] = news.slice(0, 10).map(item => ({
      id: item.id || Math.random().toString(36).substring(2, 9),
      headline: item.headline,
      summary: item.summary,
      source: item.source || 'StockPulse',
      datetime: item.datetime || Math.floor(Date.now() / 1000 - 3600),
      url: item.url || '#'
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

export default router;

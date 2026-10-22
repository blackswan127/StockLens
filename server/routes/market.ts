import { Router } from 'express';
import { yahooService } from '../services/yahoo.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

export interface IndexQuoteResult {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  unavailable: boolean;
}

export interface MarketSummaryStock {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  high_52w: number | null;
  low_52w: number | null;
  exchange: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  change_52w: number | null;
}

export interface MarketMoversResponse {
  most_active: MarketSummaryStock[];
  trending: MarketSummaryStock[];
  gainers: MarketSummaryStock[];
  losers: MarketSummaryStock[];
  highs_52w: MarketSummaryStock[];
  lows_52w: MarketSummaryStock[];
}

export interface SectorQuote {
  price?: number | null;
  change?: number | null;
  change_pct?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  prev_close?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
}

export interface SectorPerformance {
  name: string;
  proxy: string;
  performance: number;
}

// 1. GET /api/market/indices -> retrieve main global indices
router.get('/indices', apiLimiter, async (_req, res, next) => {
  const indexSymbols = {
    'S&P 500': '^GSPC',
    'NASDAQ': '^IXIC',
    'DOW 30': '^DJI',
    'FTSE 100': '^FTSE',
    'NIKKEI 225': '^N225',
    'SENSEX': '^BSESN'
  };

  try {
    const list = await Promise.all(
      Object.entries(indexSymbols).map(async ([name, symbol]) => {
        try {
          // Fetch Layer 2 (Yahoo Scraping is perfect for indices and key globals)
          const quote = await yahooService.getIndexQuote(symbol);

          // Defensive check: a resolved promise with a missing/garbage payload
          // is just as dangerous as a thrown error if we don't validate it.
          if (
            !quote ||
            typeof quote.price !== 'number' ||
            typeof quote.change !== 'number' ||
            typeof quote.change_pct !== 'number' ||
            Number.isNaN(quote.price)
          ) {
            throw new Error('Malformed quote payload from upstream source');
          }

          return {
            name,
            symbol,
            price: quote.price,
            change: quote.change,
            change_pct: quote.change_pct,
            unavailable: false as const
          };
        } catch (e) {
          // Honest unavailable state. We do NOT fabricate a price here.
          // A previous version of this route synthesized a fake quote from
          // the index name's character codes when the scraper failed -
          // that is a data-integrity bug, not a fallback. Never reintroduce it.
          return {
            name,
            symbol,
            price: null,
            change: null,
            change_pct: null,
            unavailable: true as const
          };
        }
      })
    );

    res.json(list);
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/market/movers -> Top gainers / losers / active / trending / breakouts using Yahoo Finance Native Playlists
router.get('/movers', apiLimiter, async (_req, res, next) => {
  try {
    const [
      trending,
      gainers,
      losers,
      mostActive,
      highs52w,
      lows52w
    ] = await Promise.all([
      yahooService.getTrendingSymbols('US'),
      yahooService.getMarketPlaylist('day_gainers'),
      yahooService.getMarketPlaylist('day_losers'),
      yahooService.getMarketPlaylist('most_actives'),
      yahooService.getMarketPlaylist('growth_technology_stocks'),
      yahooService.getMarketPlaylist('undervalued_growth_stocks')
    ]);

    const response: MarketMoversResponse = {
      most_active: mostActive.slice(0, 20),
      trending: trending.slice(0, 20),
      gainers: gainers.slice(0, 20),
      losers: losers.slice(0, 20),
      highs_52w: highs52w.slice(0, 20),
      lows_52w: lows52w.slice(0, 20)
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/market/sectors -> Heatmap Sector Performance (fetched dynamically from ETFs)
router.get('/sectors', apiLimiter, async (_req, res, next) => {
  const sectors = [
    { name: 'Technology', proxy: 'XLK' },
    { name: 'Financials', proxy: 'XLF' },
    { name: 'Healthcare', proxy: 'XLV' },
    { name: 'Consumer Cyclical', proxy: 'XLY' },
    { name: 'Industrials', proxy: 'XLI' },
    { name: 'Energy', proxy: 'XLE' },
    { name: 'Basic Materials', proxy: 'XLB' },
    { name: 'Consumer Defensive', proxy: 'XLP' },
    { name: 'Utilities', proxy: 'XLU' },
    { name: 'Real Estate', proxy: 'XLRE' },
    { name: 'Telecom Services', proxy: 'XLC' },
    { name: 'Aerospace & Defense', proxy: 'ITA' }
  ];

  try {
    const results: SectorPerformance[] = await Promise.all(
      sectors.map(async (sec) => {
        let quote: SectorQuote | null = null;
        try {
          quote = (await yahooService.getQuote(sec.proxy)) as SectorQuote | null;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[SECTORS ROUTE] Failed to get quote for sector proxy ${sec.proxy}:`, msg);
        }
        return {
          name: sec.name,
          proxy: sec.proxy,
          performance: quote && quote.change_pct !== undefined && quote.change_pct !== null ? Number(quote.change_pct.toFixed(2)) : 0
        };
      })
    );
    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;

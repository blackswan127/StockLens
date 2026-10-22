import { Router, type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual } from 'crypto';
import db from '../services/db.js';
import { yahooService } from '../services/yahoo.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function isWriteAuthorized(req: Request): boolean {
  const expectedToken = process.env.WATCHLIST_TOKEN;
  if (!expectedToken) return true;

  const authorization = req.headers.authorization;
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match && secureCompare(match[1].trim(), expectedToken)) return true;
  }

  const headerToken = req.headers['x-watchlist-token'];
  const providedToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  if (providedToken && secureCompare(providedToken, expectedToken)) return true;

  return false;
}

function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (isWriteAuthorized(req)) return next();
  return res.status(401).json({ error: true, message: 'Unauthorized' });
}

// 1. GET /api/watchlist -> retrieve watchlisted items with current quotes
router.get('/', apiLimiter, async (_req, res, next) => {
  try {
    const listStmt = db.prepare('SELECT symbol, added_at FROM watchlist ORDER BY added_at DESC');
    const watchItems = listStmt.all() as Array<{ symbol: string; added_at: number }>;

    if (watchItems.length === 0) {
      return res.json([]);
    }

    const watchDetails = await Promise.all(
      watchItems.map(async (item) => {
        const symbol = item.symbol.toUpperCase();
        
        // Retrieve stock company name
        let name = symbol;
        let exchange = 'US';
        try {
          const profile = db.prepare('SELECT name, exchange FROM stocks WHERE symbol = ?').get(symbol) as any;
          if (profile) {
            name = profile.name;
            exchange = profile.exchange;
          }
        } catch (e: any) {
          console.debug(`[WATCHLIST] Failed to fetch SQLite profile for ${symbol}:`, e.message);
        }

        // Fetch quote data via waterfall
        let price = null;
        let change = 0;
        let change_pct = 0;

        try {
          const quote = await yahooService.getQuote(symbol);
          if (quote) {
            price = quote.price ?? null;
            change = quote.change ?? 0;
            change_pct = quote.change_pct ?? 0;
          }
        } catch (qErr) {
          // Check cached quotes backup in SQLite
          try {
            const row = db.prepare('SELECT price, change, change_pct FROM quotes WHERE symbol = ?').get(symbol) as any;
            if (row) {
              price = row.price;
              change = row.change;
              change_pct = row.change_pct;
            }
          } catch (sqliteErr: any) {
            console.debug(`[WATCHLIST] Failed to fetch SQLite quote fallback for ${symbol}:`, sqliteErr.message);
          }
        }

        // Return standardized object
        return {
          symbol,
          name,
          exchange,
          price,
          change,
          change_pct,
          added_at: item.added_at
        };
      })
    );

    res.json(watchDetails);
  } catch (error) {
    next(error);
  }
});

import { z } from 'zod';

const WatchlistAddSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9.-]+$/i, "Invalid symbol format").transform(s => s.toUpperCase().trim())
});

// 2. POST /api/watchlist/add -> add symbol to watchlist
router.post('/add', apiLimiter, requireWriteAccess, (req, res, next) => {
  try {
    const parseResult = WatchlistAddSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: true, message: parseResult.error.issues[0].message });
    }
    const symbol = parseResult.data.symbol;

    try {
      const stmt = db.prepare(`
        INSERT INTO watchlist (symbol, added_at)
        VALUES (?, ?)
      `);
      stmt.run(symbol, Date.now());
      res.json({ success: true, symbol, message: 'Added to watchlist successfully.' });
    } catch (insertErr: any) {
      if (insertErr.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || insertErr.message.includes('UNIQUE')) {
        return res.json({ success: true, symbol, message: 'Already exists in watchlist.' });
      }
      throw insertErr;
    }
  } catch (error) {
    next(error);
  }
});

// 3. DELETE /api/watchlist/:symbol -> remove symbol from watchlist
router.delete('/:symbol', apiLimiter, requireWriteAccess, (req, res, next) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    const stmt = db.prepare('DELETE FROM watchlist WHERE symbol = ?');
    const info = stmt.run(symbol);

    res.json({
      success: true,
      symbol,
      deleted: info.changes > 0,
      message: 'Removed from watchlist successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

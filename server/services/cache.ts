import NodeCache from 'node-cache';
import Redis from 'ioredis';
import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize NodeCache (fallback)
const localCache = new NodeCache({
  stdTTL: 300,        // Default 5 min
  checkperiod: 60     // Clean up expired items every 60s
});

let redisClient: Redis | undefined;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  redisClient.on('error', (err) => console.error('[REDIS CACHE ERROR]', err));
}

export const CACHE_TTLS = {
  QUOTE: 300,         // 5 mins
  FUNDAMENTALS: 86400, // 24 hours
  NEWS: 1800,         // 30 mins
  PEERS: 604800       // 7 days
};

export interface PendingCacheLogEntry {
  endpoint: string;
  symbol: string;
  source: string;
  hits: number;
  lastHitAt: number;
}

export interface CacheLogStats {
  pendingEntries: number;
  pendingHits: number;
  evictedEntries: number;
  maxEntries: number;
}

export interface CacheLogFlushResult {
  inserted: number;
  hits: number;
}

export interface FundamentalsDbRow {
  data: string;
  source: string;
  updated_at: number;
}

export interface FundamentalsBackup<T = Record<string, unknown>> {
  data: T;
  source: string;
  updated_at: number;
}

export interface QuoteBackup {
  price: number;
  change: number;
  change_pct: number;
  high_52w: number | null;
  low_52w: number | null;
  updated_at: number;
}

export interface SaveQuoteBackupInput {
  price: number;
  change: number;
  change_pct: number;
  high_52w?: number | null;
  low_52w?: number | null;
}

export interface ShareholdingDbRow {
  data: string;
  updated_at: number;
}

export interface ShareholdingBackup<T = Record<string, unknown>> {
  data: T;
  updated_at: number;
}

export interface RatiosDbRow {
  data: string;
  updated_at: number;
}

export interface RatiosBackup<T = Record<string, unknown>> {
  data: T;
  updated_at: number;
}

const MAX_PENDING_CACHE_LOG_ENTRIES = 500;
const pendingCacheLog = new Map<string, PendingCacheLogEntry>();
let evictedCacheLogEntries = 0;

const cacheLogKey = (endpoint: string, symbol: string, source: string): string =>
  `${endpoint}\u0000${symbol}\u0000${source}`;

const evictOldestPendingEntry = (): void => {
  const oldestKey = pendingCacheLog.keys().next().value;
  if (oldestKey !== undefined) {
    pendingCacheLog.delete(oldestKey);
    evictedCacheLogEntries += 1;
  }
};

const restorePendingEntry = (entry: PendingCacheLogEntry): void => {
  const key = cacheLogKey(entry.endpoint, entry.symbol, entry.source);
  const existing = pendingCacheLog.get(key);
  if (existing) {
    existing.hits += entry.hits;
    existing.lastHitAt = Math.max(existing.lastHitAt, entry.lastHitAt);
    return;
  }
  if (pendingCacheLog.size >= MAX_PENDING_CACHE_LOG_ENTRIES) {
    evictOldestPendingEntry();
  }
  pendingCacheLog.set(key, entry);
};

export const getCacheLogStats = (): CacheLogStats => {
  let pendingHits = 0;
  for (const entry of pendingCacheLog.values()) {
    pendingHits += entry.hits;
  }
  return {
    pendingEntries: pendingCacheLog.size,
    pendingHits,
    evictedEntries: evictedCacheLogEntries,
    maxEntries: MAX_PENDING_CACHE_LOG_ENTRIES
  };
};

export const flushCacheLog = (): CacheLogFlushResult => {
  if (pendingCacheLog.size === 0) {
    return { inserted: 0, hits: 0 };
  }

  const entries = Array.from(pendingCacheLog.values());
  pendingCacheLog.clear();

  try {
    const insert = db.prepare(`
      INSERT INTO cache_log (endpoint, symbol, source, hit_at)
      VALUES (?, ?, ?, ?)
    `);

    let inserted = 0;
    let hits = 0;

    db.transaction(() => {
      for (const entry of entries) {
        insert.run(entry.endpoint, entry.symbol, entry.source, entry.lastHitAt);
        inserted += 1;
        hits += entry.hits;
      }
    })();

    return { inserted, hits };
  } catch (error) {
    console.error('[CACHE LOG FLUSH ERROR]', error);
    for (const entry of entries) {
      restorePendingEntry(entry);
    }
    return { inserted: 0, hits: 0 };
  }
};

export const pruneCacheLog = (maxAgeDays = 7): number => {
  try {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const result = db.prepare('DELETE FROM cache_log WHERE hit_at < ?').run(cutoff);
    return result.changes;
  } catch (error) {
    console.error('[CACHE LOG PRUNE ERROR]', error);
    return 0;
  }
};

export const cacheService = {
  get: async <T>(key: string): Promise<T | undefined> => {
    // L1: always check in-process cache first
    const l1Val = localCache.get<T>(key);
    if (l1Val !== undefined) return l1Val;

    if (redisClient) {
      try {
        const val = await redisClient.get(key);
        if (val) {
          const parsed = JSON.parse(val) as T;
          // Backfill L1 with a short TTL (max 60s)
          const remainingTtl = await redisClient.ttl(key);
          const l1Ttl = Math.min(remainingTtl > 0 ? remainingTtl : 60, 60);
          localCache.set(key, parsed, l1Ttl);
          return parsed;
        }
      } catch (err) {
        console.error('[REDIS GET ERROR]', err);
      }
      return undefined;
    }
    return undefined;
  },

  set: async <T>(key: string, value: T, ttlSeconds: number): Promise<boolean> => {
    // L1: always write to in-process cache
    // If Redis is enabled, L1 acts as a short-lived cache (max 60s) to avoid redundant network calls.
    // If Redis is disabled, L1 is the primary cache and holds the full requested TTL.
    const l1Ttl = redisClient ? Math.min(ttlSeconds, 60) : ttlSeconds;
    localCache.set(key, value, l1Ttl);

    if (redisClient) {
      try {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error('[REDIS SET ERROR]', err);
        return false;
      }
    }
    return true;
  },

  // Aggregate cache hits in memory; flushCacheLog() persists them later.
  logHit: (endpoint: string, symbol: string, source: string): void => {
    try {
      const normalizedSymbol = symbol.toUpperCase();
      const key = cacheLogKey(endpoint, normalizedSymbol, source);
      const now = Date.now();
      const existing = pendingCacheLog.get(key);

      if (existing) {
        existing.hits += 1;
        existing.lastHitAt = now;
        pendingCacheLog.delete(key);
        pendingCacheLog.set(key, existing);
        return;
      }

      if (pendingCacheLog.size >= MAX_PENDING_CACHE_LOG_ENTRIES) {
        evictOldestPendingEntry();
      }

      pendingCacheLog.set(key, {
        endpoint,
        symbol: normalizedSymbol,
        source,
        hits: 1,
        lastHitAt: now
      });
    } catch (error) {
      console.error('[CACHE LOG ERROR]', error);
    }
  },

  // Retrieve cached fundamentals from SQLite as durable fallback backup
  getFundamentalsBackup: <T = Record<string, unknown>>(symbol: string): FundamentalsBackup<T> | null => {
    try {
      const stmt = db.prepare('SELECT data, source, updated_at FROM fundamentals WHERE symbol = ?');
      const row = stmt.get(symbol.toUpperCase()) as FundamentalsDbRow | undefined;
      if (row) {
        return {
          data: JSON.parse(row.data) as T,
          source: row.source,
          updated_at: row.updated_at
        };
      }
    } catch (error) {
      console.error('[DB FUNDAMENTALS BACKUP GET ERROR]', error);
    }
    return null;
  },

  // Save successful fundamentals to SQLite
  saveFundamentalsBackup: <T = unknown>(symbol: string, data: T, source: string): void => {
    try {
      const stmt = db.prepare(`
        INSERT INTO fundamentals (symbol, data, source, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          data = excluded.data,
          source = excluded.source,
          updated_at = excluded.updated_at
      `);
      stmt.run(symbol.toUpperCase(), JSON.stringify(data), source, Date.now());
    } catch (error) {
      console.error('[DB FUNDAMENTALS BACKUP SAVE ERROR]', error);
    }
  },

  // Retrieve cached quote from SQLite as fallback backup
  getQuoteBackup: (symbol: string): QuoteBackup | null => {
    try {
      const stmt = db.prepare('SELECT price, change, change_pct, high_52w, low_52w, updated_at FROM quotes WHERE symbol = ?');
      const row = stmt.get(symbol.toUpperCase()) as QuoteBackup | undefined;
      if (row) {
        return row;
      }
    } catch (error) {
      console.error('[DB QUOTE BACKUP GET ERROR]', error);
    }
    return null;
  },

  // Save successful quote to SQLite
  saveQuoteBackup: (symbol: string, quote: SaveQuoteBackupInput): void => {
    try {
      const stmt = db.prepare(`
        INSERT INTO quotes (symbol, price, change, change_pct, high_52w, low_52w, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          price = excluded.price,
          change = excluded.change,
          change_pct = excluded.change_pct,
          high_52w = excluded.high_52w,
          low_52w = excluded.low_52w,
          updated_at = excluded.updated_at
      `);
      stmt.run(symbol.toUpperCase(), quote.price, quote.change, quote.change_pct, quote.high_52w ?? null, quote.low_52w ?? null, Date.now());
    } catch (error) {
      console.error('[DB QUOTE BACKUP SAVE ERROR]', error);
    }
  },

  // Retrieve cached shareholding from SQLite as durable fallback backup
  getShareholdingBackup: <T = Record<string, unknown>>(symbol: string): ShareholdingBackup<T> | null => {
    try {
      const stmt = db.prepare('SELECT data, updated_at FROM shareholding_cache WHERE symbol = ?');
      const row = stmt.get(symbol.toUpperCase()) as ShareholdingDbRow | undefined;
      if (row) {
        return {
          data: JSON.parse(row.data) as T,
          updated_at: row.updated_at
        };
      }
    } catch (error) {
      console.error('[DB SHAREHOLDING BACKUP GET ERROR]', error);
    }
    return null;
  },

  // Save successful shareholding to SQLite
  saveShareholdingBackup: <T = unknown>(symbol: string, data: T): void => {
    try {
      const stmt = db.prepare(`
        INSERT INTO shareholding_cache (symbol, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);
      stmt.run(symbol.toUpperCase(), JSON.stringify(data), Date.now());
    } catch (error) {
      console.error('[DB SHAREHOLDING BACKUP SAVE ERROR]', error);
    }
  },

  // Retrieve cached basic financials/ratios (PE, ROE, D/E etc.) from SQLite
  getRatiosBackup: <T = Record<string, unknown>>(symbol: string): RatiosBackup<T> | null => {
    try {
      const stmt = db.prepare('SELECT data, updated_at FROM ratios_cache WHERE symbol = ?');
      const row = stmt.get(symbol.toUpperCase()) as RatiosDbRow | undefined;
      if (row) {
        return { data: JSON.parse(row.data) as T, updated_at: row.updated_at };
      }
    } catch (error) {
      console.error('[DB RATIOS BACKUP GET ERROR]', error);
    }
    return null;
  },

  // Save successful basic financials/ratios to SQLite (survives server restarts)
  saveRatiosBackup: <T = unknown>(symbol: string, data: T): void => {
    try {
      const stmt = db.prepare(`
        INSERT INTO ratios_cache (symbol, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);
      stmt.run(symbol.toUpperCase(), JSON.stringify(data), Date.now());
    } catch (error) {
      console.error('[DB RATIOS BACKUP SAVE ERROR]', error);
    }
  }
};

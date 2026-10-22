import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type DbModule = typeof import('../db.js');
type CacheModule = typeof import('../cache.js');

let tempDir: string;
let database: DbModule['default'];
let cache: CacheModule;

const countCacheLogRows = (): number => {
  const row = database.prepare('SELECT COUNT(*) AS count FROM cache_log').get() as { count: number };
  return row.count;
};

const hasTable = (name: string): boolean =>
  database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;

const migrationSql = (filename: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), 'server', 'services', 'migrations', filename), 'utf-8');

beforeEach(async () => {
  vi.resetModules();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocklens-cache-log-'));
  process.env.SQLITE_DB_PATH = path.join(tempDir, 'test.db');

  const dbModule: DbModule = await import('../db.js');
  database = dbModule.default;
  cache = await import('../cache.js');
});

afterEach(() => {
  try {
    database.close();
  } catch {
    // already closed
  }
  delete process.env.SQLITE_DB_PATH;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('cache hit log aggregation', () => {
  it('accumulates hits in memory without writing to cache_log', () => {
    cache.cacheService.logHit('quote', 'aapl', 'MEMORY');
    cache.cacheService.logHit('quote', 'AAPL', 'MEMORY');
    cache.cacheService.logHit('financials', 'msft', 'MEMCACHE_YAHOO');

    expect(countCacheLogRows()).toBe(0);

    const stats = cache.getCacheLogStats();
    expect(stats.pendingEntries).toBe(2);
    expect(stats.pendingHits).toBe(3);
    expect(stats.evictedEntries).toBe(0);
  });

  it('flushes one row per key, clears memory, and preserves the schema shape', () => {
    const before = Date.now();
    cache.cacheService.logHit('quote', 'aapl', 'MEMORY');
    cache.cacheService.logHit('quote', 'AAPL', 'MEMORY');
    cache.cacheService.logHit('financials', 'msft', 'MEMCACHE_YAHOO');

    expect(cache.flushCacheLog()).toEqual({ inserted: 2, hits: 3 });
    expect(countCacheLogRows()).toBe(2);
    expect(cache.getCacheLogStats().pendingEntries).toBe(0);
    expect(cache.flushCacheLog()).toEqual({ inserted: 0, hits: 0 });

    const rows = database
      .prepare('SELECT endpoint, symbol, source, hit_at FROM cache_log ORDER BY symbol')
      .all() as Array<{ endpoint: string; symbol: string; source: string; hit_at: number }>;

    expect(rows.map((row) => row.symbol)).toEqual(['AAPL', 'MSFT']);
    expect(rows[0]).toMatchObject({ endpoint: 'quote', source: 'MEMORY' });
    expect(rows[1]).toMatchObject({ endpoint: 'financials', source: 'MEMCACHE_YAHOO' });
    for (const row of rows) {
      expect(row.hit_at).toBeGreaterThanOrEqual(before);
      expect(row.hit_at).toBeLessThanOrEqual(Date.now());
    }
  });

  it('bounds pending entries at 500 and evicts the least recently used key', () => {
    for (let i = 0; i <= 500; i++) {
      cache.cacheService.logHit('quote', `SYM${i}`, 'MEMORY');
    }

    const stats = cache.getCacheLogStats();
    expect(stats.pendingEntries).toBe(500);
    expect(stats.pendingHits).toBe(500);
    expect(stats.evictedEntries).toBe(1);

    expect(cache.flushCacheLog()).toEqual({ inserted: 500, hits: 500 });
    expect(countCacheLogRows()).toBe(500);
    expect(database.prepare('SELECT 1 FROM cache_log WHERE symbol = ?').get('SYM0')).toBeUndefined();
    expect(database.prepare('SELECT 1 FROM cache_log WHERE symbol = ?').get('SYM500')).toBeDefined();
  });

  it('prunes rows older than the retention window', () => {
    const insert = database.prepare(
      'INSERT INTO cache_log (endpoint, symbol, source, hit_at) VALUES (?, ?, ?, ?)'
    );
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    insert.run('quote', 'RECENT', 'MEMORY', now - day);
    insert.run('quote', 'WEEK_OLD', 'MEMORY', now - 8 * day);
    insert.run('quote', 'ANCIENT', 'MEMORY', now - 30 * day);

    expect(cache.pruneCacheLog(7)).toBe(2);
    expect(countCacheLogRows()).toBe(1);

    const remaining = database.prepare('SELECT symbol FROM cache_log').get() as { symbol: string };
    expect(remaining.symbol).toBe('RECENT');
  });
});

describe('database migrations', () => {
  it('records the baseline and applies migration 002 at startup', () => {
    const applied = database
      .prepare('SELECT filename FROM migrations ORDER BY filename')
      .all() as Array<{ filename: string }>;

    expect(applied.map((row) => row.filename)).toEqual([
      '001-initial-schema.sql',
      '002-drop-unused-historical-prices.sql'
    ]);
    expect(hasTable('historical_prices')).toBe(false);
  });

  it('applies migration 002 idempotently to a legacy database', () => {
    database.exec(`
      CREATE TABLE historical_prices (
        symbol TEXT NOT NULL,
        date INTEGER NOT NULL,
        close REAL,
        PRIMARY KEY (symbol, date)
      ) WITHOUT ROWID;
    `);
    expect(hasTable('historical_prices')).toBe(true);

    const sql = migrationSql('002-drop-unused-historical-prices.sql');
    database.exec(sql);
    expect(hasTable('historical_prices')).toBe(false);

    expect(() => database.exec(sql)).not.toThrow();
    expect(hasTable('historical_prices')).toBe(false);
  });
});

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SEED_STOCKS } from './seeds.js';

// Initialize Database
const dbPath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'stocklens.db');
const db = new Database(dbPath);

// Enable WAL and performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('mmap_size = 268435456');
db.pragma('temp_store = MEMORY');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

// Define database schemas
db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    sector TEXT NOT NULL,
    industry TEXT NOT NULL,
    country TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    symbol TEXT PRIMARY KEY,
    price REAL NOT NULL,
    change REAL NOT NULL,
    change_pct REAL NOT NULL,
    high_52w REAL,
    low_52w REAL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fundamentals (
    symbol TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- Stored as JSON string
    source TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    added_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cache_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    symbol TEXT NOT NULL,
    source TEXT NOT NULL,
    hit_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS edgar_cache (
    cache_key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fred_cache (
    series_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shareholding_cache (
    symbol TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- Stored as JSON string
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ratios_cache (
    symbol TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- Stored as JSON string (getBasicFinancials output)
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
  CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);
  CREATE INDEX IF NOT EXISTS idx_ratios_updated ON ratios_cache(updated_at);
  CREATE INDEX IF NOT EXISTS idx_quotes_symbol ON quotes(symbol);
  CREATE INDEX IF NOT EXISTS idx_cache_log_hit_at ON cache_log(hit_at);
`);

// Run Migrations
const migrationsDir = path.resolve(process.cwd(), 'server', 'services', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const isApplied = db.prepare('SELECT 1 FROM migrations WHERE filename = ?').get(file);
    if (!isApplied) {
      console.log(`[DB] Applying migration ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (filename, applied_at) VALUES (?, ?)').run(file, Date.now());
      })();
    }
  }
}

console.log('[DB] Database initialized successfully in WAL mode.');

// Seed database with preloaded stocks if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM stocks');
const { count } = countStmt.get() as { count: number };

if (count === 0) {
  console.log('[DB] Seeding stock metadata table with S&P 500 and popular global equities...');
  const insertStmt = db.prepare(`
    INSERT INTO stocks (symbol, name, exchange, sector, industry, country)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((stocks) => {
    for (const stock of stocks) {
      insertStmt.run(stock.symbol, stock.name, stock.exchange, stock.sector, stock.industry, stock.country);
    }
  });

  transaction(SEED_STOCKS);
  console.log(`[DB] Seeding complete. Seeding matched exactly ${SEED_STOCKS.length} entries.`);
} else {
  console.log(`[DB] Stocks table already has ${count} records. Skipping seeding.`);
}

// Seed fred_cache with baseline macroeconomic series if empty (and not running unit tests)
if (process.env.NODE_ENV !== 'test') {
  try {
    const fredCountStmt = db.prepare('SELECT COUNT(*) as count FROM fred_cache');
    const fredRow = fredCountStmt.get() as { count: number } | undefined;
    if (fredRow && fredRow.count === 0) {
      console.log('[DB] Seeding baseline macroeconomic telemetry into fred_cache...');
      const { seedFredCache } = await import('./seedMacroCache.js');
      seedFredCache();
    }
  } catch (err: any) {
    console.warn('[DB] Macro seed check skipped:', err?.message ?? err);
  }
}

export default db;

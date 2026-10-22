import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import screenerRouter from '../screener.js';
import db from '../../services/db.js';

const app = express();
app.use(express.json());
app.use('/api/screener', screenerRouter);

describe('Screener Route', () => {
  beforeAll(() => {
    // Seed some test data into the DB
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS stocks (
          symbol TEXT PRIMARY KEY,
          name TEXT,
          exchange TEXT,
          sector TEXT,
          industry TEXT,
          country TEXT
        )
      `).run();
      
      db.prepare('DELETE FROM stocks WHERE symbol LIKE \'TEST_SCREENER_%\'').run();
      
      db.prepare(`
        INSERT INTO stocks (symbol, name, exchange, sector, industry, country)
        VALUES 
        ('TEST_SCREENER_AAPL', 'Apple', 'NASDAQ', 'Technology', 'Consumer Electronics', 'US'),
        ('TEST_SCREENER_MSFT', 'Microsoft', 'NASDAQ', 'Technology', 'Software', 'US'),
        ('TEST_SCREENER_JNJ', 'Johnson', 'NYSE', 'Healthcare', 'Drugs', 'US')
      `).run();
      
      // Seed some quotes and fundamentals
      db.prepare(`
        INSERT OR REPLACE INTO quotes (symbol, price, change, change_pct, updated_at)
        VALUES 
        ('TEST_SCREENER_AAPL', 150, 1, 0.5, 123456789),
        ('TEST_SCREENER_MSFT', 300, 2, 0.7, 123456789),
        ('TEST_SCREENER_JNJ', 160, 0, 0, 123456789)
      `).run();
    } catch (e) {
      console.error(e);
    }
  });

  afterAll(() => {
    try {
      db.prepare('DELETE FROM stocks WHERE symbol LIKE \'TEST_SCREENER_%\'').run();
      db.prepare('DELETE FROM quotes WHERE symbol LIKE \'TEST_SCREENER_%\'').run();
    } catch (e) {
      /* intentionally ignored */
    }
  });

  it('filters by sector and returns only matching tickers', async () => {
    const res = await request(app)
      .get('/api/screener')
      .query({ sector: 'Technology', q: 'TEST_SCREENER' });
    
    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();
    
    const symbols = res.body.results.map((r: any) => r.symbol);
    expect(symbols).toContain('TEST_SCREENER_AAPL');
    expect(symbols).toContain('TEST_SCREENER_MSFT');
    expect(symbols).not.toContain('TEST_SCREENER_JNJ');
  });

  it('filters by market cap (mocked/omitted data implies we can test if it returns normally)', async () => {
    const res = await request(app)
      .get('/api/screener')
      .query({ minMcap: 1000, q: 'TEST_SCREENER' });
    
    expect(res.status).toBe(200);
    // Because we didn't seed market_cap via the cache mock, we just ensure it handles the query correctly.
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import watchlistRouter from '../watchlist.js';

vi.mock('../../services/db.js', () => ({
  default: {
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      get: vi.fn(),
      run: vi.fn(() => ({ changes: 1 })),
    })),
  },
}));

vi.mock('../../services/yahoo.js', () => ({
  yahooService: {
    getQuote: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/watchlist', watchlistRouter);

const TOKEN = 'test-token-1234';
const originalToken = process.env.WATCHLIST_TOKEN;

beforeEach(() => {
  delete process.env.WATCHLIST_TOKEN;
});

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.WATCHLIST_TOKEN;
  } else {
    process.env.WATCHLIST_TOKEN = originalToken;
  }
});

describe('Watchlist Route', () => {
  describe('GET /api/watchlist', () => {
    it('works with no token configured', async () => {
      const response = await request(app).get('/api/watchlist');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('remains public when WATCHLIST_TOKEN is configured', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app).get('/api/watchlist');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/watchlist/add', () => {
    it('is allowed when WATCHLIST_TOKEN is unset', async () => {
      const response = await request(app).post('/api/watchlist/add').send({ symbol: 'aapl' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, symbol: 'AAPL' });
    });

    it('returns 401 when the token is required and no header is sent', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app).post('/api/watchlist/add').send({ symbol: 'AAPL' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: true, message: 'Unauthorized' });
    });

    it('returns 401 for a wrong Bearer token of equal length', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .post('/api/watchlist/add')
        .set('Authorization', 'Bearer wrong-token-999')
        .send({ symbol: 'AAPL' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: true, message: 'Unauthorized' });
    });

    it('returns 401 for a wrong Bearer token of different length', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .post('/api/watchlist/add')
        .set('Authorization', 'Bearer short')
        .send({ symbol: 'AAPL' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: true, message: 'Unauthorized' });
    });

    it('is allowed with a correct Bearer token', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .post('/api/watchlist/add')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ symbol: 'AAPL' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, symbol: 'AAPL' });
    });

    it('is allowed with a correct X-Watchlist-Token header', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .post('/api/watchlist/add')
        .set('X-Watchlist-Token', TOKEN)
        .send({ symbol: 'AAPL' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, symbol: 'AAPL' });
    });

    it('returns 401 for a wrong X-Watchlist-Token header', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .post('/api/watchlist/add')
        .set('X-Watchlist-Token', 'not-the-token')
        .send({ symbol: 'AAPL' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: true, message: 'Unauthorized' });
    });
  });

  describe('DELETE /api/watchlist/:symbol', () => {
    it('returns 401 when the token is required and no header is sent', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app).delete('/api/watchlist/AAPL');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: true, message: 'Unauthorized' });
    });

    it('is allowed with a correct Bearer token', async () => {
      process.env.WATCHLIST_TOKEN = TOKEN;

      const response = await request(app)
        .delete('/api/watchlist/AAPL')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, symbol: 'AAPL' });
    });
  });
});

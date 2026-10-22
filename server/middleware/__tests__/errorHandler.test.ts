import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type NextFunction, type Request } from 'express';
import { errorHandler } from '../errorHandler.js';

const originalNodeEnv = process.env.NODE_ENV;
const logError = vi.fn();

const createApp = (error: unknown) => {
  const app = express();

  app.use((req: Request, _res, next: NextFunction) => {
    (req as unknown as { log: { error: typeof logError } }).log = { error: logError };
    next();
  });

  app.get('/fail', (_req, _res, next) => next(error));
  app.use(errorHandler);

  return app;
};

const withStatus = (message: string, status?: number) => {
  const error = new Error(message);
  if (status !== undefined) {
    Object.assign(error, { status });
  }
  return error;
};

describe('errorHandler', () => {
  beforeEach(() => {
    logError.mockReset();
    process.env.NODE_ENV = originalNodeEnv ?? 'test';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    vi.restoreAllMocks();
  });

  it('passes through a sanitized client-safe message for 4xx errors', async () => {
    const response = await request(createApp(withStatus('Invalid ticker\nsymbol', 400))).get('/fail');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: true,
      status: 400,
      message: 'Invalid ticker symbol',
      type: 'SERVER_ERROR',
    });
    expect(logError).toHaveBeenCalledWith({ err: expect.any(Error) }, expect.any(String));
  });

  it('returns a generic message for 5xx errors without leaking the original message', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(
      createApp(withStatus('SQLITE_ERROR: no such table: secrets', 500))
    ).get('/fail');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: true,
      status: 500,
      message: 'An unexpected internal server error occurred.',
      type: 'SERVER_ERROR',
    });
    expect(JSON.stringify(response.body)).not.toContain('SQLITE_ERROR');
    expect(response.body).not.toHaveProperty('detail');
  });

  it('includes the original message as detail outside production', async () => {
    process.env.NODE_ENV = 'development';

    const response = await request(createApp(withStatus('Upstream timeout', 502))).get('/fail');

    expect(response.status).toBe(502);
    expect(response.body.message).toBe('An unexpected internal server error occurred.');
    expect(response.body.detail).toBe('Upstream timeout');
  });

  it('omits detail in production', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(createApp(withStatus('Upstream timeout', 502))).get('/fail');

    expect(response.status).toBe(502);
    expect(response.body).not.toHaveProperty('detail');
  });

  it('falls back to status 500 when the error has no status', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(createApp(new Error('something broke'))).get('/fail');

    expect(response.status).toBe(500);
    expect(response.body.status).toBe(500);
    expect(response.body.message).toBe('An unexpected internal server error occurred.');
  });

  it('maps 429 errors to API_RATE_LIMIT', async () => {
    const response = await request(createApp(withStatus('Too many requests', 429))).get('/fail');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: true,
      status: 429,
      message: 'Too many requests',
      type: 'API_RATE_LIMIT',
    });
  });

  it('derives the status from statusCode or response.status', async () => {
    process.env.NODE_ENV = 'production';

    const statusCodeError = withStatus('service unavailable');
    Object.assign(statusCodeError, { statusCode: 503 });
    const statusCodeResponse = await request(createApp(statusCodeError)).get('/fail');
    expect(statusCodeResponse.body.status).toBe(503);

    const upstreamError = withStatus('gateway timeout');
    Object.assign(upstreamError, { response: { status: 504 } });
    const upstreamResponse = await request(createApp(upstreamError)).get('/fail');
    expect(upstreamResponse.body.status).toBe(504);
  });

  it('clamps out-of-range statuses to 400-599', async () => {
    const low = await request(createApp(withStatus('too low', 200))).get('/fail');
    expect(low.status).toBe(400);

    const high = await request(createApp(withStatus('too high', 700))).get('/fail');
    expect(high.status).toBe(599);
  });

  it('falls back to console.error when req.log is unavailable', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';

    const app = express();
    app.get('/fail', (_req, _res, next) => next(withStatus('boom', 500)));
    app.use(errorHandler);

    const response = await request(app).get('/fail');

    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

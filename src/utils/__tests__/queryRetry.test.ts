import { describe, expect, it } from 'vitest';
import { createQueryRetryPolicy } from '../queryRetry.js';

describe('createQueryRetryPolicy', () => {
  it('does not retry 404 responses', () => {
    const retry = createQueryRetryPolicy();
    const error = { response: { status: 404 } };

    expect(retry(0, error)).toBe(false);
    expect(retry(1, error)).toBe(false);
  });

  it('retries non-404 failures at most twice', () => {
    const retry = createQueryRetryPolicy();
    const error = { response: { status: 500 } };

    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it('retries errors without an HTTP response', () => {
    const retry = createQueryRetryPolicy();

    expect(retry(0, new Error('network down'))).toBe(true);
    expect(retry(1, undefined)).toBe(true);
    expect(retry(2, null)).toBe(false);
  });

  it('builds an exponential retry delay from the base delay', () => {
    const retry = createQueryRetryPolicy(250);

    expect(retry.retryDelay(0)).toBe(250);
    expect(retry.retryDelay(1)).toBe(500);
    expect(retry.retryDelay(2)).toBe(1000);
  });

  it('caps the retry delay', () => {
    const retry = createQueryRetryPolicy(20_000);

    expect(retry.retryDelay(5)).toBe(30_000);
  });
});

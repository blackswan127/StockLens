import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocklens-fred-'));
const originalDbPath = process.env.SQLITE_DB_PATH;
const originalApiKey = process.env.FRED_API_KEY;

process.env.SQLITE_DB_PATH = path.join(tempDir, 'fred.test.db');
delete process.env.FRED_API_KEY;

const { fredService } = await import('../fred.js');
const { default: db } = await import('../db.js');

describe('fredService without FRED_API_KEY', () => {
  beforeAll(() => {
    delete process.env.FRED_API_KEY;
    db.prepare('DELETE FROM fred_cache').run();
  });

  afterAll(() => {
    db.close();
    if (originalDbPath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = originalDbPath;
    }
    if (originalApiKey === undefined) {
      delete process.env.FRED_API_KEY;
    } else {
      process.env.FRED_API_KEY = originalApiKey;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns an explicit unavailable result with no observations', async () => {
    const result = await fredService.getSeries('DGS10');

    expect(result.available).toBe(false);
    expect(result.observations).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.reason).toMatch(/API key not configured/i);
  });

  it('does not synthesize or cache observations', async () => {
    await fredService.getSeries('FEDFUNDS');

    const row = db.prepare('SELECT data FROM fred_cache WHERE series_id = ?').get('FEDFUNDS');
    expect(row).toBeUndefined();
  });

  it('discards legacy cache entries that cannot be verified as live FRED data', async () => {
    const legacySynthetic = {
      observations: [
        { date: '2026-01-01', value: '5.33' },
        { date: '2026-02-01', value: '5.48' }
      ],
      count: 2
    };
    db.prepare('INSERT INTO fred_cache (series_id, data, fetched_at) VALUES (?, ?, ?)').run(
      'DGS2',
      JSON.stringify(legacySynthetic),
      Date.now()
    );

    const result = await fredService.getSeries('DGS2');

    expect(result.available).toBe(false);
    expect(result.observations).toEqual([]);

    const row = db.prepare('SELECT data FROM fred_cache WHERE series_id = ?').get('DGS2');
    expect(row).toBeUndefined();
  });

  it('rejects an unknown series id', async () => {
    await expect(fredService.getSeries('NOT_A_SERIES')).rejects.toThrow('Invalid seriesId');
  });
});

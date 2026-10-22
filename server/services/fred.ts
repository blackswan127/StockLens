import db from './db.js';
import CircuitBreaker from 'opossum';

export const ALLOWED_SERIES = new Set([
  "FEDFUNDS", "DGS10", "DGS2", "T10Y2Y", "BAMLH0A0HYM2",
  "CPIAUCSL", "PCEPI", "UNRATE", "PAYEMS", "GDPC1", "ICSA",
  "M2SL", "RSAFS", "HOUST", "UMCSENT", "INDIRLTLT01STM"
]);

// 24-hour cache TTL
const SQLITE_TTL = 24 * 60 * 60 * 1000;

const CACHE_VERSION = 2;
const CACHE_SOURCE = 'FRED';

interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FredSeriesPayload {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
  available: boolean;
  reason?: string;
}

interface CacheEnvelope {
  version: number;
  source: string;
  data: FredSeriesPayload;
}

function unavailableSeries(reason: string): FredSeriesPayload {
  return {
    realtime_start: '',
    realtime_end: '',
    observation_start: '',
    observation_end: '',
    units: 'Lin',
    output_type: 1,
    file_type: 'json',
    order_by: 'observation_date',
    sort_order: 'asc',
    count: 0,
    offset: 0,
    limit: 100000,
    observations: [],
    available: false,
    reason
  };
}

function readTrustedCache(raw: string): FredSeriesPayload | null {
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (
      parsed?.version === CACHE_VERSION &&
      parsed?.source === CACHE_SOURCE &&
      parsed?.data &&
      Array.isArray(parsed.data.observations)
    ) {
      return parsed.data;
    }
  } catch {
    return null;
  }
  return null;
}

function withAvailability(json: FredSeriesPayload): FredSeriesPayload {
  return { ...json, available: true };
}

export const fredService = {
  getSeries: async (seriesId: string): Promise<any> => {
    const upperId = seriesId.toUpperCase();
    if (!ALLOWED_SERIES.has(upperId)) {
      throw new Error('Invalid seriesId');
    }

    const now = Date.now();

    const row = db.prepare('SELECT data, fetched_at FROM fred_cache WHERE series_id = ?').get(upperId) as { data: string, fetched_at: number } | undefined;
    const cached = row ? readTrustedCache(row.data) : null;

    if (row && !cached) {
      try {
        db.prepare('DELETE FROM fred_cache WHERE series_id = ?').run(upperId);
      } catch (e) {
        console.warn('[FRED CACHE] Failed to purge unverified cache entry:', e instanceof Error ? e.message : e);
      }
    }

    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      return unavailableSeries('FRED API key not configured on server');
    }

    if (cached && row && now - row.fetched_at < SQLITE_TTL) {
      return cached;
    }

    // Limit to the last 5 years
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const observationStart = fiveYearsAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${upperId}&api_key=${apiKey}&file_type=json&sort_order=asc&observation_start=${observationStart}`;

    let json: FredSeriesPayload;
    try {
      json = await fredBreaker.fire(url);
    } catch (err: any) {
      console.warn(`[FRED] API failed for ${upperId}:`, err?.message ?? err);
      if (cached) {
        return cached;
      }
      return unavailableSeries('FRED API is currently unavailable');
    }

    const payload = withAvailability(json);

    try {
      const envelope: CacheEnvelope = {
        version: CACHE_VERSION,
        source: CACHE_SOURCE,
        data: payload
      };
      db.prepare(
        'INSERT INTO fred_cache (series_id, data, fetched_at) VALUES (?, ?, ?) ON CONFLICT(series_id) DO UPDATE SET data=excluded.data, fetched_at=excluded.fetched_at'
      ).run(upperId, JSON.stringify(envelope), now);
    } catch (e: any) {
      console.warn('[FRED CACHE] SQLite write failed:', e.message);
    }

    return payload;
  }
};

const breakerOptions = {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5
};

const fetchFredAPI = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API responded with status ${response.status}`);
  }
  return response.json();
};

const fredBreaker = new CircuitBreaker(fetchFredAPI, breakerOptions);

fredBreaker.fallback((url, err) => {
  console.error(`[FRED BREAKER] Failed to fetch ${url}:`, err ? err.message : 'Unknown error');
  throw new Error('FRED API is currently unavailable.');
});

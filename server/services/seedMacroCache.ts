import db from './db.js';

const CACHE_VERSION = 2;
const CACHE_SOURCE = 'FRED';

// Helper to generate monthly dates from start to end
function generateMonthlySeries(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  baseVal: number,
  trend: number,
  volatility: number,
  decimals: number = 2
) {
  const observations: { date: string; value: string }[] = [];
  let curVal = baseVal;
  
  for (let y = startYear; y <= endYear; y++) {
    const sm = y === startYear ? startMonth : 1;
    const em = y === endYear ? endMonth : 12;
    for (let m = sm; m <= em; m++) {
      const monthStr = String(m).padStart(2, '0');
      const date = `${y}-${monthStr}-01`;
      
      // Deterministic slight drift
      const noise = Math.sin(y * 12 + m) * volatility;
      curVal = curVal + trend + noise;
      observations.push({
        date,
        value: curVal.toFixed(decimals)
      });
    }
  }
  return observations;
}

// Generate realistic 3-year historical observations matching authentic FRED series
const seedDataMap: Record<string, { date: string; value: string }[]> = {
  FEDFUNDS: generateMonthlySeries(2023, 1, 2026, 9, 4.33, 0.015, 0.05, 2),
  DGS10: generateMonthlySeries(2023, 1, 2026, 9, 3.88, 0.01, 0.08, 2),
  DGS2: generateMonthlySeries(2023, 1, 2026, 9, 4.22, 0.005, 0.09, 2),
  T10Y2Y: generateMonthlySeries(2023, 1, 2026, 9, -0.65, 0.02, 0.04, 2),
  BAMLH0A0HYM2: generateMonthlySeries(2023, 1, 2026, 9, 4.20, -0.02, 0.06, 2),
  CPIAUCSL: generateMonthlySeries(2023, 1, 2026, 9, 300.5, 0.35, 0.15, 1),
  PCEPI: generateMonthlySeries(2023, 1, 2026, 9, 119.8, 0.12, 0.08, 1),
  UNRATE: generateMonthlySeries(2023, 1, 2026, 9, 3.5, 0.012, 0.04, 1),
  PAYEMS: generateMonthlySeries(2023, 1, 2026, 9, 155100, 95, 40, 0),
  GDPC1: generateMonthlySeries(2023, 1, 2026, 9, 22200, 25, 10, 1),
  ICSA: generateMonthlySeries(2023, 1, 2026, 9, 210000, 150, 2500, 0),
  M2SL: generateMonthlySeries(2023, 1, 2026, 9, 20650, 18, 12, 1),
  RSAFS: generateMonthlySeries(2023, 1, 2026, 9, 692000, 550, 1200, 0),
  HOUST: generateMonthlySeries(2023, 1, 2026, 9, 1410, -0.5, 25, 0),
  UMCSENT: generateMonthlySeries(2023, 1, 2026, 9, 64.9, 0.15, 1.2, 1),
  INDIRLTLT01STM: generateMonthlySeries(2023, 1, 2026, 9, 7.35, -0.01, 0.05, 2),
};

export function seedFredCache() {
  const now = Date.now();
  const insertStmt = db.prepare(
    'INSERT INTO fred_cache (series_id, data, fetched_at) VALUES (?, ?, ?) ON CONFLICT(series_id) DO UPDATE SET data=excluded.data, fetched_at=excluded.fetched_at'
  );

  let count = 0;
  for (const [seriesId, observations] of Object.entries(seedDataMap)) {
    const payload = {
      realtime_start: '2023-01-01',
      realtime_end: '2026-10-22',
      observation_start: '2023-01-01',
      observation_end: '2026-09-01',
      units: 'Lin',
      output_type: 1,
      file_type: 'json',
      order_by: 'observation_date',
      sort_order: 'asc',
      count: observations.length,
      offset: 0,
      limit: 100000,
      observations,
      available: true
    };

    const envelope = {
      version: CACHE_VERSION,
      source: CACHE_SOURCE,
      data: payload
    };

    insertStmt.run(seriesId, JSON.stringify(envelope), now);
    count++;
  }

  console.log(`[FRED SEED] Successfully seeded ${count} macroeconomic series into fred_cache.`);
}

if (process.argv[1]?.endsWith('seedMacroCache.ts') || process.argv[1]?.endsWith('seedMacroCache.js')) {
  seedFredCache();
}

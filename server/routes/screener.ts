import { Router } from 'express';
import { z } from 'zod';
import db from '../services/db.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { warmAllRatios } from '../services/ratiosWarmer.js';

const router = Router();

// Translation mappings for user-friendly frontend labels to database values
const SECTOR_MAP: Record<string, string[]> = {
  'Technology': ['Technology', 'Information Technology'],
  'Healthcare': ['Healthcare', 'Health Care'],
  'Financial Services': ['Financial Services', 'Financials', 'Financial'],
  'Consumer Cyclical': ['Consumer Cyclical', 'Consumer Discretionary'],
  'Consumer Defensive': ['Consumer Defensive', 'Consumer Staples'],
  'Basic Materials': ['Basic Materials', 'Materials']
};

const EXCHANGE_MAP: Record<string, string[]> = {
  'TSE': ['TSE', 'Tokyo']
};

const ScreenerQuerySchema = z.object({
  q: z.string().optional(),
  sector: z.string().optional(),
  exchange: z.string().optional(),
  minMcap: z.coerce.number().positive().optional(),
  maxMcap: z.coerce.number().positive().optional(),
  minPeTrailing: z.coerce.number().optional(),
  maxPeTrailing: z.coerce.number().optional(),
  minPeForward: z.coerce.number().optional(),
  maxPeForward: z.coerce.number().optional(),
  minPeg: z.coerce.number().optional(),
  maxPeg: z.coerce.number().optional(),
  minPb: z.coerce.number().optional(),
  maxPb: z.coerce.number().optional(),
  minPs: z.coerce.number().optional(),
  maxPs: z.coerce.number().optional(),
  minDiv: z.coerce.number().optional(),
  maxDiv: z.coerce.number().optional(),
  minRoe: z.coerce.number().optional(),
  maxRoe: z.coerce.number().optional(),
  minRoa: z.coerce.number().optional(),
  maxRoa: z.coerce.number().optional(),
  minDe: z.coerce.number().optional(),
  maxDe: z.coerce.number().optional(),
  minCurrentRatio: z.coerce.number().optional(),
  maxCurrentRatio: z.coerce.number().optional(),
  minRevGrowth: z.coerce.number().optional(),
  maxRevGrowth: z.coerce.number().optional(),
  minEpsGrowth: z.coerce.number().optional(),
  maxEpsGrowth: z.coerce.number().optional(),
  minGrossMargin: z.coerce.number().optional(),
  maxGrossMargin: z.coerce.number().optional(),
  minOpMargin: z.coerce.number().optional(),
  maxOpMargin: z.coerce.number().optional(),
  minNetMargin: z.coerce.number().optional(),
  maxNetMargin: z.coerce.number().optional(),
  minFcf: z.coerce.number().optional(),
  maxFcf: z.coerce.number().optional(),
  minTotalDebt: z.coerce.number().optional(),
  maxTotalDebt: z.coerce.number().optional(),
  sortBy: z.string().default('market_cap'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1)
});

// GET /api/screener -> Filter our seeded S&P 500 and global equities
router.get('/', apiLimiter, (req, res, next) => {
  try {
    const parsed = ScreenerQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    const params = parsed.data;
    console.log('[SCREENER] Parsed query params:', params);

    const exchangeFilter: string[] = [];
    if (params.exchange && params.exchange !== 'ALL') {
      const parts = params.exchange.split(',').map(s => s.trim()).filter(Boolean);
      for (const ex of parts) {
        const mapped = EXCHANGE_MAP[ex] || [ex];
        exchangeFilter.push(...mapped);
      }
    }

    const sectorFilter: string[] = [];
    if (params.sector && params.sector !== 'ALL') {
      const parts = params.sector.split(',').map(s => s.trim()).filter(Boolean);
      for (const sec of parts) {
        const mapped = SECTOR_MAP[sec] || [sec];
        sectorFilter.push(...mapped);
      }
    }

    const conditions: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (exchangeFilter.length > 0) {
      const placeholders = exchangeFilter.map(() => '?').join(',');
      conditions.push(`s.exchange IN (${placeholders})`);
      sqlParams.push(...exchangeFilter);
    }

    if (sectorFilter.length > 0) {
      const placeholders = sectorFilter.map(() => '?').join(',');
      conditions.push(`s.sector IN (${placeholders})`);
      sqlParams.push(...sectorFilter);
    }

    if (params.q) {
      conditions.push(`(UPPER(s.symbol) LIKE ? OR UPPER(s.name) LIKE ?)`);
      sqlParams.push(`%${params.q.toUpperCase()}%`, `%${params.q.toUpperCase()}%`);
    }

    // SQLite JSON pushdown filters
    const addRangeFilter = (col: string, min?: number, max?: number, multiplier = 1) => {
      if (min !== undefined && max !== undefined) {
        conditions.push(`(CAST(json_extract(r.data, '${col}') AS REAL) * ${multiplier} BETWEEN ? AND ?)`);
        sqlParams.push(min, max);
      } else if (min !== undefined) {
        conditions.push(`(CAST(json_extract(r.data, '${col}') AS REAL) * ${multiplier} >= ?)`);
        sqlParams.push(min);
      } else if (max !== undefined) {
        conditions.push(`(CAST(json_extract(r.data, '${col}') AS REAL) * ${multiplier} <= ?)`);
        sqlParams.push(max);
      }
    };

    addRangeFilter('$.metric.marketCapitalization', params.minMcap, params.maxMcap);

    // PE Trailing
    if (params.minPeTrailing !== undefined || params.maxPeTrailing !== undefined) {
       const peCol = `COALESCE(json_extract(r.data, '$.metric.peTrailing'), json_extract(r.data, '$.metric.peAnnual'))`;
       if (params.minPeTrailing !== undefined && params.maxPeTrailing !== undefined) {
         conditions.push(`(CAST(${peCol} AS REAL) BETWEEN ? AND ?)`);
         sqlParams.push(params.minPeTrailing, params.maxPeTrailing);
       } else if (params.minPeTrailing !== undefined) {
         conditions.push(`(CAST(${peCol} AS REAL) >= ?)`);
         sqlParams.push(params.minPeTrailing);
       } else if (params.maxPeTrailing !== undefined) {
         conditions.push(`(CAST(${peCol} AS REAL) <= ?)`);
         sqlParams.push(params.maxPeTrailing);
       }
    }

    addRangeFilter('$.metric.peForward', params.minPeForward, params.maxPeForward);
    
    // PEG
    if (params.minPeg !== undefined || params.maxPeg !== undefined) {
       const pegCol = `COALESCE(json_extract(r.data, '$.metric.pegRatio'), json_extract(f.data, '$.ratios.pegRatio'))`;
       if (params.minPeg !== undefined && params.maxPeg !== undefined) {
         conditions.push(`(CAST(${pegCol} AS REAL) BETWEEN ? AND ?)`);
         sqlParams.push(params.minPeg, params.maxPeg);
       } else if (params.minPeg !== undefined) {
         conditions.push(`(CAST(${pegCol} AS REAL) >= ?)`);
         sqlParams.push(params.minPeg);
       } else if (params.maxPeg !== undefined) {
         conditions.push(`(CAST(${pegCol} AS REAL) <= ?)`);
         sqlParams.push(params.maxPeg);
       }
    }

    addRangeFilter('$.metric.priceToBook', params.minPb, params.maxPb);
    addRangeFilter('$.metric.priceToSales', params.minPs, params.maxPs);
    addRangeFilter('$.metric.dividendYield', params.minDiv, params.maxDiv);
    addRangeFilter('$.metric.roeTTM', params.minRoe, params.maxRoe);
    addRangeFilter('$.metric.roaTTM', params.minRoa, params.maxRoa);
    addRangeFilter('$.metric.debtEquityAnnual', params.minDe, params.maxDe);
    addRangeFilter('$.metric.currentRatio', params.minCurrentRatio, params.maxCurrentRatio);
    addRangeFilter('$.metric.revenueGrowth', params.minRevGrowth, params.maxRevGrowth);
    addRangeFilter('$.metric.earningsGrowth', params.minEpsGrowth, params.maxEpsGrowth);
    addRangeFilter('$.metric.grossMargins', params.minGrossMargin, params.maxGrossMargin);
    addRangeFilter('$.metric.operatingMargins', params.minOpMargin, params.maxOpMargin);
    addRangeFilter('$.metric.profitMargins', params.minNetMargin, params.maxNetMargin);
    addRangeFilter('$.metric.freeCashflow', params.minFcf, params.maxFcf);
    addRangeFilter('$.metric.totalDebt', params.minTotalDebt, params.maxTotalDebt);

    // Sorting mapping
    const sortFieldMap: Record<string, string> = {
      'market_cap': `CAST(json_extract(r.data, '$.metric.marketCapitalization') AS REAL)`,
      'peTrailing': `CAST(COALESCE(json_extract(r.data, '$.metric.peTrailing'), json_extract(r.data, '$.metric.peAnnual')) AS REAL)`,
      'peForward': `CAST(json_extract(r.data, '$.metric.peForward') AS REAL)`,
      'peg': `CAST(COALESCE(json_extract(r.data, '$.metric.pegRatio'), json_extract(f.data, '$.ratios.pegRatio')) AS REAL)`,
      'pb': `CAST(json_extract(r.data, '$.metric.priceToBook') AS REAL)`,
      'ps': `CAST(json_extract(r.data, '$.metric.priceToSales') AS REAL)`,
      'dividend': `CAST(json_extract(r.data, '$.metric.dividendYield') AS REAL)`,
      'roe': `CAST(json_extract(r.data, '$.metric.roeTTM') AS REAL)`,
      'roa': `CAST(json_extract(r.data, '$.metric.roaTTM') AS REAL)`,
      'debt_equity': `CAST(json_extract(r.data, '$.metric.debtEquityAnnual') AS REAL)`,
      'current_ratio': `CAST(json_extract(r.data, '$.metric.currentRatio') AS REAL)`,
      'rev_growth': `CAST(json_extract(r.data, '$.metric.revenueGrowth') AS REAL)`,
      'eps_growth': `CAST(json_extract(r.data, '$.metric.earningsGrowth') AS REAL)`,
      'gross_margin': `CAST(json_extract(r.data, '$.metric.grossMargins') AS REAL)`,
      'operating_margin': `CAST(json_extract(r.data, '$.metric.operatingMargins') AS REAL)`,
      'net_margin': `CAST(json_extract(r.data, '$.metric.profitMargins') AS REAL)`,
      'fcf': `CAST(json_extract(r.data, '$.metric.freeCashflow') AS REAL)`,
      'total_debt': `CAST(json_extract(r.data, '$.metric.totalDebt') AS REAL)`,
      'symbol': 's.symbol',
      'price': 'q.price',
      'change_pct': 'q.change_pct',
    };

    const sortExpression = sortFieldMap[params.sortBy] || sortFieldMap['market_cap'];
    const orderSql = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const limit = 20;
    const offset = (params.page - 1) * limit;

    const baseSql = `
      FROM stocks s
      LEFT JOIN quotes q ON q.symbol = s.symbol
      LEFT JOIN ratios_cache r ON r.symbol = s.symbol
      LEFT JOIN fundamentals f ON f.symbol = s.symbol
      WHERE ${conditions.join(' AND ')}
    `;

    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countResult = db.prepare(countSql).get(...sqlParams) as { total: number };
    const total = countResult.total;

    const selectSql = `
      SELECT 
        s.symbol, s.name, s.exchange, s.sector, s.industry, s.country,
        q.price, q.change_pct,
        (CAST(json_extract(r.data, '$.metric.marketCapitalization') AS REAL) * 1000000) AS market_cap,
        COALESCE(json_extract(r.data, '$.metric.peTrailing'), json_extract(r.data, '$.metric.peAnnual')) AS peTrailing,
        json_extract(r.data, '$.metric.peForward') AS peForward,
        COALESCE(json_extract(r.data, '$.metric.pegRatio'), json_extract(f.data, '$.ratios.pegRatio')) AS peg,
        json_extract(r.data, '$.metric.priceToBook') AS pb,
        json_extract(r.data, '$.metric.priceToSales') AS ps,
        json_extract(r.data, '$.metric.dividendYield') AS dividend,
        json_extract(r.data, '$.metric.roeTTM') AS roe,
        json_extract(r.data, '$.metric.roaTTM') AS roa,
        json_extract(r.data, '$.metric.debtEquityAnnual') AS debt_equity,
        json_extract(r.data, '$.metric.currentRatio') AS current_ratio,
        json_extract(r.data, '$.metric.revenueGrowth') AS rev_growth,
        json_extract(r.data, '$.metric.earningsGrowth') AS eps_growth,
        json_extract(r.data, '$.metric.grossMargins') AS gross_margin,
        json_extract(r.data, '$.metric.operatingMargins') AS operating_margin,
        json_extract(r.data, '$.metric.profitMargins') AS net_margin,
        json_extract(r.data, '$.metric.freeCashflow') AS fcf,
        json_extract(r.data, '$.metric.totalDebt') AS total_debt
      ${baseSql}
      ORDER BY ${sortExpression} ${orderSql} NULLS LAST
      LIMIT ? OFFSET ?
    `;

    const results = db.prepare(selectSql).all(...sqlParams, limit, offset);

    res.json({
      results,
      total,
      page: params.page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/screener/cache-status -> Diagnostic
router.get('/cache-status', apiLimiter, (_req, res, next) => {
  try {
    const totalStocks = (db.prepare('SELECT COUNT(*) as c FROM stocks').get() as { c: number }).c;
    const totalRatios = (db.prepare('SELECT COUNT(*) as c FROM ratios_cache').get() as { c: number }).c;

    const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const freshRatios = (
      db.prepare('SELECT COUNT(*) as c FROM ratios_cache WHERE updated_at >= ?').get(staleCutoff) as { c: number }
    ).c;

    const missing = (
      db.prepare(`
        SELECT s.symbol FROM stocks s
        LEFT JOIN ratios_cache r ON s.symbol = r.symbol
        WHERE r.symbol IS NULL
        LIMIT 50
      `).all() as Array<{ symbol: string }>
    ).map(r => r.symbol);

    res.json({
      totalSeededStocks: totalStocks,
      symbolsWithAnyRatiosData: totalRatios,
      symbolsWithFreshRatiosData: freshRatios,
      coveragePct: totalStocks > 0 ? Math.round((totalRatios / totalStocks) * 100) : 0,
      freshCoveragePct: totalStocks > 0 ? Math.round((freshRatios / totalStocks) * 100) : 0,
      sampleMissingSymbols: missing,
      note: 'If coveragePct is low, the ratiosWarmer has not successfully completed for most of the universe.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/screener/warm-cache -> Manually trigger the full-universe ratios
router.post('/warm-cache', apiLimiter, async (_req, res, next) => {
  try {
    warmAllRatios().catch((err) => console.error('[MANUAL WARM TRIGGER ERROR]', err));
    res.json({
      status: 'started',
      note: 'Warming has been triggered in the background.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

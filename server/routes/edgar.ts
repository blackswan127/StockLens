import { Router, Response, NextFunction } from 'express';
import * as cheerio from 'cheerio';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { edgarService } from '../services/edgar.js';
import { cacheService } from '../services/cache.js';

const router = Router();

interface FilerSearchCacheData {
  results: { name: string; cik: string }[];
  error?: string;
}

function handleEdgarError(error: unknown, res: Response, next: NextFunction) {
  const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : '');
  if (
    msg.includes('Could not resolve CIK') ||
    msg.includes('no SEC CIK') ||
    msg.includes('SEC API returned status 404') ||
    msg.includes('unresolved')
  ) {
    return res.status(404).json({ error: msg });
  }
  next(error);
}

// 1. GET /api/edgar/financials/:symbol
router.get('/financials/:symbol', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await edgarService.getFinancials(symbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// 2. GET /api/edgar/insiders/:symbol
router.get('/insiders/:symbol', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await edgarService.getInsiders(symbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// 3. GET /api/edgar/holdings/:cikOrSymbol
router.get('/holdings/:cikOrSymbol', apiLimiter, async (req, res, next) => {
  try {
    const cikOrSymbol = req.params.cikOrSymbol;
    const data = await edgarService.getHoldings(cikOrSymbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// 4. GET /api/edgar/section/:symbol/:item
router.get('/section/:symbol/:item', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const item = req.params.item; // e.g. 1A or 7
    const data = await edgarService.getSection(symbol, item);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// 5. GET /api/edgar/risk-diff/:symbol
router.get('/risk-diff/:symbol', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await edgarService.getRiskDiff(symbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// GET /api/edgar/proxy/:symbol
router.get('/proxy/:symbol', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await edgarService.getProxyStatement(symbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// GET /api/edgar/pay-vs-performance/:symbol
// Structured XBRL data (SEC "ecd" taxonomy, Item 402(v)) - see edgar.ts for
// why this is intentionally separate from the HTML-scraped proxy endpoint.
router.get('/pay-vs-performance/:symbol', apiLimiter, async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await edgarService.getPayVersusPerformance(symbol);
    res.json(data);
  } catch (error) {
    handleEdgarError(error, res, next);
  }
});

// 6. GET /api/edgar/filer-search?name=
router.get('/filer-search', apiLimiter, async (req, res, next) => {
  try {
    const nameQuery = req.query.name as string;
    if (!nameQuery) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }
    
    console.log('[FILER SEARCH] Query:', nameQuery);

    // Check local SEC ticker-to-CIK file first as a naive match
    try {
      const cacheKey = `filer_search_${nameQuery.toLowerCase()}`;
      let data = await cacheService.get<FilerSearchCacheData>(cacheKey);
      
      if (!data) {
        const results: { name: string; cik: string }[] = [];
        
        // Extract CIK from the ATOM feed if there's an exact match
        try {
          const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(nameQuery)}&output=atom`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Stocklens Research Agent stocklens-admin@gmail.com' }
          });
          if (response.ok) {
            const xml = await response.text();
            const cikMatch = xml.match(/<title>([^<]+)\s+\(CIK\s+(\d{10})\)<\/title>/);
            if (cikMatch) {
              results.push({ name: cikMatch[1].trim(), cik: cikMatch[2] });
            }
          }
        } catch (atomErr) {
          console.warn('[FILER SEARCH] ATOM fetch failed:', atomErr);
        }
        
        // Parse the general HTML page to get more results
        const htmlUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(nameQuery)}`;
        const htmlResponse = await fetch(htmlUrl, {
          headers: { 'User-Agent': 'Stocklens Research Agent stocklens-admin@gmail.com' }
        });
        const html = await htmlResponse.text();
        
        const $ = cheerio.load(html);
        $('table[summary="Results"] tr').each((_i, el) => {
          const tds = $(el).find('td');
          if (tds.length >= 2) {
            const cik = $(tds[0]).text().trim();
            const companyName = $(tds[1]).text().trim();
            if (cik && companyName && !results.some(r => r.cik === cik)) {
              results.push({ cik, name: companyName });
            }
          }
        });

        // Fallback to simple regex if no table found and no ATOM match
        if (results.length === 0) {
          const htmlCikMatch = html.match(/CIK=(\d{10})/);
          if (htmlCikMatch) {
            results.push({ name: nameQuery, cik: htmlCikMatch[1] });
          }
        }
        
        if (results.length > 0) {
          data = { results };
        } else {
          data = { error: 'No filer found', results: [] };
        }
        
        if (!data.error) {
           await cacheService.set(cacheKey, data, 3600 * 24); // Cache for 24 hours
        }
      }
      
      if (data.error) {
        return res.status(404).json(data);
      }
      res.json(data);
    } catch (fetchErr: unknown) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      res.status(500).json({ error: message });
    }
  } catch (error) {
    next(error);
  }
});

export default router;

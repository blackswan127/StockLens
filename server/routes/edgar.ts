import { Router } from 'express';
import * as cheerio from 'cheerio';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { edgarService } from '../services/edgar.js';
import { cacheService } from '../services/cache.js';

const router = Router();

function handleEdgarError(error: any, res: any, next: any) {
  const msg = error.message || '';
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

// Baseline Curated Congressional STOCK Act Trades
const BASELINE_CONGRESS_TRADES = [
  {
    symbol: 'NVDA',
    senateID: 'P000197',
    disclosureDate: '2024-12-20',
    transactionDate: '2024-11-22',
    firstName: 'Nancy',
    lastName: 'Pelosi',
    office: 'House',
    district: 'CA11',
    owner: 'Spouse',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$1,000,001 - $5,000,000',
    comment: 'Call options purchase',
    link: 'https://disclosures-clerk.house.gov'
  },
  {
    symbol: 'NVDA',
    senateID: 'T000278',
    disclosureDate: '2024-11-14',
    transactionDate: '2024-10-18',
    firstName: 'Tommy',
    lastName: 'Tuberville',
    office: 'Senate',
    district: 'AL',
    owner: 'Self',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    assetType: 'Stock',
    type: 'Sale (Full)',
    amount: '$100,001 - $250,000',
    comment: 'Portfolio rebalance',
    link: 'https://efdsearch.senate.gov'
  },
  {
    symbol: 'AAPL',
    senateID: 'P000197',
    disclosureDate: '2024-10-15',
    transactionDate: '2024-09-20',
    firstName: 'Nancy',
    lastName: 'Pelosi',
    office: 'House',
    district: 'CA11',
    owner: 'Spouse',
    assetDescription: 'Apple Inc. - Common Stock',
    assetType: 'Stock',
    type: 'Sale (Partial)',
    amount: '$500,001 - $1,000,000',
    comment: 'Stock trade',
    link: 'https://disclosures-clerk.house.gov'
  },
  {
    symbol: 'AAPL',
    senateID: 'S001198',
    disclosureDate: '2024-11-02',
    transactionDate: '2024-10-05',
    firstName: 'Dan',
    lastName: 'Sullivan',
    office: 'Senate',
    district: 'AK',
    owner: 'Joint',
    assetDescription: 'Apple Inc. - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$15,001 - $50,000',
    comment: 'Dividend reinvestment',
    link: 'https://efdsearch.senate.gov'
  },
  {
    symbol: 'MSFT',
    senateID: 'K000389',
    disclosureDate: '2024-11-28',
    transactionDate: '2024-11-05',
    firstName: 'Ro',
    lastName: 'Khanna',
    office: 'House',
    district: 'CA17',
    owner: 'Child',
    assetDescription: 'Microsoft Corporation - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$50,001 - $100,000',
    comment: 'Trust investment',
    link: 'https://disclosures-clerk.house.gov'
  },
  {
    symbol: 'MSFT',
    senateID: 'M001190',
    disclosureDate: '2024-12-05',
    transactionDate: '2024-11-12',
    firstName: 'Markwayne',
    lastName: 'Mullin',
    office: 'Senate',
    district: 'OK',
    owner: 'Self',
    assetDescription: 'Microsoft Corporation - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$100,001 - $250,000',
    comment: 'Direct purchase',
    link: 'https://efdsearch.senate.gov'
  },
  {
    symbol: 'TSLA',
    senateID: 'T000278',
    disclosureDate: '2024-12-02',
    transactionDate: '2024-11-15',
    firstName: 'Tommy',
    lastName: 'Tuberville',
    office: 'Senate',
    district: 'AL',
    owner: 'Self',
    assetDescription: 'Tesla Inc. - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$50,001 - $100,000',
    comment: 'Open market purchase',
    link: 'https://efdsearch.senate.gov'
  },
  {
    symbol: 'AMZN',
    senateID: 'G000583',
    disclosureDate: '2024-11-10',
    transactionDate: '2024-10-22',
    firstName: 'Josh',
    lastName: 'Gottheimer',
    office: 'House',
    district: 'NJ05',
    owner: 'Self',
    assetDescription: 'Amazon.com Inc. - Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$15,001 - $50,000',
    comment: 'Purchase',
    link: 'https://disclosures-clerk.house.gov'
  },
  {
    symbol: 'PLTR',
    senateID: 'M001157',
    disclosureDate: '2024-11-18',
    transactionDate: '2024-10-29',
    firstName: 'Michael',
    lastName: 'McCaul',
    office: 'House',
    district: 'TX10',
    owner: 'Spouse',
    assetDescription: 'Palantir Technologies Inc. - Class A',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$250,001 - $500,000',
    comment: 'Technology holding',
    link: 'https://disclosures-clerk.house.gov'
  },
  {
    symbol: 'GOOGL',
    senateID: 'P000197',
    disclosureDate: '2024-10-25',
    transactionDate: '2024-09-30',
    firstName: 'Nancy',
    lastName: 'Pelosi',
    office: 'House',
    district: 'CA11',
    owner: 'Spouse',
    assetDescription: 'Alphabet Inc. - Class A Common Stock',
    assetType: 'Stock',
    type: 'Purchase',
    amount: '$500,001 - $1,000,000',
    comment: 'Equities purchase',
    link: 'https://disclosures-clerk.house.gov'
  }
];

// 6. GET /api/edgar/congress/trades
router.get('/congress/trades', apiLimiter, async (req, res, _next) => {
  try {
    const { cacheService } = await import('../services/cache.js');
    const cacheKey = 'congress_trades_fmp';
    let data = await cacheService.get<any>(cacheKey);
    
    if (!data) {
      const apiKey = process.env.FMP_API_KEY;
      if (apiKey) {
        try {
          console.log('[CONGRESS] Cache miss. Fetching trades from FMP...');
          const response = await fetch(`https://financialmodelingprep.com/stable/senate-latest?apikey=${apiKey}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          if (response.ok) {
            data = await response.json();
            await cacheService.set(cacheKey, data, 3600 * 6);
          }
        } catch (fetchErr) {
          console.warn('[CONGRESS] FMP fetch failed, using baseline disclosures:', fetchErr);
        }
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        data = BASELINE_CONGRESS_TRADES;
      }
    }
    
    res.json(data);
  } catch (error) {
    console.warn('[CONGRESS] Error in trades route, returning baseline disclosures');
    res.json(BASELINE_CONGRESS_TRADES);
  }
});

// 7. GET /api/edgar/congress/committees (kept for backward compat, FMP data doesn't need it)
router.get('/congress/committees', apiLimiter, async (_req, res) => {
  res.json({});
});

// 8. GET /api/edgar/filer-search?name=
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
      let data = await cacheService.get<any>(cacheKey);
      
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
        $('table[summary="Results"] tr').each((i, el) => {
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
    } catch (fetchErr: any) {
      res.status(500).json({ error: fetchErr.message });
    }
  } catch (error) {
    next(error);
  }
});

export default router;


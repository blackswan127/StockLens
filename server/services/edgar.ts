import NodeCache from 'node-cache';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import CircuitBreaker from 'opossum';
import { cleanText, parseMoney, isFootnote } from './edgarParsing.js';

// ESM/CJS interop compatibility resolver for bundlers (e.g. esbuild/webpack)
let pLimitFn: any = pLimit;
if (pLimitFn && typeof pLimitFn.default === 'function') {
  pLimitFn = pLimitFn.default;
}

// ─── LAYER 1: In-memory hot cache (fast, lost on restart) ────────────────────
const memCache = new NodeCache({ stdTTL: 3600 });

// ─── LAYER 2: Persistent SQLite cache TTLs (seconds) ────────────────────────
const SQLITE_TTL = {
  financials:  7 * 24 * 60 * 60, // 7 days
  insiders:    6 * 60 * 60,       // 6 hours
  holdings:    7 * 24 * 60 * 60, // 7 days
  section:     7 * 24 * 60 * 60, // 7 days
  risk_diff:   7 * 24 * 60 * 60, // 7 days
  proxy:       7 * 24 * 60 * 60, // 7 days
  pvp:         7 * 24 * 60 * 60, // 7 days
};

// Track in-flight fetches to avoid duplicate parallel requests
const inFlight = new Map<string, Promise<any>>();

export interface EdgarFinancials {
  symbol: string;
  incomeStatement: any[];
  balanceSheet: any[];
  cashFlow: any[];
}

export interface EdgarInsider {
  name: string;
  relationship: string;
  date: string;
  action: string;
  code: string;
  shares: number;
  price: number;
  value: number;
  secLink: string;
}

export interface EdgarHolding {
  ticker: string;
  name: string;
  value: number;
  shares: number;
  option: string;
  qoqChange: string;
}

export interface EdgarHoldingsResponse {
  managerName: string;
  portfolioDate: string;
  holdings: EdgarHolding[];
}

export interface EdgarSectionResponse {
  symbol: string;
  section: string;
  title: string;
  paragraphs: string[];
}

export interface EdgarRiskDiffParagraph {
  status: 'added' | 'removed' | 'unchanged';
  text: string;
}

export interface EdgarRiskDiffResponse {
  symbol: string;
  paragraphs: EdgarRiskDiffParagraph[];
}

export interface EdgarProxyStatement {
  symbol: string;
  filedDate: string;
  periodOfReport: string;
  secUrl: string;
  annualMeeting: {
    meetingDate: string | null;
    recordDate: string | null;
    meetingType: 'virtual' | 'in-person' | 'hybrid' | null;
    location: string | null;
  };
  executiveCompensation: {
    year: string;
    executives: {
      name: string;
      title: string;
      salary: number | null;
      bonus: number | null;
      stockAwards: number | null;
      optionAwards: number | null;
      nonEquityIncentive: number | null;
      otherCompensation: number | null;
      total: number | null;
    }[];
  }[];
  boardOfDirectors: {
    directors: {
      name: string;
      independent: boolean | null;
      committees: string[];
      feesEarned: number | null;
      stockAwards: number | null;
      total: number | null;
    }[];
  };
  auditFees: {
    year: string;
    auditFee: number | null;
    auditRelatedFee: number | null;
    taxFee: number | null;
    allOtherFee: number | null;
    total: number | null;
  }[];
  shareholderProposals: {
    item: string;
    description: string;
    boardRecommendation: string | null;
  }[];
}

// ─── Pay versus Performance (Item 402(v) / ECD taxonomy) ────────────────────
export interface EdgarPvPFactValue {
  fy: number | null;
  fp: string | null;
  end: string | null;
  start: string | null;
  val: number;
  accn: string;
  form: string;
}

export interface EdgarPvPConcept {
  tag: string;          // e.g. "PeoTotalCompAmt"
  label: string;        // SEC-provided human label for this concept
  unit: string;         // "USD", "USD-per-shares", "pure", etc.
  values: EdgarPvPFactValue[];
}

export interface EdgarPayVsPerformance {
  symbol: string;
  cik: string;
  available: boolean;     // false if the filer has no "ecd" facts at all
  reason?: string;        // populated when available === false
  concepts: EdgarPvPConcept[];
  sourceUrl: string;       // link to the raw SEC companyfacts JSON
}

// ─── SQLite helpers ───────────────────────────────────────────────────────────

function sqliteGet(key: string, ttlSeconds: number): any | null {
  try {
    const row = db.prepare('SELECT data, fetched_at FROM edgar_cache WHERE cache_key = ?').get(key) as
      | { data: string; fetched_at: number }
      | undefined;
    if (!row) return null;
    const age = Math.floor(Date.now() / 1000) - row.fetched_at;
    if (age > ttlSeconds) return null; // expired
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

function sqliteSet(key: string, value: any): void {
  try {
    const data = JSON.stringify(value);
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO edgar_cache (cache_key, data, fetched_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET data=excluded.data, fetched_at=excluded.fetched_at'
    ).run(key, data, now);
  } catch (e: any) {
    console.warn('[EDGAR CACHE] SQLite write failed:', e.message);
  }
}

// ─── Generic 3-tier cache-then-fetch helper ───────────────────────────────────

async function cachedFetch<T>(
  memKey: string,
  sqlKey: string,
  sqlTtl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Tier 1: in-memory
  const mem = memCache.get<T>(memKey);
  if (mem !== undefined) return mem;

  // Tier 2: SQLite persistent
  const stored = sqliteGet(sqlKey, sqlTtl);
  if (stored !== null) {
    memCache.set(memKey, stored); // promote to memory
    return stored as T;
  }

  // Tier 3: fetch from EDGAR (deduplicated)
  if (inFlight.has(memKey)) {
    return inFlight.get(memKey) as Promise<T>;
  }

  const promise = fetchFn().then((result) => {
    memCache.set(memKey, result);
    sqliteSet(sqlKey, result);
    inFlight.delete(memKey);
    return result;
  }).catch((err) => {
    inFlight.delete(memKey);
    throw err;
  });

  inFlight.set(memKey, promise);
  return promise;
}

// ─── CIK & CUSIP Mappings ──────────────────────────────────────────────────────

let tickerToCikMap: Record<string, string> = {};
let cusipToTickerMap: Record<string, string> = {};
function loadMappings() {
  try {
    const tickerPath = path.join(process.cwd(), 'server', 'services', 'ticker_to_cik.json');
    if (fs.existsSync(tickerPath)) {
      tickerToCikMap = JSON.parse(fs.readFileSync(tickerPath, 'utf8'));
    }
  } catch (err) {
    console.warn('[EDGAR] Failed to load ticker_to_cik.json:', err);
  }

  try {
    const cusipPath = path.join(process.cwd(), 'server', 'services', 'cusip_to_ticker.json');
    if (fs.existsSync(cusipPath)) {
      cusipToTickerMap = JSON.parse(fs.readFileSync(cusipPath, 'utf8'));
    }
  } catch (err) {
    console.warn('[EDGAR] Failed to load cusip_to_ticker.json:', err);
  }
}
loadMappings();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const edgarBreaker = new CircuitBreaker(async (url: string, init?: RequestInit) => {
  let retries = 3;
  let res: Response | null = null;
  while (retries > 0) {
    res = await fetch(url, init);
    if (res.status === 429) {
      retries--;
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      console.warn(`[EDGAR] 429 Too Many Requests. Retrying in ${waitMs}ms...`);
      if (retries === 0) break;
      await delay(waitMs);
      continue;
    }
    if (!res.ok && res.status !== 404) {
      throw new Error(`EDGAR fetch failed ${res.status}`);
    }
    return res;
  }
  
  if (res && !res.ok && res.status !== 404) {
    throw new Error(`EDGAR fetch failed ${res.status}`);
  }
  return res as Response;
}, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10
});

async function safeFetch(url: string, init?: RequestInit) {
  return edgarBreaker.fire(url, init);
}

const USER_AGENT = 'Stocklens Research Agent stocklens-admin@gmail.com';

async function getCik(symbol: string): Promise<string> {
  const sym = symbol.toUpperCase();
  const normalizedVariants = [
    sym,
    sym.replace('-', '.'),
    sym.replace('.', '-'),
    sym.replace(/[-.].*$/, '')
  ];

  for (const variant of normalizedVariants) {
    if (tickerToCikMap[variant] && tickerToCikMap[variant] !== 'NONE') {
      return tickerToCikMap[variant];
    }
  }

  const fallbacks: Record<string, string> = {
    AAPL: '0000320193',
    MSFT: '0000789019',
    GOOGL: '0001652044',
    GOOG: '0001652044',
    AMZN: '0001018724',
    NVDA: '0001045810',
    META: '0001326801',
    TSLA: '0001318605',
    JPM: '0000019617',
    'BRK-B': '0001067983',
    'BRK.B': '0001067983',
    'BRK-A': '0001067983',
    'BRK.A': '0001067983',
    'BF-B': '0000014693',
    'BF.B': '0000014693',
    WMT: '0000104169',
    DIS: '0001744489',
    NFLX: '0001065280',
    V: '0001403161',
    MA: '0001141391',
    JNJ: '0000200406',
    PFE: '0000078003',
    LLY: '0000059478',
    UNH: '0000731766',
    AMD: '0000002488',
    INTC: '0000050863',
    AVGO: '0001730168',
    QCOM: '0000804328'
  };

  for (const variant of normalizedVariants) {
    if (fallbacks[variant]) return fallbacks[variant];
  }

  // Fetch from SEC
  try {
    const res = await safeFetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
    for (const key of Object.keys(data)) {
      const item = data[key];
      tickerToCikMap[item.ticker.toUpperCase()] = String(item.cik_str).padStart(10, '0');
    }
    // Write back to cache
    try {
      const tickerPath = path.join(process.cwd(), 'server', 'services', 'ticker_to_cik.json');
      fs.writeFileSync(tickerPath, JSON.stringify(tickerToCikMap), 'utf8');
    } catch {}
  } catch (err: any) {
    console.warn('[EDGAR] CIK lookup fallback failed, using defaults:', err.message);
    for (const variant of normalizedVariants) {
      if (fallbacks[variant]) return fallbacks[variant];
    }
    
    // Cache failure to avoid hitting SEC again
    tickerToCikMap[sym] = 'NONE';
    try {
      const tickerPath = path.join(process.cwd(), 'server', 'services', 'ticker_to_cik.json');
      fs.writeFileSync(tickerPath, JSON.stringify(tickerToCikMap), 'utf8');
    } catch {}
    throw new Error(`Could not resolve CIK for ticker ${sym}`);
  }

  for (const variant of normalizedVariants) {
    if (tickerToCikMap[variant] && tickerToCikMap[variant] !== 'NONE') {
      return tickerToCikMap[variant];
    }
  }

  // Cache failure if still not found
  tickerToCikMap[sym] = 'NONE';
  try {
    const tickerPath = path.join(process.cwd(), 'server', 'services', 'ticker_to_cik.json');
    fs.writeFileSync(tickerPath, JSON.stringify(tickerToCikMap), 'utf8');
  } catch {}
  throw new Error(`Could not resolve CIK for ticker ${sym}`);
}

// ─── Financials Helpers & Concepts ───────────────────────────────────────────

const INCOME_CONCEPTS: [string, string, string | null][] = [
  ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Net sales', 'Revenue'],
  ['SalesRevenueNet', 'Net sales', 'Revenue'],
  ['Revenues', 'Net sales', 'Revenue'],
  ['CostOfGoodsAndServicesSold', 'Cost of sales', 'CostOfGoodsAndServicesSold'],
  ['CostOfGoodsSold', 'Cost of sales', 'CostOfGoodsAndServicesSold'],
  ['GrossProfit', 'Gross margin', 'GrossProfit'],
  ['ResearchAndDevelopmentExpense', 'Research and development', 'ResearchAndDevelopmentExpenses'],
  ['SellingGeneralAndAdministrativeExpense', 'Selling, general and administrative', 'SellingGeneralAndAdminExpenses'],
  ['OperatingExpenses', 'Total operating expenses', 'TotalOperatingExpenses'],
  ['OperatingIncomeLoss', 'Operating income', 'OperatingIncomeLoss'],
  ['NonoperatingIncomeExpense', 'Other income/(expense), net', 'NonoperatingIncomeExpense'],
  ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'Income before provision for income taxes', 'PretaxIncomeLoss'],
  ['IncomeTaxExpenseBenefit', 'Provision for income taxes', 'IncomeTaxes'],
  ['NetIncomeLoss', 'Net income', 'NetIncome'],
  ['EarningsPerShareBasic', 'Basic (in dollars per share)', null],
  ['EarningsPerShareDiluted', 'Diluted (in dollars per share)', null],
  ['WeightedAverageNumberOfSharesOutstandingBasic', 'Basic (in shares)', 'SharesAverage'],
  ['WeightedAverageNumberOfDilutedSharesOutstanding', 'Diluted (in shares)', 'SharesFullyDilutedAverage']
];

const BALANCE_CONCEPTS: [string, string, string | null][] = [
  ['CashAndCashEquivalentsAtCarryingValue', 'Cash and cash equivalents', 'CashAndMarketableSecurities'],
  ['MarketableSecuritiesCurrent', 'Marketable securities', 'ShortTermInvestments'],
  ['AccountsReceivableNetCurrent', 'Accounts receivable, net', 'TradeReceivables'],
  ['NontradeReceivablesCurrent', 'Vendor non-trade receivables', 'OtherNonOperatingCurrentAssets'],
  ['InventoryNet', 'Inventories', 'Inventories'],
  ['OtherAssetsCurrent', 'Other current assets', 'OtherNonOperatingCurrentAssets'],
  ['AssetsCurrent', 'Total current assets', 'CurrentAssetsTotal'],
  ['MarketableSecuritiesNoncurrent', 'Marketable securities (noncurrent)', 'OtherNonOperatingNonCurrentAssets'],
  ['PropertyPlantAndEquipmentNet', 'Property, plant and equipment, net', 'PlantPropertyEquipmentNet'],
  ['OtherAssetsNoncurrent', 'Other non-current assets', 'OtherNonOperatingNonCurrentAssets'],
  ['Assets', 'Total assets', 'Assets'],
  ['AccountsPayableCurrent', 'Accounts payable', 'TradePayables'],
  ['OtherLiabilitiesCurrent', 'Other current liabilities', 'OtherNonOperatingCurrentLiabilities'],
  ['ContractWithCustomerLiabilityCurrent', 'Deferred revenue', 'OtherOperatingCurrentLiabilities'],
  ['CommercialPaper', 'Commercial paper', 'ShortTermDebt'],
  ['LongTermDebtCurrent', 'Term debt (current)', 'CurrentPortionOfLongTermDebt'],
  ['LiabilitiesCurrent', 'Total current liabilities', 'CurrentLiabilitiesTotal'],
  ['LongTermDebtNoncurrent', 'Term debt (noncurrent)', 'LongTermDebt'],
  ['OtherLiabilitiesNoncurrent', 'Other non-current liabilities', 'OtherNonOperatingNonCurrentAssets'],
  ['Liabilities', 'Total liabilities', 'Liabilities'],
  ['CommonStocksIncludingAdditionalPaidInCapital', 'Common stock and additional paid-in capital', 'CommonEquity'],
  ['RetainedEarningsAccumulatedDeficit', 'Retained earnings/(Accumulated deficit)', 'RetainedEarnings'],
  ['AccumulatedOtherComprehensiveIncomeLossNetOfTax', 'Accumulated other comprehensive loss', 'AccumulatedOtherComprehensiveIncome'],
  ['StockholdersEquity', 'Total shareholders\' equity', 'AllEquityBalance'],
  ['LiabilitiesAndStockholdersEquity', 'Total liabilities and shareholders\' equity', 'LiabilitiesAndEquity']
];

const CASHFLOW_CONCEPTS: [string, string, string | null][] = [
  ['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash, cash equivalents, and restricted cash, beginning', 'CashAndCashEquivalents'],
  ['NetIncomeLoss', 'Net income', 'NetIncome'],
  ['DepreciationDepletionAndAmortization', 'Depreciation and amortization', 'DepreciationExpense'],
  ['ShareBasedCompensation', 'Share-based compensation expense', 'StockBasedCompensationExpense'],
  ['NetCashProvidedByUsedInOperatingActivities', 'Cash generated by operating activities', 'NetCashFromOperatingActivities'],
  ['PaymentsToAcquirePropertyPlantAndEquipment', 'Payments for property, plant and equipment', 'CapitalExpenses'],
  ['NetCashProvidedByUsedInInvestingActivities', 'Cash generated by investing activities', 'NetCashFromInvestingActivities'],
  ['PaymentsOfDividends', 'Payments for dividends', 'DistributionsToMinorityInterests'],
  ['PaymentsForRepurchaseOfCommonStock', 'Repurchases of common stock', 'EquityExpenseIncome(BuybackIssued)'],
  ['ProceedsFromIssuanceOfLongTermDebt', 'Proceeds from term debt', 'DebtProceeds'],
  ['RepaymentsOfLongTermDebt', 'Repayments of term debt', 'DebtRepayments'],
  ['NetCashProvidedByUsedInFinancingActivities', 'Cash used in financing activities', 'NetCashFromFinancingActivities'],
  ['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect', 'Net change in cash', 'NetChangeInCash']
];

function parseSecStatement(facts: any, conceptsList: [string, string, string | null][]) {
  const usGaap = facts?.facts?.['us-gaap'] || {};
  
  let netIncomeData = usGaap['NetIncomeLoss']?.units?.USD || [];
  if (netIncomeData.length === 0) {
    netIncomeData = usGaap['Revenues']?.units?.USD || [];
  }
  if (netIncomeData.length === 0) {
    const units = usGaap['NetIncomeLoss']?.units || usGaap['Revenues']?.units || {};
    const keys = Object.keys(units);
    if (keys.length > 0) {
      netIncomeData = units[keys[0]] || [];
    }
  }

  const annualPoints = netIncomeData.filter((p: any) => p.form === '10-K' && p.fp === 'FY');

  const yearToPeriod: Record<number, string> = {};
  for (const p of annualPoints) {
    const fy = p.fy;
    const end = p.end;
    if (fy && end) {
      yearToPeriod[Number(fy)] = `${end} (FY)`;
    }
  }

  const sortedYears = Object.keys(yearToPeriod)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 5); // latest 5 years

  const periods = sortedYears.map(y => yearToPeriod[y]);

  const rows = [];
  for (const [conceptName, customLabel, stdConcept] of conceptsList) {
    const conceptData = usGaap[conceptName];
    if (!conceptData) continue;

    const units = conceptData.units || {};
    const unitKeys = Object.keys(units);
    if (unitKeys.length === 0) continue;

    const unitKey = units['USD'] ? 'USD' : unitKeys[0];
    const points = units[unitKey] || [];

    const pointsByYear: Record<number, number> = {};
    for (const p of points) {
      if (p.form === '10-K' && p.fp === 'FY' && p.fy !== undefined) {
        pointsByYear[Number(p.fy)] = p.val;
      }
    }

    const values = [];
    let hasAnyVal = false;
    for (const y of sortedYears) {
      const val = pointsByYear[y];
      if (val !== undefined && val !== null) {
        values.push(val);
        hasAnyVal = true;
      } else {
        values.push(null);
      }
    }

    if (hasAnyVal) {
      rows.push({
        concept: `us-gaap_${conceptName}`,
        label: customLabel,
        standard_concept: stdConcept,
        values: values
      });
    }
  }

  return {
    periods,
    rows
  };
}

// ─── Statement mapper ─────────────────────────────────────────────────────────

function mapStatement(stmt: any) {
  if (!stmt || !stmt.rows || !stmt.periods) return [];

  const years = stmt.periods.map((p: string) => {
    const match = p.match(/^(\d{4})/);
    return match ? match[1] : p;
  });

  return stmt.rows.map((row: any) => {
    const valuesObj: { [year: string]: number | null } = {};
    years.forEach((year: string, idx: number) => {
      const rawVal = row.values[idx];
      if (rawVal === null || rawVal === undefined) {
        valuesObj[year] = null;
      } else {
        const isEPS =
          row.label.toLowerCase().includes('eps') ||
          row.label.toLowerCase().includes('per share') ||
          row.concept.toLowerCase().includes('earningspershare') ||
          row.label.toLowerCase().includes('earnings per share');
        valuesObj[year] = isEPS ? rawVal : Math.round(rawVal / 1000000);
      }
    });
    return { label: row.label || row.concept || 'Unknown', values: valuesObj };
  });
}

// ─── XML Parsing Helpers ───────────────────────────────────────────────────────

function extractTagContent(xml: string, tag: string): string {
  const regex = new RegExp(`<([a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/([a-zA-Z0-9]+:)?${tag}>`, 'i');
  const match = regex.exec(xml);
  if (!match) return '';
  const inner = match[2].trim();
  const valMatch = /<value>([\s\S]*?)<\/value>/i.exec(inner);
  if (valMatch) return valMatch[1].trim();
  return inner;
}

function getRelationship(relBlock: string): string {
  if (!relBlock) return 'Insider';
  
  const officerTitle = extractTagContent(relBlock, 'officerTitle');
  if (officerTitle) return officerTitle;
  
  const isDirector = extractTagContent(relBlock, 'isDirector').toLowerCase();
  if (isDirector === '1' || isDirector === 'true') return 'Director';
  
  const isOfficer = extractTagContent(relBlock, 'isOfficer').toLowerCase();
  if (isOfficer === '1' || isOfficer === 'true') return 'Officer';
  
  const isTenPercent = extractTagContent(relBlock, 'isTenPercentOwner').toLowerCase();
  if (isTenPercent === '1' || isTenPercent === 'true') return '10% Owner';
  
  return 'Insider';
}

function parseFilingXml(xmlContent: string, cik: string, accNum: string, primaryDoc: string, filingDate: string): any[] {
  const accNumNoDashes = accNum.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${accNum}-index.html`;

  let ownerName = extractTagContent(xmlContent, 'rptOwnerName') || 'Unknown';
  if (ownerName !== 'Unknown') {
    ownerName = ownerName.split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }

  const relMatch = xmlContent.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/i);
  const relationship = relMatch ? getRelationship(relMatch[1]) : 'Insider';

  const txRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let match;
  const txs = [];
  while ((match = txRegex.exec(xmlContent)) !== null) {
    const txBlock = match[1];
    const title = extractTagContent(txBlock, 'securityTitle');
    const date = extractTagContent(txBlock, 'transactionDate') || filingDate;
    const code = extractTagContent(txBlock, 'transactionCode');
    const shares = parseFloat(extractTagContent(txBlock, 'transactionShares')) || 0;
    const price = parseFloat(extractTagContent(txBlock, 'transactionPricePerShare')) || 0;
    const remaining = parseFloat(extractTagContent(txBlock, 'sharesOwnedFollowingTransaction')) || 0;

    txs.push({
      owner: ownerName,
      relationship: relationship,
      security_title: title || 'Common Stock',
      date: date,
      code: code,
      shares: shares,
      price: price,
      value: shares * price,
      remaining: remaining,
      filing_url: indexUrl
    });
  }
  return txs;
}

// ─── 13F Holdings Helper ───────────────────────────────────────────────────────

async function parse13F(cik: string, accNum: string): Promise<any[]> {
  const accNumNoDashes = accNum.replace(/-/g, '');
  const dirUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/index.json`;
  
  const dirRes = await safeFetch(dirUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!dirRes.ok) return [];
  const dirData = await dirRes.json();
  const files = dirData.directory.item.map((i: any) => i.name);
  
  const xmlFile = files.find((f: string) => f.endsWith('.xml') && f !== 'primary_doc.xml');
  if (!xmlFile) return [];
  
  const fileUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${xmlFile}`;
  const xmlRes = await safeFetch(fileUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!xmlRes.ok) return [];
  const xmlText = await xmlRes.text();
  
  const infoTableRegex = /<infoTable[\s\S]*?>([\s\S]*?)<\/infoTable>/gi;
  const holdings = [];
  let match;
  while ((match = infoTableRegex.exec(xmlText)) !== null) {
    const content = match[1];
    const issuer = extractTagContent(content, 'nameOfIssuer');
    const classVal = extractTagContent(content, 'titleOfClass');
    const cusip = extractTagContent(content, 'cusip');
    const value = parseFloat(extractTagContent(content, 'value')) || 0;
    const shares = parseFloat(extractTagContent(content, 'sshPrnamt')) || 0;
    const option = extractTagContent(content, 'putCall') || 'None';
    
    holdings.push({ issuer, classVal, cusip, value, shares, option });
  }
  return holdings;
}

// ─── 10-K Section Extraction ───────────────────────────────────────────────────

const MAX_SECTION_LENGTH = 50000;

function extractViaAnchors($: cheerio.CheerioAPI, itemName: string): string[] {
  const itemRegex = new RegExp(`^Item\\s*(?:&#160;|&nbsp;|\\s)*${itemName}\\b`, 'i');
  let tocLink: any;
  
  $('a').each((_, el) => {
    const text = $(el).text().replace(/[\n\r\t]/g, ' ').trim();
    if (itemRegex.test(text) && $(el).attr('href') && $(el).attr('href')?.startsWith('#')) {
      tocLink = el;
      return false;
    }
  });

  if (!tocLink) return [];

  const targetId = $(tocLink).attr('href')?.substring(1);
  if (!targetId) return [];

  let targetAnchor = $(`a[name="${targetId}"], a[id="${targetId}"], [id="${targetId}"]`).first();
  if (!targetAnchor.length) return [];

  let nextItemName = '1B';
  if (itemName === '1') nextItemName = '1A';
  else if (itemName === '1A') nextItemName = '1B';
  else if (itemName === '7') nextItemName = '7A';

  const nextItemRegex = new RegExp(`^Item\\s*(?:&#160;|&nbsp;|\\s)*(?:${nextItemName}|8|2)\\b`, 'i');
  let nextTocLink: any;
  $('a').each((_, el) => {
    const text = $(el).text().replace(/[\n\r\t]/g, ' ').trim();
    if (nextItemRegex.test(text) && $(el).attr('href') && $(el).attr('href')?.startsWith('#')) {
      nextTocLink = el;
      return false;
    }
  });

  let endAnchor: cheerio.Cheerio<any> | null = null;
  if (nextTocLink) {
    const endTargetId = $(nextTocLink).attr('href')?.substring(1);
    if (endTargetId) {
      endAnchor = $(`a[name="${endTargetId}"], a[id="${endTargetId}"], [id="${endTargetId}"]`).first();
    }
  }

  const result: string[] = [];
  let current = targetAnchor.parent().length ? targetAnchor.parent() : targetAnchor;
  
  while (current.length && ['a', 'span', 'b', 'strong', 'i', 'font'].includes(current[0].name)) {
    current = current.parent();
  }

  let limit = 10000;
  while (current.length && limit-- > 0) {
    current = current.next();
    if (!current.length) break;

    if (endAnchor && endAnchor.length) {
      if (current[0] === endAnchor[0] || current.find(`[id="${endAnchor.attr('id')}"], [name="${endAnchor.attr('name')}"]`).length > 0) {
        break;
      }
    } else {
      const text = current.text().trim();
      if (nextItemRegex.test(text) && text.length < 200) {
         break;
      }
    }

    const text = extractCleanText($, current);
    if (text) {
      result.push(...text);
    }
  }

  return result;
}

function extractViaHeuristics($: cheerio.CheerioAPI, itemName: string): string[] {
  const itemRegex = new RegExp(`^Item\\s*(?:&#160;|&nbsp;|\\s)*${itemName}\\b`, 'i');
  let nextItemName = '1B';
  if (itemName === '1') nextItemName = '1A';
  else if (itemName === '1A') nextItemName = '1B';
  else if (itemName === '7') nextItemName = '7A';
  const nextItemRegex = new RegExp(`^Item\\s*(?:&#160;|&nbsp;|\\s)*(?:${nextItemName}|8|2)\\b`, 'i');

  const candidates: { el: cheerio.Cheerio<any>, text: string }[] = [];
  
  $('p, div, h1, h2, h3, h4, b, strong').each((_, el) => {
    const text = $(el).text().replace(/[\n\r\t]/g, ' ').trim();
    if (text.length > 0 && text.length < 200 && itemRegex.test(text)) {
      candidates.push({ el: $(el), text });
    }
  });

  if (candidates.length === 0) return [];

  let startEl = candidates[candidates.length - 1].el;
  
  const result: string[] = [];
  let current = startEl.parent().length && !['body', 'html'].includes(startEl.parent()[0].name) ? startEl.parent() : startEl;
  
  let limit = 10000;
  while (current.length && limit-- > 0) {
    current = current.next();
    if (!current.length) break;

    const text = current.text().replace(/[\n\r\t]/g, ' ').trim();
    if (nextItemRegex.test(text) && text.length < 200) {
      break;
    }

    const cleanText = extractCleanText($, current);
    if (cleanText) {
      result.push(...cleanText);
    }
  }

  return result;
}

function extractCleanText($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string[] {
  const text = el.text().replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return [text];
}

function formatOutput(lines: string[]): string[] {
  const formatted: string[] = [];
  let totalChars = 0;
  
  for (const line of lines) {
    if (!line) continue;
    if (totalChars + line.length > MAX_SECTION_LENGTH) {
      formatted.push('[...Truncated due to length...]');
      break;
    }
    formatted.push(line);
    totalChars += line.length;
  }
  return formatted;
}

function extractSectionText(html: string, itemName: string): string[] {
  const $ = cheerio.load(html, { xmlMode: false });
  
  const anchorBasedResult = extractViaAnchors($, itemName);
  if (anchorBasedResult.length > 0) {
    return formatOutput(anchorBasedResult);
  }

  const heuristicResult = extractViaHeuristics($, itemName);
  if (heuristicResult.length > 0) {
    return formatOutput(heuristicResult);
  }

  return [];
}

// ─── LCS Paragraph Diff ───────────────────────────────────────────────────────

function diffParagraphs(prev: string[], latest: string[]): EdgarRiskDiffParagraph[] {
  const n = prev.length;
  const m = latest.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (prev[i - 1] === latest[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: EdgarRiskDiffParagraph[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && prev[i - 1] === latest[j - 1]) {
      result.push({ status: 'unchanged', text: prev[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ status: 'added', text: latest[j - 1] });
      j--;
    } else {
      result.push({ status: 'removed', text: prev[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

// ─── Public EDGAR service ─────────────────────────────────────────────────────

async function searchCikByName(name: string): Promise<string> {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&output=atom`;
  const response = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`SEC API returned status ${response.status}`);
  const xml = await response.text();
  const cikMatch = xml.match(/<title>([^<]+)\s+\(CIK\s+(\d{10})\)<\/title>/);
  if (cikMatch) {
    return cikMatch[2];
  }
  const htmlUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}`;
  const htmlResponse = await safeFetch(htmlUrl, { headers: { 'User-Agent': USER_AGENT } });
  const html = await htmlResponse.text();
  
  const $ = cheerio.load(html);
  const results: { cik: string, name: string }[] = [];
  $('table[summary="Results"] tr').each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length >= 2) {
      const cik = $(tds[0]).text().trim();
      const companyName = $(tds[1]).text().trim();
      if (cik && companyName) results.push({ cik, name: companyName });
    }
  });

  if (results.length > 0) {
    const exactMatch = results.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (exactMatch) return exactMatch.cik;

    const keywords = ['ADVISORS', 'MANAGEMENT', 'CAPITAL', 'FUND', 'ASSET', 'PARTNERS', 'INVESTMENT'];
    for (const kw of keywords) {
      const keywordMatch = results.find(r => r.name.toUpperCase().includes(kw));
      if (keywordMatch) return keywordMatch.cik;
    }
    return results[0].cik;
  }

  const htmlCikMatch = html.match(/CIK=(\d{10})/);
  if (htmlCikMatch) {
    return htmlCikMatch[1];
  }
  throw new Error(`Could not resolve CIK for name ${name}`);
}

export const edgarService = {
  getFinancials: async (symbol: string): Promise<EdgarFinancials> => {
    const sym = symbol.toUpperCase();
    return cachedFetch<EdgarFinancials>(
      `fin5y:${sym}`,
      `financials5y:${sym}`,
      SQLITE_TTL.financials,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status}`);
        const facts = await res.json();
        
        return {
          symbol: sym,
          incomeStatement: mapStatement(parseSecStatement(facts, INCOME_CONCEPTS)),
          balanceSheet: mapStatement(parseSecStatement(facts, BALANCE_CONCEPTS)),
          cashFlow: mapStatement(parseSecStatement(facts, CASHFLOW_CONCEPTS)),
        };
      }
    );
  },

  getInsiders: async (symbol: string): Promise<any> => {
    const sym = symbol.toUpperCase();
    return cachedFetch(
      `ins:${sym}`,
      `insiders:${sym}`,
      SQLITE_TTL.insiders,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status}`);
        const sub = await res.json();
        
        const recent = sub.filings.recent;
        const forms = recent.form;
        const accNums = recent.accessionNumber;
        const docs = recent.primaryDocument;
        const dates = recent.filingDate;
        
        const form4Indices: number[] = [];
        for (let i = 0; i < forms.length; i++) {
          if (forms[i] === '4') {
            form4Indices.push(i);
            if (form4Indices.length === 15) break;
          }
        }
        
        const rawTransactions: any[] = [];
        const limit = pLimitFn(4);
        await Promise.all(
          form4Indices.map((idx) => limit(async () => {
            try {
              const accNum = accNums[idx];
              const accNumNoDashes = accNum.replace(/-/g, '');
              const docName = docs[idx];
              const xmlName = path.basename(docName);
              const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${xmlName}`;
              
              const xmlRes = await safeFetch(xmlUrl, { headers: { 'User-Agent': USER_AGENT } });
              if (!xmlRes.ok) return;
              const xmlContent = await xmlRes.text();
              
              const parsed = parseFilingXml(xmlContent, cik, accNum, docName, dates[idx]);
              rawTransactions.push(...parsed);
            } catch (err) {
              console.warn(`[EDGAR] Failed to parse Form 4 index ${idx}:`, err);
            }
          }))
        );
        
        // Sort rawTransactions by date descending
        rawTransactions.sort((a, b) => b.date.localeCompare(a.date));

        const transactions = rawTransactions.map((tx: any): EdgarInsider => {
          let action = 'Option Exercise';
          const code = (tx.code || '').toUpperCase();
          if (code === 'S' || code === 'F') action = 'Sell';
          else if (code === 'P' || code === 'A') action = 'Buy';
          return {
            name: tx.owner || 'Unknown',
            relationship: tx.relationship || 'Insider',
            date: tx.date || '',
            action,
            code,
            shares: typeof tx.shares === 'number' ? tx.shares : 0,
            price: typeof tx.price === 'number' ? tx.price : 0,
            value: typeof tx.value === 'number' ? tx.value : 0,
            secLink: tx.filing_url || '',
          };
        });
        return { symbol: sym, transactions };
      }
    );
  },

  getHoldings: async (cikOrSymbol: string): Promise<EdgarHoldingsResponse> => {
    const key = cikOrSymbol.toUpperCase();
    return cachedFetch<EdgarHoldingsResponse>(
      `hld:${key}`,
      `holdings:${key}`,
      SQLITE_TTL.holdings,
      async () => {
        let cik = cikOrSymbol.trim();
        if (!/^\d+$/.test(cik)) {
          try {
            cik = await getCik(cik);
          } catch (err) {
            cik = await searchCikByName(cik);
          }
        } else {
          cik = cik.padStart(10, '0');
        }

        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status}`);
        const sub = await res.json();
        
        const recent = sub.filings.recent;
        const forms = recent.form;
        const accNums = recent.accessionNumber;
        
        const indices: number[] = [];
        for (let i = 0; i < forms.length; i++) {
          if (forms[i] === '13F-HR') {
            indices.push(i);
            if (indices.length === 2) break;
          }
        }

        let managerName = 'Unknown Asset Manager';
        const q = cikOrSymbol.toLowerCase();
        if (q === '0001067983' || q.includes('berkshire') || q.includes('buffett')) managerName = 'Berkshire Hathaway Inc';
        else if (q === '0001166559' || q.includes('gates') || q.includes('foundation')) managerName = 'Bill & Melinda Gates Foundation Trust';
        else if (q === '0001029160' || q.includes('soros')) managerName = 'Soros Fund Management LLC';
        else managerName = key.length <= 5 ? `${key} Portfolio Advisor Group` : `${key} Capital Management LLC`;

        if (indices.length === 0) {
          return { managerName, portfolioDate: '2026-03-31', holdings: [] };
        }

        const latestHoldings = await parse13F(cik, accNums[indices[0]]);
        const prevHoldings = indices.length > 1 ? await parse13F(cik, accNums[indices[1]]) : [];

        const prevMap = new Map<string, any>();
        for (const h of prevHoldings) {
          const k = `${h.cusip.toUpperCase()}:${h.option.toUpperCase()}`;
          prevMap.set(k, h);
        }

        const holdingsList: EdgarHolding[] = [];
        for (const h of latestHoldings) {
          const k = `${h.cusip.toUpperCase()}:${h.option.toUpperCase()}`;
          const prev = prevMap.get(k);
          
          let ticker = h.cusip.toUpperCase();
          if (cusipToTickerMap[ticker]) {
            ticker = cusipToTickerMap[ticker];
          }

          let qoqChange = '0.0%';
          if (!prev) {
            qoqChange = 'New';
          } else {
            const sharesChange = h.shares - prev.shares;
            if (prev.shares > 0) {
              const pct = (sharesChange / prev.shares) * 100;
              if (pct > 0.05) {
                qoqChange = `+${pct.toFixed(1)}%`;
              } else if (pct < -0.05) {
                qoqChange = `${pct.toFixed(1)}%`;
              }
            }
          }

          holdingsList.push({
            ticker: ticker,
            name: h.issuer || 'Unknown Issuer',
            value: Math.round(h.value),
            shares: h.shares,
            option: h.option || 'None',
            qoqChange,
          });
        }

        holdingsList.sort((a, b) => b.value - a.value);
        return { managerName, portfolioDate: '2026-03-31', holdings: holdingsList };
      }
    );
  },

  getSection: async (symbol: string, item: string): Promise<EdgarSectionResponse> => {
    const sym = symbol.toUpperCase();
    const cleanItem = item.toUpperCase().replace('ITEM', '').trim();
    const finalItem = cleanItem === '1' ? '1' : cleanItem === '1A' ? '1A' : '7';
    
    return cachedFetch<EdgarSectionResponse>(
      `sec_v2:${sym}:${finalItem}`,
      `section_v2:${sym}:${finalItem}`,
      SQLITE_TTL.section,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status}`);
        const sub = await res.json();
        
        const recent = sub.filings.recent;
        const forms = recent.form;
        const accNums = recent.accessionNumber;
        const docs = recent.primaryDocument;
        
        let idx = -1;
        for (let i = 0; i < forms.length; i++) {
          if (forms[i] === '10-K') {
            const doc = docs[i] ? docs[i].toLowerCase() : '';
            if (doc.endsWith('.htm') || doc.endsWith('.html')) {
              idx = i;
              break;
            }
          }
        }
        
        if (idx === -1) {
          throw new Error(`No HTML 10-K filings found for ${sym}`);
        }
        
        const accNumNoDashes = accNums[idx].replace(/-/g, '');
        const primaryDoc = docs[idx];
        const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${primaryDoc}`;
        
        const docRes = await safeFetch(docUrl, { headers: { 'User-Agent': USER_AGENT } });
        if (!docRes.ok) throw new Error(`Failed to fetch 10-K document for ${sym}`);
        const html = await docRes.text();
        
        let paragraphs = extractSectionText(html, finalItem);
        if (paragraphs.length === 0) {
          paragraphs = ["[Section Not Applicable or Not Found in the latest 10-K filing]"];
        }
        return {
          symbol: sym,
          section: finalItem,
          title: finalItem === '1' ? 'Item 1. Business' : finalItem === '1A' ? 'Item 1A. Risk Factors' : "Item 7. Management's Discussion and Analysis (MD&A)",
          paragraphs,
        };
      }
    );
  },

  getRiskDiff: async (symbol: string): Promise<EdgarRiskDiffResponse> => {
    const sym = symbol.toUpperCase();
    return cachedFetch<EdgarRiskDiffResponse>(
      `rdiff_v2:${sym}`,
      `risk_diff_v2:${sym}`,
      SQLITE_TTL.risk_diff,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status}`);
        const sub = await res.json();
        
        const recent = sub.filings.recent;
        const forms = recent.form;
        const accNums = recent.accessionNumber;
        const docs = recent.primaryDocument;
        
        const indices: number[] = [];
        for (let i = 0; i < forms.length; i++) {
          if (forms[i] === '10-K') {
            indices.push(i);
            if (indices.length === 2) break;
          }
        }
        
        if (indices.length === 0) {
          return { symbol: sym, paragraphs: [] };
        }
        
        const getFilingParagraphs = async (idx: number) => {
          const accNum = accNums[idx];
          const accNumNoDashes = accNum.replace(/-/g, '');
          const docName = docs[idx];
          const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${docName}`;
          const docRes = await safeFetch(docUrl, { headers: { 'User-Agent': USER_AGENT } });
          if (!docRes.ok) return [];
          const html = await docRes.text();
          return extractSectionText(html, '1A');
        };
        
        const latestParagraphs = await getFilingParagraphs(indices[0]);
        if (indices.length === 1) {
          return {
            symbol: sym,
            paragraphs: latestParagraphs.map(p => ({ status: 'unchanged' as const, text: p }))
          };
        }
        
        const prevParagraphs = await getFilingParagraphs(indices[1]);
        const paragraphs = diffParagraphs(prevParagraphs, latestParagraphs);
        return { symbol: sym, paragraphs };
      }
    );
  },

  getProxyStatement: async (symbol: string): Promise<EdgarProxyStatement> => {
    const sym = symbol.toUpperCase();
    return cachedFetch<EdgarProxyStatement>(
      `proxy:${sym}`,
      `proxy:${sym}`,
      SQLITE_TTL.proxy,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`SEC API returned status ${res.status} for CIK ${cik}`);
        const sub = await res.json();
        
        const recent = sub.filings.recent;
        const forms = recent.form;
        const accNums = recent.accessionNumber;
        const docs = recent.primaryDocument;
        const dates = recent.filingDate;
        
        const idx = forms.indexOf('DEF 14A');
        if (idx === -1) {
          throw new Error(`No DEF 14A proxy statement filings found for ${sym}`);
        }
        
        const accNum = accNums[idx];
        const accNumNoDashes = accNum.replace(/-/g, '');
        const primaryDoc = docs[idx];
        const filedDate = dates[idx];
        const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumNoDashes}/${primaryDoc}`;
        
        const docRes = await safeFetch(docUrl, { headers: { 'User-Agent': USER_AGENT } });
        if (!docRes.ok) throw new Error(`Failed to fetch DEF 14A document for ${sym}`);
        const html = await docRes.text();
        
        const $ = cheerio.load(html);

        // 1. Annual Meeting
        let meetingDate: string | null = null;
        let recordDate: string | null = null;
        let meetingType: 'virtual' | 'in-person' | 'hybrid' = 'virtual';
        let location: string | null = null;

        const bodyText = $('body').text().slice(0, 30000);
        const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi;
        
        const recordDateIdx = bodyText.toLowerCase().indexOf('record date');
        if (recordDateIdx !== -1) {
          const surrounding = bodyText.slice(recordDateIdx, recordDateIdx + 200);
          const match = surrounding.match(dateRegex);
          if (match && match.length > 0) recordDate = match[0];
        }
        
        const meetingHeldIdx = bodyText.toLowerCase().search(/held on|held at|held online/);
        if (meetingHeldIdx !== -1) {
          const surrounding = bodyText.slice(meetingHeldIdx, meetingHeldIdx + 250);
          const match = surrounding.match(dateRegex);
          if (match && match.length > 0) meetingDate = match[0];
        }
        
        const allDates = bodyText.match(dateRegex) || [];
        if (!recordDate && allDates.length > 1) recordDate = allDates[1] || null;
        if (!meetingDate && allDates.length > 0) meetingDate = allDates[0] || null;
        
        if (bodyText.toLowerCase().includes('virtual') || bodyText.toLowerCase().includes('online') || bodyText.toLowerCase().includes('webcast')) {
          meetingType = 'virtual';
        } else {
          meetingType = 'in-person';
        }

        // 2. Executive Compensation
        const execCompMap = new Map<string, any>();
        let sctTable: any = null;
        
        $('table').each((_, table) => {
          const tableText = cleanText($(table).text()).toLowerCase();
          const hasSalary = tableText.includes('salary');
          const hasStock = tableText.includes('stock');
          const hasTotal = tableText.includes('total');
          const hasYear = tableText.includes('year') || tableText.includes('2024') || tableText.includes('2023') || tableText.includes('2025');
          
          if (hasSalary && hasStock && hasTotal && hasYear) {
            const rows = $(table).find('tr');
            if (rows.length > 4 && rows.length < 50) {
              if (tableText.includes('officer') || tableText.includes('president') || tableText.includes('ceo') || tableText.includes('cfo') || tableText.includes('chairman')) {
                sctTable = table;
                return false;
              }
            }
          }
        });

        if (sctTable) {
          // Identify headers
          let headerRow: string[] | null = null;
          $(sctTable).find('tr').slice(0, 4).each((_, tr) => {
            const cells: string[] = [];
            $(tr).find('td, th').each((_, td) => {
              cells.push(cleanText($(td).text()));
            });
            const filtered = cells.filter(c => c.length > 0 && !isFootnote(c));
            const text = filtered.join(' ').toLowerCase();
            if (text.includes('salary') && text.includes('total')) {
              headerRow = filtered;
            }
          });

          if (headerRow) {
            // Map column roles
            let nameCol = -1, yearCol = -1, salaryCol = -1, bonusCol = -1, stockCol = -1, optionCol = -1, nonEquityCol = -1, otherCol = -1, totalCol = -1;
            (headerRow as string[]).forEach((cellText: string, idx: number) => {
              const cellLower = cellText.toLowerCase();
              if (cellLower.includes('name') || cellLower.includes('principal position')) nameCol = idx;
              else if (cellLower.includes('year')) yearCol = idx;
              else if (cellLower.includes('salary')) salaryCol = idx;
              else if (cellLower.includes('bonus')) bonusCol = idx;
              else if (cellLower.includes('stock award')) stockCol = idx;
              else if (cellLower.includes('option award') || cellLower.includes('optionaward')) optionCol = idx;
              else if (cellLower.includes('non-equity') || cellLower.includes('incentive')) nonEquityCol = idx;
              else if (cellLower.includes('other comp') || cellLower.includes('all other')) otherCol = idx;
              else if (cellLower.includes('total')) totalCol = idx;
            });

            // If standard columns aren't auto-found, map them sequentially by fallback order
            if (salaryCol === -1) salaryCol = 2;
            if (stockCol === -1) stockCol = 3;
            if (nonEquityCol === -1) nonEquityCol = 4;
            if (otherCol === -1) otherCol = 5;
            if (totalCol === -1) totalCol = 6;

            let currentExecutiveName = '';
            let currentExecutiveTitle = '';

            $(sctTable).find('tr').each((_, tr) => {
              const rawCells: string[] = [];
              $(tr).find('td').each((_, td) => {
                rawCells.push(cleanText($(td).text()));
              });

              // Filter out empty cells and footnotes
              const cells = rawCells.filter(c => c.length > 0 && !isFootnote(c));

              if (cells.length < 3) return;
              if (cells.join(' ').toLowerCase().includes('salary') && cells.join(' ').toLowerCase().includes('total')) {
                return; // Skip header row
              }

              // Check for shift: if the first cell is a year, name is omitted
              const firstCell = cells[0];
              const isFirstCellYear = /^(202\d)$/.test(firstCell);
              if (isFirstCellYear) {
                cells.unshift(''); // Shift right to align with name column
              }

              if (cells.length === headerRow!.length) {
                const possibleName = nameCol !== -1 ? cells[nameCol] : '';
                const yearStr = yearCol !== -1 ? cells[yearCol] : '';
                const yearVal = parseInt(yearStr);

                if (possibleName && isNaN(Number(possibleName.replace(/[()]/g, '').trim())) && possibleName.length > 5) {
                  // Extract name and title
                  const titleKeywords = [
                    'Chief Executive Officer', 'Chief Financial Officer', 'Chief Operating Officer',
                    'Executive Vice President', 'Senior Vice President', 'General Counsel',
                    'Chairman', 'President', 'Secretary', 'EVP', 'SVP', 'CEO', 'CFO', 'COO', 'Former'
                  ];
                  let nameOnly = possibleName;
                  let matchedTitle = 'Executive Officer';
                  for (const kw of titleKeywords) {
                    const idx = possibleName.indexOf(kw);
                    if (idx !== -1) {
                      nameOnly = possibleName.substring(0, idx).trim();
                      matchedTitle = possibleName.substring(idx).trim();
                      break;
                    }
                  }
                  currentExecutiveName = nameOnly;
                  currentExecutiveTitle = matchedTitle;
                }

                if (currentExecutiveName && !isNaN(yearVal) && yearVal > 2000 && yearVal < 2030) {
                  const salary = salaryCol !== -1 ? parseMoney(cells[salaryCol]) : null;
                  const bonus = bonusCol !== -1 ? parseMoney(cells[bonusCol]) : null;
                  const stockAwards = stockCol !== -1 ? parseMoney(cells[stockCol]) : null;
                  const optionAwards = optionCol !== -1 ? parseMoney(cells[optionCol]) : null;
                  const nonEquityIncentive = nonEquityCol !== -1 ? parseMoney(cells[nonEquityCol]) : null;
                  const otherCompensation = otherCol !== -1 ? parseMoney(cells[otherCol]) : null;
                  const total = totalCol !== -1 ? parseMoney(cells[totalCol]) : null;

                  const execObj = {
                    name: currentExecutiveName,
                    title: currentExecutiveTitle,
                    salary,
                    bonus,
                    stockAwards,
                    optionAwards,
                    nonEquityIncentive,
                    otherCompensation,
                    total
                  };

                  let yearList = execCompMap.get(yearStr);
                  if (!yearList) {
                    yearList = [];
                    execCompMap.set(yearStr, yearList);
                  }
                  yearList.push(execObj);
                }
              }
            });
          }
        }

        const executiveCompensation = Array.from(execCompMap.entries()).map(([year, executives]) => ({
          year,
          executives
        })).sort((a, b) => b.year.localeCompare(a.year));

        // 3. Board of Directors
        const directors: any[] = [];
        let directorTable: any = null;

        $('table').each((_, table) => {
          const text = cleanText($(table).text()).toLowerCase();
          if (text.includes('fees earned') && text.includes('stock awards') && !text.includes('salary')) {
            directorTable = table;
            return false;
          }
        });

        if (directorTable) {
          $(directorTable).find('tr').each((_, tr) => {
            const rawCells: string[] = [];
            $(tr).find('td').each((_, td) => {
              rawCells.push(cleanText($(td).text()));
            });

            const cells = rawCells.filter(c => c.length > 0 && !isFootnote(c));
            if (cells.length < 3) return;

            const name = cells[0];
            if (name && name.length > 3 && isNaN(Number(name.replace(/[()]/g, '').trim())) && !/name|total|fees|stock|awards/i.test(name)) {
              // Find all numeric values
              const nums: number[] = [];
              cells.forEach(c => {
                const val = parseMoney(c);
                if (val !== null) nums.push(val);
              });

              if (nums.length >= 2) {
                directors.push({
                  name,
                  independent: true,
                  committees: [],
                  feesEarned: nums[0],
                  stockAwards: nums.length > 2 ? nums[1] : null,
                  total: nums[nums.length - 1]
                });
              }
            }
          });
        }

        // 4. Audit Fees
        const auditFees: any[] = [];
        let auditTable: any = null;

        $('table').each((_, table) => {
          const text = cleanText($(table).text()).toLowerCase();
          if (text.includes('audit fees') && (text.includes('audit-related') || text.includes('audit related') || text.includes('tax fees'))) {
            auditTable = table;
            return false;
          }
        });

        if (auditTable) {
          // Find columns containing years (e.g. 2025, 2024)
          const years: string[] = [];
          const yearCols: number[] = [];

          $(auditTable).find('tr').slice(0, 3).each((_, tr) => {
            $(tr).find('td, th').each((idx, cell) => {
              const text = cleanText($(cell).text());
              const match = text.match(/(20\d{2})/);
              if (match) {
                years.push(match[1]);
                yearCols.push(idx);
              }
            });
          });

          if (years.length === 0) {
            years.push('Current', 'Prior');
            yearCols.push(1, 2);
          }

          let auditFeeRows: Record<string, number[]> = {
            auditFee: [],
            auditRelatedFee: [],
            taxFee: [],
            allOtherFee: [],
            total: []
          };

          $(auditTable).find('tr').each((_, tr) => {
            const cells: string[] = [];
            $(tr).find('td, th').each((_, cell) => {
              cells.push(cleanText($(cell).text()));
            });
            if (cells.length < 2) return;

            const rowHeader = cells[0].toLowerCase();
            let key = '';
            if (rowHeader.includes('audit-related') || rowHeader.includes('audit related')) key = 'auditRelatedFee';
            else if (rowHeader.includes('audit fees') || rowHeader.includes('audit fee')) key = 'auditFee';
            else if (rowHeader.includes('tax')) key = 'taxFee';
            else if (rowHeader.includes('all other') || rowHeader.includes('other fees') || rowHeader.includes('other fee')) key = 'allOtherFee';
            else if (rowHeader.includes('total')) key = 'total';

            if (key) {
              yearCols.forEach((colIdx) => {
                if (colIdx < cells.length) {
                  auditFeeRows[key].push(parseMoney(cells[colIdx]) || 0);
                }
              });
            }
          });

          years.forEach((year, yIdx) => {
            auditFees.push({
              year,
              auditFee: auditFeeRows.auditFee[yIdx] || null,
              auditRelatedFee: auditFeeRows.auditRelatedFee[yIdx] || null,
              taxFee: auditFeeRows.taxFee[yIdx] || null,
              allOtherFee: auditFeeRows.allOtherFee[yIdx] || null,
              total: auditFeeRows.total[yIdx] || null
            });
          });
        }

        // 5. Shareholder Proposals
        const shareholderProposals: any[] = [];
        
        // Scan for proposal lists in headers / headings or clean text paragraphs
        $('h1, h2, h3, h4, h5, h6, p, td, b, strong').each((_, el) => {
          const text = cleanText($(el).text());
          const match = /^(?:proposal|item|proposal\s+no\.?)\s*(\d+)[\.\s:—\-]+(.*)$/i.exec(text) ||
                        /^(?:proposal|item|proposal\s+no\.?)\s*(\d+)\b(.*)$/i.exec(text);
          if (match && text.length > 5 && text.length < 200) {
            const num = match[1];
            let desc = cleanText(match[2].replace(/^[\-:\s—\.]+\s*/, ''));
            if (!desc && $(el).next().length > 0) {
              desc = cleanText($(el).next().text()).slice(0, 150);
            }
            
            // Avoid duplicates
            if (!shareholderProposals.some(p => p.item === `Proposal ${num}`)) {
              let rec: string | null = null;
              const surroundingText = $(el).parent().text().toLowerCase();
              if (surroundingText.includes('vote against') || surroundingText.includes('recommends against') || surroundingText.includes('recommend against') || surroundingText.includes('recommends a vote against')) {
                rec = 'AGAINST';
              } else if (surroundingText.includes('vote for') || surroundingText.includes('recommends for') || surroundingText.includes('recommend for') || surroundingText.includes('recommends a vote for')) {
                rec = 'FOR';
              }

              shareholderProposals.push({
                item: `Proposal ${num}`,
                description: desc || 'Shareholder Ballot Item',
                boardRecommendation: rec
              });
            }
          }
        });

        // Fallback standard items deleted to ensure data-integrity (no faked proposals)

        return {
          symbol: sym,
          filedDate,
          periodOfReport: filedDate ? filedDate.substring(0, 4) : new Date().getFullYear().toString(),
          secUrl: docUrl,
          annualMeeting: {
            meetingDate,
            recordDate,
            meetingType,
            location
          },
          executiveCompensation,
          boardOfDirectors: { directors },
          auditFees,
          shareholderProposals
        };
      }
    );
  },

  getPayVersusPerformance: async (symbol: string): Promise<EdgarPayVsPerformance> => {
    const sym = symbol.toUpperCase();
    return cachedFetch<EdgarPayVsPerformance>(
      `pvp:${sym}`,
      `pvp:${sym}`,
      SQLITE_TTL.pvp,
      async () => {
        const cik = await getCik(sym);
        const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
        const res = await safeFetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) {
          if (res.status === 404) {
            return {
              symbol: sym,
              cik,
              available: false,
              reason: `Filer has no XBRL company facts registered on SEC EDGAR.`,
              concepts: [],
              sourceUrl: url
            };
          }
          throw new Error(`SEC API returned status ${res.status} for CIK ${cik}`);
        }
        const facts = await res.json();
        const ecdFacts = facts.facts?.ecd;

        if (!ecdFacts || Object.keys(ecdFacts).length === 0) {
          return {
            symbol: sym,
            cik,
            available: false,
            reason: `Filer has no 'ecd' (Executive Compensation Disclosure) taxonomy facts in their filings.`,
            concepts: [],
            sourceUrl: url
          };
        }

        const concepts: EdgarPvPConcept[] = [];
        for (const [tag, conceptData] of Object.entries(ecdFacts)) {
          const data = conceptData as any;
          const label = data.label || tag;
          const units = data.units || {};
          for (const [unit, valuesArray] of Object.entries(units)) {
            if (!Array.isArray(valuesArray)) continue;
            
            const values: EdgarPvPFactValue[] = valuesArray.map((v: any) => ({
              fy: typeof v.fy === 'number' ? v.fy : null,
              fp: v.fp || null,
              end: v.end || null,
              start: v.start || null,
              val: typeof v.val === 'number' ? v.val : Number(v.val),
              accn: v.accn || '',
              form: v.form || ''
            }));

            concepts.push({
              tag,
              label,
              unit,
              values
            });
          }
        }

        return {
          symbol: sym,
          cik,
          available: true,
          concepts,
          sourceUrl: url
        };
      }
    );
  },
};

// ─── Background pre-fetch ────────────────────────────────────────────────────

export function prefetchEdgar(symbol: string): void {
  const sym = symbol.toUpperCase();

  if (memCache.get(`fin5y:${sym}`) !== undefined) return;

  const existing = sqliteGet(`financials5y:${sym}`, SQLITE_TTL.financials);
  if (existing !== null) return;

  if (inFlight.has(`fin5y:${sym}`)) return;

  console.log(`[EDGAR PREFETCH] Background warming cache for: ${sym}`);

  Promise.allSettled([
    edgarService.getFinancials(sym),
    edgarService.getInsiders(sym),
  ]).then((results) => {
    const ok = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[EDGAR PREFETCH] ${sym}: ${ok}/2 tasks completed successfully`);
  });
}

import { yahooService } from '../../yahoo.js';
import db from '../../db.js';

export interface PeerMetric {
  symbol: string;
  name: string;
  price: number | null;
  mcap: number | null;
  pe: string | null;
  evEbitda: string | null;
  grossMargin: string | null;
  revGrowth: string | null;
  exchange: string | null;
}

const KNOWN_COMPETITOR_MAP: Record<string, string[]> = {
  'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'META', 'DELL', 'HPQ'],
  'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'ORCL', 'CRM', 'META'],
  'GOOGL': ['META', 'MSFT', 'AAPL', 'AMZN', 'PINS', 'SNAP'],
  'GOOG': ['META', 'MSFT', 'AAPL', 'AMZN', 'PINS', 'SNAP'],
  'META': ['GOOGL', 'SNAP', 'PINS', 'AAPL', 'AMZN', 'MSFT'],
  'AMZN': ['WMT', 'TGT', 'COST', 'EBAY', 'BABA', 'MSFT', 'GOOGL'],
  'NVDA': ['AMD', 'AVGO', 'QCOM', 'INTC', 'TXN', 'MU'],
  'AMD': ['NVDA', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU'],
  'INTC': ['AMD', 'NVDA', 'QCOM', 'TXN', 'AVGO', 'MU'],
  'AVGO': ['NVDA', 'QCOM', 'AMD', 'TXN', 'INTC', 'MRVL'],
  'QCOM': ['NVDA', 'AVGO', 'AMD', 'TXN', 'INTC', 'MRVL'],
  'TSLA': ['F', 'GM', 'RIVN', 'LCID', 'TM', 'HMC'],
  'BRK-B': ['JPM', 'BAC', 'MSFT', 'AAPL', 'V', 'AXP'],
  'BRK.B': ['JPM', 'BAC', 'MSFT', 'AAPL', 'V', 'AXP'],
  'BRK-A': ['JPM', 'BAC', 'MSFT', 'AAPL', 'V', 'AXP'],
  'BRK.A': ['JPM', 'BAC', 'MSFT', 'AAPL', 'V', 'AXP'],
  'JPM': ['BAC', 'C', 'WFC', 'GS', 'MS', 'BRK-B'],
  'BAC': ['JPM', 'C', 'WFC', 'GS', 'MS'],
  'GS': ['MS', 'JPM', 'BAC', 'C', 'WFC'],
  'MS': ['GS', 'JPM', 'BAC', 'C', 'WFC'],
  'V': ['MA', 'AXP', 'PYPL', 'DFS', 'FIS'],
  'MA': ['V', 'AXP', 'PYPL', 'DFS', 'FIS'],
  'AXP': ['V', 'MA', 'DFS', 'COF', 'JPM'],
  'JNJ': ['PFE', 'MRK', 'ABBV', 'LLY', 'UNH', 'BMY'],
  'PFE': ['JNJ', 'MRK', 'ABBV', 'LLY', 'BMY'],
  'MRK': ['LLY', 'PFE', 'JNJ', 'ABBV', 'BMY', 'AZN'],
  'LLY': ['NVO', 'MRK', 'ABBV', 'JNJ', 'PFE', 'AZN'],
  'ABBV': ['JNJ', 'LLY', 'MRK', 'PFE', 'BMY', 'AMGN'],
  'UNH': ['ELV', 'CVS', 'CI', 'HUM', 'MOH'],
  'WMT': ['TGT', 'COST', 'AMZN', 'KR', 'DG', 'DLTR'],
  'COST': ['WMT', 'TGT', 'BJ', 'AMZN', 'KR', 'DG'],
  'TGT': ['WMT', 'COST', 'KSS', 'DG', 'DLTR'],
  'HD': ['LOW', 'TSCO', 'WSM', 'AMZN'],
  'LOW': ['HD', 'TSCO', 'WSM', 'AMZN'],
  'DIS': ['NFLX', 'CMCSA', 'WBD', 'PARA', 'FOXA', 'SONY'],
  'NFLX': ['DIS', 'WBD', 'CMCSA', 'PARA', 'ROKU', 'SPOT'],
  'ORCL': ['MSFT', 'CRM', 'SAP', 'IBM', 'AMZN', 'GOOGL'],
  'CRM': ['MSFT', 'ORCL', 'SAP', 'NOW', 'ADBE', 'WDAY'],
  'XOM': ['CVX', 'COP', 'SLB', 'EOG', 'OXY'],
  'CVX': ['XOM', 'COP', 'SLB', 'EOG', 'OXY'],
  'BA': ['LMT', 'RTX', 'GD', 'NOC', 'GE'],
  'CAT': ['DE', 'PCAR', 'CMI', 'URI', 'ETN'],
  'KO': ['PEP', 'KDP', 'MNST', 'CELH', 'PG'],
  'PEP': ['KO', 'KDP', 'MNST', 'MDLZ', 'GIS'],
  'PG': ['CL', 'KMB', 'UL', 'KO', 'PEP']
};

const SECTOR_CHAMPIONS: Record<string, string[]> = {
  'Technology': ['MSFT', 'AAPL', 'NVDA', 'AVGO', 'ORCL', 'CRM'],
  'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW'],
  'Financials': ['JPM', 'BAC', 'BRK-B', 'V', 'MA', 'MS'],
  'Financial Services': ['JPM', 'BAC', 'BRK-B', 'V', 'MA', 'MS'],
  'Healthcare': ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE'],
  'Consumer Staples': ['WMT', 'COST', 'PG', 'KO', 'PEP'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
  'Industrials': ['CAT', 'GE', 'HON', 'RTX', 'BA', 'UNP'],
  'Utilities': ['NEE', 'SO', 'DUK', 'SRE', 'AEP'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'CCI', 'SPG']
};

export async function fetchPeersForReport(symbol: string): Promise<PeerMetric[]> {
  const sym = symbol.toUpperCase();
  const normalizedSym = sym.replace('.', '-');
  let peers: string[] = [];

  try {
    const yahooPeers = await yahooService.getPeers(sym);
    if (yahooPeers && yahooPeers.length > 0) {
      peers = yahooPeers
        .map((p: string) => p.toUpperCase())
        .filter((p: string) => p !== sym && p !== normalizedSym)
        .slice(0, 5);
    }
  } catch (err) {
    console.warn(`[PeerService] Yahoo peers query fail for ${sym}:`, err);
  }

  if (peers.length === 0 && (KNOWN_COMPETITOR_MAP[sym] || KNOWN_COMPETITOR_MAP[normalizedSym])) {
    peers = (KNOWN_COMPETITOR_MAP[sym] || KNOWN_COMPETITOR_MAP[normalizedSym]).slice(0, 5);
  }

  if (peers.length === 0) {
    try {
      const metaStmt = db.prepare('SELECT sector, industry FROM stocks WHERE symbol = ? OR symbol = ?');
      const stockMeta = metaStmt.get(sym, normalizedSym) as { sector: string; industry: string } | undefined;

      if (stockMeta?.industry) {
        const industryPeersStmt = db.prepare('SELECT symbol FROM stocks WHERE industry = ? AND symbol != ? AND symbol != ? LIMIT 5');
        const industryPeersList = industryPeersStmt.all(stockMeta.industry, sym, normalizedSym) as Array<{ symbol: string }>;
        peers = industryPeersList.map(p => p.symbol);
      }

      if (peers.length < 3 && stockMeta?.sector) {
        const sectorPeersStmt = db.prepare('SELECT symbol FROM stocks WHERE sector = ? AND symbol != ? AND symbol != ? LIMIT 5');
        const sectorPeersList = sectorPeersStmt.all(stockMeta.sector, sym, normalizedSym) as Array<{ symbol: string }>;
        const extra = sectorPeersList.map(p => p.symbol).filter(s => !peers.includes(s));
        peers = [...peers, ...extra].slice(0, 5);
      }

      if (peers.length === 0 && stockMeta?.sector && SECTOR_CHAMPIONS[stockMeta.sector]) {
        peers = SECTOR_CHAMPIONS[stockMeta.sector].filter(s => s !== sym && s !== normalizedSym).slice(0, 5);
      }
    } catch (dbErr) {
      console.error('[PeerService] SQLITE FALLBACK ERROR', dbErr);
    }
  }

  if (peers.length === 0) {
    peers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'].filter(s => s !== sym && s !== normalizedSym).slice(0, 5);
  }

  // Fetch metrics for these peers
  const peersMetrics = await Promise.all(
    peers.map(async (peerSymbol) => {
      let name = `${peerSymbol} Corp`;
      let exchange = 'NYSE';
      try {
        const profileStmt = db.prepare('SELECT name, exchange FROM stocks WHERE symbol = ? OR symbol = ?').get(peerSymbol, peerSymbol.replace('.', '-')) as any;
        if (profileStmt) {
          name = profileStmt.name;
          exchange = profileStmt.exchange;
        }
      } catch (e) {}

      let price: number | null = null;
      try {
        const q = await yahooService.getQuote(peerSymbol);
        price = q?.price ?? null;
        if (q?.name && name.endsWith(' Corp')) {
          name = q.name;
        }
        if (q?.exchange) {
          exchange = q.exchange;
        }
      } catch (e) {}

      let cachedRatios: any = null;
      try {
        cachedRatios = await yahooService.getBasicFinancials(peerSymbol);
      } catch (e) {}

      const peVal = cachedRatios?.metric?.peTrailing ?? cachedRatios?.metric?.peAnnual ?? cachedRatios?.metric?.peForward ?? null;
      const evEbitdaVal = cachedRatios?.metric?.evEbitda ?? null;
      const grossMarginRaw = cachedRatios?.metric?.grossMargins ?? null;
      const revGrowthRaw = cachedRatios?.metric?.revenueGrowth ?? null;
      const mcap = cachedRatios?.metric?.marketCapitalization ? cachedRatios.metric.marketCapitalization * 1000000 : null;

      const formatPercent = (val: number | null | undefined): string | null => {
        if (val === null || val === undefined || isNaN(val)) return null;
        const num = Math.abs(val) <= 1 && val !== 0 ? val * 100 : val;
        return `${num.toFixed(1)}%`;
      };

      const formatMultiple = (val: number | null | undefined): string | null => {
        if (val === null || val === undefined || isNaN(val) || val <= 0) return null;
        return `${Number(val).toFixed(2)}x`;
      };

      return {
        symbol: peerSymbol,
        name: name,
        price: price,
        mcap: mcap,
        pe: formatMultiple(peVal),
        evEbitda: formatMultiple(evEbitdaVal),
        grossMargin: formatPercent(grossMarginRaw),
        revGrowth: formatPercent(revGrowthRaw),
        exchange: exchange
      };
    })
  );

  return peersMetrics;
}


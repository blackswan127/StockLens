import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../services/report/data/yahooFinanceService.js', () => ({
  fetchYahooData: vi.fn()
}));
vi.mock('../../services/report/data/secEdgarService.js', () => ({
  fetchSecData: vi.fn()
}));
vi.mock('../../services/report/data/fredService.js', () => ({
  fetchFredData: vi.fn()
}));
vi.mock('../../services/report/data/peerService.js', () => ({
  fetchPeersForReport: vi.fn()
}));
vi.mock('../../services/report/compute/ratios.js', () => ({
  computeRatios: vi.fn()
}));
vi.mock('../../services/report/compute/analystNote.js', () => ({
  generateAnalystNote: vi.fn()
}));
vi.mock('../../services/report/compute/charts.js', () => ({
  generatePriceChartUrl: vi.fn()
}));
vi.mock('../../services/report/render/templates.js', () => ({
  generateReportContent: vi.fn()
}));
vi.mock('../../services/report/output/pdfGenerator.js', () => ({
  generatePdf: vi.fn()
}));
vi.mock('../../services/report/output/wordGenerator.js', () => ({
  generateWord: vi.fn()
}));

import reportRouter from '../report.js';
import { reportLimiter } from '../../middleware/reportLimiter.js';
import { fetchYahooData } from '../../services/report/data/yahooFinanceService.js';
import { fetchSecData } from '../../services/report/data/secEdgarService.js';
import { fetchFredData } from '../../services/report/data/fredService.js';
import { fetchPeersForReport } from '../../services/report/data/peerService.js';
import { computeRatios } from '../../services/report/compute/ratios.js';
import { generateAnalystNote } from '../../services/report/compute/analystNote.js';
import { generatePriceChartUrl } from '../../services/report/compute/charts.js';
import { generateReportContent } from '../../services/report/render/templates.js';
import { generatePdf } from '../../services/report/output/pdfGenerator.js';
import { generateWord } from '../../services/report/output/wordGenerator.js';

const TEST_IP = '203.0.113.7';

const app = express();
app.use((req, _res, next) => {
  Object.defineProperty(req, 'ip', { value: TEST_IP, configurable: true });
  next();
});
app.use('/api/report', reportRouter);

const YF_DATA = {
  profile: {
    assetProfile: {
      sector: 'Technology',
      industry: 'Software - Application',
      longName: 'Acme Corp'
    },
    price: { regularMarketPrice: 100, marketCap: 1_000_000_000 },
    defaultKeyStatistics: { beta: 1.2, marketCap: 1_000_000_000 }
  },
  quoteSummary: {
    quoteType: { longName: 'Acme Corp' },
    financialData: { revenueGrowth: 0.1 },
    defaultKeyStatistics: { beta: 1.2, marketCap: 1_000_000_000 },
    assetProfile: { sector: 'Technology', industry: 'Software - Application' },
    price: { shortName: 'Acme Corp' }
  },
  history: [
    { date: '2025-01-01T00:00:00.000Z', close: 90 },
    { date: '2026-01-01T00:00:00.000Z', close: 100 }
  ],
  fundamentals: [
    {
      date: '2023-12-31T00:00:00.000Z',
      totalRevenue: 800,
      grossProfit: 320,
      operatingIncome: 120,
      netIncome: 80,
      totalAssets: 600,
      stockholdersEquity: 300
    },
    {
      date: '2024-12-31T00:00:00.000Z',
      totalRevenue: 1_000,
      grossProfit: 400,
      operatingIncome: 200,
      netIncome: 100,
      totalAssets: 700,
      stockholdersEquity: 350
    }
  ],
  returns: { oneMonth: 0.01, threeMonth: 0.02, oneYear: 0.1, threeYear: 0.2, fiveYear: 0.5 }
};

const SEC_DATA = {
  businessDescription: 'Acme builds software.',
  riskFactors: 'Competition and macro risk.',
  riskDiff: null,
  proxyStatement: null,
  congressionalTrades: []
};

const FRED_DATA = { fedFundsRate: 4.5, gdpGrowth: 2.2 };

const METRICS = {
  revenueGrowth: 10,
  grossMargin: 40,
  operatingMargin: 20,
  netMargin: 10,
  currentRatio: 2,
  debtToEquity: 0.5,
  returnOnEquity: 18,
  dupont: null
};

const REPORT_CONTENT = {
  title: 'ACME Equity Research Report',
  ticker: 'ACME',
  exchange: 'NASDAQ',
  sector: 'Technology',
  industry: 'Software - Application',
  companyName: 'Acme Corp',
  currentPrice: '$100.00',
  priceChange: '+1.00 (+1.00%)',
  fiftyTwoWeekRange: '$80.00 - $120.00',
  marketCap: '$1.00B',
  timestamp: '2026-01-01T00:00:00.000Z',
  executiveSummary: 'Institutional thesis.',
  finstarRating: 'BULLISH',
  businessDescription: 'Acme builds software.',
  chartUrl: 'https://charts.test/acme.png',
  returns: {
    oneMonth: '1.0%',
    threeMonth: '2.0%',
    oneYear: '10.0%',
    threeYear: '20.0%',
    fiveYear: '50.0%'
  },
  beta: '1.20',
  valuation: {
    pe: '20.00',
    pb: '5.00',
    ps: '3.00',
    evEbitda: '12.00',
    peg: '1.50',
    dividendYield: '0.00%'
  },
  incomeStatement: { headers: ['Metric', '2024'], rows: [['Total Revenue', '$1.00B']] },
  balanceSheet: { headers: ['Metric', '2024'], rows: [['Total Assets', '$700.00M']] },
  cashFlow: { headers: ['Metric', '2024'], rows: [['Free Cash Flow', '$100.00M']] },
  scenarios: {
    headers: ['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst'],
    rows: [['Bull Case', '30%', '$130.00', '+30.0%', 'AI adoption']]
  },
  dupont: null,
  growth: null,
  peers: [],
  congressionalTrades: [],
  proxyStatement: null,
  riskFactors: 'Competition and macro risk.',
  riskDiff: null,
  macroContext: 'Fed funds at 4.50%.',
  bullBearSummary: '[Bull Catalyst - Moat] Strong margins.',
  dataFreshness: { 'Quotes & Pricing': '2026-01-01T00:00:00.000Z' }
};

function cloneContent() {
  return structuredClone(REPORT_CONTENT);
}

describe('Report Route', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    reportLimiter.resetKey(TEST_IP);

    vi.mocked(fetchYahooData).mockResolvedValue(YF_DATA);
    vi.mocked(fetchSecData).mockResolvedValue(SEC_DATA);
    vi.mocked(fetchFredData).mockResolvedValue(FRED_DATA);
    vi.mocked(fetchPeersForReport).mockResolvedValue([]);
    vi.mocked(computeRatios).mockReturnValue(METRICS as any);
    vi.mocked(generateAnalystNote).mockResolvedValue('Analyst note.');
    vi.mocked(generatePriceChartUrl).mockReturnValue('https://charts.test/chart.png');
    vi.mocked(generateReportContent).mockImplementation(() => cloneContent() as any);
    vi.mocked(generatePdf).mockResolvedValue(Buffer.from('%PDF-1.7 mocked'));
    vi.mocked(generateWord).mockResolvedValue(Buffer.from('PK mocked docx'));
  });

  describe('validation', () => {
    it.each(['BAD%20TICKER', 'ABCDEFGHIJK', 'ACME_INC'])(
      'rejects invalid ticker %s with 400 before calling any data service',
      async (badTicker) => {
        const response = await request(app).get(`/api/report/${badTicker}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid report parameters');
        expect(response.body.issues[0].path).toBe('ticker');
        expect(fetchYahooData).not.toHaveBeenCalled();
        expect(fetchSecData).not.toHaveBeenCalled();
        expect(generatePdf).not.toHaveBeenCalled();
        expect(generateWord).not.toHaveBeenCalled();
      }
    );

    it('rejects an unsupported format with 400', async () => {
      const response = await request(app).get('/api/report/ACME?format=excel');

      expect(response.status).toBe(400);
      expect(response.body.issues[0].path).toBe('format');
      expect(fetchYahooData).not.toHaveBeenCalled();
    });

    it('rejects an unsupported report type with 400', async () => {
      const response = await request(app).get('/api/report/ACME?type=brief');

      expect(response.status).toBe(400);
      expect(response.body.issues[0].path).toBe('type');
      expect(fetchYahooData).not.toHaveBeenCalled();
    });

    it('rejects a repeated format query parameter (array, not string) with 400', async () => {
      const response = await request(app).get('/api/report/ACME?format=pdf&format=word');

      expect(response.status).toBe(400);
      expect(response.body.issues[0].path).toBe('format');
    });
  });

  describe('PDF output', () => {
    it('returns a full PDF with upstream data and the expected content shape', async () => {
      const response = await request(app).get('/api/report/acme?format=pdf&type=full');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^application\/pdf/);
      expect(response.headers['content-disposition']).toBe('attachment; filename=ACME_Report.pdf');

      // Uppercased ticker + all four data services wired in
      expect(fetchYahooData).toHaveBeenCalledWith('ACME');
      expect(fetchSecData).toHaveBeenCalledWith('ACME');
      expect(fetchFredData).toHaveBeenCalledTimes(1);
      expect(fetchPeersForReport).toHaveBeenCalledWith('ACME');

      // Compute layer mixes quoteSummary financialData/defaultKeyStatistics with the
      // latest fundamentals row (production aliases quoteSummary to the Yahoo profile).
      expect(computeRatios).toHaveBeenCalledWith(
        YF_DATA.quoteSummary.financialData,
        YF_DATA.quoteSummary.defaultKeyStatistics,
        YF_DATA.fundamentals[1]
      );
      expect(generatePriceChartUrl).toHaveBeenCalledWith('ACME', YF_DATA.history);
      expect(generateAnalystNote).toHaveBeenCalledWith(
        'ACME',
        'Acme Corp',
        'Technology',
        'Software - Application',
        METRICS,
        SEC_DATA.riskFactors,
        expect.any(Array)
      );
      expect(generateReportContent).toHaveBeenCalledWith(
        'ACME',
        YF_DATA,
        SEC_DATA,
        FRED_DATA,
        METRICS,
        'https://charts.test/chart.png',
        [],
        undefined,
        'Analyst note.'
      );

      // Full reports keep every statement section
      const contentArg = vi.mocked(generatePdf).mock.calls[0][0] as any;
      expect(contentArg.incomeStatement).toBeDefined();
      expect(contentArg.balanceSheet).toBeDefined();
      expect(contentArg.cashFlow).toBeDefined();

      expect(generatePdf).toHaveBeenCalledTimes(1);
      expect(generateWord).not.toHaveBeenCalled();
    });

    it('filters snapshot content before generating the PDF', async () => {
      const response = await request(app).get('/api/report/ACME?format=pdf&type=snapshot');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^application\/pdf/);

      const contentArg = vi.mocked(generatePdf).mock.calls[0][0] as any;
      expect(contentArg.incomeStatement).toBeUndefined();
      expect(contentArg.balanceSheet).toBeUndefined();
      expect(contentArg.cashFlow).toBeUndefined();
      expect(contentArg.businessDescription).toBe('');
      expect(contentArg.riskFactors).toBe('');

      // Snapshot keeps the executive summary, chart, valuations, peers and finstar
      expect(contentArg.executiveSummary).toBe('Institutional thesis.');
      expect(contentArg.chartUrl).toBe('https://charts.test/acme.png');
      expect(contentArg.valuation.pe).toBe('20.00');
      expect(contentArg.finstarRating).toBe('BULLISH');
      expect(generateWord).not.toHaveBeenCalled();
    });
  });

  describe('Word output', () => {
    it('returns a docx when format=word', async () => {
      const response = await request(app).get('/api/report/ACME?format=word');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(response.headers['content-disposition']).toBe('attachment; filename=ACME_Report.docx');
      expect(generateWord).toHaveBeenCalledTimes(1);
      expect(generatePdf).not.toHaveBeenCalled();

      const contentArg = vi.mocked(generateWord).mock.calls[0][0] as any;
      expect(contentArg.ticker).toBe('ACME');
      expect(contentArg.incomeStatement).toBeDefined();
    });

    it('applies snapshot filtering to Word output too', async () => {
      const response = await request(app).get('/api/report/ACME?format=word&type=snapshot');

      expect(response.status).toBe(200);
      const contentArg = vi.mocked(generateWord).mock.calls[0][0] as any;
      expect(contentArg.incomeStatement).toBeUndefined();
      expect(contentArg.balanceSheet).toBeUndefined();
      expect(contentArg.cashFlow).toBeUndefined();
    });
  });

  describe('failure handling', () => {
    it('returns 500 JSON when an upstream data service fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchYahooData).mockRejectedValue(new Error('Yahoo upstream 503'));

      try {
        const response = await request(app).get('/api/report/ACME');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to generate report' });
        expect(generatePdf).not.toHaveBeenCalled();
        expect(generateWord).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('returns 500 JSON when the PDF generator throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(generatePdf).mockRejectedValue(new Error('PDF render failed'));

      try {
        const response = await request(app).get('/api/report/ACME');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to generate report' });
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe('rate limiting', () => {
    it('returns 429 on the 6th request inside the 15-minute window', async () => {
      for (let i = 0; i < 5; i += 1) {
        const allowed = await request(app).get('/api/report/ACME');
        expect(allowed.status).toBe(200);
      }

      const limited = await request(app).get('/api/report/ACME');

      expect(limited.status).toBe(429);
      expect(limited.body.error).toBe('Too many report requests');
      expect(generatePdf).toHaveBeenCalledTimes(5);
    });

    it('returns 429 when more than the concurrent report capacity is in flight', async () => {
      const pending: Array<(value: typeof YF_DATA) => void> = [];
      vi.mocked(fetchYahooData).mockImplementation(
        () => new Promise((resolve) => { pending.push(resolve); })
      );

      const first = request(app).get('/api/report/AAA').then((response) => response);
      const second = request(app).get('/api/report/BBB').then((response) => response);

      await vi.waitFor(() => {
        expect(fetchYahooData).toHaveBeenCalledTimes(2);
      });

      const third = await request(app).get('/api/report/CCC');

      expect(third.status).toBe(429);
      expect(third.body.error).toBe('Report generation capacity reached');
      expect(generatePdf).toHaveBeenCalledTimes(0);

      pending.forEach((resolve) => resolve(YF_DATA));
      const [firstResponse, secondResponse] = await Promise.all([first, second]);

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
    });
  });
});

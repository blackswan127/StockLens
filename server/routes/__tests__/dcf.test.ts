import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dcfRouter from '../dcf.js';
import { yahooService } from '../../services/yahoo.js';
import { fredService } from '../../services/fred.js';
import { edgarService } from '../../services/edgar.js';
import { fetchPeersForReport } from '../../services/report/data/peerService.js';

// Mock services
vi.mock('../../services/yahoo.js', () => ({
  yahooService: {
    getProfile: vi.fn(),
    getQuote: vi.fn(),
    getBasicFinancials: vi.fn(),
    getFundamentalsTimeSeries: vi.fn(),
    getGrowthEstimates: vi.fn(),
    getPeers: vi.fn()
  }
}));

vi.mock('../../services/fred.js', () => ({
  fredService: {
    getSeries: vi.fn()
  }
}));

vi.mock('../../services/edgar.js', () => ({
  edgarService: {
    getFinancials: vi.fn()
  }
}));

vi.mock('../../services/report/data/peerService.js', () => ({
  fetchPeersForReport: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/api', dcfRouter);

describe('DCF Route API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(yahooService.getProfile).mockResolvedValue({ name: 'Test Corp', country: 'US' });
    vi.mocked(yahooService.getQuote).mockResolvedValue({ price: 100 });
    vi.mocked(yahooService.getBasicFinancials).mockResolvedValue({ metric: {} });
    vi.mocked(yahooService.getFundamentalsTimeSeries).mockResolvedValue([]);
    vi.mocked(yahooService.getGrowthEstimates).mockResolvedValue({ growthEstimate5yr: null });
    vi.mocked(yahooService.getPeers).mockResolvedValue([]);
    vi.mocked(fredService.getSeries).mockResolvedValue({ observations: [] });
    vi.mocked(edgarService.getFinancials).mockRejectedValue(new Error('EDGAR data unavailable'));
    vi.mocked(fetchPeersForReport).mockResolvedValue([]);
  });

  it('successfully returns DCF inputs for standard US stock', async () => {
    // Mock profile
    vi.mocked(yahooService.getProfile).mockResolvedValue({
      name: 'Test Tech Corp',
      country: 'US'
    });

    // Mock quote
    vi.mocked(yahooService.getQuote).mockResolvedValue({
      price: 150.0
    });

    // Mock basic financials
    vi.mocked(yahooService.getBasicFinancials).mockResolvedValue({
      metric: {
        sharesOutstanding: 10000000,
        totalDebt: 50000000,
        totalCash: 25000000,
        beta: 1.1,
        marketCapitalization: 1500
      }
    });

    // Mock time series statements with real-world AMAT payload snapshot
    vi.mocked(yahooService.getFundamentalsTimeSeries).mockImplementation(async (_sym, _p1, _p2, type) => {
      if (type === 'quarterly') {
        return [
          { "date": "2024-10-27T00:00:00.000Z", "freeCashFlow": 1000000000, "totalRevenue": 5000000000 },
          { "date": "2024-07-27T00:00:00.000Z", "freeCashFlow": 1000000000, "totalRevenue": 5000000000 },
          { "date": "2024-04-27T00:00:00.000Z", "freeCashFlow": 1000000000, "totalRevenue": 5000000000 },
          { "date": "2024-01-27T00:00:00.000Z", "freeCashFlow": 1000000000, "totalRevenue": 5000000000 }
        ];
      }
      return [
        {
          "date": "2023-10-29T00:00:00.000Z",
          "freeCashFlow": 7592000000,
          "totalRevenue": 26517000000,
          "interestExpenseNonOperating": 257000000,
          "interestExpense": 257000000,
          "taxRateForCalcs": 0.155,
          "totalDebt": 5589000000,
          "cashAndCashEquivalents": 6057000000,
          "ordinarySharesNumber": 836000000
        },
        {
          "date": "2024-10-27T00:00:00.000Z",
          "freeCashFlow": 5698000000,
          "totalRevenue": 28368000000,
          "operatingIncome": 8000000000,
          "interestExpenseNonOperating": 269000000,
          "taxRateForCalcs": 0.245,
          "totalDebt": 7050000000,
          "cashAndCashEquivalents": 7241000000,
          "ordinarySharesNumber": 793000000
        }
      ];
    });

    // Mock analyst estimates
    vi.mocked(yahooService.getGrowthEstimates).mockResolvedValue({
      growthEstimate5yr: 0.12
    });

    // Mock FRED Risk Free Rate DGS10
    vi.mocked(fredService.getSeries).mockResolvedValue({
      observations: [
        { value: '4.25' }
      ]
    });

    const response = await request(app).get('/api/dcf/AAPL');
    expect(response.status).toBe(200);

    const data = response.body;
    expect(data.symbol).toBe('AAPL');
    expect(data.companyName).toBe('Test Tech Corp');
    expect(data.currentPrice).toBe(150.0);
    expect(data.sharesOutstanding).toBe(10000000);
    expect(data.totalDebt).toBe(50000000);
    expect(data.cashAndEquivalents).toBe(25000000);
    expect(data.beta).toBe(1.1);
    expect(data.riskFreeRate).toBe(0.0425);
    expect(data.marketCap).toBe(1500 * 1000000);
    expect(data.interestExpense).toBe(269000000); // from latest year 2024
    expect(data.taxRate).toBe(0.245); // from latest year 2024
    expect(data.analystGrowthEstimate5yr).toBe(0.12);
    expect(data.currency).toBe('USD');
    expect(data.lastFiscalYear).toBe(2024);

    // Verify oldest -> newest sorting with TTM appended
    expect(data.historicalFCF.length).toBe(3);
    expect(data.historicalFCF[0].year).toBe(2023);
    expect(data.historicalFCF[1].year).toBe(2024);
    expect(data.historicalFCF[1].value).toBe(5698000000);
    expect(data.historicalFCF[2].value).toBe(4000000000); // 4 * 1B from quarters
    expect(data.historicalFCF[2].source).toBe('Yahoo Quarterly TTM');

    // Unlevered FCFF series: reported FCF + after-tax interest expense.
    // 2023: 7,592,000,000 + 257,000,000 * (1 - 0.155) = 7,809,165,000
    // 2024: 5,698,000,000 + 269,000,000 * (1 - 0.245) = 5,901,095,000 (uses interestExpenseNonOperating)
    // TTM : 4,000,000,000 (quarterly rows carry no interest => no add-back)
    expect(data.historicalFCFF.length).toBe(3);
    expect(data.historicalFCFF[0].value).toBeCloseTo(7809165000, 0);
    expect(data.historicalFCFF[1].value).toBeCloseTo(5901095000, 0);
    expect(data.historicalFCFF[2].value).toBe(4000000000);

    expect(data.historicalRevenue[0].year).toBe(2023);
    expect(data.historicalRevenue[1].year).toBe(2024);
    expect(data.historicalRevenue[1].value).toBe(28368000000);
    expect(data.historicalRevenue[2].value).toBe(20000000000); // 4 * 5B
    
    // Assert provenance payload
    expect(data.provenance).toBeDefined();
    expect(data.provenance.sharesOutstanding.source).toBe('Yahoo Basic Financials');
    expect(data.provenance.totalDebt.source).toBe('Yahoo Basic Financials');

    // Assert synthetic credit rating
    // EBIT = 8B, Interest = 269M => ICR ~ 29.7 => AAA => spread 0.0069 => Cost of Debt = 0.0425 + 0.0069 = 0.0494
    expect(data.syntheticRating).toBe('AAA');
    expect(data.syntheticCostOfDebt).toBeCloseTo(0.0494);
  });

  it('applies Indian default risk-free rate for Indian NSE stocks', async () => {
    vi.mocked(yahooService.getProfile).mockResolvedValue({
      name: 'Reliance Industries',
      country: 'India'
    });
    vi.mocked(yahooService.getQuote).mockResolvedValue({
      price: 2500.0
    });
    vi.mocked(yahooService.getBasicFinancials).mockResolvedValue({
      metric: {
        sharesOutstanding: 6700000000,
        totalDebt: 300000000000,
        totalCash: 150000000000,
        beta: 0.9,
        marketCapitalization: 16750000
      }
    });
    vi.mocked(yahooService.getFundamentalsTimeSeries).mockResolvedValue([]);
    vi.mocked(yahooService.getGrowthEstimates).mockResolvedValue({ growthEstimate5yr: null });

    const response = await request(app).get('/api/dcf/RELIANCE.NS');
    expect(response.status).toBe(200);

    const data = response.body;
    expect(data.currency).toBe('INR');
    expect(data.riskFreeRate).toBe(0.071); // Hardcoded RBI fallback used when mock returns empty
    expect(fredService.getSeries).toHaveBeenCalledWith('INDIRLTLT01STM'); 
  });

  it('falls back to time series data when basicFinancials metrics are missing', async () => {
    vi.mocked(yahooService.getProfile).mockResolvedValue({ name: 'Fallback Corp', country: 'US' });
    vi.mocked(yahooService.getQuote).mockResolvedValue({ price: 50.0 });
    
    // Simulate missing basicFinancials metrics
    vi.mocked(yahooService.getBasicFinancials).mockResolvedValue({
      metric: {}
    });

    // Provide the data via the fundamentals time series instead
    vi.mocked(yahooService.getFundamentalsTimeSeries).mockResolvedValue([
      {
        "date": "2024-12-31T00:00:00.000Z",
        "totalDebt": 99000000,
        "cashAndCashEquivalents": 55000000,
        "ordinarySharesNumber": 10000000
      }
    ]);

    const response = await request(app).get('/api/dcf/FALLBACK');
    expect(response.status).toBe(200);

    const data = response.body;
    // Should extract values from time series
    expect(data.totalDebt).toBe(99000000);
    expect(data.cashAndEquivalents).toBe(55000000);
    expect(data.sharesOutstanding).toBe(10000000);
  });

  it('returns 404 if the quote is missing', async () => {
    vi.mocked(yahooService.getQuote).mockRejectedValue(new Error('Symbol not found'));

    const response = await request(app).get('/api/dcf/INVALID');
    expect(response.status).toBe(404);
  });

  it('validates confidence correctly against EDGAR data', async () => {
    vi.mocked(yahooService.getProfile).mockResolvedValue({ name: 'Valid Corp', country: 'US' });
    vi.mocked(yahooService.getQuote).mockResolvedValue({ price: 100 });
    
    // Yahoo data: 2024 FCF = 1B, 2024 Revenue = 5B
    vi.mocked(yahooService.getFundamentalsTimeSeries).mockImplementation(async (_sym, _p1, _p2, type) => {
      if (type === 'annual') {
        return [{
          date: "2024-12-31T00:00:00.000Z",
          freeCashFlow: 1000000000,
          totalRevenue: 5000000000
        }];
      }
      return [];
    });

    // Mock perfect EDGAR match (in millions): OpCF (1500) - CapEx (500) = FCF 1000. Rev = 5000.
    vi.mocked(edgarService.getFinancials).mockResolvedValue({
      incomeStatement: [
        { label: 'Revenue', values: { '2024': 5000 } }
      ],
      cashFlow: [
        { label: 'Cash generated by operating activities', values: { '2024': 1500 } },
        { label: 'Payments for property, plant and equipment', values: { '2024': -500 } }
      ],
      balanceSheet: []
    } as any);

    const response = await request(app).get('/api/dcf/VALID');
    expect(response.status).toBe(200);
    expect(response.body.dataConfidence).toBe('high');

    // Now mock a mismatch
    vi.mocked(edgarService.getFinancials).mockResolvedValue({
      incomeStatement: [
        { label: 'Revenue', values: { '2024': 8000 } } // 8000 !== 5000
      ],
      cashFlow: [
        { label: 'Cash generated by operating activities', values: { '2024': 2000 } },
        { label: 'Payments for property, plant and equipment', values: { '2024': 0 } }
      ],
      balanceSheet: []
    } as any);

    const mismatchResponse = await request(app).get('/api/dcf/INVALID');
    expect(mismatchResponse.status).toBe(200);
    expect(mismatchResponse.body.dataConfidence).toBe('medium');
  });
});

import { describe, it, expect } from 'vitest';
import { cleanSecContent, decodeHtmlEntities } from '../edgarParsing.js';
import { computeRatios } from '../report/compute/ratios.js';
import { generatePdf } from '../report/output/pdfGenerator.js';
import { generateWord } from '../report/output/wordGenerator.js';
import { generateReportContent, ReportContent } from '../report/render/templates.js';

describe('SEC Forensics, Peer Extraction & Layout Alignment', () => {
  describe('HTML Entity Decoding & SEC Content Sanitization', () => {
    it('decodes HTML entities properly without leaving raw escape sequences', () => {
      const raw = 'Risks&#8226; &amp; uncertainties &#8239;regarding &quot;AI&quot; &apos;growth&apos; &lt;2026&gt;';
      const decoded = decodeHtmlEntities(raw);
      expect(decoded).toContain('•');
      expect(decoded).toContain('&');
      expect(decoded).toContain('"AI"');
      expect(decoded).toContain("'growth'");
      expect(decoded).toContain('<2026>');
      expect(decoded).not.toContain('&#8226;');
      expect(decoded).not.toContain('&amp;');
      expect(decoded).not.toContain('&#8239;');
    });

    it('strips XML tags and cleans boilerplate artifacts', () => {
      const dirtyXml = '<ix:nonNumeric contextRef="D2026">The company faces <span style="color:red">operational risks</span>.</ix:nonNumeric>';
      const cleaned = cleanSecContent(dirtyXml);
      expect(cleaned).toBe('The company faces operational risks.');
      expect(cleaned).not.toContain('<ix');
      expect(cleaned).not.toContain('<span');
    });
  });

  describe('DuPont 3-Stage & 5-Stage Computation', () => {
    it('computes both 3-stage and 5-stage DuPont decompositions accurately', () => {
      const financials = {
        totalRevenue: 100000,
        grossProfit: 60000,
        operatingIncome: 30000,
        netIncome: 20000,
        incomeBeforeTax: 25000
      };
      const balanceSheet = {
        totalAssets: 200000,
        stockholdersEquity: 100000,
        totalDebt: 50000
      };

      const metrics = computeRatios(financials, balanceSheet);
      expect(metrics.dupont).not.toBeNull();
      expect(metrics.dupont?.stage3).toBeDefined();
      expect(metrics.dupont?.stage5).toBeDefined();

      // 3-Stage: Net Margin (20/100 = 0.20) * Asset Turnover (100/200 = 0.50) * Equity Multiplier (200/100 = 2.0) = 0.20
      expect(metrics.dupont?.stage3?.netMargin).toBeCloseTo(0.20);
      expect(metrics.dupont?.stage3?.assetTurnover).toBeCloseTo(0.50);
      expect(metrics.dupont?.stage3?.equityMultiplier).toBeCloseTo(2.0);
      expect(metrics.dupont?.stage3?.roe).toBeCloseTo(0.20);

      // 5-Stage: Tax Burden (20/25 = 0.80) * Interest Burden (25/30 = 0.833) * Op Margin (30/100 = 0.30) * AT (0.5) * EM (2.0) = 0.20
      expect(metrics.dupont?.stage5?.taxBurden).toBeCloseTo(0.80);
      expect(metrics.dupont?.stage5?.interestBurden).toBeCloseTo(25 / 30);
      expect(metrics.dupont?.stage5?.operatingMargin).toBeCloseTo(0.30);
      expect(metrics.dupont?.stage5?.roe).toBeCloseTo(0.20);
    });
  });

  describe('PDF and Word Report Generators Layout Alignment', () => {
    const mockReportContent: ReportContent = {
      title: 'NVDA Equity Research Report',
      ticker: 'NVDA',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Semiconductors',
      companyName: 'NVIDIA Corporation',
      currentPrice: '$125.50',
      priceChange: '+$4.20 (+3.46%)',
      fiftyTwoWeekRange: '$45.00 - $140.00',
      marketCap: '$3.10T',
      timestamp: new Date().toISOString(),
      executiveSummary: '1. STRATEGIC MOAT & PRICING POWER\nNVIDIA commands unprecedented moat.\n\n2. CAPITAL ALLOCATION EFFICIENCY\nHigh ROIC and ROE execution.\n\n3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY\nAccelerating Blackwell architecture adoption.\n\n4. SEC 10-K RISK FACTOR SYNTHESIS\nSupply chain concentration and geopolitical considerations.',
      finstarRating: 'BULLISH',
      businessDescription: 'NVIDIA Corporation designs graphics processing units and data center computing solutions.',
      chartUrl: 'https://quickchart.io/chart?c=%7Btype%3A%27bar%27%2Cdata%3A%7Blabels%3A%5B%27Q1%27%2C%27Q2%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27Revenue%27%2Cdata%3A%5B50%2C60%5D%7D%5D%7D%7D',
      returns: {
        oneMonth: '+8.5%',
        threeMonth: '+22.4%',
        oneYear: '+145.2%',
        threeYear: '+412.0%',
        fiveYear: '+1250.0%'
      },
      beta: '1.65',
      valuation: {
        pe: '42.50',
        pb: '28.10',
        ps: '24.30',
        evEbitda: '34.20',
        peg: '1.25',
        dividendYield: '0.04%'
      },
      incomeStatement: {
        headers: ['Metric', '2024', '2025', '2026', '2Y CAGR'],
        rows: [
          ['Total Revenue', '$60.92B', '$96.31B', '$130.50B', '46.4%'],
          ['Gross Profit', '$44.30B', '$72.10B', '$98.00B', '48.7%'],
          ['Net Income', '$29.76B', '$52.00B', '$70.50B', '53.9%']
        ]
      },
      balanceSheet: {
        headers: ['Metric', '2024', '2025', '2026', '2Y CAGR'],
        rows: [
          ['Total Assets', '$65.73B', '$110.00B', '$145.00B', '48.5%'],
          ['Stockholders Equity', '$42.98B', '$78.00B', '$105.00B', '56.3%']
        ]
      },
      cashFlow: {
        headers: ['Metric', '2024', '2025', '2026', '2Y CAGR'],
        rows: [
          ['Operating Cash Flow', '$28.09B', '$55.00B', '$75.00B', '63.4%'],
          ['Free Cash Flow', '$26.95B', '$50.00B', '$68.00B', '58.8%']
        ]
      },
      scenarios: {
        headers: ['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst'],
        rows: [
          ['Bull Case', '30%', '$165.00', '+31.5%', 'Hyper-scale cloud revenue acceleration and Blackwell gross margin expansion'],
          ['Base Case', '55%', '$138.00', '+10.0%', 'Consensus data center deliveries and enterprise software adoption'],
          ['Bear Case', '15%', '$98.00', '-21.9%', 'Supply chain bottlenecks and multiple compression']
        ]
      },
      dupont: {
        stage3: {
          netMargin: 0.54,
          assetTurnover: 0.90,
          equityMultiplier: 1.38,
          roe: 0.67
        },
        stage5: {
          taxBurden: 0.88,
          interestBurden: 0.99,
          operatingMargin: 0.62,
          assetTurnover: 0.90,
          equityMultiplier: 1.38,
          roe: 0.67
        },
        netMargin: 0.54,
        assetTurnover: 0.90,
        equityMultiplier: 1.38,
        roe: 0.67
      },
      growth: null,
      peers: [
        { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', price: 145.2, mcap: 235000000000, pe: '45.20x', evEbitda: '32.10x', grossMargin: '52.0%', revGrowth: '18.5%', exchange: 'NASDAQ' },
        { symbol: 'AVGO', name: 'Broadcom Inc.', price: 155.0, mcap: 720000000000, pe: '36.50x', evEbitda: '24.80x', grossMargin: '64.2%', revGrowth: '43.0%', exchange: 'NASDAQ' },
        { symbol: 'QCOM', name: 'QUALCOMM Incorporated', price: 168.4, mcap: 188000000000, pe: '18.20x', evEbitda: '14.50x', grossMargin: '56.0%', revGrowth: '12.0%', exchange: 'NASDAQ' }
      ],
      congressionalTrades: [],
      proxyStatement: {
        url: 'https://www.sec.gov/Archives/edgar/data/0001045810/def14a.htm',
        proposals: [
          { item: 'Proposal 1', description: 'Election of 12 Director Nominees', boardRecommendation: 'FOR' },
          { item: 'Proposal 2', description: 'Advisory Vote to Approve Executive Compensation', boardRecommendation: 'FOR' },
          { item: 'Proposal 3', description: 'Ratification of Independent Registered Public Accounting Firm', boardRecommendation: 'FOR' }
        ]
      },
      riskFactors: 'Global semiconductor supply chain concentration and foundry reliance remain key operational considerations.',
      riskDiff: null,
      macroContext: 'Federal Funds Rate target range is at 5.25% - 5.50% with sustained economic expansion.',
      hedgeFundResult: {
        evaluations: {
          NVDA: {
            score: 85,
            agents: {
              warrenBuffett: { signal: 'bullish', confidence: 90, reasoning: ['Unrivaled software ecosystem (CUDA) creating immense pricing power'] },
              charlieMunger: { signal: 'bullish', confidence: 92, reasoning: ['High capital velocity and compound earnings growth'] },
              benGraham: { signal: 'neutral', confidence: 60, reasoning: ['Valuation multiples elevated relative to historical book value'] },
              billAckman: { signal: 'bullish', confidence: 88, reasoning: ['Cash conversion cycle and free cash flow margin exceeds 50%'] },
              stanDruckenmiller: { signal: 'bullish', confidence: 95, reasoning: ['AI computing architectural inflection and demand tailwind'] },
              philFisher: { signal: 'bullish', confidence: 94, reasoning: ['Outstanding R&D efficiency and visionary engineering leadership'] },
              cathieWood: { signal: 'bullish', confidence: 98, reasoning: ['Exponential TAM expansion across accelerated computing and autonomous systems'] }
            }
          }
        },
        portfolio: { NVDA: 1000000 }
      } as any,
      bullBearSummary: '• [Bull Catalyst - Warren Buffett] Unrivaled software ecosystem (CUDA) creating immense pricing power\n• [Bear Risk - Ben Graham] Valuation multiples elevated relative to historical book value',
      dataFreshness: {
        'Quotes & Pricing': new Date().toISOString(),
        'Valuation & Financials': new Date().toISOString(),
        'SEC Filings & Risks': new Date().toISOString()
      }
    };

    it('generates a valid PDF buffer without errors', async () => {
      const pdfBuffer = await generatePdf(mockReportContent);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
    });

    it('generates a valid Word buffer without errors', async () => {
      const wordBuffer = await generateWord(mockReportContent);
      expect(wordBuffer).toBeDefined();
      expect(wordBuffer.length).toBeGreaterThan(1000);
      // Word documents are zip files starting with PK header (0x50, 0x4B)
      expect(wordBuffer[0]).toBe(0x50);
      expect(wordBuffer[1]).toBe(0x4B);
    });
  });
});

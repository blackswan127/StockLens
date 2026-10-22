import { describe, it, expect } from 'vitest';
import { generateReportContent } from '../report/render/templates.js';

describe('generateReportContent dynamic scenarios and catalysts', () => {
  const dummySecData = {
    businessDescription: 'A technology company specializing in AI solutions.',
    riskFactors: 'Risks include competition and technological disruption.',
    proxyStatement: null,
    riskDiff: null
  };

  const dummyFredData = {
    fedFundsRate: 5.25,
    gdpGrowth: 2.8,
    cpiInflation: 3.1
  };

  const dummyMetrics = {
    revenueGrowth: 25.0,
    grossMargin: 65.0,
    operatingMargin: 28.0,
    netMargin: 22.0,
    currentRatio: 2.4,
    debtToEquity: 0.35,
    returnOnEquity: 32.0,
    dupont: {
      netMargin: 0.22,
      assetTurnover: 0.85,
      equityMultiplier: 1.71
    }
  };

  it('computes dynamic, stock-specific Bull / Base / Bear scenario targets based on beta, revenue growth, and consensus target', () => {
    const mockYfData = {
      profile: {
        assetProfile: {
          sector: 'Technology',
          industry: 'Software - Infrastructure',
          longName: 'TechCorp International'
        },
        price: {
          regularMarketPrice: 200,
          regularMarketChange: 4.5,
          regularMarketChangePercent: 0.023,
          fiftyTwoWeekLow: 140,
          fiftyTwoWeekHigh: 220,
          marketCap: 500000000000
        },
        defaultKeyStatistics: {
          beta: 1.4,
          marketCap: 500000000000
        },
        financialData: {
          revenueGrowth: 0.25,
          targetMeanPrice: 230
        }
      },
      quoteSummary: {
        financialData: {
          revenueGrowth: 0.25,
          targetMeanPrice: 230
        },
        defaultKeyStatistics: {
          beta: 1.4
        },
        quoteType: {
          longName: 'TechCorp International'
        }
      },
      history: [],
      fundamentals: [
        { date: '2023-12-31', totalRevenue: 100000000, grossProfit: 60000000, netIncome: 20000000 },
        { date: '2024-12-31', totalRevenue: 125000000, grossProfit: 81250000, netIncome: 27500000 }
      ]
    };

    const content = generateReportContent(
      'TECH',
      mockYfData as any,
      dummySecData as any,
      dummyFredData as any,
      dummyMetrics,
      'http://localhost:5000/chart.png',
      []
    );

    expect(content.scenarios).toBeDefined();
    expect(content.scenarios.headers).toEqual(['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst']);
    expect(content.scenarios.rows.length).toBe(3);

    const [bullRow, baseRow, bearRow] = content.scenarios.rows;

    // Check Bull Case: Target price > 200, return is positive dynamic string, catalyst matches Technology
    expect(bullRow[0]).toBe('Bull Case');
    expect(String(bullRow[2])).toMatch(/^\$\d+\.\d{2}$/);
    const bullPrice = parseFloat(String(bullRow[2]).replace('$', ''));
    expect(bullPrice).toBeGreaterThan(200);
    expect(String(bullRow[4])).toContain('cloud');

    // Check Base Case: uses consensus target or formula
    expect(baseRow[0]).toBe('Base Case');
    expect(String(baseRow[2])).toBe('$230.00'); // targetMeanPrice was 230
    expect(baseRow[3]).toBe('+15.0%');

    // Check Bear Case: price < 200
    expect(bearRow[0]).toBe('Bear Case');
    const bearPrice = parseFloat(String(bearRow[2]).replace('$', ''));
    expect(bearPrice).toBeLessThan(200);
    expect(String(bearRow[4])).toContain('multiples compression');

    // Check Bull/Bear summary uses the fundamental metrics and risks
    expect(content.bullBearSummary).toContain('[Bull Catalyst - Moat]');
    expect(content.bullBearSummary).toContain('High ROE of 32.00%');
    expect(content.bullBearSummary).toContain('[Bear Risk - Valuation]');
  });

  it('customizes sector catalysts for Financials and Healthcare appropriately', () => {
    const mockFinYfData = {
      profile: {
        assetProfile: { sector: 'Financial Services', industry: 'Regional Banks', longName: 'Bank Corp' },
        price: { regularMarketPrice: 50, regularMarketChange: 0.5, regularMarketChangePercent: 0.01 },
        defaultKeyStatistics: { beta: 0.9 },
        financialData: { revenueGrowth: 0.05 }
      },
      quoteSummary: {
        quoteType: { longName: 'Bank Corp' }
      },
      fundamentals: []
    };

    const finContent = generateReportContent(
      'BANK',
      mockFinYfData as any,
      dummySecData as any,
      dummyFredData as any,
      dummyMetrics,
      'http://localhost:5000/chart.png',
      [],
      null
    );

    const finBullRow = finContent.scenarios.rows[0];
    expect(String(finBullRow[4])).toContain('Net interest margin');
  });
});

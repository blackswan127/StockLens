import { describe, it, expect } from 'vitest';
import { generateReportContent } from '../report/render/templates.js';

describe('generateReportContent dynamic scenarios and catalysts', () => {
  const dummySecData = {
    businessDescription: 'A technology company specializing in AI solutions.',
    riskFactors: 'Risks include competition and technological disruption.',
    proxyStatement: null,
    riskDiff: null,
    congressionalTrades: []
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

    const mockHfResult: any = {
      decisions: {},
      evaluations: {
        TECH: {
          symbol: 'TECH',
          price: 200,
          agents: {
            warrenBuffett: { signal: 'bullish', confidence: 85, reasoning: ['✅ High ROE of 32% indicating strong capital allocation'] },
            cathieWood: { signal: 'bullish', confidence: 90, reasoning: ['✅ Hyper-growth: Revenue up 25% YoY'] },
            benGraham: { signal: 'bearish', confidence: 30, reasoning: ['❌ P/E ratio is high (> 15)'] },
            billAckman: { signal: 'bullish', confidence: 80, reasoning: ['✅ Very strong operating margin at 28%'] },
            charlieMunger: { signal: 'bullish', confidence: 85, reasoning: ['✅ Strong Gross Margin of 65% indicating pricing power'] },
            philFisher: { signal: 'bullish', confidence: 80, reasoning: ['✅ Excellent operational efficiency'] },
            stanDruckenmiller: { signal: 'bullish', confidence: 80, reasoning: ['✅ Earnings momentum is accelerating'] }
          }
        }
      },
      summary: []
    };

    const content = generateReportContent(
      'TECH',
      mockYfData as any,
      dummySecData as any,
      dummyFredData as any,
      dummyMetrics,
      'http://localhost:5000/chart.png',
      [],
      mockHfResult
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

    // Check Bull/Bear summary uses the actual agent reasons
    expect(content.bullBearSummary).toContain('Warren Buffett');
    expect(content.bullBearSummary).toContain('High ROE of 32%');
    expect(content.bullBearSummary).toContain('Ben Graham');
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

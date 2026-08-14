import { describe, it, expect } from 'vitest';
import {
  classifyMargin,
  classifyGrowth,
  classifyLeverage,
  classifyRoe,
  extractSecRiskInsights,
  synthesizeHedgeFundSignals,
  generateInstitutionalFallbackNote,
  generateAnalystNote
} from '../report/compute/analystNote.js';
import { ComputedMetrics } from '../report/compute/ratios.js';

describe('Analyst Note Dynamic Synthesis Engine', () => {
  describe('Classification Logic', () => {
    it('classifies margins correctly across all 4 tiers', () => {
      expect(classifyMargin(55, 30, 20)).toBe('top-decile'); // > 50%
      expect(classifyMargin(40, 20, 15)).toBe('healthy'); // 20-50%
      expect(classifyMargin(15, 6, 4)).toBe('compressed'); // 5-20%
      expect(classifyMargin(-2, -5, -10)).toBe('negative'); // < 0%
    });

    it('classifies revenue growth across all 4 regimes', () => {
      expect(classifyGrowth(35)).toBe('hyper-growth'); // > 30%
      expect(classifyGrowth(18)).toBe('steady'); // 10-30%
      expect(classifyGrowth(5)).toBe('mature'); // 0-10%
      expect(classifyGrowth(-8)).toBe('contracting'); // < 0%
    });

    it('classifies financial leverage conditions', () => {
      expect(classifyLeverage(0.25)).toBe('conservative'); // < 0.5x
      expect(classifyLeverage(0.95)).toBe('moderate'); // 0.5 - 1.5x
      expect(classifyLeverage(2.4)).toBe('highly-levered'); // > 1.5x
    });

    it('classifies ROE quality tiers', () => {
      expect(classifyRoe(35)).toBe('exceptional'); // > 30%
      expect(classifyRoe(22)).toBe('strong'); // 15-30%
      expect(classifyRoe(11)).toBe('moderate'); // 8-15%
      expect(classifyRoe(4)).toBe('subdued'); // 0-8%
      expect(classifyRoe(-5)).toBe('negative'); // < 0%
    });
  });

  describe('SEC 10-K Risk Factor Synthesis', () => {
    it('extracts regulatory, geopolitical, and supply chain themes from filing text', () => {
      const filingText = `
        Item 1A. Risk Factors.
        We face intense scrutiny from the European Commission and the FTC regarding digital advertising antitrust regulations.
        Export control restrictions on advanced semiconductor shipments to China may adversely impact international revenues.
        We rely on single-source foundry manufacturing partners such as TSMC for wafer fabrication.
      `;
      const result = extractSecRiskInsights(filingText, 'Test Corp', 'TEST', 'Semiconductors');
      expect(result.themes.length).toBeGreaterThanOrEqual(2);
      expect(result.keyDisclosures.length).toBeGreaterThanOrEqual(2);
      expect(result.narrative).toContain('Test Corp');
    });
  });

  describe('Multi-Stock Report Diversity Verification', () => {
    const metaMetrics: ComputedMetrics = {
      revenueGrowth: 23.2,
      grossMargin: 81.5,
      operatingMargin: 38.2,
      netMargin: 34.0,
      currentRatio: 2.1,
      debtToEquity: 0.18,
      returnOnEquity: 33.5,
      dupont: { netMargin: 0.34, assetTurnover: 0.65, equityMultiplier: 1.51 }
    };

    const aaplMetrics: ComputedMetrics = {
      revenueGrowth: 2.0,
      grossMargin: 46.2,
      operatingMargin: 31.5,
      netMargin: 26.3,
      currentRatio: 0.98,
      debtToEquity: 1.45,
      returnOnEquity: 160.0,
      dupont: { netMargin: 0.263, assetTurnover: 1.05, equityMultiplier: 5.8 }
    };

    const brkMetrics: ComputedMetrics = {
      revenueGrowth: 7.5,
      grossMargin: 28.0,
      operatingMargin: 15.0,
      netMargin: 12.5,
      currentRatio: 1.8,
      debtToEquity: 0.32,
      returnOnEquity: 13.8,
      dupont: { netMargin: 0.125, assetTurnover: 0.35, equityMultiplier: 3.1 }
    };

    it('generates distinct, deeply customized reports for META, AAPL, and BRK-B', async () => {
      const metaReport = generateInstitutionalFallbackNote(
        'META',
        'Meta Platforms, Inc.',
        'Communication Services',
        'Internet Content & Information',
        metaMetrics,
        'We face regulatory investigations under the EU Digital Markets Act and FTC antitrust enforcement.',
        ['Warren Buffett: Strong network effects and high ROE moat.', 'Cathie Wood: AI infrastructure scale.']
      );

      const aaplReport = generateInstitutionalFallbackNote(
        'AAPL',
        'Apple Inc.',
        'Technology',
        'Consumer Electronics',
        aaplMetrics,
        'We depend on single-source suppliers and assembly facilities primarily located in China and Taiwan.',
        ['Warren Buffett: Incredible brand loyalty and customer switching costs.', 'Ben Graham: High P/E multiple limits margin of safety.']
      );

      const brkReport = generateInstitutionalFallbackNote(
        'BRK-B',
        'Berkshire Hathaway Inc.',
        'Financial Services',
        'Insurance - Diversified',
        brkMetrics,
        'Our insurance operations are subject to catastrophe risk and investment portfolio volatility.',
        ['Warren Buffett: Massive low-cost insurance float and disciplined capital allocation.', 'Charlie Munger: Superb long-term compounding.']
      );

      // Verify all 4 required uppercase headers are present in each report
      const requiredHeaders = [
        '1. STRATEGIC MOAT & PRICING POWER',
        '2. CAPITAL ALLOCATION EFFICIENCY',
        '3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY',
        '4. SEC 10-K RISK FACTOR SYNTHESIS'
      ];

      for (const header of requiredHeaders) {
        expect(metaReport).toContain(header);
        expect(aaplReport).toContain(header);
        expect(brkReport).toContain(header);
      }

      // Verify META specific contents
      expect(metaReport).toContain('Meta Platforms, Inc.');
      expect(metaReport).toContain('top-decile gross margin');
      expect(metaReport).toContain('81.5%');
      expect(metaReport).toContain('Internet Content & Information');
      expect(metaReport).toContain('EU Digital Markets Act');

      // Verify AAPL specific contents
      expect(aaplReport).toContain('Apple Inc.');
      expect(aaplReport).toContain('Consumer Electronics');
      expect(aaplReport).toContain('46.2%');
      expect(aaplReport).toContain('mature');
      expect(aaplReport).toContain('China and Taiwan');

      // Verify BRK-B specific contents
      expect(brkReport).toContain('Berkshire Hathaway Inc.');
      expect(brkReport).toContain('Insurance - Diversified');
      expect(brkReport).toContain('Financial Services');
      expect(brkReport).toContain('catastrophe risk');

      // Verify reports are not identical
      expect(metaReport).not.toEqual(aaplReport);
      expect(aaplReport).not.toEqual(brkReport);
      expect(metaReport).not.toEqual(brkReport);
    });

    it('generateAnalystNote falls back smoothly when no API key is set', async () => {
      const note = await generateAnalystNote(
        'NVDA',
        'NVIDIA Corporation',
        'Technology',
        'Semiconductors',
        {
          revenueGrowth: 125.0,
          grossMargin: 75.5,
          operatingMargin: 62.0,
          netMargin: 55.0,
          currentRatio: 3.5,
          debtToEquity: 0.15,
          returnOnEquity: 115.0,
          dupont: null
        },
        'Export controls to foreign countries and reliance on TSMC foundry operations.',
        ['Cathie Wood: Leader in AI acceleration.', 'Stan Druckenmiller: Extreme liquidity momentum.']
      );

      expect(note).toContain('1. STRATEGIC MOAT & PRICING POWER');
      expect(note).toContain('2. CAPITAL ALLOCATION EFFICIENCY');
      expect(note).toContain('3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY');
      expect(note).toContain('4. SEC 10-K RISK FACTOR SYNTHESIS');
      expect(note).toContain('NVIDIA Corporation');
      expect(note).toContain('Semiconductors');
      expect(note).toContain('75.5%');
    });
  });
});

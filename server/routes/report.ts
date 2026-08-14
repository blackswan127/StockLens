import { Router } from 'express';
import { fetchYahooData } from '../services/report/data/yahooFinanceService.js';
import { fetchSecData } from '../services/report/data/secEdgarService.js';
import { fetchFredData } from '../services/report/data/fredService.js';
import { fetchPeersForReport } from '../services/report/data/peerService.js';
import { runHedgeFundForReport } from '../services/report/data/hedgeFundService.js';
import { computeRatios } from '../services/report/compute/ratios.js';
import { generateAnalystNote } from '../services/report/compute/analystNote.js';
import { generatePriceChartUrl } from '../services/report/compute/charts.js';
import { generateReportContent } from '../services/report/render/templates.js';
import { generatePdf } from '../services/report/output/pdfGenerator.js';
import { generateWord } from '../services/report/output/wordGenerator.js';

const router = Router();

router.get('/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const format = (req.query.format as string)?.toLowerCase() || 'pdf'; // 'pdf' or 'word'
  const type = (req.query.type as string)?.toLowerCase() || 'full'; // 'snapshot' or 'full'

  try {
    // 1. Data Layer
    const [yfData, secData, fredData, peers] = await Promise.all([
      fetchYahooData(ticker),
      fetchSecData(ticker),
      fetchFredData(),
      fetchPeersForReport(ticker)
    ]);

    const hfResult = runHedgeFundForReport(ticker, yfData);

    // 2. Compute Layer
    // Using fundamentals[0] for current ratios if available, else fallback
    const fundamentals = yfData.fundamentals || [];
    const latestFund = fundamentals.length > 0 ? fundamentals[fundamentals.length - 1] : {};
    
    // Mix and match keys for our ratio compute
    const ratiosInput = yfData.quoteSummary?.financialData || latestFund;
    const balanceInput = yfData.quoteSummary?.defaultKeyStatistics || latestFund;
    
    const metrics = computeRatios(ratiosInput, balanceInput, latestFund);
    const chartUrl = generatePriceChartUrl(ticker, yfData.history);

    const profile = yfData.quoteSummary?.assetProfile || {};
    const quoteType = yfData.quoteSummary?.quoteType || {};
    const companyName = quoteType.longName || quoteType.shortName || yfData.quoteSummary?.price?.shortName || profile.longName || ticker;
    const sector = profile.sector || 'Unknown';
    const industry = profile.industry || 'Unknown';

    let summaryReasons: string[] = [];
    if (hfResult && hfResult.evaluations && hfResult.evaluations[ticker]) {
      const agents = hfResult.evaluations[ticker].agents;
      const personaLabels: Record<string, string> = {
        warrenBuffett: 'Warren Buffett (Moat & Capital Compounding)',
        charlieMunger: 'Charlie Munger (Quality & Reinvestment Moat)',
        benGraham: 'Benjamin Graham (Margin of Safety & Value)',
        billAckman: 'Bill Ackman (Free Cash Flow & Operational Leverage)',
        cathieWood: 'Cathie Wood (Disruptive Innovation & Scalability)',
        stanDruckenmiller: 'Stanley Druckenmiller (Macro Liquidity & Trend)',
        philFisher: 'Philip Fisher (R&D Pipeline & Organic Growth Runway)'
      };
      
      Object.entries(agents).forEach(([key, agent]: [string, any]) => {
        const label = personaLabels[key] || key;
        const reasons = agent.reasoning && agent.reasoning.length > 0 ? agent.reasoning.join('; ') : 'Balanced risk/reward.';
        summaryReasons.push(`${label} [${(agent.signal || 'neutral').toUpperCase()} - ${agent.confidence || 50}% confidence]: ${reasons}`);
      });
    }

    const analystNote = await generateAnalystNote(
      ticker,
      companyName,
      sector,
      industry,
      metrics,
      secData.riskFactors || '',
      summaryReasons
    );

    // 3. Render Layer
    const content = generateReportContent(ticker, yfData, secData, fredData, metrics, chartUrl, peers, hfResult, analystNote);

    // Apply snapshot filtering if requested
    if (type === 'snapshot') {
      content.incomeStatement = undefined;
      content.balanceSheet = undefined;
      content.cashFlow = undefined;
      content.businessDescription = '';
      content.riskFactors = '';
      // Snapshot keeps Executive summary, chart, val, peers, and finstar.
    }

    // 4. Output Layer
    if (format === 'word') {
      const wordBuffer = await generateWord(content);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${ticker}_Report.docx`);
      res.send(wordBuffer);
    } else {
      const pdfBuffer = await generatePdf(content);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${ticker}_Report.pdf`);
      res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

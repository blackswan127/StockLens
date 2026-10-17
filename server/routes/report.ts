import { Router } from 'express';
import { fetchYahooData } from '../services/report/data/yahooFinanceService.js';
import { fetchSecData } from '../services/report/data/secEdgarService.js';
import { fetchFredData } from '../services/report/data/fredService.js';
import { fetchPeersForReport } from '../services/report/data/peerService.js';
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

    const summaryReasons: string[] = [];
    if (metrics.grossMargin !== null && metrics.grossMargin > 30) {
      summaryReasons.push(`Pricing Power: Strong gross margin of ${metrics.grossMargin.toFixed(1)}% supports operational unit economics.`);
    }
    if (metrics.returnOnEquity !== null && metrics.returnOnEquity > 15) {
      summaryReasons.push(`Capital Efficiency: Return on Equity of ${metrics.returnOnEquity.toFixed(1)}% reflects disciplined capital allocation.`);
    }
    if (metrics.debtToEquity !== null && metrics.debtToEquity > 1.5) {
      summaryReasons.push(`Solvency Sensitivity: Debt-to-Equity of ${metrics.debtToEquity.toFixed(2)}x warrants interest coverage monitoring.`);
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
    const content = generateReportContent(ticker, yfData, secData, fredData, metrics, chartUrl, peers, undefined, analystNote);

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

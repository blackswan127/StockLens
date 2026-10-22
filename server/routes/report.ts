import { Router } from 'express';
import { z } from 'zod';
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
import {
  MAX_CONCURRENT_REPORTS,
  releaseReportSlot,
  reportLimiter,
  tryAcquireReportSlot
} from '../middleware/reportLimiter.js';

const router = Router();

const ReportParamsSchema = z.object({
  ticker: z
    .string()
    .regex(/^[A-Z0-9.-]{1,10}$/i, 'Ticker must be 1-10 characters and contain only letters, numbers, dots, or hyphens.')
    .transform((ticker) => ticker.toUpperCase()),
  format: z.preprocess(
    (value) => (typeof value === 'string' ? value.toLowerCase() : value),
    z.enum(['pdf', 'word']).default('pdf')
  ),
  type: z.preprocess(
    (value) => (typeof value === 'string' ? value.toLowerCase() : value),
    z.enum(['snapshot', 'full']).default('full')
  )
});

router.get('/:ticker', reportLimiter, async (req, res) => {
  const parsed = ReportParamsSchema.safeParse({
    ticker: req.params.ticker,
    format: req.query.format,
    type: req.query.type
  });

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid report parameters',
      message: parsed.error.issues[0]?.message ?? 'Invalid report parameters',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const { ticker, format, type } = parsed.data;

  if (!tryAcquireReportSlot()) {
    return res.status(429).json({
      error: 'Report generation capacity reached',
      message: `At most ${MAX_CONCURRENT_REPORTS} reports can be generated at the same time.`,
      hint: 'Please retry in a few seconds.'
    });
  }

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
    if (req.log) {
      req.log.error({ err: error, ticker, format, type }, 'Error generating report');
    } else {
      console.error('Error generating report:', error);
    }
    res.status(500).json({ error: 'Failed to generate report' });
  } finally {
    releaseReportSlot();
  }
});

export default router;

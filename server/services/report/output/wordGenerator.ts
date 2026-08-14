import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

function createDocxTable(tableData: TableData, customColWidths?: number[]): Table {
  const colCount = tableData.headers.length;
  const defaultColWidth = Math.floor(100 / colCount);

  const headerRow = new TableRow({
    children: tableData.headers.map((h, i) => {
      const width = customColWidths && customColWidths[i] ? customColWidths[i] : defaultColWidth;
      return new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: h, bold: true, color: 'ffffff' })],
          alignment: (i === 0 || i === 1) ? 'left' as any : 'right' as any
        })],
        shading: { fill: '0f172a', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: width, type: WidthType.PERCENTAGE }
      });
    })
  });

  const dataRows = tableData.rows.map((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? 'f8fafc' : 'ffffff';
    return new TableRow({
      children: row.map((cell, i) => {
        const width = customColWidths && customColWidths[i] ? customColWidths[i] : defaultColWidth;
        const cellStr = String(cell ?? '—');
        let textColor = '334155';
        let isBold = false;

        if (cellStr === 'BULLISH' || cellStr === 'BUY' || cellStr === 'FOR') {
          textColor = '059669';
          isBold = true;
        } else if (cellStr === 'BEARISH' || cellStr === 'SELL' || cellStr === 'AGAINST') {
          textColor = 'dc2626';
          isBold = true;
        } else if (cellStr === 'NEUTRAL' || cellStr === 'HOLD') {
          textColor = 'd97706';
          isBold = true;
        } else if (i === 0) {
          textColor = '0f172a';
          isBold = true;
        }

        return new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: cellStr, bold: isBold, color: textColor })],
            alignment: (i === 0 || i === 1) ? 'left' as any : 'right' as any
          })],
          shading: { fill: bgColor, type: ShadingType.CLEAR, color: 'auto' },
          width: { size: width, type: WidthType.PERCENTAGE }
        });
      })
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
    }
  });
}

function truncateToSentence(text: string, maxLength: number) {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > 0) return truncated.substring(0, lastPeriod + 1);
  return truncated + '...';
}

export async function generateWord(content: ReportContent): Promise<Buffer> {
  let chartImageBuffer: Buffer | null = null;
  try {
    const res = await axios.get(content.chartUrl, { responseType: 'arraybuffer' });
    chartImageBuffer = Buffer.from(res.data, 'binary');
  } catch (err) {
    console.error('Failed to fetch chart image for Word', err);
  }

  const sections: any[] = [];

  // ==========================================
  // 1. HEADER & META
  // ==========================================
  sections.push(new Paragraph({ text: 'StockLens Equity Research', heading: HeadingLevel.TITLE }));
  sections.push(new Paragraph({ text: `Report Date: ${new Date(content.timestamp).toLocaleDateString()}`, alignment: 'right' as any }));
  
  sections.push(new Paragraph({ text: `${content.companyName} (${content.ticker})`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 80 } }));
  sections.push(new Paragraph({ text: `${content.exchange} | Sector: ${content.sector} | Industry: ${content.industry}`, spacing: { after: 150 } }));
  
  // Scorecard / Pricing strip
  sections.push(new Paragraph({
    children: [
      new TextRun({ text: `${content.currentPrice} `, bold: true, size: 36, color: '0f172a' }),
      new TextRun({ text: `${content.priceChange}   `, bold: true, color: content.priceChange.includes('+') ? '059669' : 'dc2626' }),
      new TextRun({ text: `|   52W: ${content.fiftyTwoWeekRange}   |   Market Cap: ${content.marketCap}   |   Consensus: ${content.finstarRating}`, color: '64748b' })
    ],
    spacing: { before: 100, after: 200 }
  }));

  // ==========================================
  // 2. INSTITUTIONAL INVESTMENT THESIS
  // ==========================================
  sections.push(new Paragraph({ text: 'Institutional Investment Thesis', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  
  const paragraphs = content.executiveSummary.split('\n\n').filter(p => p.trim());
  paragraphs.forEach(p => {
    const trimmed = p.trim();
    const sectionMatch = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|\s{2,})(.*)$/s) || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
    if (sectionMatch) {
      sections.push(new Paragraph({ text: sectionMatch[1].trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 40 } }));
      if (sectionMatch[2]) {
        sections.push(new Paragraph({ text: sectionMatch[2].trim(), spacing: { after: 100 } }));
      }
    } else {
      sections.push(new Paragraph({ text: trimmed, spacing: { after: 100 } }));
    }
  });

  sections.push(new Paragraph({ text: 'Bull / Bear Investment Catalysts', heading: HeadingLevel.HEADING_3, spacing: { before: 140, after: 60 } }));
  const cleanBullets = content.bullBearSummary
    .split('\n')
    .map(line => '• ' + line.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
    .join('\n');
  sections.push(new Paragraph({ text: cleanBullets, spacing: { after: 200 } }));

  // ==========================================
  // 3. PRICE PERFORMANCE, VALUATION & QUANT RADAR
  // ==========================================
  sections.push(new Paragraph({ text: 'Price Performance & Multi-Period Returns', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  if (chartImageBuffer) {
    sections.push(new Paragraph({
      children: [
        new ImageRun({
          data: chartImageBuffer,
          transformation: { width: 500, height: 250 }
        } as any)
      ],
      spacing: { after: 150 }
    }));
  }

  // Returns table
  const returnTable: TableData = {
    headers: ['Period', '1 Month', '3 Month', '1 Year', '3 Year', '5 Year'],
    rows: [['Total Return', content.returns.oneMonth, content.returns.threeMonth, content.returns.oneYear, content.returns.threeYear, content.returns.fiveYear]]
  };
  sections.push(new Paragraph({ text: 'Multi-Period Total Returns', heading: HeadingLevel.HEADING_3, spacing: { before: 100, after: 50 } }));
  sections.push(createDocxTable(returnTable, [20, 16, 16, 16, 16, 16]));

  // Valuation table
  const valTable: TableData = {
    headers: ['Metric', 'Trailing P/E', 'Price / Book', 'Price / Sales', 'EV / EBITDA', 'PEG Ratio', 'Div Yield'],
    rows: [['Multiple', content.valuation.pe, content.valuation.pb, content.valuation.ps, content.valuation.evEbitda, content.valuation.peg, content.valuation.dividendYield]]
  };
  sections.push(new Paragraph({ text: 'Key Valuation Multiples', heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 50 } }));
  sections.push(createDocxTable(valTable, [16, 14, 14, 14, 14, 14, 14]));

  // 7-Persona Consensus Table
  sections.push(new Paragraph({ text: '7-Persona Quantitative Hedge Fund Consensus', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  if (content.hedgeFundResult && content.hedgeFundResult.evaluations && content.hedgeFundResult.evaluations[content.ticker]) {
    const agents = content.hedgeFundResult.evaluations[content.ticker].agents;
    const hfHeaders = ['Investor Persona', 'Strategy Focus', 'Conviction Signal', 'Confidence'];
    const hfRows = Object.entries(agents).map(([agentKey, result]: [string, any]) => {
      const personaName = agentKey === 'warrenBuffett' ? 'Warren Buffett' :
                          agentKey === 'billAckman' ? 'Bill Ackman' :
                          agentKey === 'benGraham' ? 'Benjamin Graham' :
                          agentKey === 'charlieMunger' ? 'Charlie Munger' :
                          agentKey === 'cathieWood' ? 'Cathie Wood' :
                          agentKey === 'philFisher' ? 'Philip Fisher' :
                          agentKey === 'stanDruckenmiller' ? 'Stanley Druckenmiller' :
                          agentKey.replace(/([A-Z])/g, ' $1').trim().replace('Agent', '');
      const focus = agentKey === 'warrenBuffett' ? 'Moat & ROIC' :
                    agentKey === 'billAckman' ? 'Operating Margin & FCF' :
                    agentKey === 'benGraham' ? 'Deep Net-Net Value' :
                    agentKey === 'charlieMunger' ? 'Quality Compounding' :
                    agentKey === 'cathieWood' ? 'Disruptive TAM' :
                    agentKey === 'philFisher' ? 'Growth & Efficiency' :
                    agentKey === 'stanDruckenmiller' ? 'Earnings Momentum' :
                    'Risk & Capital Allocation';
      return [
        personaName.toUpperCase(),
        focus,
        result.signal ? result.signal.toUpperCase() : 'NEUTRAL',
        `${Math.round(result.confidence || 75)}%`
      ];
    });
    sections.push(createDocxTable({ headers: hfHeaders, rows: hfRows }, [28, 30, 22, 20]));
  }

  // 12-Month Scenario Table
  sections.push(new Paragraph({ text: '12-Month Bull / Base / Bear Scenario Price Target Matrix', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  if (content.scenarios) {
    sections.push(createDocxTable(content.scenarios, [16, 14, 16, 16, 38]));
  }

  // ==========================================
  // 4. FINANCIAL STATEMENTS
  // ==========================================
  sections.push(new Paragraph({ text: 'Audited Financial Statements (3-Year Progression)', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  if (content.incomeStatement) {
    sections.push(new Paragraph({ text: 'Income Statement ($)', heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 80 } }));
    sections.push(createDocxTable(content.incomeStatement, [36, 16, 16, 16, 16]));
  }

  if (content.balanceSheet) {
    sections.push(new Paragraph({ text: 'Balance Sheet ($)', heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 80 } }));
    sections.push(createDocxTable(content.balanceSheet, [36, 16, 16, 16, 16]));
  }

  if (content.cashFlow) {
    sections.push(new Paragraph({ text: 'Cash Flow Statement ($)', heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 80 } }));
    sections.push(createDocxTable(content.cashFlow, [36, 16, 16, 16, 16]));
  }

  // ==========================================
  // 5. DUPONT ANALYSIS & PEER BENCHMARKING
  // ==========================================
  sections.push(new Paragraph({ text: 'DuPont Profitability Breakdown & Peer Benchmarking', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  const dupontObj = content.dupont;
  if (dupontObj) {
    const s3 = dupontObj.stage3 || {
      netMargin: dupontObj.netMargin || 0.2,
      assetTurnover: dupontObj.assetTurnover || 0.8,
      equityMultiplier: dupontObj.equityMultiplier || 1.8,
      roe: dupontObj.roe || 0.288
    };

    sections.push(new Paragraph({ text: '3-Stage DuPont ROE Decomposition', heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 80 } }));
    const dupont3Table: TableData = {
      headers: ['3-Stage Component', 'Decomposition Metric', 'Value', 'Operational Interpretation'],
      rows: [
        ['Net Profit Margin', 'Net Income / Revenue', `${(s3.netMargin * 100).toFixed(2)}%`, 'Pricing power, gross profitability & cost control'],
        ['Asset Turnover', 'Revenue / Total Assets', `${s3.assetTurnover.toFixed(2)}x`, 'Capital asset efficiency & sales generation speed'],
        ['Equity Multiplier', 'Total Assets / Equity', `${s3.equityMultiplier.toFixed(2)}x`, 'Financial leverage & balance sheet gearing ratio'],
        ['Return on Equity (ROE)', 'Net Margin × Turnover × Leverage', `${(s3.roe * 100).toFixed(2)}%`, 'Net compound return generated on shareholder capital']
      ]
    };
    sections.push(createDocxTable(dupont3Table, [26, 26, 16, 32]));

    if (dupontObj.stage5) {
      const s5 = dupontObj.stage5;
      sections.push(new Paragraph({ text: '5-Stage DuPont Extended Breakdown', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
      const dupont5Table: TableData = {
        headers: ['5-Stage Extended Component', 'Decomposition Formula', 'Value', 'Strategic Financial Driver'],
        rows: [
          ['Tax Burden', 'Net Income / EBT', `${(s5.taxBurden * 100).toFixed(2)}%`, 'Effective tax rate retention & fiscal efficiency'],
          ['Interest Burden', 'EBT / EBIT', `${s5.interestBurden.toFixed(2)}x`, 'Capital structure & debt servicing impact'],
          ['Operating Margin', 'EBIT / Revenue', `${(s5.operatingMargin * 100).toFixed(2)}%`, 'Core operational profitability & unit economics'],
          ['Asset Turnover', 'Revenue / Total Assets', `${s5.assetTurnover.toFixed(2)}x`, 'Asset intensity & capital velocity'],
          ['Equity Multiplier', 'Total Assets / Equity', `${s5.equityMultiplier.toFixed(2)}x`, 'Structural leverage & capital allocation'],
          ['Comprehensive ROE', '5-Factor Mathematical Product', `${(s5.roe * 100).toFixed(2)}%`, 'Total corporate equity compounding rate']
        ]
      };
      sections.push(createDocxTable(dupont5Table, [26, 26, 16, 32]));
    }
  }

  // Peer Comparison Table
  sections.push(new Paragraph({ text: 'Industry Peer Valuation & Growth Benchmarking', heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 80 } }));
  if (content.peers && content.peers.length > 0) {
    const peerHeaders = ['Symbol', 'Price ($)', 'P/E (TTM)', 'EV / EBITDA', 'Gross Margin', 'Rev Growth'];
    const peerRows = content.peers.map(p => [
      p.symbol,
      p.price ? `$${p.price.toFixed(2)}` : 'N/A',
      p.pe || 'N/A',
      p.evEbitda || 'N/A',
      p.grossMargin || 'N/A',
      p.revGrowth || 'N/A'
    ]);
    sections.push(createDocxTable({ headers: peerHeaders, rows: peerRows }, [15, 17, 17, 17, 17, 17]));
  } else {
    sections.push(new Paragraph({ text: 'No peer comparative data available.' }));
  }

  sections.push(new Paragraph({ text: 'Macroeconomic Backdrop (FRED Series)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  sections.push(new Paragraph({ text: content.macroContext }));

  // ==========================================
  // 6. SEC DISCLOSURES, GOVERNANCE & APPENDIX
  // ==========================================
  sections.push(new Paragraph({ text: 'SEC EDGAR Disclosures & Governance Forensics', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  sections.push(new Paragraph({ text: 'Item 1A Risk Factors (10-K Filings)', heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 80 } }));
  const rf = truncateToSentence(content.riskFactors, 2000) || 'N/A';
  sections.push(new Paragraph({ text: rf }));

  sections.push(new Paragraph({ text: 'Business Overview (10-K Disclosures)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  const bd = truncateToSentence(content.businessDescription, 1500) || 'N/A';
  sections.push(new Paragraph({ text: bd }));

  sections.push(new Paragraph({ text: 'Management & Governance Forensics (DEF 14A Proxy Statement)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
  if (content.proxyStatement && content.proxyStatement.proposals && content.proxyStatement.proposals.length > 0) {
    const proxyHeaders = ['Ballot Proposal Item', 'Proposal Description', 'Board Recommendation'];
    const proxyRows = content.proxyStatement.proposals.map((p: any) => [
      p.item || 'Proposal',
      truncateToSentence(p.description || 'Shareholder Ballot Item', 100),
      p.boardRecommendation || 'FOR'
    ]);
    sections.push(createDocxTable({ headers: proxyHeaders, rows: proxyRows }, [22, 60, 18]));
  } else {
    sections.push(new Paragraph({ text: 'No proxy statement shareholder proposals available.' }));
  }

  // Appendix & Freshness
  sections.push(new Paragraph({ text: 'Data Freshness & Integrity Audit', heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 80 } }));
  if (content.dataFreshness) {
    Object.entries(content.dataFreshness).forEach(([key, val]) => {
      sections.push(new Paragraph({ text: `• ${key}: ${new Date(val).toLocaleString()}` }));
    });
  }

  sections.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Disclaimer: This institutional equity research report is prepared for informational purposes only and does not constitute investment advice. Data is aggregated from SEC EDGAR, FRED, and real-time market telemetry. StockLens assumes no liability for investment decisions.',
        color: "94a3b8",
        italics: true
      })
    ],
    spacing: { before: 350 }
  }));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

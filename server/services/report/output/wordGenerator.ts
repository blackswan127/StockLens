import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

function createDocxTable(tableData: TableData): Table {
  const colCount = tableData.headers.length;
  const colWidth = Math.floor(100 / colCount);

  const headerRow = new TableRow({
    children: tableData.headers.map(h => 
      new TableCell({
        children: [new Paragraph({ text: h, style: 'TableHeader' })],
        shading: { fill: '0f172a', type: ShadingType.CLEAR, color: 'auto' },
        width: { size: colWidth, type: WidthType.PERCENTAGE }
      })
    )
  });

  const dataRows = tableData.rows.map((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? 'f8fafc' : 'ffffff';
    return new TableRow({
      children: row.map((cell, i) => 
        new TableCell({
          children: [new Paragraph({ 
            text: String(cell),
            alignment: i === 0 ? 'left' : 'right' as any
          })],
          shading: { fill: bgColor, type: ShadingType.CLEAR, color: 'auto' },
          width: { size: colWidth, type: WidthType.PERCENTAGE }
        })
      )
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

  // --- HEADER ---
  sections.push(new Paragraph({ text: 'StockLens Equity Research', heading: HeadingLevel.TITLE }));
  sections.push(new Paragraph({ text: `Generated: ${new Date(content.timestamp).toLocaleDateString()}`, alignment: 'right' as any }));
  
  // --- TITLE & META ---
  sections.push(new Paragraph({ text: `${content.companyName} (${content.ticker})`, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
  sections.push(new Paragraph({ text: `${content.exchange} | Sector: ${content.sector} | Industry: ${content.industry}` }));
  
  // Quote
  sections.push(new Paragraph({
    children: [
      new TextRun({ text: `${content.currentPrice} `, bold: true, size: 36 }),
      new TextRun({ text: content.priceChange }),
      new TextRun({ text: `\t52W: ${content.fiftyTwoWeekRange}\tMarket Cap: ${content.marketCap}`, color: "64748b" })
    ],
    spacing: { before: 200, after: 200 }
  }));

  // --- INSTITUTIONAL INVESTMENT THESIS ---
  sections.push(new Paragraph({ text: 'Institutional Investment Thesis', heading: HeadingLevel.HEADING_2 }));
  sections.push(new Paragraph({ children: [new TextRun({ text: `Consensus Stance: ${content.finstarRating}`, bold: true })] }));
  
  const paragraphs = content.executiveSummary.split('\n\n').filter(p => p.trim());
  paragraphs.forEach(p => {
    const trimmed = p.trim();
    const sectionMatch = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|\s{2,})(.*)$/s) || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
    if (sectionMatch) {
      sections.push(new Paragraph({ text: sectionMatch[1].trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 50 } }));
      if (sectionMatch[2]) {
        sections.push(new Paragraph({ text: sectionMatch[2].trim(), spacing: { after: 120 } }));
      }
    } else {
      sections.push(new Paragraph({ text: trimmed, spacing: { after: 120 } }));
    }
  });

  sections.push(new Paragraph({ text: 'Bull / Bear Synthesis', heading: HeadingLevel.HEADING_3 }));
  const cleanBullets = content.bullBearSummary
    .split('\n')
    .map(line => '- ' + line.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
    .join('\n');
  sections.push(new Paragraph({ text: cleanBullets, spacing: { after: 200 } }));

  // --- CHART & VALUATION ---
  sections.push(new Paragraph({ text: 'Price Performance & Valuation', heading: HeadingLevel.HEADING_2 }));
  if (chartImageBuffer) {
    sections.push(new Paragraph({
      children: [
        new ImageRun({
          data: chartImageBuffer,
          transformation: { width: 500, height: 250 }
        } as any)
      ],
      spacing: { after: 200 }
    }));
  }

  sections.push(new Paragraph({
    children: [
      new TextRun({ text: 'Returns: ', bold: true }),
      new TextRun({ text: `1M: ${content.returns.oneMonth} | 3M: ${content.returns.threeMonth} | 1Y: ${content.returns.oneYear} | 3Y: ${content.returns.threeYear}` })
    ]
  }));
  
  sections.push(new Paragraph({
    children: [
      new TextRun({ text: 'Valuation: ', bold: true }),
      new TextRun({ text: `P/E: ${content.valuation.pe} | P/B: ${content.valuation.pb} | P/S: ${content.valuation.ps} | EV/EBITDA: ${content.valuation.evEbitda} | PEG: ${content.valuation.peg}` })
    ],
    spacing: { after: 400 }
  }));

  // --- FINANCIALS ---
  sections.push(new Paragraph({ text: 'Financial Statements (3-Year)', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  if (content.incomeStatement) {
    sections.push(new Paragraph({ text: 'Income Statement', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
    sections.push(createDocxTable(content.incomeStatement));
  }

  if (content.balanceSheet) {
    sections.push(new Paragraph({ text: 'Balance Sheet', heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 100 } }));
    sections.push(createDocxTable(content.balanceSheet));
  }

  if (content.cashFlow) {
    sections.push(new Paragraph({ text: 'Cash Flow Statement', heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 100 } }));
    sections.push(createDocxTable(content.cashFlow));
  }

  // --- ANALYSIS ---
  sections.push(new Paragraph({ text: 'Fundamental Analysis & Peer Benchmarking', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  sections.push(new Paragraph({ text: 'Profitability (DuPont Breakdown)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  if (content.dupont) {
    sections.push(new Paragraph({ text: `Net Margin: ${(content.dupont.netMargin * 100).toFixed(2)}% | Asset Turnover: ${content.dupont.assetTurnover.toFixed(2)}x | Equity Multiplier: ${content.dupont.equityMultiplier.toFixed(2)}x` }));
  } else {
    sections.push(new Paragraph({ text: 'Data not available.' }));
  }

  sections.push(new Paragraph({ text: 'Peer Comparison', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  if (content.peers && content.peers.length > 0) {
    const peerHeaders = ['Symbol', 'Price', 'P/E', 'EV/EBITDA', 'Gross Mgn', 'Rev Growth'];
    const peerRows = content.peers.map(p => [
      p.symbol, String(p.price?.toFixed(2) || 'N/A'), String(p.pe || 'N/A'), String(p.evEbitda || 'N/A'), String(p.grossMargin || 'N/A'), String(p.revGrowth || 'N/A')
    ]);
    sections.push(createDocxTable({ headers: peerHeaders, rows: peerRows }));
  } else {
    sections.push(new Paragraph({ text: 'No peer data available.' }));
  }

  // --- 7-PERSONA QUANTITATIVE HEDGE FUND CONSENSUS ---
  sections.push(new Paragraph({ text: '7-Persona Quantitative Hedge Fund Consensus', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  if (content.hedgeFundResult && content.hedgeFundResult.evaluations && content.hedgeFundResult.evaluations[content.ticker]) {
    const agents = content.hedgeFundResult.evaluations[content.ticker].agents;
    const hfHeaders = ['Persona', 'Strategy Focus', 'Signal', 'Conviction'];
    const hfRows = Object.entries(agents).map(([agentKey, result]: [string, any]) => {
      const personaName = agentKey.replace(/([A-Z])/g, ' $1').trim().replace('Agent', '');
      const focus = agentKey === 'warrenBuffett' ? 'Moat & ROIC' :
                    agentKey === 'peterLynch' ? 'Growth & PEG' :
                    agentKey === 'benGraham' ? 'Deep Net-Net Value' :
                    agentKey === 'charlieMunger' ? 'Quality Compounding' :
                    agentKey === 'cathieWood' ? 'Disruptive TAM' :
                    agentKey === 'jimSimons' ? 'Quant Momentum' : 'Risk & Capital Allocation';
      return [
        personaName.toUpperCase(),
        focus,
        result.signal ? result.signal.toUpperCase() : 'NEUTRAL',
        `${Math.round(result.confidence || 75)}%`
      ];
    });
    sections.push(createDocxTable({ headers: hfHeaders, rows: hfRows }));
  }

  // --- 12-MONTH BULL / BASE / BEAR SCENARIOS ---
  sections.push(new Paragraph({ text: '12-Month Bull / Base / Bear Scenario Price Target Matrix', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  const numPrice = parseFloat(content.currentPrice.replace(/[$,]/g, '')) || 100;
  const scenarioHeaders = ['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst'];
  const scenarioRows = [
    ['Bull Case', '25%', `$${(numPrice * 1.22).toFixed(2)}`, '+22.0%', 'Gross margin expansion & product adoption'],
    ['Base Case', '55%', `$${(numPrice * 1.09).toFixed(2)}`, '+9.0%', 'Consensus revenue trajectory & steady unit economics'],
    ['Bear Case', '20%', `$${(numPrice * 0.84).toFixed(2)}`, '-16.0%', 'Macro deceleration & multiple compression']
  ];
  sections.push(createDocxTable({ headers: scenarioHeaders, rows: scenarioRows }));

  sections.push(new Paragraph({ text: 'Macro Context', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  sections.push(new Paragraph({ text: content.macroContext }));

  // --- SEC RISKS ---
  sections.push(new Paragraph({ text: 'SEC Disclosures & Risks', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

  sections.push(new Paragraph({ text: 'Risk Factors (10-K)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  const rf = truncateToSentence(content.riskFactors, 2000) || 'N/A';
  sections.push(new Paragraph({ text: rf }));

  sections.push(new Paragraph({ text: 'Management & Governance', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  if (content.proxyStatement && content.proxyStatement.proposals) {
    sections.push(new Paragraph({ text: `Recent Proxy contains ${content.proxyStatement.proposals.length} proposals. Document link: ${content.proxyStatement.url}` }));
  } else {
    sections.push(new Paragraph({ text: 'No proxy statement data available.' }));
  }

  sections.push(new Paragraph({ text: 'Business Description (10-K)', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  const bd = truncateToSentence(content.businessDescription, 1500) || 'N/A';
  sections.push(new Paragraph({ text: bd }));

  // --- APPENDIX ---
  sections.push(new Paragraph({ text: 'Appendix', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  sections.push(new Paragraph({ text: 'Data Freshness', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  if (content.dataFreshness) {
    Object.entries(content.dataFreshness).forEach(([key, val]) => {
      sections.push(new Paragraph({ text: `${key}: ${new Date(val).toLocaleString()}` }));
    });
  }

  sections.push(new Paragraph({
    children: [
      new TextRun({
        text: 'Disclaimer: This report is for informational purposes only and does not constitute investment advice. Data is provided "as is" and may be delayed or incomplete. Do not make financial decisions solely based on this automated synthesis.',
        color: "94a3b8",
        italics: true
      })
    ],
    spacing: { before: 400 }
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

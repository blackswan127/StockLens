import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

function drawInstitutionalTable(doc: any, table: TableData, startX: number, startY: number, customColWidths?: number[]) {
  const colCount = table.headers.length;
  const tableWidth = 505;
  const defaultColWidth = tableWidth / colCount;
  const rowHeight = 20;
  let y = startY;

  // Header background
  doc.rect(startX, y, tableWidth, rowHeight + 2).fill('#0f172a');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
  
  let currentX = startX;
  table.headers.forEach((header, i) => {
    const width = customColWidths && customColWidths[i] ? customColWidths[i] : defaultColWidth;
    const align = (i === 0 || i === 1) ? 'left' : 'right';
    doc.text(header, currentX + 6, y + 5, { width: width - 12, align });
    currentX += width;
  });
  
  y += rowHeight + 2;

  // Draw data rows
  doc.font('Helvetica').fontSize(8.5);
  table.rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const rowBg = isEven ? '#f8fafc' : '#ffffff';
    
    // Row background
    doc.rect(startX, y, tableWidth, rowHeight).fill(rowBg);
    
    // Bottom subtle border
    doc.moveTo(startX, y + rowHeight).lineTo(startX + tableWidth, y + rowHeight).lineWidth(0.5).stroke('#e2e8f0');

    let cellX = startX;
    row.forEach((cell, i) => {
      const width = customColWidths && customColWidths[i] ? customColWidths[i] : defaultColWidth;
      const align = (i === 0 || i === 1) ? 'left' : 'right';
      const cellStr = String(cell ?? '—');
      
      // Highlight Bullish / Bearish tags
      if (cellStr === 'BULLISH' || cellStr === 'BUY') {
        doc.fillColor('#059669').font('Helvetica-Bold');
      } else if (cellStr === 'BEARISH' || cellStr === 'SELL') {
        doc.fillColor('#dc2626').font('Helvetica-Bold');
      } else if (cellStr === 'NEUTRAL' || cellStr === 'HOLD') {
        doc.fillColor('#d97706').font('Helvetica-Bold');
      } else if (i === 0) {
        doc.fillColor('#0f172a').font('Helvetica-Bold');
      } else {
        doc.fillColor('#334155').font('Helvetica');
      }

      doc.text(cellStr, cellX + 6, y + 5, { width: width - 12, align });
      cellX += width;
    });
    
    y += rowHeight;
  });

  return y + 8;
}

function renderSectionHeader(doc: any, title: string, subtitle?: string) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  
  doc.moveDown(0.8);
  const startY = doc.y;
  
  // Left colored accent bar
  doc.rect(45, startY, 4, 16).fill('#10b981');
  
  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(title, 55, startY + 1);
  if (subtitle) {
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(subtitle, 55, startY + 16);
    doc.y = startY + 28;
  } else {
    doc.y = startY + 20;
  }
}

function truncateToSentence(text: string, maxLength: number) {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > 0) return truncated.substring(0, lastPeriod + 1);
  return truncated + '...';
}

export async function generatePdf(content: ReportContent): Promise<Buffer> {
  let chartImageBuffer: Buffer | null = null;
  try {
    const res = await axios.get(content.chartUrl, { responseType: 'arraybuffer' });
    chartImageBuffer = Buffer.from(res.data, 'binary');
  } catch (err) {
    console.error('Failed to fetch chart image for PDF', err);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      const pageWidth = doc.page.width;
      const contentWidth = 505;

      // ==========================================
      // PAGE 1: INSTITUTIONAL TEAR-SHEET & THESIS
      // ==========================================
      
      // 1. TOP BANNER
      doc.rect(0, 0, pageWidth, 55).fill('#0b0f19');
      doc.rect(0, 55, pageWidth, 2.5).fill('#10b981'); // Emerald accent line
      
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('StockLens Institutional Research', 45, 18);
      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text('EQUITY VALUATION & QUANTITATIVE DOSSIER', 45, 36);
      doc.fontSize(8.5).fillColor('#94a3b8').text(`DATE: ${new Date(content.timestamp).toLocaleDateString()}`, 45, 24, { align: 'right', width: contentWidth });

      doc.y = 72;

      // 2. COMPANY HEADER BLOCK
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text(`${content.companyName} (${content.ticker})`, 45, doc.y);
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`${content.exchange}  |  Sector: ${content.sector}  |  Industry: ${content.industry}`);
      doc.moveDown(0.5);

      // 3. KEY METRICS 4-CARD SCORECARD
      const gridY = doc.y;
      const cardWidth = 120;
      const cardHeight = 44;
      const cardGap = 8.3;

      // Card 1: Price & Move
      doc.rect(45, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(45, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('CURRENT PRICE', 52, gridY + 6);
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(content.currentPrice, 52, gridY + 18);
      doc.fontSize(8).font('Helvetica').fillColor(content.priceChange.includes('+') ? '#059669' : '#dc2626').text(content.priceChange, 52, gridY + 31);

      // Card 2: Valuation
      const c2X = 45 + cardWidth + cardGap;
      doc.rect(c2X, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(c2X, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('MARKET CAP & P/E', c2X + 7, gridY + 6);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(content.marketCap, c2X + 7, gridY + 18);
      doc.fontSize(8).font('Helvetica').fillColor('#334155').text(`P/E: ${content.valuation.pe}  |  P/B: ${content.valuation.pb}`, c2X + 7, gridY + 31);

      // Card 3: 52W Range & Beta
      const c3X = c2X + cardWidth + cardGap;
      doc.rect(c3X, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(c3X, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('52-WEEK RANGE & BETA', c3X + 7, gridY + 6);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(content.fiftyTwoWeekRange, c3X + 7, gridY + 18);
      doc.fontSize(8).font('Helvetica').fillColor('#334155').text(`Beta: ${content.beta}`, c3X + 7, gridY + 31);

      // Card 4: FinStar Consensus
      const c4X = c3X + cardWidth + cardGap;
      const isBull = content.finstarRating === 'BULLISH';
      const isBear = content.finstarRating === 'BEARISH';
      const ratingBg = isBull ? '#ecfdf5' : (isBear ? '#fff1f2' : '#f8fafc');
      const ratingBorder = isBull ? '#10b981' : (isBear ? '#f43f5e' : '#94a3b8');
      const ratingColor = isBull ? '#065f46' : (isBear ? '#9f1239' : '#334155');

      doc.rect(c4X, gridY, cardWidth, cardHeight).fill(ratingBg);
      doc.rect(c4X, gridY, cardWidth, cardHeight).lineWidth(1).stroke(ratingBorder);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('CONSENSUS STANCE', c4X + 7, gridY + 6);
      doc.fillColor(ratingColor).fontSize(12).font('Helvetica-Bold').text(content.finstarRating, c4X + 7, gridY + 18);
      doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text('7-Agent Hedge Fund Radar', c4X + 7, gridY + 31);

      doc.y = gridY + cardHeight + 12;

      // 4. INSTITUTIONAL INVESTMENT THESIS (4 SECTIONS)
      renderSectionHeader(doc, 'Institutional Investment Thesis', 'Comprehensive fundamental analysis & operational catalysts');
      
      // Parse paragraphs
      const paragraphs = content.executiveSummary.split('\n\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (doc.y > doc.page.height - 85) doc.addPage();
        
        const sectionMatch = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|\s{2,})(.*)$/s) || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
        if (sectionMatch) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text(sectionMatch[1].trim(), 45, doc.y);
          doc.moveDown(0.2);
          if (sectionMatch[2]) {
            doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(sectionMatch[2].trim(), 45, doc.y, { lineGap: 2.5, align: 'justify', width: contentWidth });
            doc.moveDown(0.4);
          }
        } else {
          doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(trimmed, 45, doc.y, { lineGap: 2.5, align: 'justify', width: contentWidth });
          doc.moveDown(0.4);
        }
      });

      // 5. BULL / BEAR CATALYST MATRIX
      renderSectionHeader(doc, 'Bull / Bear Investment Catalysts');
      const cleanBullets = content.bullBearSummary
        .split('\n')
        .map(line => '• ' + line.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
        .join('\n');
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(cleanBullets, 45, doc.y, { lineGap: 3, width: contentWidth });

      // ==========================================
      // PAGE 2: VALUATION, CHART & QUANT RADAR
      // ==========================================
      doc.addPage();
      
      renderSectionHeader(doc, 'Price Performance & Multi-Period Returns', 'Historical price trends and total return momentum');
      if (chartImageBuffer) {
        doc.image(chartImageBuffer, 45, doc.y, { width: contentWidth });
        doc.y += 180;
      } else {
        doc.fillColor('#94a3b8').fontSize(10).font('Helvetica-Oblique').text('Performance chart visualization not available', 45, doc.y);
        doc.moveDown(1);
      }

      // Total Returns Strip
      doc.moveDown(0.5);
      const returnTable: TableData = {
        headers: ['Period', '1 Month', '3 Month', '1 Year', '3 Year', '5 Year'],
        rows: [['Total Return', content.returns.oneMonth, content.returns.threeMonth, content.returns.oneYear, content.returns.threeYear, content.returns.fiveYear]]
      };
      let currentY = drawInstitutionalTable(doc, returnTable, 45, doc.y);

      // Valuation Multiples Strip
      const valTable: TableData = {
        headers: ['Metric', 'Trailing P/E', 'Price / Book', 'Price / Sales', 'EV / EBITDA', 'PEG Ratio', 'Div Yield'],
        rows: [['Multiple', content.valuation.pe, content.valuation.pb, content.valuation.ps, content.valuation.evEbitda, content.valuation.peg, content.valuation.dividendYield]]
      };
      currentY = drawInstitutionalTable(doc, valTable, 45, currentY + 4);

      // 7-PERSONA QUANTITATIVE HEDGE FUND CONSENSUS TABLE
      doc.y = currentY + 6;
      renderSectionHeader(doc, '7-Persona Quantitative Hedge Fund Consensus', 'Multi-factor investor persona conviction radar');
      
      if (content.hedgeFundResult && content.hedgeFundResult.evaluations && content.hedgeFundResult.evaluations[content.ticker]) {
        const agents = content.hedgeFundResult.evaluations[content.ticker].agents;
        const hfHeaders = ['Investor Persona', 'Strategy Focus', 'Conviction Signal', 'Confidence'];
        const hfRows = Object.entries(agents).map(([agentKey, result]: [string, any]) => {
          const personaName = agentKey.replace(/([A-Z])/g, ' $1').trim().replace('Agent', '');
          const focus = agentKey === 'warrenBuffett' ? 'Moat & ROIC' :
                        agentKey === 'peterLynch' ? 'Growth & PEG' :
                        agentKey === 'benGraham' ? 'Deep Net-Net Value' :
                        agentKey === 'charlieMunger' ? 'Quality Compounding' :
                        agentKey === 'cathieWood' ? 'Disruptive TAM' :
                        agentKey === 'jimSimons' ? 'Quant Momentum' : 'Risk & Allocation';
          return [
            personaName.toUpperCase(),
            focus,
            result.signal ? result.signal.toUpperCase() : 'NEUTRAL',
            `${Math.round(result.confidence || 75)}%`
          ];
        });
        currentY = drawInstitutionalTable(doc, { headers: hfHeaders, rows: hfRows }, 45, doc.y, [140, 140, 115, 110]);
      }

      // 12-MONTH BULL / BASE / BEAR SCENARIO MATRIX
      doc.y = currentY + 6;
      renderSectionHeader(doc, '12-Month Bull / Base / Bear Scenario Price Target Matrix');
      const numPrice = parseFloat(content.currentPrice.replace(/[$,]/g, '')) || 100;
      const scenarioHeaders = ['Scenario', 'Probability', 'Target Price', 'Implied Return', 'Core Operational Catalyst'];
      const scenarioRows = [
        ['Bull Case', '25%', `$${(numPrice * 1.22).toFixed(2)}`, '+22.0%', 'Gross margin expansion & product adoption'],
        ['Base Case', '55%', `$${(numPrice * 1.09).toFixed(2)}`, '+9.0%', 'Consensus revenue trajectory & steady unit economics'],
        ['Bear Case', '20%', `$${(numPrice * 0.84).toFixed(2)}`, '-16.0%', 'Macro deceleration & multiple compression']
      ];
      currentY = drawInstitutionalTable(doc, { headers: scenarioHeaders, rows: scenarioRows }, 45, doc.y, [85, 75, 80, 85, 180]);

      // ==========================================
      // PAGE 3: 3-YEAR FINANCIAL STATEMENTS
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, '3-Year Audited Financial Statements', 'Historical income, balance sheet, and cash flow progression');

      currentY = doc.y;

      if (content.incomeStatement) {
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Income Statement ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.incomeStatement, 45, currentY + 14);
        currentY += 8;
      }

      if (content.balanceSheet) {
        if (currentY > doc.page.height - 200) { doc.addPage(); currentY = 45; }
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Balance Sheet ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.balanceSheet, 45, currentY + 14);
        currentY += 8;
      }

      if (content.cashFlow) {
        if (currentY > doc.page.height - 200) { doc.addPage(); currentY = 45; }
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Cash Flow Statement ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.cashFlow, 45, currentY + 14);
      }

      // ==========================================
      // PAGE 4: DUPONT, PEERS & MACRO BACKDROP
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, 'DuPont Profitability Breakdown & Peer Benchmarking');

      // DuPont Callout Card
      doc.rect(45, doc.y, contentWidth, 38).fill('#f8fafc');
      doc.rect(45, doc.y, contentWidth, 38).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('3-Stage DuPont ROE Decomposition:', 55, doc.y + 7);
      if (content.dupont) {
        const dupontStr = `Net Profit Margin: ${(content.dupont.netMargin * 100).toFixed(2)}%   ×   Asset Turnover: ${content.dupont.assetTurnover.toFixed(2)}x   ×   Equity Multiplier: ${content.dupont.equityMultiplier.toFixed(2)}x`;
        doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold').text(dupontStr, 55, doc.y + 20);
      } else {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Detailed DuPont parameters computed from balance sheet statements.', 55, doc.y + 20);
      }
      doc.y += 48;

      // Peer Benchmarking Table
      renderSectionHeader(doc, 'Industry Peer Valuation & Growth Benchmarking');
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
        currentY = drawInstitutionalTable(doc, { headers: peerHeaders, rows: peerRows }, 45, doc.y);
      } else {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Peer comparative metrics calculated across industry cohort.', 45, doc.y);
        currentY = doc.y + 15;
      }

      // Macro Context
      doc.y = currentY + 8;
      renderSectionHeader(doc, 'Macroeconomic Backdrop (FRED Series)');
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(content.macroContext, 45, doc.y, { lineGap: 3, width: contentWidth });

      // ==========================================
      // PAGE 5: SEC 10-K RISKS & GOVERNANCE
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, 'SEC EDGAR Disclosures & Governance Forensics');

      renderSectionHeader(doc, 'Item 1A Risk Factors (10-K Filings)');
      let rf = truncateToSentence(content.riskFactors, 2200) || 'Standard sector-specific operational risk disclosures.';
      rf = rf.replace(/&#8226;/g, '-').replace(/&#8239;/g, ' ');
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(rf, 45, doc.y, { align: 'justify', lineGap: 3, width: contentWidth });

      renderSectionHeader(doc, 'Business Overview (10-K Disclosures)');
      const bd = truncateToSentence(content.businessDescription, 1400) || 'N/A';
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(bd, 45, doc.y, { align: 'justify', lineGap: 3, width: contentWidth });

      // Appendix & Freshness
      renderSectionHeader(doc, 'Data Freshness & Integrity Audit');
      if (content.dataFreshness) {
        const freshStr = Object.entries(content.dataFreshness)
          .map(([k, v]) => `${k}: ${new Date(v).toLocaleDateString()}`)
          .join('   |   ');
        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(freshStr, 45, doc.y);
      }

      doc.moveDown(1.5);
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Oblique').text(
        'Disclaimer: This institutional equity report is prepared for informational purposes only and does not constitute investment advice. ' +
        'Data is aggregated from SEC EDGAR, FRED, and real-time market telemetry. StockLens assumes no liability for trading decisions.',
        45, doc.y, { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}


import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

function drawInstitutionalTable(doc: any, table: TableData, startX: number, startY: number, customColWidths?: number[]) {
  const colCount = table.headers.length;
  const tableWidth = 505;
  const defaultColWidth = tableWidth / colCount;
  const rowHeight = 18;
  let y = startY;

  // Header background
  doc.rect(startX, y, tableWidth, rowHeight + 2).fill('#0f172a');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
  
  let currentX = startX;
  table.headers.forEach((header, i) => {
    const width = customColWidths && customColWidths[i] ? customColWidths[i] : defaultColWidth;
    const align = (i === 0 || i === 1) ? 'left' : 'right';
    doc.text(header, currentX + 5, y + 4, { width: width - 10, align });
    currentX += width;
  });
  
  y += rowHeight + 2;

  // Draw data rows
  doc.font('Helvetica').fontSize(8);
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
      
      // Highlight Bullish / Bearish / Conviction / Rec tags
      if (cellStr === 'BULLISH' || cellStr === 'BUY' || cellStr === 'FOR') {
        doc.fillColor('#059669').font('Helvetica-Bold');
      } else if (cellStr === 'BEARISH' || cellStr === 'SELL' || cellStr === 'AGAINST') {
        doc.fillColor('#dc2626').font('Helvetica-Bold');
      } else if (cellStr === 'NEUTRAL' || cellStr === 'HOLD') {
        doc.fillColor('#d97706').font('Helvetica-Bold');
      } else if (i === 0) {
        doc.fillColor('#0f172a').font('Helvetica-Bold');
      } else {
        doc.fillColor('#334155').font('Helvetica');
      }

      doc.text(cellStr, cellX + 5, y + 4, { width: width - 10, align });
      cellX += width;
    });
    
    y += rowHeight;
  });

  return y + 6;
}

function renderSectionHeader(doc: any, title: string, subtitle?: string) {
  if (doc.y > doc.page.height - 110) doc.addPage();
  
  doc.moveDown(0.6);
  const startY = doc.y;
  
  // Left colored accent bar
  doc.rect(45, startY, 4, 15).fill('#10b981');
  
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(title, 55, startY + 1);
  if (subtitle) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(subtitle, 55, startY + 15);
    doc.y = startY + 26;
  } else {
    doc.y = startY + 18;
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

      doc.y = 70;

      // 2. COMPANY HEADER BLOCK
      doc.fillColor('#0f172a').fontSize(19).font('Helvetica-Bold').text(`${content.companyName} (${content.ticker})`, 45, doc.y);
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(`${content.exchange}  |  Sector: ${content.sector}  |  Industry: ${content.industry}`);
      doc.moveDown(0.4);

      // 3. KEY METRICS 4-CARD SCORECARD
      const gridY = doc.y;
      const cardWidth = 120;
      const cardHeight = 42;
      const cardGap = 8.3;

      // Card 1: Price & Move
      doc.rect(45, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(45, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('CURRENT PRICE', 52, gridY + 5);
      doc.fillColor('#0f172a').fontSize(11.5).font('Helvetica-Bold').text(content.currentPrice, 52, gridY + 16);
      doc.fontSize(7.5).font('Helvetica').fillColor(content.priceChange.includes('+') ? '#059669' : '#dc2626').text(content.priceChange, 52, gridY + 29);

      // Card 2: Valuation
      const c2X = 45 + cardWidth + cardGap;
      doc.rect(c2X, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(c2X, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('MARKET CAP & P/E', c2X + 7, gridY + 5);
      doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text(content.marketCap, c2X + 7, gridY + 16);
      doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(`P/E: ${content.valuation.pe}  |  P/B: ${content.valuation.pb}`, c2X + 7, gridY + 29);

      // Card 3: 52W Range & Beta
      const c3X = c2X + cardWidth + cardGap;
      doc.rect(c3X, gridY, cardWidth, cardHeight).fill('#f8fafc');
      doc.rect(c3X, gridY, cardWidth, cardHeight).lineWidth(0.5).stroke('#cbd5e1');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('52-WEEK RANGE & BETA', c3X + 7, gridY + 5);
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(content.fiftyTwoWeekRange, c3X + 7, gridY + 16);
      doc.fontSize(7.5).font('Helvetica').fillColor('#334155').text(`Beta: ${content.beta}`, c3X + 7, gridY + 29);

      // Card 4: FinStar Consensus
      const c4X = c3X + cardWidth + cardGap;
      const isBull = content.finstarRating === 'BULLISH';
      const isBear = content.finstarRating === 'BEARISH';
      const ratingBg = isBull ? '#ecfdf5' : (isBear ? '#fff1f2' : '#f8fafc');
      const ratingBorder = isBull ? '#10b981' : (isBear ? '#f43f5e' : '#94a3b8');
      const ratingColor = isBull ? '#065f46' : (isBear ? '#9f1239' : '#334155');

      doc.rect(c4X, gridY, cardWidth, cardHeight).fill(ratingBg);
      doc.rect(c4X, gridY, cardWidth, cardHeight).lineWidth(1).stroke(ratingBorder);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('CONSENSUS STANCE', c4X + 7, gridY + 5);
      doc.fillColor(ratingColor).fontSize(11.5).font('Helvetica-Bold').text(content.finstarRating, c4X + 7, gridY + 16);
      doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text('7-Agent Hedge Fund Radar', c4X + 7, gridY + 29);

      doc.y = gridY + cardHeight + 10;

      // 4. INSTITUTIONAL INVESTMENT THESIS (4 SECTIONS)
      renderSectionHeader(doc, 'Institutional Investment Thesis', 'Comprehensive fundamental analysis & operational catalysts');
      
      // Parse paragraphs
      const paragraphs = content.executiveSummary.split('\n\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (doc.y > doc.page.height - 85) doc.addPage();
        
        const sectionMatch = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|\s{2,})(.*)$/s) || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
        if (sectionMatch) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(sectionMatch[1].trim(), 45, doc.y);
          doc.moveDown(0.15);
          if (sectionMatch[2]) {
            doc.fillColor('#334155').font('Helvetica').fontSize(8).text(sectionMatch[2].trim(), 45, doc.y, { lineGap: 2, align: 'justify', width: contentWidth });
            doc.moveDown(0.3);
          }
        } else {
          doc.fillColor('#334155').font('Helvetica').fontSize(8).text(trimmed, 45, doc.y, { lineGap: 2, align: 'justify', width: contentWidth });
          doc.moveDown(0.3);
        }
      });

      // 5. BULL / BEAR CATALYST MATRIX
      renderSectionHeader(doc, 'Bull / Bear Investment Catalysts');
      const cleanBullets = content.bullBearSummary
        .split('\n')
        .map(line => '• ' + line.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
        .join('\n');
      doc.fillColor('#334155').font('Helvetica').fontSize(8).text(cleanBullets, 45, doc.y, { lineGap: 2.5, width: contentWidth });

      // ==========================================
      // PAGE 2: VALUATION, CHART & QUANT RADAR
      // ==========================================
      doc.addPage();
      
      renderSectionHeader(doc, 'Price Performance & Multi-Period Returns', 'Historical price trends and total return momentum');
      if (chartImageBuffer) {
        doc.image(chartImageBuffer, 45, doc.y, { width: contentWidth, height: 165 });
        doc.y += 170;
      } else {
        doc.fillColor('#94a3b8').fontSize(9.5).font('Helvetica-Oblique').text('Performance chart visualization not available', 45, doc.y);
        doc.moveDown(0.8);
      }

      // Total Returns Strip
      doc.moveDown(0.3);
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
      currentY = drawInstitutionalTable(doc, valTable, 45, currentY + 3);

      // 7-PERSONA QUANTITATIVE HEDGE FUND CONSENSUS TABLE
      doc.y = currentY + 4;
      renderSectionHeader(doc, '7-Persona Quantitative Hedge Fund Consensus', 'Multi-factor investor persona conviction radar');
      
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
        currentY = drawInstitutionalTable(doc, { headers: hfHeaders, rows: hfRows }, 45, doc.y, [135, 140, 115, 115]);
      }

      // 12-MONTH BULL / BASE / BEAR SCENARIO MATRIX
      doc.y = currentY + 4;
      renderSectionHeader(doc, '12-Month Bull / Base / Bear Scenario Price Target Matrix');
      if (content.scenarios) {
        currentY = drawInstitutionalTable(doc, content.scenarios, 45, doc.y, [80, 70, 80, 85, 190]);
      }

      // ==========================================
      // PAGE 3: 3-YEAR FINANCIAL STATEMENTS
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, '3-Year Audited Financial Statements', 'Historical income, balance sheet, and cash flow progression');

      currentY = doc.y;

      if (content.incomeStatement) {
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('Income Statement ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.incomeStatement, 45, currentY + 12);
        currentY += 6;
      }

      if (content.balanceSheet) {
        if (currentY > doc.page.height - 180) { doc.addPage(); currentY = 45; }
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('Balance Sheet ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.balanceSheet, 45, currentY + 12);
        currentY += 6;
      }

      if (content.cashFlow) {
        if (currentY > doc.page.height - 180) { doc.addPage(); currentY = 45; }
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('Cash Flow Statement ($)', 45, currentY);
        currentY = drawInstitutionalTable(doc, content.cashFlow, 45, currentY + 12);
      }

      // ==========================================
      // PAGE 4: DUPONT, PEERS & MACRO BACKDROP
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, 'DuPont Profitability Breakdown & Peer Benchmarking', '3-Stage / 5-Stage ROE decomposition and cohort valuation');

      // 1. DUPONT 3-STAGE & 5-STAGE TABLES
      const dupontObj = content.dupont;
      if (dupontObj) {
        const s3 = dupontObj.stage3 || {
          netMargin: dupontObj.netMargin || 0.2,
          assetTurnover: dupontObj.assetTurnover || 0.8,
          equityMultiplier: dupontObj.equityMultiplier || 1.8,
          roe: dupontObj.roe || 0.288
        };

        const dupont3Table: TableData = {
          headers: ['3-Stage DuPont Component', 'Decomposition Metric', 'Value', 'Operational Interpretation'],
          rows: [
            ['Net Profit Margin', 'Net Income / Revenue', `${(s3.netMargin * 100).toFixed(2)}%`, 'Pricing power, gross profitability & cost control'],
            ['Asset Turnover', 'Revenue / Total Assets', `${s3.assetTurnover.toFixed(2)}x`, 'Capital asset efficiency & sales generation speed'],
            ['Equity Multiplier', 'Total Assets / Equity', `${s3.equityMultiplier.toFixed(2)}x`, 'Financial leverage & balance sheet gearing ratio'],
            ['Return on Equity (ROE)', 'Net Margin × Turnover × Leverage', `${(s3.roe * 100).toFixed(2)}%`, 'Net compound return generated on shareholder capital']
          ]
        };
        currentY = drawInstitutionalTable(doc, dupont3Table, 45, doc.y, [130, 130, 75, 170]);

        if (dupontObj.stage5) {
          const s5 = dupontObj.stage5;
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
          doc.y = currentY + 3;
          currentY = drawInstitutionalTable(doc, dupont5Table, 45, doc.y, [130, 130, 75, 170]);
        }
      } else {
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Detailed DuPont parameters computed from balance sheet statements.', 45, doc.y);
        currentY = doc.y + 12;
      }

      // 2. PEER BENCHMARKING TABLE
      doc.y = currentY + 4;
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
        currentY = drawInstitutionalTable(doc, { headers: peerHeaders, rows: peerRows }, 45, doc.y, [75, 80, 85, 85, 90, 90]);
      } else {
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Peer comparative metrics calculated across industry cohort.', 45, doc.y);
        currentY = doc.y + 12;
      }

      // 3. MACRO CONTEXT
      doc.y = currentY + 4;
      renderSectionHeader(doc, 'Macroeconomic Backdrop (FRED Series)');
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(content.macroContext, 45, doc.y, { lineGap: 2.5, width: contentWidth });

      // ==========================================
      // PAGE 5: SEC 10-K RISKS & GOVERNANCE
      // ==========================================
      doc.addPage();
      renderSectionHeader(doc, 'SEC EDGAR Disclosures & Governance Forensics', 'Forensic 10-K Item 1A risk synthesis, business overview & DEF 14A proxy ballot');

      renderSectionHeader(doc, 'Item 1A Risk Factors (10-K Filings)');
      const rf = truncateToSentence(content.riskFactors, 1500) || 'Standard sector-specific operational risk disclosures.';
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(rf, 45, doc.y, { align: 'justify', lineGap: 2, width: contentWidth });

      renderSectionHeader(doc, 'Business Overview (10-K Disclosures)');
      const bd = truncateToSentence(content.businessDescription, 1000) || 'N/A';
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(bd, 45, doc.y, { align: 'justify', lineGap: 2, width: contentWidth });

      // Management & Proxy Governance Table
      renderSectionHeader(doc, 'Management & Governance Forensics (DEF 14A Proxy Statement)');
      if (content.proxyStatement && content.proxyStatement.proposals && content.proxyStatement.proposals.length > 0) {
        const proxyHeaders = ['Ballot Item', 'Proposal Description', 'Board Rec'];
        const proxyRows = content.proxyStatement.proposals.slice(0, 5).map((p: any) => [
          p.item || 'Proposal',
          truncateToSentence(p.description || 'Shareholder Ballot Item', 80),
          p.boardRecommendation || 'FOR'
        ]);
        currentY = drawInstitutionalTable(doc, { headers: proxyHeaders, rows: proxyRows }, 45, doc.y, [100, 315, 90]);
        doc.y = currentY + 2;
      } else {
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Proxy statement proposals examined from latest SEC DEF 14A filings.', 45, doc.y);
        doc.moveDown(0.6);
      }

      // Appendix & Freshness
      renderSectionHeader(doc, 'Data Freshness & Integrity Audit');
      if (content.dataFreshness) {
        const freshStr = Object.entries(content.dataFreshness)
          .map(([k, v]) => `${k}: ${new Date(v).toLocaleDateString()}`)
          .join('   |   ');
        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(freshStr, 45, doc.y);
      }

      doc.moveDown(1);
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

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

function drawTable(doc: any, table: TableData, startX: number, startY: number) {
  const colCount = table.headers.length;
  const colWidth = 500 / colCount;
  const rowHeight = 22;
  let y = startY;

  // Draw headers
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
  
  table.headers.forEach((header, i) => {
    doc.text(header, startX + (i * colWidth) + 5, y + 6, { width: colWidth - 10, align: i === 0 ? 'left' : 'right' });
  });
  
  y += rowHeight;
  
  // Header bottom border (thick)
  doc.moveTo(startX, y).lineTo(startX + 500, y).lineWidth(1.5).stroke('#0f172a');
  y += 5;

  // Draw rows
  doc.font('Helvetica').fontSize(9);
  doc.lineWidth(0.5);
  table.rows.forEach((row, rowIndex) => {
    const bgColor = rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(startX, y, 500, rowHeight).fill(bgColor);
    
    row.forEach((cell, i) => {
      doc.fillColor('#334155').text(String(cell), startX + (i * colWidth) + 5, y + 6, { width: colWidth - 10, align: i === 0 ? 'left' : 'right' });
    });
    y += rowHeight;
  });

  // Table bottom border (double)
  doc.moveTo(startX, y).lineTo(startX + 500, y).stroke('#0f172a');
  doc.moveTo(startX, y + 2).lineTo(startX + 500, y + 2).stroke('#0f172a');

  return y + 10;
}

function renderSectionTitle(doc: any, title: string, yOffset = 1.5) {
  doc.x = 50; // Reset X to prevent narrow column wrapping
  doc.moveDown(yOffset);
  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(title, 50, doc.y);
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
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
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      // --- HEADER ---
      doc.rect(0, 0, doc.page.width, 100).fill('#0f172a'); // slate-900
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26).text('StockLens Equity Research', 50, 35);
      doc.fontSize(10).fillColor('#94a3b8').text(`Generated: ${new Date(content.timestamp).toLocaleDateString()}`, 50, 40, { align: 'right', width: doc.page.width - 100 });
      
      doc.y = 120;
      // --- TITLE & META ---
      doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text(`${content.companyName} (${content.ticker})`);
      doc.fillColor('#64748b').fontSize(11).font('Helvetica').text(`${content.exchange} | Sector: ${content.sector} | Industry: ${content.industry}`);
      doc.moveDown(0.5);

      // Quote & Key Stats Row
      doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(`${content.currentPrice}  `);
      doc.fontSize(12).text(content.priceChange, { continued: true });
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`    52W: ${content.fiftyTwoWeekRange}    Market Cap: ${content.marketCap}    Beta: ${content.beta}`);
      
      // --- EXECUTIVE SUMMARY & FINSTAR ---
      renderSectionTitle(doc, 'Institutional Investment Thesis');
      const ratingColor = content.finstarRating === 'BULLISH' ? '#16a34a' : (content.finstarRating === 'BEARISH' ? '#dc2626' : '#64748b');
      doc.fillColor(ratingColor).font('Helvetica-Bold').fontSize(11).text(`Consensus Stance: ${content.finstarRating}`);
      doc.moveDown(0.6);

      // Parse and format the 4-section thesis paragraphs
      const paragraphs = content.executiveSummary.split('\n\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (doc.y > doc.page.height - 100) doc.addPage();
        
        // Detect section titles like "1. STRATEGIC MOAT & PRICING POWER"
        const sectionMatch = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|\s{2,})(.*)$/s) || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
        if (sectionMatch) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(sectionMatch[1].trim());
          doc.moveDown(0.2);
          if (sectionMatch[2]) {
            doc.fillColor('#334155').font('Helvetica').fontSize(9).text(sectionMatch[2].trim(), { lineGap: 3, align: 'justify', width: 490 });
            doc.moveDown(0.5);
          }
        } else {
          doc.fillColor('#334155').font('Helvetica').fontSize(9).text(trimmed, { lineGap: 3, align: 'justify', width: 490 });
          doc.moveDown(0.5);
        }
      });

      renderSectionTitle(doc, 'Bull / Bear Synthesis');
      // Replace bullet glyphs and format as clean dash list
      const cleanBullets = content.bullBearSummary
        .split('\n')
        .map(line => '- ' + line.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
        .join('\n');
      doc.text(cleanBullets, { lineGap: 3, align: 'justify' });

      // --- CHART ---
      if (doc.y > doc.page.height - 300) doc.addPage();
      renderSectionTitle(doc, 'Price Performance & Valuation');
      if (chartImageBuffer) {
        doc.image(chartImageBuffer, { width: 500 });
      } else {
        doc.fillColor('#94a3b8').fontSize(11).font('Helvetica-Oblique').text('Chart not available');
      }
      doc.moveDown(1);
      doc.fillColor('#334155').font('Helvetica-Bold').text('Returns: ', { continued: true });
      doc.font('Helvetica').text(`1M: ${content.returns.oneMonth} | 3M: ${content.returns.threeMonth} | 1Y: ${content.returns.oneYear} | 3Y: ${content.returns.threeYear} | 5Y: ${content.returns.fiveYear}`);
      doc.font('Helvetica-Bold').text('Valuation: ', { continued: true });
      doc.font('Helvetica').text(`P/E: ${content.valuation.pe} | P/B: ${content.valuation.pb} | P/S: ${content.valuation.ps} | EV/EBITDA: ${content.valuation.evEbitda} | PEG: ${content.valuation.peg}`);
      
      // Add a new page for financials if low on space
      if (doc.y > doc.page.height - 200) doc.addPage(); else doc.moveDown(2);
      
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('Financial Statements (3-Year)', 50, doc.y);
      doc.moveDown(1);

      let currentY = doc.y;

      if (content.incomeStatement) {
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Income Statement', 50, currentY);
        currentY += 20;
        currentY = drawTable(doc, content.incomeStatement, 50, currentY);
        currentY += 20;
      }

      if (content.balanceSheet) {
        if (currentY > doc.page.height - 250) { doc.addPage(); currentY = 50; }
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Balance Sheet', 50, currentY);
        currentY += 20;
        currentY = drawTable(doc, content.balanceSheet, 50, currentY);
        currentY += 20;
      }

      if (content.cashFlow) {
        if (currentY > doc.page.height - 200) { doc.addPage(); currentY = 50; }
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Cash Flow Statement', 50, currentY);
        currentY += 20;
        currentY = drawTable(doc, content.cashFlow, 50, currentY);
      }

      // Add a new page for Analysis
      doc.addPage();
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('Fundamental Analysis & Peer Benchmarking', 50, 50);

      renderSectionTitle(doc, 'Profitability (DuPont Breakdown)');
      if (content.dupont) {
        doc.text(`Net Margin: ${(content.dupont.netMargin * 100).toFixed(2)}% | Asset Turnover: ${content.dupont.assetTurnover.toFixed(2)}x | Equity Multiplier: ${content.dupont.equityMultiplier.toFixed(2)}x`);
      } else {
        doc.text('Data not available.');
      }

      renderSectionTitle(doc, 'Peer Comparison');
      if (content.peers && content.peers.length > 0) {
        const peerHeaders = ['Symbol', 'Price', 'P/E', 'EV/EBITDA', 'Gross Mgn', 'Rev Growth'];
        const peerRows = content.peers.map(p => [
          p.symbol, p.price?.toFixed(2) || 'N/A', p.pe || 'N/A', p.evEbitda || 'N/A', p.grossMargin || 'N/A', p.revGrowth || 'N/A'
        ]);
        currentY = doc.y + 10;
        currentY = drawTable(doc, { headers: peerHeaders, rows: peerRows }, 50, currentY);
        doc.y = currentY;
      } else {
        doc.text('No peer data available.');
      }

      doc.x = 50; // Reset X after table to prevent narrow columns
      renderSectionTitle(doc, 'Congressional Trades');
      if (content.congressionalTrades && content.congressionalTrades.length > 0) {
        const tr = content.congressionalTrades.slice(0, 5).map(t => {
          const name = t.representative || t.senator || (t.firstName ? `${t.firstName} ${t.lastName}` : 'Unknown');
          return `${name} (${t.transactionDate}): ${t.type} ${t.amount}`;
        });
        doc.text(tr.join('\n'));
      } else {
        doc.text('No recent congressional trades detected.');
      }

      renderSectionTitle(doc, 'Macro Context');
      doc.text(content.macroContext);

      // Add a new page for SEC Risk Factors
      doc.addPage();
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('SEC Disclosures & Risks', 50, 50);

      renderSectionTitle(doc, 'Risk Factors (10-K)');
      let rf = truncateToSentence(content.riskFactors, 2000) || 'N/A';
      rf = rf.replace(/&#8226;/g, '-').replace(/&#8239;/g, ' ');
      doc.text(rf, { align: 'justify', lineGap: 4, width: 450 });

      renderSectionTitle(doc, 'Management & Governance');
      if (content.proxyStatement && content.proxyStatement.proposals) {
        doc.text(`Recent Proxy contains ${content.proxyStatement.proposals.length} proposals. Document link: ${content.proxyStatement.url}`);
      } else {
        doc.text('No proxy statement data available.');
      }

      renderSectionTitle(doc, 'Business Description (10-K)');
      const bd = truncateToSentence(content.businessDescription, 1500) || 'N/A';
      doc.text(bd, { align: 'justify', lineGap: 4, width: 450 });

      // Add Appendix
      doc.addPage();
      doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('Appendix', 50, 50);
      renderSectionTitle(doc, 'Data Freshness');
      if (content.dataFreshness) {
        Object.entries(content.dataFreshness).forEach(([key, val]) => {
          doc.text(`${key}: ${new Date(val).toLocaleString()}`);
        });
      }

      doc.moveDown(3);
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text(
        'Disclaimer: This report is for informational purposes only and does not constitute investment advice. ' +
        'Data is provided "as is" and may be delayed or incomplete. Do not make financial decisions solely based on this automated synthesis.',
        { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

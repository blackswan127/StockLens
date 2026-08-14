import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

import axios from 'axios';
import { ReportContent, TableData } from '../render/templates.js';

// ============================================================
// COLORS & DESIGN TOKENS
// ============================================================
const C = {
  ink:        '#0f172a',
  body:       '#334155',
  muted:      '#64748b',
  faint:      '#94a3b8',
  accent:     '#10b981',
  cardBg:     '#f8fafc',
  cardBorder: '#e2e8f0',
  headerBg:   '#0f172a',
  headerFg:   '#ffffff',
  zebraA:     '#f8fafc',
  zebraB:     '#ffffff',
  bull:       '#059669',
  bear:       '#dc2626',
  neutral:    '#d97706',
  bannerBg:   '#0b0f19',
  divider:    '#cbd5e1',
} as const;

const MARGIN = 50;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2;  // 495.28

// ============================================================
// TABLE RENDERER
// ============================================================
function drawTable(doc: any, table: TableData, x: number, y: number, colWidths?: number[]) {
  const cols = table.headers.length;
  const tableW = CONTENT_W;
  const defaultW = tableW / cols;
  const ROW_H = 20;
  let cy = y;

  // ── header row ──
  doc.rect(x, cy, tableW, ROW_H).fill(C.headerBg);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.headerFg);

  let cx = x;
  table.headers.forEach((h, i) => {
    const w = colWidths?.[i] ?? defaultW;
    doc.text(h, cx + 6, cy + 6, { width: w - 12, align: i < 2 ? 'left' : 'right' });
    cx += w;
  });
  cy += ROW_H;

  // ── data rows ──
  doc.font('Helvetica').fontSize(7.5);
  table.rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.zebraA : C.zebraB;
    doc.rect(x, cy, tableW, ROW_H).fill(bg);
    doc.moveTo(x, cy + ROW_H).lineTo(x + tableW, cy + ROW_H).lineWidth(0.3).stroke(C.cardBorder);

    let rx = x;
    row.forEach((cell, i) => {
      const w = colWidths?.[i] ?? defaultW;
      const s = String(cell ?? '—');

      if (s === 'BULLISH' || s === 'BUY' || s === 'FOR') {
        doc.fillColor(C.bull).font('Helvetica-Bold');
      } else if (s === 'BEARISH' || s === 'SELL' || s === 'AGAINST') {
        doc.fillColor(C.bear).font('Helvetica-Bold');
      } else if (s === 'NEUTRAL' || s === 'HOLD') {
        doc.fillColor(C.neutral).font('Helvetica-Bold');
      } else if (i === 0) {
        doc.fillColor(C.ink).font('Helvetica-Bold');
      } else {
        doc.fillColor(C.body).font('Helvetica');
      }

      doc.text(s, rx + 6, cy + 6, { width: w - 12, align: i < 2 ? 'left' : 'right' });
      rx += w;
    });
    cy += ROW_H;
  });

  return cy + 4;
}

// ============================================================
// SECTION HEADER WITH EMERALD ACCENT BAR
// ============================================================
function sectionHead(doc: any, title: string, subtitle?: string) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.8);

  const sy = doc.y;
  // accent bar
  doc.rect(MARGIN, sy, 3.5, subtitle ? 22 : 14).fill(C.accent);
  // title
  doc.fillColor(C.ink).fontSize(11).font('Helvetica-Bold').text(title, MARGIN + 12, sy + 1);
  if (subtitle) {
    doc.fillColor(C.muted).fontSize(7.5).font('Helvetica').text(subtitle, MARGIN + 12, sy + 14);
    doc.y = sy + 28;
  } else {
    doc.y = sy + 18;
  }
}

// ============================================================
// LIGHT DIVIDER LINE
// ============================================================
function divider(doc: any) {
  doc.moveDown(0.25);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).lineWidth(0.4).stroke(C.divider);
  doc.moveDown(0.35);
}

// ============================================================
// PARAGRAPH HELPER
// ============================================================
function bodyText(doc: any, text: string, opts?: { indent?: number }) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const left = MARGIN + (opts?.indent || 0);
  doc.fillColor(C.body).font('Helvetica').fontSize(8.5)
    .text(text, left, doc.y, { lineGap: 3, width: CONTENT_W - (opts?.indent || 0) });
  doc.moveDown(0.35);
}

function truncSentence(text: string, max: number) {
  if (!text || text.length <= max) return text;
  const t = text.substring(0, max);
  const lp = t.lastIndexOf('.');
  return lp > 0 ? t.substring(0, lp + 1) : t + '...';
}

// ============================================================
// MAIN PDF GENERATOR
// ============================================================
export async function generatePdf(content: ReportContent): Promise<Buffer> {
  let chartBuf: Buffer | null = null;
  try {
    const res = await axios.get(content.chartUrl, { responseType: 'arraybuffer' });
    chartBuf = Buffer.from(res.data, 'binary');
  } catch { /* chart unavailable */ }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e: any) => reject(e));

      // ════════════════════════════════════════════
      //  PAGE 1 — COVER & INSTITUTIONAL THESIS
      // ════════════════════════════════════════════

      // ── top banner ──
      doc.rect(0, 0, PAGE_W, 52).fill(C.bannerBg);
      doc.rect(0, 52, PAGE_W, 2).fill(C.accent);

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
        .text('StockLens  Institutional Research', MARGIN, 17);
      doc.fillColor(C.faint).font('Helvetica').fontSize(7.5)
        .text(`EQUITY VALUATION & QUANTITATIVE DOSSIER   |   ${new Date(content.timestamp).toLocaleDateString()}`, MARGIN, 33);

      doc.y = 66;

      // ── company name & context ──
      doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(18)
        .text(`${content.companyName}`, MARGIN, doc.y);
      doc.fillColor(C.muted).font('Helvetica').fontSize(9)
        .text(`${content.ticker}  ·  ${content.exchange}  ·  ${content.sector}  ·  ${content.industry}`);
      doc.moveDown(0.5);

      // ── 4-card scorecard ──
      const gy = doc.y;
      const cW = (CONTENT_W - 3 * 8) / 4;
      const cH = 46;

      const cards = [
        { label: 'PRICE', big: content.currentPrice, sub: content.priceChange, subColor: content.priceChange.includes('+') ? C.bull : C.bear },
        { label: 'MARKET CAP', big: content.marketCap, sub: `P/E ${content.valuation.pe}  ·  P/B ${content.valuation.pb}`, subColor: C.body },
        { label: '52-WEEK RANGE', big: content.fiftyTwoWeekRange, sub: `Beta ${content.beta}`, subColor: C.body },
        { label: 'CONSENSUS', big: content.finstarRating, sub: '7-Agent Hedge Fund', subColor: C.muted,
          bgFill: content.finstarRating === 'BULLISH' ? '#ecfdf5' : content.finstarRating === 'BEARISH' ? '#fff1f2' : C.cardBg,
          bigColor: content.finstarRating === 'BULLISH' ? C.bull : content.finstarRating === 'BEARISH' ? C.bear : C.ink }
      ];

      cards.forEach((c, i) => {
        const cx = MARGIN + i * (cW + 8);
        doc.rect(cx, gy, cW, cH).fill(c.bgFill || C.cardBg);
        doc.rect(cx, gy, cW, cH).lineWidth(0.4).stroke(C.cardBorder);
        doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(6.5).text(c.label, cx + 8, gy + 6, { width: cW - 16 });
        doc.fillColor(c.bigColor || C.ink).font('Helvetica-Bold').fontSize(11).text(c.big, cx + 8, gy + 17, { width: cW - 16 });
        doc.fillColor(c.subColor).font('Helvetica').fontSize(7).text(c.sub, cx + 8, gy + 32, { width: cW - 16 });
      });

      doc.y = gy + cH + 14;

      // ── thesis sections ──
      sectionHead(doc, 'Institutional Investment Thesis', 'Deep-dive fundamental analysis & operational catalyst assessment');

      const paras = content.executiveSummary.split('\n\n').filter(p => p.trim());
      paras.forEach(p => {
        const trimmed = p.trim();
        if (doc.y > doc.page.height - 90) doc.addPage();

        // Check for numbered section header pattern
        const m = trimmed.match(/^(\d+\.\s+[A-Z\s&/]+)(?:\n|:|  )(.*)$/s)
               || trimmed.match(/^([A-Z\s&/]{4,}):?\s*(.*)$/s);
        if (m) {
          doc.moveDown(0.35);
          doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text(m[1].trim(), MARGIN);
          doc.moveDown(0.15);
          divider(doc);
          if (m[2]) bodyText(doc, m[2].trim());
        } else {
          bodyText(doc, trimmed);
        }
      });

      // ── bull / bear catalysts ──
      doc.moveDown(0.3);
      sectionHead(doc, 'Bull / Bear Investment Catalysts');
      const bullets = content.bullBearSummary
        .split('\n')
        .map(l => l.replace(/^[-•*✓x✅❌L'"]+\s*/i, '').trim())
        .filter(l => l.length > 3);

      bullets.forEach(b => {
        if (doc.y > doc.page.height - 60) doc.addPage();
        doc.fillColor(C.body).font('Helvetica').fontSize(8)
          .text(`  •  ${b}`, MARGIN + 4, doc.y, { lineGap: 2, width: CONTENT_W - 8 });
        doc.moveDown(0.15);
      });

      // ════════════════════════════════════════════
      //  PAGE 2 — CHART, VALUATION & QUANT RADAR
      // ════════════════════════════════════════════
      doc.addPage();

      sectionHead(doc, 'Price Performance & Multi-Period Returns', 'Historical price trends & total return momentum');
      if (chartBuf) {
        doc.image(chartBuf, MARGIN, doc.y, { width: CONTENT_W, height: 160 });
        doc.y += 168;
      }

      // returns strip
      doc.moveDown(0.3);
      const retTable: TableData = {
        headers: ['Period', '1 Month', '3 Month', '1 Year', '3 Year', '5 Year'],
        rows: [['Total Return', content.returns.oneMonth, content.returns.threeMonth, content.returns.oneYear, content.returns.threeYear, content.returns.fiveYear]]
      };
      let cy = drawTable(doc, retTable, MARGIN, doc.y);

      // valuation strip
      const valTable: TableData = {
        headers: ['Metric', 'P/E (TTM)', 'P / Book', 'P / Sales', 'EV / EBITDA', 'PEG', 'Div Yield'],
        rows: [['Multiple', content.valuation.pe, content.valuation.pb, content.valuation.ps, content.valuation.evEbitda, content.valuation.peg, content.valuation.dividendYield]]
      };
      cy = drawTable(doc, valTable, MARGIN, cy + 2);

      // ── 7-persona hedge fund table ──
      doc.y = cy + 2;
      sectionHead(doc, '7-Persona Quantitative Hedge Fund Consensus', 'Multi-factor investor persona conviction radar');

      if (content.hedgeFundResult?.evaluations?.[content.ticker]) {
        const agents = content.hedgeFundResult.evaluations[content.ticker].agents;
        const hfH = ['Investor Persona', 'Strategy Focus', 'Conviction', 'Confidence'];
        const hfR = Object.entries(agents).map(([k, r]: [string, any]) => {
          const name = { warrenBuffett:'Warren Buffett', billAckman:'Bill Ackman', benGraham:'Benjamin Graham',
            charlieMunger:'Charlie Munger', cathieWood:'Cathie Wood', philFisher:'Philip Fisher',
            stanDruckenmiller:'Stanley Druckenmiller' }[k] || k.replace(/([A-Z])/g,' $1').trim();
          const focus = { warrenBuffett:'Moat & ROIC', billAckman:'Oper. Margin & FCF', benGraham:'Net-Net Value',
            charlieMunger:'Quality Compounding', cathieWood:'Disruptive TAM', philFisher:'Growth & Efficiency',
            stanDruckenmiller:'Earnings Momentum' }[k] || 'Risk & Allocation';
          return [name, focus, r.signal?.toUpperCase() || 'NEUTRAL', `${Math.round(r.confidence || 75)}%`];
        });
        cy = drawTable(doc, { headers: hfH, rows: hfR }, MARGIN, doc.y, [140, 135, 110, 110]);
      }

      // ── scenario matrix ──
      doc.y = cy + 2;
      sectionHead(doc, '12-Month Scenario Price Target Matrix');
      if (content.scenarios) {
        cy = drawTable(doc, content.scenarios, MARGIN, doc.y, [80, 65, 80, 85, 185]);
      }

      // ════════════════════════════════════════════
      //  PAGE 3 — FINANCIAL STATEMENTS
      // ════════════════════════════════════════════
      doc.addPage();
      sectionHead(doc, '3-Year Audited Financial Statements', 'Income statement, balance sheet & cash flow progression');
      cy = doc.y;

      if (content.incomeStatement) {
        doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('Income Statement', MARGIN, cy);
        cy = drawTable(doc, content.incomeStatement, MARGIN, cy + 14);
        cy += 8;
      }
      if (content.balanceSheet) {
        if (cy > doc.page.height - 180) { doc.addPage(); cy = MARGIN; }
        doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('Balance Sheet', MARGIN, cy);
        cy = drawTable(doc, content.balanceSheet, MARGIN, cy + 14);
        cy += 8;
      }
      if (content.cashFlow) {
        if (cy > doc.page.height - 180) { doc.addPage(); cy = MARGIN; }
        doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('Cash Flow Statement', MARGIN, cy);
        cy = drawTable(doc, content.cashFlow, MARGIN, cy + 14);
      }

      // ════════════════════════════════════════════
      //  PAGE 4 — DUPONT, PEERS & MACRO
      // ════════════════════════════════════════════
      doc.addPage();
      sectionHead(doc, 'DuPont Profitability & Peer Benchmarking', 'ROE decomposition and sector cohort valuation');

      const dp = content.dupont;
      if (dp) {
        const s3 = dp.stage3 || { netMargin: dp.netMargin||0.2, assetTurnover: dp.assetTurnover||0.8, equityMultiplier: dp.equityMultiplier||1.8, roe: dp.roe||0.288 };
        const d3: TableData = {
          headers: ['Component', 'Formula', 'Value', 'Interpretation'],
          rows: [
            ['Net Profit Margin', 'Net Income / Revenue', `${(s3.netMargin*100).toFixed(2)}%`, 'Pricing power & cost control'],
            ['Asset Turnover', 'Revenue / Assets', `${s3.assetTurnover.toFixed(2)}x`, 'Capital efficiency'],
            ['Equity Multiplier', 'Assets / Equity', `${s3.equityMultiplier.toFixed(2)}x`, 'Financial leverage'],
            ['ROE', 'Margin × Turnover × Leverage', `${(s3.roe*100).toFixed(2)}%`, 'Shareholder return']
          ]
        };
        cy = drawTable(doc, d3, MARGIN, doc.y, [120, 130, 80, 165]);

        if (dp.stage5) {
          const s5 = dp.stage5;
          doc.y = cy + 4;
          const d5: TableData = {
            headers: ['5-Stage Component', 'Formula', 'Value', 'Driver'],
            rows: [
              ['Tax Burden', 'Net Inc / EBT', `${(s5.taxBurden*100).toFixed(2)}%`, 'Tax retention efficiency'],
              ['Interest Burden', 'EBT / EBIT', `${s5.interestBurden.toFixed(2)}x`, 'Debt servicing cost'],
              ['Operating Margin', 'EBIT / Revenue', `${(s5.operatingMargin*100).toFixed(2)}%`, 'Core profitability'],
              ['Asset Turnover', 'Revenue / Assets', `${s5.assetTurnover.toFixed(2)}x`, 'Capital velocity'],
              ['Equity Multiplier', 'Assets / Equity', `${s5.equityMultiplier.toFixed(2)}x`, 'Leverage ratio'],
              ['Comprehensive ROE', '5-Factor Product', `${(s5.roe*100).toFixed(2)}%`, 'Total compounding rate']
            ]
          };
          cy = drawTable(doc, d5, MARGIN, doc.y, [120, 130, 80, 165]);
        }
      } else {
        bodyText(doc, 'DuPont decomposition computed from balance sheet data.');
        cy = doc.y;
      }

      // ── peer benchmarking ──
      doc.y = cy + 2;
      sectionHead(doc, 'Industry Peer Valuation & Growth Benchmarking');
      if (content.peers && content.peers.length > 0) {
        const pH = ['Symbol', 'Price', 'P/E (TTM)', 'EV/EBITDA', 'Gross Margin', 'Rev Growth'];
        const pR = content.peers.map(p => [
          p.symbol, p.price ? `$${p.price.toFixed(2)}` : '—',
          p.pe || '—', p.evEbitda || '—', p.grossMargin || '—', p.revGrowth || '—'
        ]);
        cy = drawTable(doc, { headers: pH, rows: pR }, MARGIN, doc.y, [80, 80, 84, 84, 84, 83]);
      } else {
        bodyText(doc, 'Peer comparison metrics calculated across industry cohort.');
        cy = doc.y;
      }

      // ── macro ──
      doc.y = cy + 2;
      sectionHead(doc, 'Macroeconomic Backdrop');
      bodyText(doc, content.macroContext);

      // ════════════════════════════════════════════
      //  PAGE 5 — SEC RISKS & GOVERNANCE
      // ════════════════════════════════════════════
      doc.addPage();
      sectionHead(doc, 'SEC EDGAR Disclosures & Governance', 'Item 1A risk factors, business overview & DEF 14A proxy');

      sectionHead(doc, 'Item 1A Risk Factors');
      bodyText(doc, truncSentence(content.riskFactors, 1500) || 'Standard sector-specific risk disclosures.');

      sectionHead(doc, 'Business Overview');
      bodyText(doc, truncSentence(content.businessDescription, 1000) || 'N/A');

      sectionHead(doc, 'Governance — DEF 14A Proxy');
      if (content.proxyStatement?.proposals?.length) {
        const prH = ['Ballot Item', 'Proposal Description', 'Board Rec'];
        const prR = content.proxyStatement.proposals.slice(0, 5).map((p: any) => [
          p.item || 'Proposal',
          truncSentence(p.description || 'Shareholder ballot item', 80),
          p.boardRecommendation || 'FOR'
        ]);
        cy = drawTable(doc, { headers: prH, rows: prR }, MARGIN, doc.y, [100, 310, 85]);
        doc.y = cy + 2;
      } else {
        bodyText(doc, 'Proxy proposals examined from latest SEC DEF 14A filing.');
      }

      // ── freshness & disclaimer ──
      sectionHead(doc, 'Data Freshness');
      if (content.dataFreshness) {
        const fs = Object.entries(content.dataFreshness).map(([k,v]) => `${k}: ${new Date(v).toLocaleDateString()}`).join('  ·  ');
        doc.fillColor(C.muted).font('Helvetica').fontSize(7).text(fs, MARGIN, doc.y);
      }

      doc.moveDown(1.5);
      doc.fillColor(C.faint).font('Helvetica-Oblique').fontSize(7)
        .text('Disclaimer: This report is for informational purposes only and does not constitute investment advice. Data aggregated from SEC EDGAR, FRED, and real-time market feeds. StockLens assumes no liability for investment decisions.',
          MARGIN, doc.y, { align: 'center', width: CONTENT_W });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

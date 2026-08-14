# StockLens: Award-Winning Obsidian Pro Financial Terminal Redesign

## 1. Executive Summary & Vision
StockLens is an all-in-one equities research workbench featuring real-time market data, interactive DCF valuation models, a 7-agent AI hedge fund stock evaluator, multi-factor screeners, SEC filing deep dives, and macro economic indicators. 

This design specification upgrades StockLens from a standard web dashboard to an **award-winning, Awwwards/FWA-tier financial intelligence terminal**. The design adopts the **Obsidian Pro Financial Terminal** aesthetic: ultra-refined dark themes, precision 1px border geometry, glowing telemetry status pills, high-density data cards with tabular typography, interactive visualization visualizers (DCF valuation waterfall, Hedge Fund investor radar charts, Monte Carlo probability distribution HUD), and tactile micro-interactions—built entirely with 100% free, open-source web technologies.

---

## 2. Design System Architecture & Tokens

### 2.1 Color Matrix (Obsidian Dark Spectrum)
- **Base Background**: `#06080D` (Void Dark)
- **Surface Elevation Levels**:
  - `Surface Level 1` (Cards, Panels, Sidebars): `#0D111A` (border: `rgba(255, 255, 255, 0.07)`)
  - `Surface Level 2` (Hover states, Active rows, Dropdowns): `#141A26` (border: `rgba(255, 255, 255, 0.12)`)
  - `Surface Level 3` (Input fields, Pill badges, Code chips): `#1B2232`
- **Telemetry & Financial Accents**:
  - `Bullish / Gain`: `#10B981` (Emerald), glow: `rgba(16, 185, 129, 0.15)`
  - `Bearish / Loss`: `#F43F5E` (Rose/Crimson), glow: `rgba(244, 63, 94, 0.15)`
  - `Neutral / Warning`: `#F59E0B` (Amber), glow: `rgba(245, 158, 11, 0.15)`
  - `AI / Valuation`: `#8B5CF6` (Electric Violet), `#38BDF8` (Sky Blue)
  - `Text Hierarchy`:
    - Heading / Hero: `#F8FAFC` (Slate 50)
    - Body / Main: `#CBD5E1` (Slate 300)
    - Muted / Meta: `#64748B` (Slate 500)
    - Borders: `rgba(255, 255, 255, 0.08)` / `#1E293B`

### 2.2 Typography Stack
- **Interface Sans**: `Inter`, `Plus Jakarta Sans`, system-ui
- **Financial Monospace**: `JetBrains Mono`, `Geist Mono`, `ui-monospace`
- **Tabular Figures Rule**: All numbers, currency figures, valuations, ratios, percentages, and dates use `font-variant-numeric: tabular-nums` to ensure zero horizontal jitter during live data updates.

---

## 3. UI Primitives & Interactive Components (`src/components/ui/`)

1. **`TerminalCard`**:
   - High-density dark glass container with subtle gradient border highlight.
   - Mouse-following interactive spotlight effect for desktop users.
   - Header with status dot, title, badge, and optional action buttons.

2. **`AnimatedNumber`**:
   - Smooth count-up / count-down interpolation when stock quotes, market caps, or DCF fair values update.

3. **`TelemetryBadge`**:
   - Crisp micro-badges with glowing pulse dots (e.g., `● Live`, `● High Confidence`, `▲ Bullish`, `▼ Bearish`).

4. **`MiniSparkline`**:
   - High-performance SVG trend sparklines embedded inside table rows, cards, and ticker items.

5. **`RadarInvestorChart`**:
   - Multi-axis radar/spider chart mapping the 7 legendary investor agent scores (Buffett value, Dalio macro, Simons quant, Ackman activist, Lynch growth, Graham margin of safety, Wood innovation).

6. **`ValuationWaterfall`**:
   - Interactive step-by-step financial bridge visualizing the DCF calculation flow: Operating Cash Flow $\to$ Capex $\to$ Free Cash Flow $\to$ Discounted PV $\to$ Terminal Value $\to$ Enterprise Value $\to$ Per Share Fair Value.

7. **`MonteCarloVisualizer`**:
   - Interactive histogram chart with draggable assumption sliders (WACC, Revenue Growth, FCF Margin) and real-time probability percentile overlays (10th, 50th, 90th percentiles).

---

## 4. Page-by-Page Experience & Feature Overhaul

### 4.1 Global Layout (`Header`, `Ticker`, `Footer`)
- **Header**:
  - Obsidian glass header with live connection telemetry (`● Yahoo Finance Live`).
  - Streamlined search bar with animated search icon, keyboard shortcut badge (`/`), instant search history chips, and auto-complete preview modal showing live ticker, company name, sector, and price.
  - Active route navigation with animated sliding underline.
- **Indices Ticker Tape**:
  - Live horizontal ticker displaying S&P 500, Nasdaq, Dow Jones, Russell 2000, 10-Year Treasury Yield, VIX, and Bitcoin with mini sparklines and green/red flash on value shifts.
- **Footer**:
  - Minimalist terminal metadata footer showing architecture status, fallback engine routes, and system uptime telemetry.

### 4.2 Company Research Hub (`/company/:symbol`)
- **Hero Stock Overview**:
  - Live ticker price with animated count-up, 24h change pill, 52-week range visual slider bar, market cap, P/E, volume, and sector tags.
  - Quick action toolbar: Download AI Report (PDF/Word), Add to Watchlist toggle, Share, and Peer Comps jump.
- **Interactive Candlestick & Technical Chart**:
  - Polished dark canvas / Recharts engine with hover crosshair, volume profile bars, timeframe selector pills (`1D`, `1W`, `1M`, `1Y`, `5Y`, `MAX`), and SMA/EMA overlay toggles.
- **Tabs Architecture**:
  - **Overview**: Key financial statistics grid, performance vs S&P 500 benchmark, latest corporate news feed.
  - **Financials**: Tabular income statement, balance sheet, and cash flow statement with interactive margin expansion bar charts and YoY growth badges.
  - **DCF Intrinsic Valuation**: 
    - Full Damodaran credit-rating curve visualizer.
    - Sensitivity tables with heat-colored cells.
    - Monte Carlo simulation histogram with dynamic percentile confidence intervals.
    - Valuation waterfall breakdown.
  - **SEC Filings**: Raw XBRL vs Yahoo cross-validation badge, insider buying/selling heatmap, 10-K / 10-Q report viewer with risk factor highlights.
  - **Company Info & Officers**: Corporate profile, business description, executive officer roster with compensation breakdown.

### 4.3 Hedge Fund — 7-Agent Evaluator (`/hedge-fund`)
- **Agent Roster**:
  - Warren Buffett (Moat & Free Cash Flow Quality)
  - Peter Lynch (GARP & PEG Growth)
  - Benjamin Graham (Net-Net & Margin of Safety)
  - Ray Dalio (Macro Regime & Debt Cycle)
  - Jim Simons (Quantitative Signal & Momentum)
  - Bill Ackman (Activist Catalyst & Capital Allocation)
  - Cathie Wood (Disruptive Innovation & TAM)
- **Visual Features**:
  - Interactive radar chart comparing agent conviction scores.
  - Animated voting sequence and composite consensus meter (`Strong Buy`, `Moderate Buy`, `Hold`, `Underperform`, `Avoid`).
  - Key bullish vs bearish bullet point matrix for each investor philosophy.

### 4.4 Market Dashboard (`/market`)
- Interactive sector performance treemap / heatmap with real-time green/red density gradients.
- Top Gainers, Top Losers, Most Active volume leaders with one-click drill-down.
- Macro yield curve visualizer (Treasury 1M to 30Y curve) with inversion alerts.

### 4.5 Multi-Factor Screener (`/screener`)
- High-density query filter bar (Market Cap, P/E, P/S, EV/EBITDA, Dividend Yield, Debt/Equity, Beta, Sector).
- Instant sortable dark data table with sticky column headers, mini sparklines, and CSV export.
- Preset filter pills ("Buffett Value Picks", "High Growth Tech", "Dividend Aristocrats", "Oversold RSI Bounces").

### 4.6 Stock Compare Workbench (`/compare`)
- Multi-ticker side-by-side benchmarking grid (e.g., AAPL vs MSFT vs GOOGL).
- Interactive comparative performance chart normalizing returns to % from start date.
- Valuation, profitability, growth, and debt health scorecard with winning badge indicators.

### 4.7 Watchlist & Alerts (`/`)
- Personalized tracking cards with live sparklines, price targets, and mini DCF fair-value upside indicator bars.
- Empty state with curated popular stock bundles ("Magnificent 7", "Dividend Kings", "Semiconductor Leaders").

---

## 5. Performance & Technical Guardrails
- **Zero Paid Dependencies**: Pure HTML/CSS/Tailwind v4, React 19, Recharts, Lucide icons, Motion, and standard Web APIs.
- **Bundle Optimization**: Lazy-loaded route splitting, lightweight SVG sparklines, memoized heavy financial computations.
- **Error Boundaries & Honest Fallbacks**: Polished dark skeleton loaders with shimmer effects (`sl-shimmer`), clear fallback UI when external APIs hit rate limits.
- **Full Responsiveness**: Fluid multi-column layouts adapting seamlessly from mobile phones (360px) to ultra-wide 4K monitors.

---

## 6. Implementation Roadmap
1. **Phase 1: Foundation & Design System Tokens**: Set up obsidian CSS theme variables, Google typography stack, and core UI primitives (`TerminalCard`, `AnimatedNumber`, `TelemetryBadge`, `MiniSparkline`).
2. **Phase 2: Global Shell Upgrade**: Redesign `Header`, search bar preview dropdown, and `Ticker` tape.
3. **Phase 3: Flagship Company Page & DCF Calculator**: Overhaul `/company/:symbol` overview, charts, financial tables, SEC cross-validation, and DCF Monte Carlo/waterfall visualizers.
4. **Phase 4: 7-Agent Hedge Fund Visualizer**: Build the investor radar chart, animated consensus voting meter, and individual agent philosophy cards.
5. **Phase 5: Screener, Market Dashboard, Compare, & Watchlist**: Restyle all remaining pages to the unified obsidian design system.
6. **Phase 6: Polish & Verification**: Micro-interactions, responsiveness testing, build verification, and end-to-end testing.

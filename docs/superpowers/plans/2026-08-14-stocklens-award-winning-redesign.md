# StockLens: Award-Winning Obsidian Pro Financial Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform StockLens into a premier award-winning equities research terminal by implementing the Obsidian Pro design system, interactive financial visualizers (Hedge Fund Radar, DCF Waterfall & Monte Carlo HUD), and tactile micro-interactions with 100% free web technologies.

**Architecture:** Layered dark theme architecture using Tailwind CSS v4 variables in `src/index.css`, modular dark UI primitives in `src/components/ui/`, enhanced Google typography (`Inter` + `JetBrains Mono`), and comprehensive page restyling across all routes (`Header`, `Ticker`, `CompanyPage`, `HedgeFundPage`, `ScreenerPage`, `MarketDashboardPage`, `ComparePage`, `WatchlistPage`).

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (Framer Motion), Recharts, Lucide React, TanStack React Query 5.

## Global Constraints
- 100% free and open-source dependencies (no paid APIs or subscriptions).
- Preserve all existing financial calculation logic (Damodaran rating table, CAPM WACC, DCF Monte Carlo, SEC EDGAR XBRL cross-validation, 7-agent Hedge Fund engine).
- Zero jitter on financial updates: all numeric displays must use `font-variant-numeric: tabular-nums` and font-mono.
- Smooth responsive layout across mobile (360px) to ultra-wide 4K screens.
- Dark theme first: base background `#06080D`, cards `#0D111A`, borders `rgba(255, 255, 255, 0.08)`, emerald `#10B981`, crimson `#F43F5E`, amber `#F59E0B`.

---

### Task 1: Design Tokens, Typography & Base Obsidian Styling

**Files:**
- Modify: `index.html:1-16`
- Modify: `src/index.css:1-101`
- Modify: `src/App.tsx:1-104`

**Interfaces:**
- Produces: Global CSS variables (`--bg-void`, `--surface-card`, `--surface-hover`, `--border-subtle`, `--accent-emerald`, etc.), `@keyframes sl-spotlight`, and dark-mode root classes.

- [ ] **Step 1: Update index.html to load Google Fonts (Plus Jakarta Sans & JetBrains Mono)**

Update `index.html` to include preconnect links and Google Fonts stylesheets:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300..800;1,300..800&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Upgrade src/index.css with Obsidian Pro tokens and animations**

Update `src/index.css` to define the rich dark color system, tabular fonts, custom scrollbars, and card spotlight glows.

- [ ] **Step 3: Update src/App.tsx to wrap with deep obsidian background and dark loader**

Replace light radial gradient in `src/App.tsx` with void obsidian background, updated dark footer telemetry, and smooth fade transitions.

- [ ] **Step 4: Verify build and styles**

Run: `npm run lint` or `npx vite build`
Expected: Clean build with 0 TypeScript/CSS errors.

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css src/App.tsx
git commit -m "feat(design): implement obsidian pro design tokens and dark app shell"
```

---

### Task 2: Core Dark UI Primitives (`src/components/ui/`)

**Files:**
- Create: `src/components/ui/TerminalCard.tsx`
- Create: `src/components/ui/AnimatedNumber.tsx`
- Create: `src/components/ui/TelemetryBadge.tsx`
- Create: `src/components/ui/MiniSparkline.tsx`
- Create: `src/components/ui/RadarInvestorChart.tsx`
- Create: `src/components/ui/ValuationWaterfall.tsx`

**Interfaces:**
- Produces: Reusable UI primitives:
  - `TerminalCard({ title, badge, children, glow, className })`
  - `AnimatedNumber({ value, prefix, suffix, decimals, className })`
  - `TelemetryBadge({ status, label, pulse })`
  - `MiniSparkline({ data, isUp, width, height })`
  - `RadarInvestorChart({ agents, symbol })`
  - `ValuationWaterfall({ items, currency })`

- [ ] **Step 1: Create TerminalCard with mouse-following spotlight glow**
- [ ] **Step 2: Create AnimatedNumber with smooth CountUp spring animation**
- [ ] **Step 3: Create TelemetryBadge & MiniSparkline SVG widgets**
- [ ] **Step 4: Create RadarInvestorChart (multi-axis SVG radar for the 7 agents)**
- [ ] **Step 5: Create ValuationWaterfall component for DCF bridge visualization**
- [ ] **Step 6: Verify TypeScript types and build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): add modern dark financial UI primitives and visualizer charts"
```

---

### Task 3: Global Header, SearchBar & Real-Time Ticker HUD

**Files:**
- Modify: `src/components/Header.tsx:1-183`
- Modify: `src/components/Ticker.tsx:1-102`
- Modify: `src/components/SearchBar.tsx:1-200`

**Interfaces:**
- Consumes: `TelemetryBadge`, `MiniSparkline`
- Produces: Award-winning sticky glass obsidian navigation, search preview with country flags, and live indices ticker tape.

- [ ] **Step 1: Restyle Header.tsx to Obsidian frosted glass with active tab sliders**
- [ ] **Step 2: Restyle SearchBar.tsx with dark autocomplete dropdown & keyboard hints**
- [ ] **Step 3: Restyle Ticker.tsx with live sparklines and smooth tick flash animations**
- [ ] **Step 4: Verify navigation and search dropdown**
- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/Ticker.tsx src/components/SearchBar.tsx
git commit -m "feat(nav): overhaul header, searchbar, and indices ticker HUD"
```

---

### Task 4: Flagship 7-Agent Hedge Fund Overhaul (`/hedge-fund`)

**Files:**
- Modify: `src/pages/HedgeFundPage.tsx:1-274`

**Interfaces:**
- Consumes: `RadarInvestorChart`, `TerminalCard`, `TelemetryBadge`, `AnimatedNumber`
- Produces: Interactive 7-Agent battle center with live consensus dial, radar philosophy graph, conviction meters, and portfolio allocation cards.

- [ ] **Step 1: Implement consensus meter dial & radar visualizer integration**
- [ ] **Step 2: Overhaul investor persona cards (Buffett, Lynch, Graham, Dalio, Simons, Ackman, Wood) with avatar badges & conviction bars**
- [ ] **Step 3: Restyle portfolio allocation decision tables and simulation summary**
- [ ] **Step 4: Verify Hedge Fund engine rendering and mutations**
- [ ] **Step 5: Commit**

```bash
git add src/pages/HedgeFundPage.tsx
git commit -m "feat(hedge-fund): redesign 7-agent investor cockpit with radar chart and consensus HUD"
```

---

### Task 5: Company Hub & DCF Valuation Suite (`/company/:symbol`)

**Files:**
- Modify: `src/pages/CompanyPage/index.tsx`
- Modify: `src/pages/CompanyPage/OverviewTab.tsx`
- Modify: `src/pages/CompanyPage/FinancialsTab.tsx`
- Modify: `src/pages/CompanyPage/DCFCalculator.tsx`
- Modify: `src/pages/CompanyPage/SECTab.tsx`
- Modify: `src/pages/CompanyPage/AnalysisTab.tsx`
- Modify: `src/pages/CompanyPage/components/DCF/DCFValuationBridge.tsx`
- Modify: `src/pages/CompanyPage/components/DCF/DCFProjectedCashFlows.tsx`

**Interfaces:**
- Consumes: `ValuationWaterfall`, `TerminalCard`, `AnimatedNumber`, `TelemetryBadge`
- Produces: Award-winning company research terminal with interactive chart, Monte Carlo simulation HUD, Damodaran rating curve visualizer, and SEC XBRL cross-validation badges.

- [ ] **Step 1: Overhaul Company Hero header with animated price counter & 52-week slider**
- [ ] **Step 2: Restyle OverviewTab, FinancialsTab, and SECTab with dark data tables and margin charts**
- [ ] **Step 3: Restyle DCFCalculator with ValuationWaterfall, interactive sensitivity grids, and Monte Carlo histogram HUD**
- [ ] **Step 4: Restyle AnalysisTab and peer comps comparison matrix**
- [ ] **Step 5: Verify all company tabs and DCF calculations**
- [ ] **Step 6: Commit**

```bash
git add src/pages/CompanyPage/
git commit -m "feat(company): redesign company research hub and DCF valuation suite"
```

---

### Task 6: Screener, Market Dashboard, Compare & Watchlist

**Files:**
- Modify: `src/pages/WatchlistPage.tsx`
- Modify: `src/pages/ScreenerPage.tsx`
- Modify: `src/pages/MarketDashboardPage.tsx`
- Modify: `src/pages/ComparePage.tsx`
- Modify: `src/pages/MacroIndicatorsPage.tsx`
- Modify: `src/components/StockCard.tsx`
- Modify: `src/components/Chart.tsx`
- Modify: `src/components/Table.tsx`
- Modify: `src/components/Skeleton.tsx`

**Interfaces:**
- Consumes: `TerminalCard`, `AnimatedNumber`, `MiniSparkline`, `TelemetryBadge`
- Produces: Complete unified dark theme across all remaining pages.

- [ ] **Step 1: Restyle WatchlistPage with sparkline cards and quick bundle chips**
- [ ] **Step 2: Restyle ScreenerPage with obsidian filter pills and high-density dark table**
- [ ] **Step 3: Restyle MarketDashboardPage with sector heatmaps and yield curve visualizer**
- [ ] **Step 4: Restyle ComparePage benchmarking scorecard and normalized return charts**
- [ ] **Step 5: Restyle MacroIndicatorsPage, Chart.tsx, Table.tsx, and Skeleton loaders**
- [ ] **Step 6: Commit**

```bash
git add src/pages/ src/components/
git commit -m "feat(pages): upgrade watchlist, screener, market, compare, and shared components"
```

---

### Task 7: Full Verification, Responsiveness & Polish

**Files:**
- Test: Full build, typecheck, and end-to-end verification

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 2: Run test suite**
Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run full production bundle build**
Run: `npm run build`
Expected: Successful build output in `dist/`

- [ ] **Step 4: Commit and tag release**
```bash
git add .
git commit -m "chore(release): verify award-winning obsidian redesign and build output"
```

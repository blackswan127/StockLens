# StockLens

**A full-stack equities research workbench** — quotes and charts, deep company
financials, an interactive DCF valuation model, AI-written research reports,
side-by-side comparisons, a multi-factor screener, SEC filing tools,
congressional trading disclosures, and macro indicators, all in one self-hosted app.

StockLens is built with **React, Express, TypeScript, and SQLite**. It
prefers real data over guesses: it caches aggressively to stay fast and
within free-tier API limits, and when a live source is unavailable it shows
an honest "no data" state instead of inventing one.

---





https://github.com/user-attachments/assets/a4d2b979-0e5a-4778-a6ad-14abc5ad7a55





https://github.com/user-attachments/assets/e24211e6-14e7-448b-b961-9e379e529121





## Table of Contents

- [Features](#features)
  - [Company Research Pages](#company-research-pages)
  - [DCF Intrinsic Value Calculator](#dcf-intrinsic-value-calculator)
  - [AI Equity Research Reports](#ai-equity-research-reports)
  - [Stock Comparison](#stock-comparison)
  - [Stock Screener](#stock-screener)
  - [Market Dashboard](#market-dashboard)
  - [Watchlist](#watchlist)
  - [SEC Filing Tools](#sec-filing-tools)
  - [Congressional Trading](#congressional-trading)
  - [Macro Indicators](#macro-indicators)
  - [Search](#search)
- [Why StockLens](#why-stocklens)
- [Data Sources](#data-sources)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Reliability Notes](#reliability-notes)

---

## Features

### Company Research Pages

Every ticker gets a dedicated page (`/company/:symbol`) organized into tabs:

* **Overview** — price, key stats, performance, and a candlestick/line chart
* **Info** — company profile, sector/industry, officers, description
* **Financials** — income statement, balance sheet, and cash flow statement history with computed ratios
* **SEC** — filing sections, insider trades, institutional holdings, and proxy data (see [SEC Filing Tools](#sec-filing-tools))
* **Analysis** — peer comparison and the DCF calculator

### DCF Intrinsic Value Calculator

A from-scratch, single-and-two-stage discounted cash flow model that runs
entirely on free data, with no paid valuation API:

* **CAPM-based WACC** — cost of equity from beta/risk-free rate/equity risk premium, cost of debt blended with a **Damodaran synthetic credit-rating table** (interest-coverage → rating → spread) instead of trusting a single noisy ratio
* **Two-stage growth decay** with FCF-margin interpolation across the projection window, plus **TTM blending** of trailing quarters so projections aren't stuck on stale fiscal-year-end numbers
* **SEC EDGAR cross-validation** — recomputes FCF/revenue from raw XBRL filings and diffs them against the Yahoo-derived figures, producing a `dataConfidence: high | medium | low` signal so you know how trustworthy each number is
* **Bear / Base / Bull scenario presets** plus full manual override of every assumption
* **Sensitivity grids** — WACC × terminal growth and revenue growth × FCF margin
* **Monte Carlo simulation** — 10,000-iteration sampling of beta, growth, margin, and WACC around their point estimates, rendered as a fair-value distribution with percentiles, instead of three fixed scenarios
* **Peer-relative sanity check** — flags when the DCF answer diverges sharply from peer-median P/E-implied value
* Provenance tooltips on every auto-populated input (source + as-of date), a 52-week price range overlay on the result, and one-click CSV export
* Guardrails for negative FCF, financial-sector applicability, WACC ≤ terminal growth, and missing shares-outstanding data

### AI Equity Research Reports

`GET /api/report/:ticker?format=pdf|word&type=snapshot|full` generates a
downloadable, analyst-style research report:

* Aggregates Yahoo fundamentals, SEC EDGAR filings, FRED macro context, and peer comps in one pass
* Runs the same multi-agent evaluation engine used by the Hedge Fund tool to inform commentary
* Computes valuation ratios and a **FinStar rating**
* Generates an **AI-written analyst note** (Gemini) summarizing the thesis
* Renders a price chart and exports the whole thing as a formatted **PDF or Word document**
* `type=snapshot` returns an executive-summary-only version (chart, valuation, peers, FinStar); `type=full` adds income statement, balance sheet, cash flow, business description, and risk factors

### Stock Comparison

`/compare` lays multiple tickers side by side across profile, key stats
(market cap, EV, P/E, EPS, dividend), price performance (1W/3M/YTD/1Y),
income statement, balance sheet, cash flow, valuation ratios (P/E, forward
P/E, P/FCF, P/B, P/S, EV/EBITDA), and margins — useful for quickly sanity-checking
a name against its closest peers.

### Stock Screener

A multi-factor screener (`/screener`) over the local stock universe with
range filters on market cap, trailing/forward P/E, PEG, P/B, P/S, dividend
yield, ROE, ROA, debt-to-equity, current ratio, revenue growth, EPS growth,
and gross margin — plus sector and exchange selection (with multi-select and
aliasing, e.g. "Financials"/"Financial Services").

### Market Dashboard

`/market` — indices, top movers, breakouts, and sector performance at a glance.

### Watchlist

The home page (`/`) tracks a personal list of tickers with live quotes,
persisted to SQLite.

### SEC Filing Tools

Pulled directly from SEC EDGAR (no API key, just a compliant `User-Agent`):

* 10-K / 10-Q filing sections
* Form 4 insider trades
* 13F institutional holdings
* DEF 14A proxy statement data — pay-versus-performance and shareholding breakdowns rendered as dedicated panels on the company page

### Congressional Trading

Disclosed trades by members of Congress, sourced via Financial Modeling Prep.

### Macro Indicators

`/macro` surfaces FRED series covering rates and the broader economy: Fed
funds rate, 10Y/2Y Treasury yields and the 10Y-2Y spread, high-yield credit
spreads, CPI, core PCE inflation, unemployment, nonfarm payrolls, initial
jobless claims, real GDP, M2 money supply, retail sales, housing starts, and
consumer sentiment — plus an India 10-year yield series used as the
risk-free rate for the DCF calculator on Indian tickers.

### Search

Fast autocomplete across the local stock index, used throughout the app to
jump to a ticker.

---

## Why StockLens

Most retail investing dashboards either hide their data sources or quietly
invent values when a live API fails. StockLens does the opposite:

* it prefers **real data**,
* it **caches** results to reduce API pressure and stay within free-tier limits,
* it **cross-validates** where it can (Yahoo vs. SEC EDGAR for the DCF, peer comps vs. intrinsic value),
* and it shows **no-data / unavailable states** instead of fake placeholders.

### Design Philosophy

StockLens is strictly designed as a **single-process, single-user tool**.
Authentication, user management, and multi-tenancy are explicitly out of
scope. It's meant to be run locally or deployed for personal use — that
trade-off is what makes it practical to ship genuinely deep features (a real
DCF engine, a 7-agent evaluator, AI report generation) without the overhead
of a multi-tenant SaaS.

---

## Data Sources

| Source | Used for | Auth |
|---|---|---|
| Yahoo Finance | Quotes, historical candles, profiles, financial statements, peers, news (**primary**) | None |
| Alpha Vantage | Automatic **fallback** for quotes, candles, profiles, financials & search when Yahoo is unavailable | API key |
| SEC EDGAR | 10-K/10-Q sections, Form 4 insider trades, 13F holdings, DEF 14A proxy statements, DCF cross-validation | None, compliant `User-Agent` required |
| FRED | Macro indicators (rates, inflation, employment, GDP), DCF risk-free rate | API key |
| Financial Modeling Prep | Congressional trading disclosures | API key |
| Google Gemini | AI-written analyst notes in equity research reports | API key |

---

## Architecture

```text
React UI
   ↓
Express API
   ↓
Cache Layer (in-memory + optional Redis)
   ↓
SQLite Backup
   ↓
External Data Sources (Yahoo, SEC EDGAR, FRED, FMP, Gemini)
```

Outbound calls to Yahoo Finance run behind circuit breakers (`opossum`) with
request de-duplication, so a slow or rate-limited upstream degrades
gracefully instead of cascading failures across the app.

### Repository structure

```text
/server
  /routes      API routes: quotes, charts, screener, market, news, search,
               watchlist, edgar, macro, dcf, report, fundamentals
  /services    Data fetching (Yahoo, FRED, EDGAR), report generation
               (PDF/Word, AI notes, peer comps), caching, database helpers, cron jobs
  /middleware  Rate limiting and error handling

/src
  /pages       Main app pages (Watchlist, Screener, Market, Macro,
               Compare, CompanyPage/*)
  /components  Shared UI components
  /hooks       React Query data hooks
  /utils       Formatters and helpers
```

### Storage

SQLite is used for:

* stock universe seed data
* cached quotes and fundamentals
* SEC filing cache (for DCF cross-validation and the SEC tab)
* watchlist data
* cache logs

---

## Getting Started

### Prerequisites

* Node.js 22+ recommended
* npm
* Optional API keys for FRED, Financial Modeling Prep, and Gemini (the app runs without them — see [Environment Variables](#environment-variables))

### Install

```bash
npm install
cp .env.example .env
npm run dev
```

### Production build

```bash
npm run build
npm start
```

### Type checking

```bash
npm run lint
```

---

## Environment Variables

```env
# Core
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
SQLITE_DB_PATH=./stocklens.db

# Production-only
CLIENT_URL=                 # required in production for CORS allow-listing
CLUSTER=                    # set to "true" to enable Node cluster mode (multi-process)

# Optional external services
FRED_API_KEY=               # macro indicators + DCF risk-free rate
FMP_API_KEY=                # congressional trading disclosures
GEMINI_API_KEY=              # AI analyst notes in equity research reports
REDIS_URL=                   # optional Redis-backed cache instead of in-memory only
```

Notes:

* The app runs with **no API keys at all** — FRED-powered pages, congressional
  trading, and AI analyst notes will show unavailable states, but quotes,
  charts, financials, the screener, and the DCF calculator
  all work off Yahoo Finance and SEC EDGAR alone.
* `SQLITE_DB_PATH` is optional and defaults to a local database file.
* In production, `CLIENT_URL` must be set or CORS fails closed by design.
* `.env.example` only seeds `APP_URL` and `FRED_API_KEY` as a minimal
  starting point — copy the block above for the full set of variables the
  app actually reads.

---

## Scripts

```bash
npm run dev        # Start the full-stack dev server (tsx, hot reload)
npm run build       # Build the client (Vite) and bundle the server (esbuild)
npm start            # Run the production server from dist/
npm run lint          # TypeScript type check (no emit)
npm test               # Run the vitest suite once
npm run test:watch      # Run vitest in watch mode
npm run clean             # Remove build artifacts
```

---

## Testing

```bash
npm test
```

Backend routes are tested with `vitest` + `supertest` against mocked
external services; valuation math (WACC, DCF, sensitivity grids, Monte
Carlo) is covered by pure-function unit tests in `src/utils/__tests__`.

---

## Reliability Notes

StockLens uses a simple data waterfall on every read:

1. **in-memory cache** (or Redis, if `REDIS_URL` is set) for speed
2. **SQLite backup** for persistence across restarts
3. **live fetch** for fresh data, behind a circuit breaker:
   1. **Yahoo Finance** — primary provider
   2. **Alpha Vantage** — automatic fallback when Yahoo fails or is rate-limited
      (set `ALPHAVANTAGE_API_KEY`; the free tier is rate-limited, so it is only
      hit when the Yahoo layer is down and every response is cached)

If every live source is down or rate-limited, StockLens serves the last known
good value from cache/SQLite rather than failing the request outright, and
surfaces data freshness/confidence where it matters (e.g. the DCF
calculator's source provenance tooltips).

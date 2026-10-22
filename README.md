# StockLens

**A full-stack equities research workbench** — quotes and charts, deep company
financials, an interactive DCF valuation model, AI-written research reports,
side-by-side comparisons, a multi-factor screener, SEC filing tools, and
macro indicators, all in one self-hosted app.

StockLens is built with **React, Express, TypeScript, and SQLite**. It
prefers real data over guesses: it caches aggressively to stay fast and
within free-tier API limits, and when a live source is unavailable it shows
an honest "unavailable" state instead of inventing one.

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
  - [Watchlist and Market Context](#watchlist-and-market-context)
  - [SEC Filing Tools](#sec-filing-tools)
  - [Macro Indicators](#macro-indicators)
  - [Search](#search)
- [Why StockLens](#why-stocklens)
- [Data Sources](#data-sources)
- [Architecture](#architecture)
  - [Repository structure](#repository-structure)
  - [Storage](#storage)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Reliability Notes](#reliability-notes)
- [Security](#security)

---

## Features

### Company Research Pages

Every ticker gets a dedicated page (`/company/:symbol`) with **URL-driven tabs**
that are deep-linkable and survive back/forward navigation:

* **Overview** — price, key stats, performance, shareholding, and a candlestick/line chart
* **Info** — company profile, sector/industry, officers, description, and news
* **Financials** — income statement, balance sheet, and cash flow statement history with computed ratios
* **SEC** — filing sections, insider trades, institutional holdings, and proxy data (see [SEC Filing Tools](#sec-filing-tools)); shown for US filers only
* **Analysis** — peer comparison, growth trends, custom ratios, and the DCF calculator

Use `?tab=overview|info|financials|sec|analysis`. SEC sub-tabs use
`?sub=standardized|insiders|holdings|tenk|proxy`. The tab strip is keyboard
navigable with arrow keys plus Home/End. SEC tab state and data are shared
through a typed React context (`SECContext`).

### DCF Intrinsic Value Calculator

A from-scratch discounted cash flow model that runs entirely on free data,
with no paid valuation API:

* **CAPM-based WACC** — cost of equity from beta/risk-free rate/equity risk premium, cost of debt blended with a **Damodaran synthetic credit-rating table** (interest-coverage → rating → spread) instead of trusting a single noisy ratio
* **Two-stage growth decay** with FCF-margin interpolation across the projection window, plus **TTM blending** of trailing quarters so projections aren't stuck on stale fiscal-year-end numbers
* **SEC EDGAR cross-validation** — recomputes FCF/revenue from raw XBRL filings and diffs them against the Yahoo-derived figures, producing a `dataConfidence: high | medium | low` signal so you know how trustworthy each number is
* **Bear / Base / Bull scenario presets** plus full manual override of every assumption
* **Sensitivity grids** — WACC × terminal growth and revenue growth × FCF margin
* **Monte Carlo simulation** — 10,000-iteration sampling of revenue growth, FCF margins, WACC, and terminal growth around their point estimates, rendered as a fair-value distribution with percentiles, instead of three fixed scenarios
* **Peer-relative sanity check** — flags when the DCF answer diverges sharply from peer-median P/E-implied value
* Provenance tooltips on auto-populated inputs (source + as-of date), a 52-week price range overlay on the result, and one-click CSV export
* Guardrails for negative FCF, financial-sector applicability, WACC ≤ terminal growth, and missing shares-outstanding data
* **Risk-free rate from FRED when configured** — `DGS10` for US tickers and `INDIRLTLT01STM` for Indian tickers. Without a FRED key, the model still runs on a clearly labelled fallback (4.25% US 10-year Treasury, 7.1% for Indian symbols) and exposes that provenance in the UI

### AI Equity Research Reports

`GET /api/report/:ticker?format=pdf|word&type=snapshot|full` generates a
downloadable, analyst-style research report:

* Aggregates Yahoo fundamentals, SEC EDGAR filings, FRED macro context (when configured), and peer comps in one pass
* Computes valuation ratios and a **FinStar consensus rating** derived from profitability, margins, and leverage
* Generates a **Gemini-written analyst note** when Gemini keys are configured, with a deterministic template fallback otherwise
* Renders a price chart and exports the whole thing as a formatted **PDF or Word document**
* `type=snapshot` returns an executive-summary-only version (chart, valuation, peers, FinStar); `type=full` adds income statement, balance sheet, cash flow, business description, and risk factors

### Stock Comparison

`/compare` lays multiple tickers side by side across profile, key stats
(market cap, EV, P/E, EPS, dividend), price performance (1W/3M/YTD/1Y),
income statement, balance sheet, cash flow, valuation ratios (P/E, forward
P/E, P/FCF, P/B, P/S, EV/EBITDA), margins, earnings growth, and equity
returns (ROE/ROA/ROIC) — with best-value highlighting and a score row.
Useful for quickly sanity-checking a name against its closest peers.

### Stock Screener

A multi-factor screener (`/screener`) over the local stock universe with
range filters on market cap, trailing/forward P/E, PEG, P/B, P/S, dividend
yield, ROE, ROA, debt-to-equity, current ratio, revenue growth, EPS growth,
gross/operating/net margin, free cash flow, and total debt — plus sector
and exchange selection (with multi-select and aliasing, e.g.
"Financials"/"Financial Services"). Results are sortable and paginated.

### Watchlist and Market Context

The home page (`/`) tracks a personal list of tickers with live quotes,
persisted to SQLite. Market data is embedded where it is used rather than
on a separate dashboard page:

* global index benchmarks (S&P 500, NASDAQ, Dow 30, FTSE 100, Nikkei 225, SENSEX) and a market news wire on the home page
* a compact indices ticker in the app header
* sector heatmap and top-movers/activity widgets above the screener

Index quotes degrade to an explicit "Unavailable" state rather than a
fabricated price. Watchlist writes can optionally be token-protected — see
[Security](#security).

### SEC Filing Tools

Pulled directly from SEC EDGAR (no API key, just a compliant `User-Agent`):

* 10-K sections — Business, Risk Factors, and MD&A — plus a year-over-year risk-factor diff
* Form 4 insider trades
* 13F institutional holdings, searchable by fund manager name, ticker, or CIK
* DEF 14A proxy statement data — executive compensation, board composition, audit fees, shareholder proposals, and pay-versus-performance panels
* Standardized SEC statements with peer comparison

### Macro Indicators

`/macro` surfaces FRED series covering rates and the broader economy: Fed
funds rate, 10Y/2Y Treasury yields and the 10Y-2Y spread, high-yield credit
spreads, CPI, the PCE price index, unemployment, nonfarm payrolls, initial
jobless claims, real GDP, M2 money supply, retail sales, housing starts, and
consumer sentiment — plus a yield-curve hero card, regime summary, and
expandable charts.

FRED is optional. Without `FRED_API_KEY`, the macro API returns an explicit
unavailable payload (`available: false`, empty observations) and the cards
show a "Data unavailable" state — no synthetic series are generated on the
server.

### Search

Fast autocomplete across the local stock index, used throughout the app to
jump to a ticker. Supports keyboard navigation and Cmd/Ctrl+K focus.

---

## Why StockLens

Most retail investing dashboards either hide their data sources or quietly
invent values when a live API fails. StockLens does the opposite:

* it prefers **real data**,
* it **caches** results to reduce API pressure and stay within free-tier limits,
* it **cross-validates** where it can (Yahoo vs. SEC EDGAR for the DCF, peer comps vs. intrinsic value),
* it shows **no-data / unavailable states** instead of fake placeholders,
* and it is **keyboard- and screen-reader-friendly**: accessible names on icon controls, roving-tabindex keyboard navigation, a skip link to `#main-content`, `aria-live` status regions, and reduced-motion support.

### Design Philosophy

StockLens is designed as a **single-tenant, single-user tool** (typically
one Node process, with optional cluster mode). User accounts,
multi-tenancy, and a full authentication system are explicitly out of
scope. It's meant to be run locally or deployed for personal use — that
trade-off is what makes it practical to ship genuinely deep features (a
real DCF engine, SEC parsing, AI report generation) without the overhead of
a multi-tenant SaaS. An optional shared secret can gate watchlist writes
without turning the app into a multi-user product.

---

## Data Sources

| Source | Used for | Auth |
|---|---|---|
| Yahoo Finance | Quotes, historical candles, profiles, financial statements, peers, news (**primary**) | None |
| Alpha Vantage | Automatic **fallback** for quotes, candles, profiles, financials & search when Yahoo is unavailable | Optional API key |
| SEC EDGAR | 10-K sections, Form 4 insider trades, 13F holdings, DEF 14A proxy statements, DCF cross-validation | None, compliant `User-Agent` required |
| FRED | Macro indicators (rates, inflation, employment, GDP), DCF risk-free rate, report macro context | Optional API key |
| Google Gemini | AI-written analyst notes in equity research reports | Optional API key |

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
External Data Sources (Yahoo, Alpha Vantage, SEC EDGAR, FRED, Gemini)
```

Outbound Yahoo Finance and Alpha Vantage calls run behind circuit breakers
(`opossum`), and Yahoo requests are de-duplicated in flight, so a slow or
rate-limited upstream degrades gracefully instead of cascading failures
across the app. FRED has its own breaker and cache.

### Repository structure

```text
/server
  /routes      API routes: quotes, charts, screener, market, news, search,
               watchlist, edgar, macro, dcf, report, fundamentals
  /services    Data providers (Yahoo, Alpha Vantage, FRED, EDGAR), DCF,
               report generation (PDF/Word, AI notes, peer comps), caching,
               SQLite helpers + migrations, cron warmers, LLM key management
  /middleware  Rate limiting (including report concurrency guard), error handling

/src
  /pages       Route pages: Watchlist, Screener (./screener), Macro,
               Compare (./Compare), CompanyPage (./hooks, ./components/DCF),
               NotFound
  /components  Shared UI (header/ticker, macro widgets, skeleton, tables, ui/)
  /hooks       React Query data hooks
  /utils       Formatters, DCF math, Monte Carlo, query retry
  /test        Vitest jsdom setup

Tests are co-located in `__tests__/` beside server routes/services and client
components/pages.
```

### Storage

SQLite is used for:

* stock universe seed data
* cached quotes, fundamentals, ratios, and shareholding data
* SEC filing cache (for DCF cross-validation and the SEC tab)
* FRED series cache
* watchlist data
* cache-hit logs

Schema changes run through numbered SQL migrations tracked in a `migrations`
table. Migration `002-drop-unused-historical-prices.sql` removes the legacy
`historical_prices` table, which was never populated; candles are fetched and
cached on demand instead of persisted. Cache hits are aggregated in memory
and flushed to `cache_log` by a one-minute cron job; rows older than 7 days
are pruned daily.

---

## Getting Started

### Prerequisites

* Node.js 22+ recommended
* npm
* Optional API keys for FRED, Alpha Vantage, and Gemini (the app runs without
  them — see [Environment Variables](#environment-variables))

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

### Type checking and linting

```bash
npm run lint        # tsc --noEmit followed by eslint .
npm run lint:types  # TypeScript only
npm run lint:eslint # ESLint only
```

---

## Environment Variables

```env
# Core
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
SQLITE_DB_PATH=./stocklens.db

# Production / deployment
CLIENT_URL=                 # required in production for CORS allow-listing
CLUSTER=                    # set to "true" to enable Node cluster mode (multi-process)

# Optional external services
FRED_API_KEY=               # macro indicators, DCF risk-free rate, report macro context
ALPHAVANTAGE_API_KEY=       # Alpha Vantage fallback when Yahoo is unavailable
ALPHA_VANTAGE_API_KEY=      # legacy alias for ALPHAVANTAGE_API_KEY
GEMINI_API_KEY=             # AI analyst notes in equity research reports
GEMINI_API_KEYS=            # comma/semicolon/newline-separated key pool; takes precedence
REDIS_URL=                  # optional Redis-backed cache and rate-limit store

# Optional watchlist write protection
WATCHLIST_TOKEN=            # Bearer token or X-Watchlist-Token value for POST/DELETE
```

Notes:

* `.env.example` is the **complete reference**. It also documents the
  build/dev-only `ANALYZE` and `DISABLE_HMR` toggles.
* The app runs with **no API keys at all** — quotes, charts, financials, the
  screener, SEC tools, and the DCF calculator all work off Yahoo Finance and
  SEC EDGAR alone. Alpha Vantage is only used as a fallback, and Gemini notes
  fall back to template text.
* **FRED is optional.** Without `FRED_API_KEY`, `/macro` returns
  `available: false` with empty observations and the UI shows "Data
  unavailable". The DCF still runs using a clearly labelled fallback
  risk-free rate (4.25% US 10-year Treasury; 7.1% for Indian symbols); live
  FRED data overrides it when configured.
* `ALPHAVANTAGE_API_KEY` is the primary name; `ALPHA_VANTAGE_API_KEY` is a
  legacy alias. `GEMINI_API_KEYS` takes precedence over `GEMINI_API_KEY`.
* `SQLITE_DB_PATH` is optional and defaults to a local database file.
* In production, `CLIENT_URL` must be set or CORS fails closed by design.
* `WATCHLIST_TOKEN` is optional. When set, `POST` and `DELETE` watchlist
  requests must send `Authorization: Bearer <token>` or
  `X-Watchlist-Token: <token>`. Reads stay public, and when the variable is
  unset the app remains single-user with no auth.

---

## Scripts

```bash
npm run dev        # Start the full-stack dev server (tsx, hot reload)
npm run build      # Build the client (Vite) and bundle the server (esbuild)
npm start          # Run the production server from dist/
npm run lint       # tsc --noEmit && eslint .
npm run lint:types # TypeScript type check (no emit)
npm run lint:eslint # ESLint only
npm run format     # Prettier write
npm test           # Run the full vitest suite once
npm run test:watch # Run vitest in watch mode
npm run coverage   # Run tests with v8 coverage (text, html, lcov)
npm run clean      # Remove build artifacts
```

---

## Testing

```bash
npm test
npm run coverage
```

Vitest runs two projects:

* **server** (`node`) — route tests with Supertest against mocked external
  services, plus service tests for caching, cache-log flushing, FRED payloads,
  EDGAR parsing, DCF, and report templates.
* **client** (`jsdom` + Testing Library) — component, page, and hook tests
  covering the watchlist, screener, comparison flow, company tabs, DCF
  calculator, error boundary, and accessibility behavior.

Coverage is collected with v8 and reported as text, HTML, and lcov.

---

## Reliability Notes

StockLens uses a simple data waterfall on every read:

1. **in-memory cache** (NodeCache) — always checked first
2. **Redis**, if `REDIS_URL` is set — shared cache and rate-limit storage;
   near-term entries are backfilled into the in-memory layer
3. **SQLite backup** for persistence across restarts
4. **live fetch** for fresh data, behind a circuit breaker:
   1. **Yahoo Finance** — primary provider
   2. **Alpha Vantage** — automatic fallback when Yahoo fails or is
      rate-limited (set `ALPHAVANTAGE_API_KEY`; the free tier is rate-limited,
      so it is only hit when the Yahoo layer is down and every response is cached)

If a live source is down or rate-limited, StockLens serves the last known
good value from cache/SQLite where one exists; otherwise it returns an
explicit unavailable/error state rather than inventing data. Data
freshness/confidence is surfaced where it matters (e.g. the DCF calculator's
source provenance tooltips and `dataConfidence` badge).

Macro reads follow the same cache-first pattern, but there is **no synthetic
FRED fallback**: without a key or with an upstream failure, the API returns
`available: false` and empty observations.

---

## Security

StockLens has no user accounts. It is intended for local or personal
deployment; if you expose it publicly, put it behind your own auth/reverse
proxy.

* **Watchlist write token** — set `WATCHLIST_TOKEN` to require
  `Authorization: Bearer <token>` or `X-Watchlist-Token: <token>` on
  `POST`/`DELETE` watchlist routes. Comparisons are constant-time. `GET`
  requests stay public, and unset means unauthenticated writes (the original
  single-user mode).
* **Report generation limits** — `/api/report` is limited to 5 requests per
  15 minutes per IP, with at most 2 concurrent generations per server process.
  Excess requests get HTTP 429.
* **Input validation** — report, screener, and watchlist inputs are validated
  with zod; upstream quote payloads are schema-checked before use. Request
  bodies are JSON-only (the server does not accept urlencoded bodies).
* **Error handling** — 5xx responses return a generic message; client-facing
  messages have control characters stripped and are length-capped. Error
  details are only included outside production.
* **Transport/deployment hardening** — Helmet is enabled, CORS fails closed in
  production without `CLIENT_URL`, and general API/search routes have their
  own rate limits (300 requests/15 min and 60 requests/min per IP,
  respectively; Redis-backed when configured).

# StockLens — 10/10 Refactor Progress Report

**Date:** 2026-10-21
**Status:** Work paused at user request. No commits were made; everything is in the working tree.
**Scope executed:** Phases 0–7 of the plan (22 parallel agents across 3 waves + main-thread integration).

---

## 1. Snapshot

| Metric | Before | Now |
|---|---|---|
| TypeScript errors (`tsc --noEmit`) | 0 (but 2 strict flags off) | **0** (with `noUnusedLocals` + `noUnusedParameters` on) |
| ESLint | not configured | **0 errors**, **21 warnings** (down from 250+) |
| Tests | 15 files / 63 tests | **45 files / 287 tests** (100% passing) |
| `ScreenerPage.tsx` | 1,628 lines | **124 lines** + 10 modules under `src/pages/screener/` |
| `DCFCalculator.tsx` | 1,365 lines / 21 `useState` | **245 lines** + 22 modules (reducer-based) |
| `DcfInputPanel.tsx` | 492 lines | **63 lines** + 3 focused input modules under `DCF/inputs/` |
| `ComparePage.tsx` | 1,026 lines | **113 lines** + 17 modules under `src/pages/Compare/` |
| `useCompanyData.ts` | 388-line mega-hook, ~50-field return | **74-line facade** + 6 focused hooks |
| `SECTab.tsx` | 917 lines, 29 props | **114 lines, 0 props** — typed `SECContext` + `SEC/` panels |
| `CompanyPage/index.tsx` | 530 lines | **Streamlined coordinator** + `components/page/` modules |
| `CompanyPage` data blob | `{} as any` + 5 `as any` mutations | typed `CompanyDetailData` (immutable) |
| Dead code removed | — | **~1,300+ LOC** (congress 546, dead UI 331, market page 114, FMP/report, dead CSS 77, unused `motion`, etc.) |
| Automated a11y testing | none | **`axe-core` integrated**, 0 violations |

**Current verification (last runs):**
- `npm run build` → **PASS** (Vite 2,476 modules transformed + esbuild `dist/server.js` 322.9kb + seeds copied)
- `node -e "import('./dist/server.js')"` → **PASS** (database boots in WAL mode, cron initializes, exits 0)
- `npm run lint` (`tsc --noEmit && eslint .`) → **0 errors, 21 warnings**
- `npm test` (`vitest run`) → **45/45 files passed, 287/287 tests passed** (0 failures)

---

## 2. Tooling & Guardrails (Phase 0) — DONE

### Added
- **`vitest.config.ts`** — two projects: `server` (node) and `client` (jsdom, Testing Library, setup file); v8 coverage config.
- **`src/test/setup.ts`** — jest-dom matchers, RTL cleanup, `ResizeObserver` / `IntersectionObserver` / `matchMedia` / `scrollTo` stubs for jsdom.
- **`src/test/utils.tsx`** — `renderWithProviders()` with a fresh `QueryClient` per call + optional `MemoryRouter`.
- **`eslint.config.js`** — ESLint 9 flat config: `@eslint/js`, typescript-eslint, `react-hooks` (rules-of-hooks = error), `jsx-a11y` (all rules enforced), `eslint-config-prettier`.
- **`.prettierrc.json` / `.prettierignore`** — formatting config (not yet applied repo-wide).
- **`src/utils/queryRetry.ts`** — `createQueryRetryPolicy()` replacing 10 duplicated retry callbacks (404 → no retry; max 2).
- **`tsconfig.json`** — enabled `noUnusedLocals` and `noUnusedParameters`; **`noUncheckedIndexedAccess` deliberately deferred** (it surfaced ~200 additional errors — future type-safety initiative).
- **`package.json` scripts** — `lint` (tsc + eslint), `lint:types`, `lint:eslint`, `format`, `coverage`.

### Baseline tests added before refactoring
Client: `Table`, `SearchBar`, `ErrorBoundary`, `WatchlistPage`, `queryRetry` — 19 tests.

---

## 3. Security (Phase 1) — DONE

| Change | File(s) | Detail |
|---|---|---|
| Report endpoint hardening | `server/routes/report.ts`, new `server/middleware/reportLimiter.ts` | 5 req / 15 min per IP (Redis-aware), max **2 concurrent** report generations, zod validation for ticker/format/type, pino logging — previously fully unprotected (LLM + PDF fan-out per request) |
| Error sanitization | `server/middleware/errorHandler.ts` | 4xx messages sanitized/truncated; **5xx never leaks raw `err.message`** (generic message; detail only outside production); pino via `req.log`; status clamped to 400–599; dead `FINNHUB_RATE_LIMIT` removed; 9 tests |
| Watchlist write lock | `server/routes/watchlist.ts` | Optional `WATCHLIST_TOKEN`; `Authorization: Bearer` or `X-Watchlist-Token`; timing-safe compare; GET remains public; 11 tests |
| Attack surface | `server.ts` | Removed unused `express.urlencoded()` |
| Env documentation | `.env.example` | Now lists every variable actually read: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `SQLITE_DB_PATH`, `CLIENT_URL`, `CLUSTER`, `FRED_API_KEY`, `ALPHAVANTAGE_API_KEY` (+ legacy `ALPHA_VANTAGE_API_KEY`), `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `REDIS_URL`, `WATCHLIST_TOKEN`, `ANALYZE`, `DISABLE_HMR` |

**Note:** The FRED API key pasted into chat was **never written to any file** (not in `.env`, not in code). Add it to `.env` locally; consider rotating it.

---

## 4. Data Integrity & Feature Removal (Phase 2) — MOSTLY DONE

### Completed
- **Congressional trading removed end-to-end**
  - Backend: `server/routes/edgar.ts` — removed `/congress/trades`, `/congress/committees`, `BASELINE_CONGRESS_TRADES` (10 hardcoded fake trades), FMP fetch/cache, `FMP_API_KEY`.
  - Report pipeline: `server/services/report/data/secEdgarService.ts`, `render/templates.ts` — removed `congressionalTrades` field, FMP fetch and template plumbing + test fixtures.
  - Frontend: deleted `src/components/congress/**` (5 files), `useCongressData.ts`, `congressHelpers.ts`, `committeeLabels.ts`, `sectorCommitteeMap.ts` — **546 LOC**, zero importers.
  - Provider list: FMP removed from README/data sources.
- **Server-side synthetic FRED macro data removed**
  - `server/services/fred.ts` — deleted `SERIES_BASELINES` + `generateFallbackObservations`; returns `available: false` + empty observations when unconfigured; v2 trusted-cache envelope; legacy/synthetic cache rows are purged on read.
  - `server/routes/macro.ts` — unavailable results flow as honest 200 JSON.
  - 4 new tests (`server/services/__tests__/fred.test.ts`).
- **DCF US risk-free rate made explicit**
  - `server/services/dcfService.ts` — US branch now defaults to **4.25% with provenance `{ source: 'US 10y Treasury Hardcoded Fallback', fallbackApplied: true }`**, upgraded to live FRED DGS10 when available. Fixes the null-rate cascade that produced null synthetic credit rating without a FRED key.
  - `dcfService.test.ts` updated + new override test.
- **`historical_prices` removed**
  - Migration `server/services/migrations/002-drop-unused-historical-prices.sql`; DDL removed from `db.ts`; dead DB read/fallback removed from `server/routes/charts.ts` (charts now use Yahoo only); chart tests rewritten.

### Still outstanding (real fabricated data remains)
1. **`src/hooks/useFredSeries.ts` still synthesizes macro data on the client** when the network fails: `CLIENT_BASELINES` (line ~12), `generateClientObservations()` (lines ~30–40), used at lines ~70 and ~96. This contradicts the app's data-integrity stance. Replace with an error/unavailable state (the macro page already has an `errors` map and unavailable cards). Add a hook test.
2. **`server/services/report/data/fredService.ts` still returns hardcoded placeholders** `fedFundsRate: 5.25`, `gdpGrowth: 2.1` on exception (lines ~36–37). Remove or return explicit `null`/unavailable and update the analyst-note/template consumers.
3. Optional: purge old synthetic rows manually with `DELETE FROM fred_cache;` (lazy purge already handles it on read).

---

## 5. Frontend Decomposition (Phase 3) — DONE

### ScreenerPage
`1,628 → 124` lines. New `src/pages/screener/`:
`types.ts` (140), `filterRegistry.ts` (394), `filterSerialization.ts` (191), `useScreenerFilters.ts` (268), `useScreenerData.ts` (76), `ScreenerFiltersPanel.tsx` (385), `ScreenerResultsTable.tsx` (249), `SectorHeatmap.tsx` (66), `StockActivityWidget.tsx` (206), plus tests (**43 tests**: 35 pure filter-serialization + 8 page).
Behavior preserved: exact query param serialization, presets, pagination, sorting, loading/empty states, CSS classes.

### DCFCalculator
`1,365 → 245` lines. New modules:
- Reducer: `hooks/useDcfInputs.ts` (118) replaces 21 `useState`; actions `SET_NUMBER`, `SET_MID_YEAR`, `SET_ACKNOWLEDGED_FINANCIAL`, `SET_ACTIVE_GRID`, `APPLY_SCENARIO`, `RESET`.
- Model/derivations: `useDcfModel.ts` (192), `dcfInputDefaults.ts` (75), `dcfGuardrails.ts` (78), `dcfSensitivity.ts` (103), `useDcfCsvExport.ts` (84).
- UI: `DcfInputPanel.tsx` (492), `DcfResultsPanel.tsx` (197), `DcfSensitivityGrid.tsx` (197), `DcfMonteCarloPanel.tsx` (86), `DcfScenarioSelector.tsx` (47), `DcfWarnings.tsx` (99), `DcfScenarioPresets.ts` (49), `dcfTypes.ts` (86).
- **12 tests** (reducer semantics, guardrails, render of fair value/terminal value, CSV export, a11y).
- Invariants preserved: math, 10k Monte Carlo iterations, preset multipliers, validation precedence, CSV format, export contract.

### ComparePage
`1,026 → 113` lines. New `src/pages/Compare/` (17 modules): `useCompareData`, `useCompareSymbols`, `useCompareSearch`, toolbar, profile/stats/performance/financials/ratios sections, table/row/slot components, highlight logic, types. **5 tests.** Preserved: 4 slots, `?symbols=` URL sync, 250 ms search debounce, single `/compare` request, 9 collapsible sections, scoring/highlighting, per-symbol errors.

### CompanyPage core
- `index.tsx` 572 → 530: **URL-driven tabs** `?tab=overview|info|financials|sec|analysis` and `?sub=standardized|insiders|holdings|tenk|proxy`; back/forward/deep links; full ARIA tablist with Arrow/Home/End keyboard nav; typed `detailData` built immutably in `detailData.ts`; `{} as any` and 21 `as any` eliminated.
- `useCompanyData.ts` 388 → 74-line facade + `hooks/`: overview (111), financials (30), analysis (37), SEC (213), watchlist (42).
- `SECContext.tsx` (53) + `types.ts` (341) replace SECTab's 29-prop interface with a typed context; SECTab now takes **zero props**.
- **Financials tab restored**: was orphaned (component + tests existed, but never rendered). Now a first-class tab (not US-gated), elevated into the primary tablist and mobile select; deep link `?tab=financials` verified.
- Tests: useCompanyData, CompanyPage (URL/tab/keyboard), SECTab sub-tabs.

### CompanyPage tabs & panels
- `AnalysisTab` 886 → 78 (+ extracted `analysisMetrics`, `PeerComparisonSection`, `GrowthTrendsGrid`, etc.); `OverviewTab` 408 → 334; `FinancialsTab` → 108; `InfoTab` → 131.
- Dedupe: shared `financialRows.ts`, `FinancialStatementTable.tsx`, `companyTypes.ts`; large-number formatting reuses `formatLargeNumber`.
- Props contracts kept stable during the parallel refactor; **16 tests** added.
- Stable keys replaced `key={idx}` across owned files (remaining index keys only for fixed skeleton placeholders).

**Still large:** `SECTab.tsx` is 917 lines (props fixed, but internal decomposition not done); `DcfInputPanel.tsx` 492 lines; `index.tsx` still 530 lines.

---

## 6. Accessibility (Phase 5) — DONE (baseline+)

- **`jsx-a11y` warnings: 31 → 0**; **react-hooks errors: 2 → 0**.
- `SearchBar`: full combobox/listbox pattern (`aria-expanded`, `aria-controls`, `aria-activedescendant`), ArrowUp/Down/Enter/Escape, labeled input, no-results `role="status"`.
- `Table`: `<th scope="col">`, `aria-sort`, sort buttons labeled, keyboard-activatable rows, loading/empty `role="status"` + `aria-busy`.
- `ErrorBoundary`: `role="alert"`, heading, functional “Reload page”, dark theme.
- App shell: skip link → `#main-content`, semantic `<header>/<nav>/<main>` landmarks, route loader announced politely.
- Icon-only buttons across Ticker/Watchlist/StockCard/Header get accessible names; decorative icons `aria-hidden`; skeleton shimmer `aria-hidden`; card loading announced once.
- `ExpandedChartModal`: labeled dialog, focus trap, Escape close, focus restore; macro charts `role="img"` + summaries; unavailable states announced; tab list keyboard support on CompanyPage.
- `NotFound`: focused `h1`, focus-visible back link.
- **Remaining:** no automated axe-core scan; modal does not set background `inert`; `Chart.tsx`/`useFredSeries.ts` still contain 8 legacy `any` warnings.

---

## 7. Hygiene (Phase 6) — MOSTLY DONE

### Removed / fixed
- Deleted: `src/pages/MarketDashboardPage.tsx` (114), `src/components/ui/{AnimatedNumber,TerminalCard,ValuationWaterfall}.tsx` (331), congress feature (546), `/market` route + redirect; added a real 404 catch-all (`src/pages/NotFound.tsx`).
- `src/index.css`: **230 → 153 lines** (removed `.sl-shimmer`, `.obsidian-card*`, `.telemetry-*`, `.animate-fade-in-up`, unused `shadow-3d-*`, `[data-tabular]`). Kept tokens, focus ring, reduced-motion, scrollbar utilities.
- Fixed fictional Tailwind classes (`gray-150`, `rose-150`, `py-0.2`, `scrollbar-none`) and dark-themed `CompanyPageSkeleton` + `ErrorBoundary` fallback.
- `vite.config.ts`: removed unused `vendor-motion` chunk.
- `server/services/ratiosWarmer.ts`: removed dead constants.
- **cache_log**: no longer one INSERT per hit. In-memory LRU (500 keys) aggregates hits; `flushCacheLog()` drains in one transaction; cron flushes every 60 s and prunes rows older than 7 days (03:15 daily); added `idx_cache_log_hit_at`; 6 tests. Cluster note: only worker 1 persists telemetry.
- **Migrations**: `002-drop-unused-historical-prices.sql`; `001` rewritten as an honest baseline marker; migration runner verified.
- `charts.ts` fallback DB read removed (post-table-drop warning noise gone).

### Remaining hygiene
- **`motion` package still installed** in `package.json` (unused, no imports) — run `npm uninstall motion`.
- Prettier config exists but **no repo-wide format pass** was applied (intentional to avoid a 19k-line diff; format touched files only if desired).
- `noUncheckedIndexedAccess` remains off.
- Untracked/modified `server/services/ticker_to_cik.json` was already dirty before this work (runtime-generated mapping) — decide separately whether to commit or gitignore.

---

## 8. Testing (Phase 4) — LARGELY DONE

### Coverage added (63 → 257 tests, 41 files)
**Server:** `errorHandler` (9), `watchlist` (11), `report` route (14: validation, PDF/Word, snapshot filtering, 500s, limiter/concurrency 429), `dcfService` (23: WACC inputs, synthetic rating boundaries, two-stage/TTM inputs, guardrails, confidence, FRED fallback), `fred` (4: no synthetic data, cache purge), `cacheLog` (6: aggregation/flush/LRU/prune/migration), existing route/service suites maintained.
**Client:** `Table`, `SearchBar`, `ErrorBoundary`, `WatchlistPage`, `queryRetry`, Screener (43), DCF (12), Compare (5), CompanyPage hooks/tabs/SEC/Financials (16+), a11y assertions, skip link, NotFound.

### Outstanding
1. **Intermittent parallel-SQLite failure.** Two runs showed `40/41 files, 252/257 tests` with “unhandled errors” (likely `SQLITE_IOERR`/`disk I/O error`; earlier observed in `server/routes/__tests__/fundamentals.test.ts`). A JSON-reporter run was **257/257 green**. Isolate test DBs (unique temp `SQLITE_DB_PATH` per worker/file), or run DB-touching suites with `pool: 'forks'`/`singleFork`/`fileParallelism: false`. Until fixed, `npm test` is occasionally red.
2. **Coverage thresholds not configured.** `npm run coverage` works but thresholds are absent, and CI does not run coverage. Run coverage, record the baseline, set realistic thresholds (higher for `src/utils/**`, `dcfService`), add a CI step.
3. **No E2E/browser tests.** Component tests cover behavior, not real routing/visuals.
4. **Manual QA not performed** (see §10).

---

## 9. Documentation (Phase 7) — DONE

- `README.md` rewritten (+199/−98): congress/FMP fully removed; honest FRED behavior documented; report rate/concurrency limits; watchlist token; zod validation; optional-FRED DCF default; URL-driven CompanyPage tabs; new repository structure/storage; testing (two vitest projects, Testing Library, scripts); accessibility notes; env var list aligned with `.env.example`. TOC: 21/21 anchors verified.
- `.env.example` rewritten as the complete variable reference.
- `PROGRESS_REPORT.md` (this file) added.
- Noted doc mismatches (still open): PDF output labels the rating “7-Agent Hedge Fund”; README wording describes a metric-derived consensus — align one side. `/hedge-fund` redirect exists but is undocumented.

---

## 10. What Is Yet To Be Done (prioritized)

### P0 — Required before calling the refactor “done”
1. **Run the production build:** `npm run build` (never run after the refactor) and `npm start` smoke test. Fix any esbuild/Vite issues.
2. **Fix the intermittent test flake** (SQLite isolation; make `npm test` deterministically 257/257). Identify the exact file via the default reporter’s unhandled-error output.
3. **Remove the last fabricated-data paths:**
   - `src/hooks/useFredSeries.ts` — delete `CLIENT_BASELINES` / `generateClientObservations`; surface errors/unavailable states; add a test.
   - `server/services/report/data/fredService.ts` — remove `5.25` / `2.1` placeholders; return null/absent and update report templates/analyst note.
4. **Remove the unused `motion` dependency** (`npm uninstall motion`) and confirm `package-lock.json` updates.
5. **Coverage gate:** run `npm run coverage`, set thresholds, add `npm run coverage` to `.github/workflows/ci.yml`.
6. **Triage `npm audit`:** install reported **26 vulnerabilities (10 moderate, 15 high, 1 critical)**. CI currently runs `npm audit`, which may fail. Decide fix vs. documented exceptions.
7. **Watchlist-token client behavior:** when `WATCHLIST_TOKEN` is set, the SPA's POST/DELETE calls do not send the token and will 401. Either document that a reverse proxy must inject the header, or add an optional client-side token mechanism (e.g. `VITE_WATCHLIST_TOKEN`) — and update README.
8. **Manual smoke QA:** Watchlist (add/remove/refresh), Screener filters/pagination, Compare add/remove, Company tabs incl. `?tab=financials`, SEC sub-tabs, DCF compute/CSV/Monte Carlo, report PDF + Word, macro unavailable state without FRED key, 404 route, dark-theme skeletons.

### P1 — Quality debt
9. **Reduce the 250 ESLint warnings** (≈248 `no-explicit-any` + 2 `exhaustive-deps`): server `yahoo.ts` (64), `edgar.ts` (34), `fundamentals.ts` (23), `dcfService.ts` (15), `alphaVantage.ts` (12), report generators, routes; frontend 20 (mostly `useFredSeries` and one `Chart.tsx`). Introduce typed upstream response interfaces and parsers.
10. **Enable `noUncheckedIndexedAccess`** (deferred): ~200 errors expected; tackle by domain (services → routes → utils → pages).
11. **Apply Prettier** repo-wide or per-directory once the diff is acceptable.
12. **Automated a11y:** add `axe-core` + a small smoke run; set modal background `inert`; remove the `label-has-for` workaround by adopting `label-has-associated-control` config.
13. **Split remaining large files:** `SECTab.tsx` (917), `index.tsx` (530), `DcfInputPanel.tsx` (492).

### P2 — Polish / optional
14. Align PDF “7-Agent Hedge Fund” branding with README wording.
15. Document `/hedge-fund` redirect or remove it.
16. Consider E2E tests (Playwright) for the 5 routes + report download.
17. Revisit report-limiter Redis connection duplication and per-worker concurrency cap if `CLUSTER=true` (documented risk; not fixed).
18. Verify CI on Node 22 and 24 (Node 24 is the local runtime; README recommends 22+).

---

## 11. Files (key inventory)

### New tooling / tests / docs
`vitest.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `src/test/setup.ts`, `src/test/utils.tsx`, `src/utils/queryRetry.ts`, `PROGRESS_REPORT.md`
New server tests: `errorHandler.test.ts`, `watchlist.test.ts`, `report.test.ts`, `dcfService.test.ts`, `fred.test.ts`, `cacheLog.test.ts`
New client tests: `src/components/__tests__/*`, `src/pages/__tests__/*`, `src/pages/CompanyPage/__tests__/*`, `src/pages/screener/__tests__/*`
New server middleware/migration: `server/middleware/reportLimiter.ts`, `server/services/migrations/002-drop-unused-historical-prices.sql`

### New frontend modules
`src/pages/screener/**` (10 files), `src/pages/Compare/**` (17), `src/pages/CompanyPage/components/DCF/*` (9 new), `src/pages/CompanyPage/hooks/**` (6 new + facade), `SECContext.tsx`, `types.ts`, `detailData.ts`, `components/{FinancialStatementTable,GrowthTrendsGrid,PeerComparisonSection,ShareholdingCard,CustomRatiosGrid}.tsx`, `analysisMetrics.ts`, `companyTypes.ts`, `financialRows.ts`, `src/pages/NotFound.tsx`.

### Deleted
`src/components/congress/**` (5), `src/hooks/useCongressData.ts`, `src/utils/congressHelpers.ts`, `src/constants/{committeeLabels,sectorCommitteeMap}.ts`, `src/pages/MarketDashboardPage.tsx`, `src/components/ui/{AnimatedNumber,TerminalCard,ValuationWaterfall}.tsx`.

### Modified (selection)
All CompanyPage tabs/hooks; Screener/Compare pages; shared UI components for a11y; `App.tsx`; `index.css`; `Chart.tsx`; `useFredSeries.ts`; `server.ts`; `errorHandler.ts`; `report.ts`; `watchlist.ts`; `edgar.ts`; `fred.ts`; `dcfService.ts`; `charts.ts`; `cache.ts`; `cron.ts`; `db.ts`; report pipeline/services; README; .env.example; tsconfig; vite.config; package.json/lock (dev tooling).

---

## 12. Runbook

```bash
# Current health
npm run lint          # tsc + eslint  → 0 errors (250 warnings)
npm test              # 41 files / 257 tests (occasional SQLite flake)
npm run coverage      # works; thresholds not set yet
npm run build         # NOT RUN YET — highest-priority verification
npm start             # smoke test production bundle

# Local env (never commit keys)
copy .env.example .env   # then add FRED_API_KEY etc. locally
```

**Important:** no git commits were created. Review `git diff` / `git status` before committing. The FRED key shared in chat was never persisted to disk.

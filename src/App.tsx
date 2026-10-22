import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header.jsx';
import { Ticker } from './components/Ticker.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

// Lazy loaded heavy routes to split the bundle and improve TTI
const WatchlistPage = React.lazy(() => import('./pages/WatchlistPage.jsx').then(m => ({ default: m.WatchlistPage })));
const ScreenerPage = React.lazy(() => import('./pages/ScreenerPage.jsx').then(m => ({ default: m.ScreenerPage })));
const ComparePage = React.lazy(() => import('./pages/ComparePage.jsx').then(m => ({ default: m.ComparePage })));
const CompanyPage = React.lazy(() => import('./pages/CompanyPage/index.jsx').then(m => ({ default: m.CompanyPage })));
const MacroIndicatorsPage = React.lazy(() => import('./pages/MacroIndicatorsPage.jsx').then(m => ({ default: m.MacroIndicatorsPage })));
const NotFound = React.lazy(() => import('./pages/NotFound.jsx').then(m => ({ default: m.NotFound })));

// 1. Initialize TanStack Query engine
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000 // 1 minute default stale threshold
    }
  }
});

const RouteLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="p-8 mt-24 flex flex-col items-center justify-center w-full gap-4"
  >
    <div aria-hidden="true" className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce shadow-sm shadow-emerald-500/50"></div>
      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.12s' }}></div>
      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.24s' }}></div>
    </div>
    <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Loading Terminal View</span>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="relative min-h-screen w-full bg-[#06080D] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
          {/* Multi-Depth 3D Spatial Lighting Gradients */}
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.09),rgba(255,255,255,0))] pointer-events-none z-0" />
          <div className="fixed top-1/4 -left-48 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none z-0 animate-pulse-glow" />
          <div className="fixed top-2/3 -right-48 h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0 animate-pulse-glow" />
          
          <div className="relative z-10 flex flex-col min-h-screen">
          
          {/* Keyboard skip link to the routed page content */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-bold focus:text-slate-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            Skip to main content
          </a>

          {/* Header block */}
          <ErrorBoundary name="Header">
            <Header />
          </ErrorBoundary>

          {/* Indices ticker widget */}
          <ErrorBoundary name="Global Ticker">
            <Ticker />
          </ErrorBoundary>

          {/* Main workspace routing content */}
          <main id="main-content" tabIndex={-1} className="flex-1 animate-fade-in focus:outline-none">
            <ErrorBoundary name="Page Content">
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/" element={<WatchlistPage />} />
                  <Route path="/screener" element={<ScreenerPage />} />
                  <Route path="/hedge-fund" element={<Navigate to="/" replace />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/macro" element={<MacroIndicatorsPage />} />
                  <Route path="/company/:symbol" element={<CompanyPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>

          {/* Obsidian Terminal Footer */}
          <footer className="border-t border-slate-800/80 bg-[#090D15]/90 py-6 text-center text-xs text-slate-500 font-mono mt-16 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="font-semibold text-slate-300 tracking-wide text-xs">
                  StockLens Institutional Equities Terminal © {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </footer>

          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

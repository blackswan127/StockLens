import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar.jsx';
import { TrendingUp, Layers, LineChart, Star, Globe, Scale, Bot, Activity } from 'lucide-react';
import { TelemetryBadge } from './ui/TelemetryBadge.js';

export const Header: React.FC = () => {
  const location = useLocation();

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', label: 'Watchlist', icon: <Star className="h-4 w-4" /> },
    { path: '/screener', label: 'Screener', icon: <Layers className="h-4 w-4" /> },
    { path: '/compare', label: 'Compare', icon: <Scale className="h-4 w-4" /> },
    { path: '/hedge-fund', label: 'Hedge Fund', icon: <Bot className="h-4 w-4" /> },
    { path: '/macro', label: 'Macro', icon: <Globe className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#06080D]/85 backdrop-blur-2xl shadow-xl shadow-black/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Identification */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-emerald-500/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-lg tracking-tight text-slate-100">
                  Stock<span className="text-emerald-400">Lens</span>
                </span>
                <span className="hidden sm:inline-block">
                  <TelemetryBadge variant="emerald" label="PRO" size="xs" />
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-500 -mt-0.5 tracking-widest uppercase">
                EQUITIES INTELLIGENCE
              </span>
            </div>
          </Link>

          {/* Navigation links for desktops */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
            {navItems.map((item) => {
              const active = isLinkActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#141A26] text-emerald-400 border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Instant Search Bar & Status */}
        <div className="flex items-center gap-3 flex-1 md:flex-none justify-end">
          {location.pathname !== '/' && (
            <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm">
              <SearchBar placeholder="Search tickers (e.g. AAPL, NVDA)..." />
            </div>
          )}
        </div>
      </div>

      {/* Sub-header Mobile Nav bar */}
      <div className="flex md:hidden border-t border-slate-800/80 bg-[#090D15]/95 backdrop-blur-2xl items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const active = isLinkActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 font-sans text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${
                active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};

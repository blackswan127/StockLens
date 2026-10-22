import React from 'react';
import { useSECContext } from './SECContext';
import { SecSubTabs } from './SEC/SecSubTabs.js';
import { StandardizedFinancialsPanel } from './SEC/StandardizedFinancialsPanel.js';
import { InsidersPanel } from './SEC/InsidersPanel.js';
import { HoldingsPanel } from './SEC/HoldingsPanel.js';
import { TenKViewerPanel } from './SEC/TenKViewerPanel.js';
import { ProxyPanels } from './SEC/ProxyPanels.js';

export const SECTab: React.FC = () => {
  const {
    upperSymbol,
    peers,
    controls: {
      subTab: activeSecSubTab,
      setSubTab: setActiveSecSubTab,
      comparePeer: secComparePeer,
      setComparePeer: setSecComparePeer,
      statement: activeSecStatement,
      setStatement: setActiveSecStatement,
      holdingsQuery,
      setHoldingsQuery,
      holdingsSearchInput,
      setHoldingsSearchInput,
      tenKTab: activeTenKTab,
      setTenKTab: setActiveTenKTab,
      showRiskDiff,
      setShowRiskDiff,
    },
    data: {
      financials,
      compareFinancials,
      insiders,
      holdings,
      section1,
      section1A,
      section7,
      riskDiff,
      proxy,
      payVersusPerformance,
    },
  } = useSECContext();

  return (
    <div id="sec" className="space-y-6 scroll-mt-20 animate-fade-in">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>🏛️ SEC EDGAR Filings & XBRL Intelligence</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                Live Stream
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Direct primary filings: XBRL standardized financial data, Form 4 insider
              rosters, 13F institutional portfolios, and Section diffs.
            </p>
          </div>

          <SecSubTabs activeSubTab={activeSecSubTab} onSelect={setActiveSecSubTab} />
        </div>

        {activeSecSubTab === 'standardized' && (
          <StandardizedFinancialsPanel
            financials={financials}
            compareFinancials={compareFinancials}
            peers={peers}
            upperSymbol={upperSymbol}
            statement={activeSecStatement}
            onStatementChange={setActiveSecStatement}
            comparePeer={secComparePeer}
            onComparePeerChange={setSecComparePeer}
          />
        )}

        {activeSecSubTab === 'insiders' && (
          <InsidersPanel insiders={insiders} upperSymbol={upperSymbol} />
        )}

        {activeSecSubTab === 'holdings' && (
          <HoldingsPanel
            holdings={holdings}
            holdingsQuery={holdingsQuery}
            onHoldingsQueryChange={setHoldingsQuery}
            holdingsSearchInput={holdingsSearchInput}
            onHoldingsSearchInputChange={setHoldingsSearchInput}
          />
        )}

        {activeSecSubTab === 'tenk' && (
          <TenKViewerPanel
            tenKTab={activeTenKTab}
            onTenKTabChange={setActiveTenKTab}
            showRiskDiff={showRiskDiff}
            onShowRiskDiffChange={setShowRiskDiff}
            section1={section1}
            section1A={section1A}
            section7={section7}
            riskDiff={riskDiff}
          />
        )}

        {activeSecSubTab === 'proxy' && (
          <ProxyPanels
            proxy={proxy}
            payVersusPerformance={payVersusPerformance}
            upperSymbol={upperSymbol}
          />
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { PayVersusPerformancePanel } from '../components/PayVersusPerformancePanel.js';
import { ProxyStatementPanel } from '../components/ProxyStatementPanel.js';
import type {
  EdgarPayVersusPerformance,
  EdgarProxyData,
  QuerySection,
} from '../types.js';

interface ProxyPanelsProps {
  proxy: QuerySection<EdgarProxyData>;
  payVersusPerformance: QuerySection<EdgarPayVersusPerformance>;
  upperSymbol: string;
}

export const ProxyPanels: React.FC<ProxyPanelsProps> = ({
  proxy,
  payVersusPerformance,
  upperSymbol,
}) => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h4 className="font-mono font-bold text-xs text-slate-200 mb-2 uppercase tracking-wider">
        Pay versus Performance (structured XBRL)
      </h4>
      <PayVersusPerformancePanel
        data={payVersusPerformance.data}
        isPending={payVersusPerformance.isPending}
        isError={payVersusPerformance.isError}
        upperSymbol={upperSymbol}
      />
    </div>

    <div className="border-t border-slate-800 pt-6">
      <h4 className="font-mono font-bold text-xs text-slate-200 mb-2 uppercase tracking-wider">
        Full Proxy Statement (parsed from filing HTML)
      </h4>
      <ProxyStatementPanel
        data={proxy.data}
        isPending={proxy.isPending}
        isError={proxy.isError}
        upperSymbol={upperSymbol}
      />
    </div>
  </div>
);

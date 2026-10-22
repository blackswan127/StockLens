import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type {
  CompanySecData,
  Peer,
  SecStatement,
  SecSubTab,
  TenKTab,
} from './types';

export interface SECControls {
  subTab: SecSubTab;
  setSubTab: (tab: SecSubTab) => void;
  comparePeer: string;
  setComparePeer: (peer: string) => void;
  statement: SecStatement;
  setStatement: (statement: SecStatement) => void;
  holdingsQuery: string;
  setHoldingsQuery: (query: string) => void;
  holdingsSearchInput: string;
  setHoldingsSearchInput: (value: string) => void;
  tenKTab: TenKTab;
  setTenKTab: (tab: TenKTab) => void;
  showRiskDiff: boolean;
  setShowRiskDiff: (show: boolean) => void;
}

export interface SECContextValue {
  upperSymbol: string;
  peers: Peer[];
  controls: SECControls;
  data: CompanySecData;
}

const SECContext = createContext<SECContextValue | null>(null);

export function SECProvider({
  value,
  children,
}: {
  value: SECContextValue;
  children: ReactNode;
}) {
  return <SECContext.Provider value={value}>{children}</SECContext.Provider>;
}

export function useSECContext(): SECContextValue {
  const context = useContext(SECContext);
  if (!context) {
    throw new Error('useSECContext must be used within a SECProvider');
  }
  return context;
}

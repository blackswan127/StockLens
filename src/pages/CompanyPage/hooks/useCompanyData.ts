import type { UseMutationResult } from '@tanstack/react-query';
import { useCompanyAnalysisData } from './useCompanyAnalysisData';
import { useCompanyFinancialsData } from './useCompanyFinancialsData';
import { useCompanyOverviewData } from './useCompanyOverviewData';
import { useCompanySecData } from './useCompanySecData';
import { useCompanyWatchlist } from './useCompanyWatchlist';
import type {
  CompanyFinancials,
  CompanyNews,
  CompanyProfile,
  CompanyQuote,
  CompanySecData,
  CompanyShareholding,
  Peer,
  Ratios,
} from '../types';

export interface UseCompanyDataProps {
  upperSymbol: string;
  secComparePeer: string;
  holdingsQuery: string;
  showRiskDiff: boolean;
}

export interface CompanyData {
  profile: CompanyProfile | undefined;
  isProfilePending: boolean;
  profileErr: unknown;
  ratios: Ratios | undefined;
  companyNews: CompanyNews[] | undefined;
  isCompanyNewsPending: boolean;
  shareholding: CompanyShareholding | undefined;
  isShareholdingPending: boolean;
  financials: CompanyFinancials | undefined;
  isFinancialsPending: boolean;
  financialsErr: unknown;
  peers: Peer[] | undefined;
  isPeersPending: boolean;
  quote: CompanyQuote | undefined;
  isUSStock: boolean;
  isStarred: boolean;
  toggleStar: UseMutationResult<unknown, unknown, void>;
  sec: CompanySecData;
}

export type { CompanyNews, CompanyProfile, CompanyQuote, Peer, Ratios };

export function useCompanyData({
  upperSymbol,
  secComparePeer,
  holdingsQuery,
  showRiskDiff,
}: UseCompanyDataProps): CompanyData {
  const overview = useCompanyOverviewData(upperSymbol);
  const financialsData = useCompanyFinancialsData(upperSymbol);
  const analysis = useCompanyAnalysisData(upperSymbol);
  const watchlist = useCompanyWatchlist(upperSymbol);
  const sec = useCompanySecData({
    upperSymbol,
    isUSStock: overview.isUSStock,
    secComparePeer,
    holdingsQuery,
    showRiskDiff,
  });

  return {
    ...overview,
    ...financialsData,
    ...analysis,
    isStarred: watchlist.isStarred,
    toggleStar: watchlist.toggleStar,
    sec,
  };
}

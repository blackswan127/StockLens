import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { edgarApiClient } from '../../../utils/apiClient.js';

export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  weburl: string;
  ipo: string;
  description: string;
}

export interface Ratios {
  symbol: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  debt_equity: string;
  eps: string;
  market_cap: number;
  dividend_yield: string;
  enterprise_value?: number | null;
  shares_outstanding?: number | null;
  book_value?: number | null;
  total_cash?: number | null;
  total_debt?: number | null;
  sales_growth?: string | null;
  profit_growth?: string | null;
}

export interface Peer {
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  pe: number;
  pb: number;
  roe: string;
  exchange: string;
}

export interface CompanyNews {
  id: string;
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
}

interface UseCompanyDataProps {
  upperSymbol: string;
  secComparePeer: string;
  holdingsQuery: string;
  showRiskDiff: boolean;
  activeSecSubTab: string;
  activePrimaryTab: 'overview' | 'analysis' | 'info' | 'sec';
}

export const useCompanyData = ({
  upperSymbol,
  secComparePeer,
  holdingsQuery,
  showRiskDiff,
  activeSecSubTab,
  activePrimaryTab,
}: UseCompanyDataProps) => {
  const queryClient = useQueryClient();

  // 1. Fetch Watchlist to check item state
  const { data: watchlist } = useQuery<any[]>({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const resp = await apiClient.get('/watchlist');
      return resp.data || [];
    }
  });

  const isStarred = watchlist?.some(item => item.symbol.toUpperCase() === upperSymbol) ?? false;

  // Watchlist Toggle mutation
  const toggleStar = useMutation({
    mutationFn: async () => {
      if (isStarred) {
        return await apiClient.delete(`/watchlist/${encodeURIComponent(upperSymbol)}`);
      } else {
        return await apiClient.post('/watchlist/add', { symbol: upperSymbol });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }
  });

  // 2. Fetch Company Profile
  const { data: profile, isPending: isProfilePending, error: profileErr } = useQuery<CompanyProfile>({
    queryKey: ['profile', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/profile/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    }
  });

  // 3. Fetch Company Key Financial Multiples (Ratios Table)
  const { data: ratios, isPending: isRatiosPending } = useQuery<Ratios>({
    queryKey: ['ratios', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/ratios/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    }
  });

  // 4. Fetch Ticker Specific Bulletins Feed
  const { data: news, isPending: isNewsPending } = useQuery<CompanyNews[]>({
    queryKey: ['news', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/news/${encodeURIComponent(upperSymbol)}`);
      return resp.data || [];
    }
  });

  // 5. Fetch Sector Peers Metrics Grid
  const { data: peers, isPending: isPeersPending } = useQuery<Peer[]>({
    queryKey: ['peers', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/peers/${encodeURIComponent(upperSymbol)}`);
      return resp.data || [];
    }
  });

  // Quick query current stock quote
  const { data: quote } = useQuery({
    queryKey: ['quote', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/quote/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    refetchInterval: 60000
  });

  // Fetch Company Financials (Quarterly + Annual Statements)
  const { data: financials, isPending: isFinancialsPending, error: financialsErr } = useQuery({
    queryKey: ['financials', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/financials/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    }
  });


  const isUSSymbol = (symbol: string): boolean => {
    const upper = symbol.toUpperCase();
    if (!upper.includes('.')) {
      return true;
    }
    const parts = upper.split('.');
    const suffix = parts[parts.length - 1];
    if (suffix.length === 1) {
      return true;
    }
    return false;
  };

  const isUSStock = profile ? (
    (profile.exchange || '').toUpperCase().includes('NASDAQ') ||
    (profile.exchange || '').toUpperCase().includes('NYSE') ||
    (profile.exchange || '').toUpperCase().includes('NEW YORK') ||
    (profile.exchange || '').toUpperCase().includes('OTC') ||
    (profile.exchange || '').toUpperCase().includes('BATS') ||
    (profile.exchange || '').toUpperCase().includes('AMEX') ||
    (profile.country || '').toUpperCase() === 'US' ||
    (profile.country || '').toUpperCase() === 'USA' ||
    (profile.country || '').toUpperCase() === 'UNITED STATES' ||
    isUSSymbol(upperSymbol)
  ) : isUSSymbol(upperSymbol);

  // SEC EDGAR Query Hooks - parallel prefetching for instant tab transitions
  const { data: edgarFinancials, isLoading: isEdgarFinancialsPending, isError: isEdgarFinancialsError } = useQuery({
    queryKey: ['edgarFinancials', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/financials/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // cache for 24h
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarCompareFinancials } = useQuery({
    queryKey: ['edgarFinancials', secComparePeer],
    queryFn: async () => {
      if (!secComparePeer) return null;
      const resp = await edgarApiClient.get(`/edgar/financials/${secComparePeer.toUpperCase()}`);
      return resp.data;
    },
    enabled: !!secComparePeer && secComparePeer !== upperSymbol,
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarInsiders, isLoading: isEdgarInsidersPending, isError: isEdgarInsidersError } = useQuery({
    queryKey: ['edgarInsiders', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/insiders/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 60 * 60 * 1000, // cache 1h
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarHoldings, isLoading: isEdgarHoldingsPending, isError: isEdgarHoldingsError } = useQuery({
    queryKey: ['edgarHoldings', holdingsQuery],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/holdings/${holdingsQuery}`);
      return resp.data;
    },
    enabled: isUSStock && !!holdingsQuery,
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarSection1, isLoading: isSection1Pending, isError: isSection1Error } = useQuery({
    queryKey: ['edgarSection1_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/1`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // 24h — 10-K text is not intraday data
    gcTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarSection1A, isLoading: isSection1APending, isError: isSection1AError } = useQuery({
    queryKey: ['edgarSection1A_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/1A`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // 24h — 10-K text is not intraday data
    gcTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarSection7, isLoading: isSection7Pending, isError: isSection7Error } = useQuery({
    queryKey: ['edgarSection7_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/7`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // 24h — 10-K text is not intraday data
    gcTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarRiskDiff, isLoading: isRiskDiffPending, isError: isRiskDiffError } = useQuery({
    queryKey: ['edgarRiskDiff_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/risk-diff/${upperSymbol}`);
      return resp.data;
    },
    enabled: showRiskDiff && isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // 24h — 10-K text is not intraday data
    gcTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarProxy, isLoading: isEdgarProxyPending, isError: isEdgarProxyError } = useQuery({
    queryKey: ['edgarProxy', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/proxy/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // cache 24h
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: edgarPayVersusPerformance, isLoading: isEdgarPayVersusPerformancePending, isError: isEdgarPayVersusPerformanceError } = useQuery({
    queryKey: ['edgarPayVersusPerformance', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/pay-vs-performance/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: 24 * 60 * 60 * 1000, // cache 24h
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });

  const { data: shareholding, isPending: isShareholdingPending } = useQuery({
    queryKey: ['shareholding', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/shareholding/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    staleTime: 60 * 60 * 1000 // 1 hour client cache
  });

  return {
    watchlist,
    isStarred,
    toggleStar,
    profile,
    isProfilePending,
    profileErr,
    ratios,
    isRatiosPending,
    news,
    isNewsPending,
    peers,
    isPeersPending,
    quote,
    companyNews: news,
    isCompanyNewsPending: isNewsPending,
    isUSStock,
    financials,
    isFinancialsPending,
    financialsErr,
    edgarFinancials,
    isEdgarFinancialsPending,
    isEdgarFinancialsError,
    edgarCompareFinancials,
    edgarInsiders,
    isEdgarInsidersPending,
    isEdgarInsidersError,
    edgarHoldings,
    isEdgarHoldingsPending,
    isEdgarHoldingsError,
    edgarSection1,
    isSection1Pending,
    isSection1Error,
    edgarSection1A,
    isSection1APending,
    isSection1AError,
    edgarSection7,
    isSection7Pending,
    isSection7Error,
    edgarRiskDiff,
    isRiskDiffPending,
    isRiskDiffError,
    edgarProxy,
    isEdgarProxyPending,
    isEdgarProxyError,
    edgarPayVersusPerformance,
    isEdgarPayVersusPerformancePending,
    isEdgarPayVersusPerformanceError,
    shareholding,
    isShareholdingPending
  };
};

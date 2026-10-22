import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../utils/queryRetry.js';
import type {
  MarketMoversResponse,
  ScreenerQueryInput,
  ScreenerResponse,
  SectorStat,
} from './types';

const retryPolicy = createQueryRetryPolicy();

const EMPTY_MOVERS: MarketMoversResponse = {
  most_active: [],
  trending: [],
  gainers: [],
  losers: [],
  highs_52w: [],
  lows_52w: [],
};

export interface UseScreenerDataInput extends ScreenerQueryInput {
  queryParams: URLSearchParams;
}

export function useScreenerData({
  filters,
  searchQuery,
  sortBy,
  sortOrder,
  page,
  queryParams,
}: UseScreenerDataInput) {
  // 1. Fetch Sector Stats for Heatmap
  const { data: sectorSummary, isPending: isSectorPending } = useQuery<SectorStat[]>({
    queryKey: ['marketSectors'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/sectors');
      return resp.data || [];
    },
    retry: retryPolicy,
    retryDelay: retryPolicy.retryDelay,
  });

  // Fetch Movers for Stock Activity Widget
  const { data: moversData, isPending: isMoversPending } = useQuery<MarketMoversResponse>({
    queryKey: ['marketMovers'],
    queryFn: async () => {
      const resp = await apiClient.get('/market/movers');
      return resp.data || EMPTY_MOVERS;
    },
    retry: retryPolicy,
    retryDelay: retryPolicy.retryDelay,
  });

  // 2. Fetch Filtered Stocks from `/api/screener`
  const { data: screenerData, isPending: isScreenerPending } = useQuery<ScreenerResponse>({
    queryKey: ['screener', searchQuery, filters, sortBy, sortOrder, page],
    queryFn: async () => {
      const resp = await apiClient.get(`/screener?${queryParams.toString()}`);
      return resp.data;
    },
    placeholderData: (previousData) => previousData,
    retry: retryPolicy,
    retryDelay: retryPolicy.retryDelay,
  });

  return {
    sectorSummary,
    isSectorPending,
    moversData,
    isMoversPending,
    screenerData,
    isScreenerPending,
  };
}

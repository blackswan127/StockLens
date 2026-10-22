import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import apiClient from '../../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../../utils/queryRetry.js';
import type { WatchlistItem } from '../types';

export interface CompanyWatchlistData {
  isStarred: boolean;
  toggleStar: UseMutationResult<unknown, unknown, void>;
}

export function useCompanyWatchlist(upperSymbol: string): CompanyWatchlistData {
  const queryClient = useQueryClient();
  const retry = createQueryRetryPolicy();

  const { data: watchlist } = useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const resp = await apiClient.get('/watchlist');
      return resp.data || [];
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  const isStarred =
    watchlist?.some((item) => item.symbol.toUpperCase() === upperSymbol) ?? false;

  const toggleStar = useMutation<unknown, unknown, void>({
    mutationFn: async () => {
      if (isStarred) {
        return apiClient.delete(`/watchlist/${encodeURIComponent(upperSymbol)}`);
      }
      return apiClient.post('/watchlist/add', { symbol: upperSymbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  return { isStarred, toggleStar };
}

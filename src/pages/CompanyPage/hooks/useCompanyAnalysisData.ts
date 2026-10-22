import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../../utils/queryRetry.js';
import type { CompanyQuote, Peer } from '../types';

export interface CompanyAnalysisData {
  peers: Peer[] | undefined;
  isPeersPending: boolean;
  quote: CompanyQuote | undefined;
}

export function useCompanyAnalysisData(upperSymbol: string): CompanyAnalysisData {
  const retry = createQueryRetryPolicy();

  const { data: peers, isPending: isPeersPending } = useQuery<Peer[]>({
    queryKey: ['peers', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/peers/${encodeURIComponent(upperSymbol)}`);
      return resp.data || [];
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  const { data: quote } = useQuery<CompanyQuote>({
    queryKey: ['quote', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/quote/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    refetchInterval: 60000,
    retry,
    retryDelay: retry.retryDelay,
  });

  return { peers, isPeersPending, quote };
}

import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../../utils/queryRetry.js';
import type { CompanyFinancials } from '../types';

export interface CompanyFinancialsData {
  financials: CompanyFinancials | undefined;
  isFinancialsPending: boolean;
  financialsErr: unknown;
}

export function useCompanyFinancialsData(upperSymbol: string): CompanyFinancialsData {
  const retry = createQueryRetryPolicy();

  const {
    data: financials,
    isPending: isFinancialsPending,
    error: financialsErr,
  } = useQuery<CompanyFinancials>({
    queryKey: ['financials', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/financials/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  return { financials, isFinancialsPending, financialsErr };
}

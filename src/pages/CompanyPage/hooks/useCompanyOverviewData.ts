import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../../utils/queryRetry.js';
import type {
  CompanyNews,
  CompanyProfile,
  CompanyShareholding,
  Ratios,
} from '../types';

export interface CompanyOverviewData {
  profile: CompanyProfile | undefined;
  isProfilePending: boolean;
  profileErr: unknown;
  ratios: Ratios | undefined;
  companyNews: CompanyNews[] | undefined;
  isCompanyNewsPending: boolean;
  shareholding: CompanyShareholding | undefined;
  isShareholdingPending: boolean;
  isUSStock: boolean;
}

function isUSSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (!upper.includes('.')) {
    return true;
  }
  const parts = upper.split('.');
  const suffix = parts[parts.length - 1];
  return suffix.length === 1;
}

function deriveIsUSStock(symbol: string, profile: CompanyProfile | undefined): boolean {
  if (!profile) return isUSSymbol(symbol);
  const exchange = (profile.exchange || '').toUpperCase();
  const country = (profile.country || '').toUpperCase();
  return (
    exchange.includes('NASDAQ') ||
    exchange.includes('NYSE') ||
    exchange.includes('NEW YORK') ||
    exchange.includes('OTC') ||
    exchange.includes('BATS') ||
    exchange.includes('AMEX') ||
    country === 'US' ||
    country === 'USA' ||
    country === 'UNITED STATES' ||
    isUSSymbol(symbol)
  );
}

export function useCompanyOverviewData(upperSymbol: string): CompanyOverviewData {
  const retry = createQueryRetryPolicy();

  const {
    data: profile,
    isPending: isProfilePending,
    error: profileErr,
  } = useQuery<CompanyProfile>({
    queryKey: ['profile', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/profile/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  const { data: ratios } = useQuery<Ratios>({
    queryKey: ['ratios', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/ratios/${encodeURIComponent(upperSymbol)}`);
      return resp.data;
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  const { data: companyNews, isPending: isCompanyNewsPending } = useQuery<CompanyNews[]>({
    queryKey: ['news', upperSymbol],
    queryFn: async () => {
      const resp = await apiClient.get(`/news/${encodeURIComponent(upperSymbol)}`);
      return resp.data || [];
    },
    retry,
    retryDelay: retry.retryDelay,
  });

  const { data: shareholding, isPending: isShareholdingPending } =
    useQuery<CompanyShareholding>({
      queryKey: ['shareholding', upperSymbol],
      queryFn: async () => {
        const resp = await apiClient.get(`/shareholding/${encodeURIComponent(upperSymbol)}`);
        return resp.data;
      },
      staleTime: 60 * 60 * 1000,
      retry,
      retryDelay: retry.retryDelay,
    });

  return {
    profile,
    isProfilePending,
    profileErr,
    ratios,
    companyNews,
    isCompanyNewsPending,
    shareholding,
    isShareholdingPending,
    isUSStock: deriveIsUSStock(upperSymbol, profile),
  };
}

import { useQuery } from '@tanstack/react-query';
import { edgarApiClient } from '../../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../../utils/queryRetry.js';
import type {
  CompanySecData,
  EdgarFinancials,
  EdgarHoldings,
  EdgarInsiders,
  EdgarPayVersusPerformance,
  EdgarProxyData,
  EdgarRiskDiff,
  EdgarSection,
} from '../types';

interface UseCompanySecDataProps {
  upperSymbol: string;
  isUSStock: boolean;
  secComparePeer: string;
  holdingsQuery: string;
  showRiskDiff: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export function useCompanySecData({
  upperSymbol,
  isUSStock,
  secComparePeer,
  holdingsQuery,
  showRiskDiff,
}: UseCompanySecDataProps): CompanySecData {
  const retry = createQueryRetryPolicy();

  const financials = useQuery<EdgarFinancials>({
    queryKey: ['edgarFinancials', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/financials/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const compareFinancials = useQuery<EdgarFinancials>({
    queryKey: ['edgarFinancials', secComparePeer],
    queryFn: async () => {
      const resp = await edgarApiClient.get(
        `/edgar/financials/${secComparePeer.toUpperCase()}`
      );
      return resp.data;
    },
    enabled: !!secComparePeer && secComparePeer !== upperSymbol,
    staleTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const insiders = useQuery<EdgarInsiders>({
    queryKey: ['edgarInsiders', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/insiders/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: HOUR,
    retry,
    retryDelay: retry.retryDelay,
  });

  const holdings = useQuery<EdgarHoldings>({
    queryKey: ['edgarHoldings', holdingsQuery],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/holdings/${holdingsQuery}`);
      return resp.data;
    },
    enabled: isUSStock && !!holdingsQuery,
    staleTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const section1 = useQuery<EdgarSection>({
    queryKey: ['edgarSection1_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/1`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    gcTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const section1A = useQuery<EdgarSection>({
    queryKey: ['edgarSection1A_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/1A`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    gcTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const section7 = useQuery<EdgarSection>({
    queryKey: ['edgarSection7_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/section/${upperSymbol}/7`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    gcTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const riskDiff = useQuery<EdgarRiskDiff>({
    queryKey: ['edgarRiskDiff_v2', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/risk-diff/${upperSymbol}`);
      return resp.data;
    },
    enabled: showRiskDiff && isUSStock,
    staleTime: DAY,
    gcTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const proxy = useQuery<EdgarProxyData>({
    queryKey: ['edgarProxy', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/proxy/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  const payVersusPerformance = useQuery<EdgarPayVersusPerformance>({
    queryKey: ['edgarPayVersusPerformance', upperSymbol],
    queryFn: async () => {
      const resp = await edgarApiClient.get(`/edgar/pay-vs-performance/${upperSymbol}`);
      return resp.data;
    },
    enabled: isUSStock,
    staleTime: DAY,
    retry,
    retryDelay: retry.retryDelay,
  });

  return {
    financials: {
      data: financials.data,
      isPending: financials.isLoading,
      isError: financials.isError,
    },
    compareFinancials: {
      data: compareFinancials.data,
      isPending: compareFinancials.isLoading,
      isError: compareFinancials.isError,
    },
    insiders: {
      data: insiders.data,
      isPending: insiders.isLoading,
      isError: insiders.isError,
    },
    holdings: {
      data: holdings.data,
      isPending: holdings.isLoading,
      isError: holdings.isError,
    },
    section1: {
      data: section1.data,
      isPending: section1.isLoading,
      isError: section1.isError,
    },
    section1A: {
      data: section1A.data,
      isPending: section1A.isLoading,
      isError: section1A.isError,
    },
    section7: {
      data: section7.data,
      isPending: section7.isLoading,
      isError: section7.isError,
    },
    riskDiff: {
      data: riskDiff.data,
      isPending: riskDiff.isLoading,
      isError: riskDiff.isError,
    },
    proxy: {
      data: proxy.data,
      isPending: proxy.isLoading,
      isError: proxy.isError,
    },
    payVersusPerformance: {
      data: payVersusPerformance.data,
      isPending: payVersusPerformance.isLoading,
      isError: payVersusPerformance.isError,
    },
  };
}

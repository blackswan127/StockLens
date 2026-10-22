import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/apiClient.js';
import { createQueryRetryPolicy } from '../../utils/queryRetry.js';
import type { BetterDirection, CompareColumn, StockData } from './types.js';

const retryPolicy = createQueryRetryPolicy();

export interface UseCompareDataResult {
  columnsData: CompareColumn[];
  scores: number[];
  isLoading: boolean;
}

export function useCompareData(selectedSymbols: string[]): UseCompareDataResult {
  const fetchSymbols = useMemo(() => selectedSymbols.filter(Boolean), [selectedSymbols]);

  const { data: compareData, isPending: isLoading } = useQuery<StockData[]>({
    queryKey: ['compareStocksData', fetchSymbols.join(',')],
    queryFn: async () => {
      if (fetchSymbols.length === 0) return [];
      const resp = await apiClient.get<StockData[]>(
        `/compare?symbols=${encodeURIComponent(fetchSymbols.join(','))}`
      );
      return resp.data;
    },
    enabled: fetchSymbols.length > 0,
    retry: retryPolicy,
    retryDelay: retryPolicy.retryDelay,
  });

  const columnsData = useMemo<CompareColumn[]>(
    () =>
      selectedSymbols.map((symbol) => {
        if (!symbol) {
          return { symbol: '', loading: false, details: null };
        }
        const details = Array.isArray(compareData)
          ? (compareData.find((d) => d.symbol.toUpperCase() === symbol.toUpperCase()) ?? null)
          : null;
        return {
          symbol,
          loading: isLoading && !details,
          details,
        };
      }),
    [selectedSymbols, compareData, isLoading]
  );

  const scores = useMemo(() => {
    const result = new Array<number>(columnsData.length).fill(0);
    if (
      columnsData.every(
        (column) => !column.symbol || column.loading || column.details?.error
      )
    ) {
      return result;
    }

    const evaluate = (
      getRawValue: (stock: StockData) => number | null,
      isBetter: BetterDirection
    ) => {
      const rawValues = columnsData.map((column) =>
        column.details && !column.details.error ? getRawValue(column.details) : null
      );
      const validValues = rawValues.filter(
        (value): value is number => value !== null && value !== undefined && !isNaN(value)
      );
      if (validValues.length < 2) return;
      const max = Math.max(...validValues);
      const min = Math.min(...validValues);
      if (max === min) return;

      const best = isBetter === 'high' ? max : min;
      rawValues.forEach((value, index) => {
        if (value === best) result[index]++;
      });
    };

    evaluate((d) => d.keyStats.peRatio, 'low');
    evaluate((d) => d.pricePerformance.oneWeek, 'high');
    evaluate((d) => d.pricePerformance.threeMonths, 'high');
    evaluate((d) => d.pricePerformance.ytd, 'high');
    evaluate((d) => d.pricePerformance.oneYear, 'high');
    evaluate((d) => d.incomeStatement.revenueGrowthYoY, 'high');
    evaluate((d) => d.balanceSheet.receivablesTurnover, 'high');
    evaluate((d) => d.cashFlow.operatingCashFlow, 'high');
    evaluate((d) => d.cashFlow.freeCashFlow, 'high');
    evaluate((d) => d.priceRatios.forwardPe, 'low');
    evaluate((d) => d.priceRatios.pFreeCashFlow, 'low');
    evaluate((d) => d.priceRatios.pBook, 'low');
    evaluate((d) => d.priceRatios.pSales, 'low');
    evaluate((d) => d.priceRatios.evEbitda, 'low');
    evaluate((d) => d.margin.operatingMargin, 'high');
    evaluate((d) => d.margin.grossMargin, 'high');
    evaluate((d) => d.margin.profitMargin, 'high');
    evaluate((d) => d.earnings.epsGrowthYoY, 'high');
    evaluate((d) => d.equityReturn.roe, 'high');
    evaluate((d) => d.equityReturn.roa, 'high');
    evaluate((d) => d.equityReturn.roic, 'high');

    return result;
  }, [columnsData]);

  return { columnsData, scores, isLoading };
}

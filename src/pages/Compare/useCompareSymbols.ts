import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SLOT_COUNT = 4;

const createEmptySymbols = (): string[] => Array.from({ length: SLOT_COUNT }, () => '');

const parseSymbols = (searchParams: URLSearchParams): string[] => {
  const symsParam = searchParams.get('symbols');
  if (!symsParam) return createEmptySymbols();

  const parsed = symsParam.split(',').map((s) => s.trim().toUpperCase());
  const padded = [...parsed];
  while (padded.length < SLOT_COUNT) padded.push('');
  return padded.slice(0, SLOT_COUNT);
};

export interface UseCompareSymbolsResult {
  selectedSymbols: string[];
  activeSymbols: string[];
  announcement: string;
  setSymbol: (index: number, symbol: string) => void;
  removeSymbol: (index: number) => void;
}

export function useCompareSymbols(): UseCompareSymbolsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [announcement, setAnnouncement] = useState('');

  const selectedSymbols = useMemo(() => parseSymbols(searchParams), [searchParams]);

  const updateUrlSymbols = useCallback(
    (newSymbols: string[]) => {
      const active = newSymbols.filter(Boolean);
      if (active.length > 0) {
        setSearchParams({ symbols: active.join(',') });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  const setSymbol = useCallback(
    (index: number, symbol: string) => {
      const normalized = symbol.toUpperCase();
      const updated = [...selectedSymbols];
      updated[index] = normalized;
      updateUrlSymbols(updated);
      setAnnouncement(`Added ${normalized} to comparison`);
    },
    [selectedSymbols, updateUrlSymbols]
  );

  const removeSymbol = useCallback(
    (index: number) => {
      const removed = selectedSymbols[index];
      const updated = [...selectedSymbols];
      updated[index] = '';
      updateUrlSymbols(updated);
      if (removed) {
        setAnnouncement(`Removed ${removed} from comparison`);
      }
    },
    [selectedSymbols, updateUrlSymbols]
  );

  return {
    selectedSymbols,
    activeSymbols: selectedSymbols.filter(Boolean),
    announcement,
    setSymbol,
    removeSymbol,
  };
}

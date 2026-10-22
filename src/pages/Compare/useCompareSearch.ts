import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import apiClient from '../../utils/apiClient.js';
import type { SearchResult } from './types.js';

const SEARCH_DEBOUNCE_MS = 250;

export interface UseCompareSearchResult {
  activeSearchIndex: number | null;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchContainerRef: RefObject<HTMLDivElement | null>;
  openSearch: (index: number) => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
}

export function useCompareSearch(): UseCompareSearchResult {
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
    }
  }, []);

  const closeSearch = useCallback(() => {
    setActiveSearchIndex(null);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await apiClient.get<SearchResult[]>(
          `/search?q=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(resp.data || []);
      } catch (err) {
        console.error('[COMPARE SEARCH ERROR]', err);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [closeSearch]);

  const openSearch = useCallback((index: number) => {
    setActiveSearchIndex(index);
  }, []);

  return {
    activeSearchIndex,
    searchQuery,
    searchResults,
    isSearching,
    searchContainerRef,
    openSearch,
    closeSearch,
    setSearchQuery: updateSearchQuery,
  };
}

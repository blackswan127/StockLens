import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  METRIC_REGISTRY,
  getFirstMetricInCategory,
  getMetricById,
  getMetricsInCategory,
  isFilterActive,
} from './filterRegistry';
import { buildScreenerParams } from './filterSerialization';
import type {
  CategoricalFilterValue,
  FilterState,
  Metric,
  MetricCategory,
  NumericCustomRange,
  NumericFilterValue,
  ScreenerQueryInput,
  SortOrder,
} from './types';

export {
  buildScreenerParams,
  getApiParamsFromFilters,
  parseAbbreviatedNumber,
} from './filterSerialization';

export const ITEMS_PER_PAGE = 20;
export const DEFAULT_SORT_BY = 'market_cap';
export const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const DEFAULT_ACTIVE_CATEGORY = CATEGORIES[0];
const DEFAULT_ACTIVE_METRIC_ID =
  getFirstMetricInCategory(DEFAULT_ACTIVE_CATEGORY)?.id ?? METRIC_REGISTRY[0].id;

export interface ScreenerFiltersState extends ScreenerQueryInput {
  itemsPerPage: number;
  showAdvancedFilters: boolean;
  activeCategory: MetricCategory;
  activeMetricId: string;
  activeMetric: Metric;
  metricsInCategory: Metric[];
  activeFilterCount: number;
  selectedSector: string;
  currentNumeric: NumericFilterValue | undefined;
  currentCategorical: CategoricalFilterValue | undefined;
  customOpen: boolean;
  categoricalSearch: string;
  queryParams: URLSearchParams;
}

export interface ScreenerFiltersActions {
  toggleAdvancedFilters: () => void;
  handleSectorCardClick: (sectorName: string) => void;
  handleSelectCategory: (category: MetricCategory) => void;
  handleSelectMetric: (metricId: string) => void;
  updateNumericPreset: (presetId: string) => void;
  updateNumericCustom: (partial: Partial<NumericCustomRange>) => void;
  toggleCategoricalOption: (option: string) => void;
  resetAllFilters: () => void;
  handleSort: (key: string) => void;
  goToPage: (nextPage: number) => void;
  updateSearchQuery: (value: string) => void;
  clearSearchQuery: () => void;
  setCustomOpen: (open: boolean) => void;
  setCategoricalSearch: (value: string) => void;
}

export type ScreenerFiltersController = ScreenerFiltersState & ScreenerFiltersActions;

export function useScreenerFilters(): ScreenerFiltersController {
  // Advanced filters state
  const [filters, setFilters] = useState<FilterState>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [page, setPage] = useState(1);

  // Editor states
  const [activeCategory, setActiveCategory] = useState<MetricCategory>(DEFAULT_ACTIVE_CATEGORY);
  const [activeMetricId, setActiveMetricId] = useState<string>(DEFAULT_ACTIVE_METRIC_ID);
  const [customOpen, setCustomOpen] = useState<boolean>(false);
  const [categoricalSearch, setCategoricalSearch] = useState<string>('');

  const activeMetric = useMemo(
    () => getMetricById(activeMetricId) ?? METRIC_REGISTRY[0],
    [activeMetricId]
  );

  const metricsInCategory = useMemo(
    () => getMetricsInCategory(activeCategory),
    [activeCategory]
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(isFilterActive).length,
    [filters]
  );

  const selectedSector = useMemo(() => {
    const sectorFilter = filters['sector'];
    if (sectorFilter?.kind !== 'categorical') return 'ALL';
    return sectorFilter.selected[0] || 'ALL';
  }, [filters]);

  const queryParams = useMemo(
    () =>
      buildScreenerParams({
        filters,
        searchQuery,
        sortBy,
        sortOrder,
        page,
        limit: ITEMS_PER_PAGE,
      }),
    [filters, searchQuery, sortBy, sortOrder, page]
  );

  const currentValue = filters[activeMetricId];
  const currentNumeric = currentValue?.kind === 'numeric' ? currentValue : undefined;
  const currentCategorical = currentValue?.kind === 'categorical' ? currentValue : undefined;

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters((prev) => !prev);
  };

  const handleSectorCardClick = (sectorName: string) => {
    setFilters((prev) => {
      const current = prev['sector'];
      const selected = current?.kind === 'categorical' ? current.selected : [];
      const isSelected = selected.includes(sectorName);
      const next = isSelected ? [] : [sectorName]; // single selection toggle
      return {
        ...prev,
        ['sector']: { kind: 'categorical', selected: next },
      };
    });
    setPage(1);
  };

  const handleSelectCategory = (category: MetricCategory) => {
    setActiveCategory(category);
    const firstMetric = getFirstMetricInCategory(category);
    if (firstMetric) {
      setActiveMetricId(firstMetric.id);
      setCustomOpen(false);
      setCategoricalSearch('');
    }
  };

  const handleSelectMetric = (metricId: string) => {
    setActiveMetricId(metricId);
    setCustomOpen(false);
    setCategoricalSearch('');
  };

  const updateNumericPreset = (presetId: string) => {
    setFilters((prev) => {
      const current = prev[activeMetricId];
      const numericCurrent = current?.kind === 'numeric' ? current : undefined;
      const isSame = numericCurrent?.preset === presetId;
      return {
        ...prev,
        [activeMetricId]: {
          kind: 'numeric',
          preset: isSame ? undefined : presetId,
          custom: numericCurrent?.custom,
        },
      };
    });
    setPage(1);
  };

  const updateNumericCustom = (partial: Partial<NumericCustomRange>) => {
    setFilters((prev) => {
      const current = prev[activeMetricId];
      const numericCurrent = current?.kind === 'numeric' ? current : undefined;
      const base = numericCurrent?.custom ?? { operator: 'more', value1: '', value2: '' };
      return {
        ...prev,
        [activeMetricId]: {
          kind: 'numeric',
          preset: undefined,
          custom: { ...base, ...partial },
        },
      };
    });
    setPage(1);
  };

  const toggleCategoricalOption = (option: string) => {
    setFilters((prev) => {
      const current = prev[activeMetricId];
      const selected = current?.kind === 'categorical' ? current.selected : [];
      const next = selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option];
      return {
        ...prev,
        [activeMetricId]: { kind: 'categorical', selected: next },
      };
    });
    setPage(1);
  };

  const resetAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  return {
    filters,
    showAdvancedFilters,
    searchQuery,
    sortBy,
    sortOrder,
    page,
    itemsPerPage: ITEMS_PER_PAGE,
    activeCategory,
    activeMetricId,
    activeMetric,
    metricsInCategory,
    activeFilterCount,
    selectedSector,
    currentNumeric,
    currentCategorical,
    customOpen,
    categoricalSearch,
    queryParams,
    toggleAdvancedFilters,
    handleSectorCardClick,
    handleSelectCategory,
    handleSelectMetric,
    updateNumericPreset,
    updateNumericCustom,
    toggleCategoricalOption,
    resetAllFilters,
    handleSort,
    goToPage: setPage,
    updateSearchQuery,
    clearSearchQuery,
    setCustomOpen,
    setCategoricalSearch,
  };
}

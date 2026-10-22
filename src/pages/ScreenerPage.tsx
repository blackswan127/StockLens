import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, SlidersHorizontal } from 'lucide-react';
import { usePrefetchCompany } from '../hooks/usePrefetchCompany';
import { SectorHeatmap } from './screener/SectorHeatmap';
import { ScreenerFiltersPanel } from './screener/ScreenerFiltersPanel';
import { ScreenerResultsTable } from './screener/ScreenerResultsTable';
import { StockActivityWidget } from './screener/StockActivityWidget';
import { useScreenerData } from './screener/useScreenerData';
import { useScreenerFilters } from './screener/useScreenerFilters';
import type { ScreenerStock } from './screener/types';

export const ScreenerPage: React.FC = () => {
  const navigate = useNavigate();
  const prefetch = usePrefetchCompany();
  const screening = useScreenerFilters();
  const {
    sectorSummary,
    isSectorPending,
    moversData,
    isMoversPending,
    screenerData,
    isScreenerPending,
  } = useScreenerData(screening);

  const stocks = screenerData?.results || [];
  const total = screenerData?.total || 0;
  const totalPages = screenerData?.totalPages || 1;

  const handleRowClick = (row: ScreenerStock) => {
    navigate(`/company/${encodeURIComponent(row.symbol.toUpperCase())}`);
  };

  const handleSelectStock = (symbol: string) => {
    navigate(`/company/${encodeURIComponent(symbol.toUpperCase())}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-20">
      {/* Page Title Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600 animate-pulse" />
            <h1 className="font-sans text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent tracking-tight drop-shadow-sm">Equities Stock Screener</h1>
          </div>
          <button
            onClick={screening.toggleAdvancedFilters}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-3xs transition-all ${
              screening.showAdvancedFilters
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-gray-705 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{screening.showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}</span>
          </button>
        </div>
        <p className="font-mono text-xs text-slate-400 max-w-2xl">
          Instantly filter through institutional multi-factor data for S&P 500 and global equities.
        </p>
      </div>

      {/* 1. Sector Heatmap Widget Grid (Actions Toggle) */}
      <SectorHeatmap
        sectors={sectorSummary}
        isPending={isSectorPending}
        selectedSector={screening.selectedSector}
        onSectorClick={screening.handleSectorCardClick}
      />

      {/* 1.5. Stock Activity Widget */}
      <StockActivityWidget
        moversData={moversData}
        isPending={isMoversPending}
        onSelectStock={handleSelectStock}
        onHoverStock={prefetch}
      />

      {/* 2. Interactive Multi-Factor Filters Builder Panel */}
      {screening.showAdvancedFilters && (
        <ScreenerFiltersPanel
          filters={screening.filters}
          activeFilterCount={screening.activeFilterCount}
          activeCategory={screening.activeCategory}
          activeMetric={screening.activeMetric}
          activeMetricId={screening.activeMetricId}
          metricsInCategory={screening.metricsInCategory}
          currentNumeric={screening.currentNumeric}
          currentCategorical={screening.currentCategorical}
          customOpen={screening.customOpen}
          categoricalSearch={screening.categoricalSearch}
          onSelectCategory={screening.handleSelectCategory}
          onSelectMetric={screening.handleSelectMetric}
          onPresetToggle={screening.updateNumericPreset}
          onCustomChange={screening.updateNumericCustom}
          onCustomOpenChange={screening.setCustomOpen}
          onCategoricalSearchChange={screening.setCategoricalSearch}
          onToggleCategoricalOption={screening.toggleCategoricalOption}
          onReset={screening.resetAllFilters}
        />
      )}

      {/* 3. Search and Dynamic Columns Table */}
      <ScreenerResultsTable
        stocks={stocks}
        total={total}
        totalPages={totalPages}
        page={screening.page}
        itemsPerPage={screening.itemsPerPage}
        isPending={isScreenerPending}
        sortBy={screening.sortBy}
        sortOrder={screening.sortOrder}
        searchQuery={screening.searchQuery}
        onSearchChange={screening.updateSearchQuery}
        onClearSearch={screening.clearSearchQuery}
        onSort={screening.handleSort}
        onPageChange={screening.goToPage}
        onRowClick={handleRowClick}
        onRowHover={(row) => prefetch(row.symbol)}
      />
    </div>
  );
};

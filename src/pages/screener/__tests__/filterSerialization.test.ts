import { describe, expect, it } from 'vitest';
import {
  buildScreenerParams,
  getApiParamsFromFilters,
  parseAbbreviatedNumber,
} from '../filterSerialization';
import { isFilterActive, summarizeFilter, getMetricById } from '../filterRegistry';
import type { FilterState } from '../types';

function numericFilters(fieldId: string, preset: string): FilterState {
  return { [fieldId]: { kind: 'numeric', preset } };
}

function numericCustom(
  fieldId: string,
  operator: 'more' | 'less' | 'equal' | 'between',
  value1: string,
  value2 = ''
): FilterState {
  return { [fieldId]: { kind: 'numeric', custom: { operator, value1, value2 } } };
}

describe('parseAbbreviatedNumber', () => {
  it('converts currency abbreviations into millions', () => {
    expect(parseAbbreviatedNumber('$10B')).toBe(10_000);
    expect(parseAbbreviatedNumber('250M')).toBe(250);
    expect(parseAbbreviatedNumber('1.5T')).toBe(1_500_000);
    expect(parseAbbreviatedNumber('500K')).toBe(0.5);
    expect(parseAbbreviatedNumber('42')).toBe(42);
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseAbbreviatedNumber('')).toBeNull();
    expect(parseAbbreviatedNumber('abc')).toBeNull();
  });
});

describe('getApiParamsFromFilters', () => {
  it('defaults categorical filters to ALL', () => {
    const params = getApiParamsFromFilters({});

    expect(params.get('exchange')).toBe('ALL');
    expect(params.get('sector')).toBe('ALL');
    expect([...params.keys()]).toEqual(['exchange', 'sector']);
  });

  it('joins multiple categorical selections with commas', () => {
    const params = getApiParamsFromFilters({
      exchange: { kind: 'categorical', selected: ['NASDAQ', 'NYSE'] },
      sector: { kind: 'categorical', selected: ['Technology', 'Healthcare'] },
    });

    expect(params.get('exchange')).toBe('NASDAQ,NYSE');
    expect(params.get('sector')).toBe('Technology,Healthcare');
  });

  it.each([
    ['small', { maxMcap: '2000' }],
    ['mid', { minMcap: '2000', maxMcap: '10000' }],
    ['large', { minMcap: '10000', maxMcap: '200000' }],
    ['mega', { minMcap: '200000' }],
  ])('serializes the %s market-cap preset', (preset, expected) => {
    const params = getApiParamsFromFilters(numericFilters('market_cap', preset));

    for (const [key, value] of Object.entries(expected)) {
      expect(params.get(key)).toBe(value);
    }
  });

  it('serializes a currency custom range using abbreviated values', () => {
    const params = getApiParamsFromFilters(numericCustom('market_cap', 'between', '1B', '2.5B'));

    expect(params.get('minMcap')).toBe('1000');
    expect(params.get('maxMcap')).toBe('2500');
  });

  it('serializes a percentage custom bound and strips the percent sign', () => {
    const params = getApiParamsFromFilters(numericCustom('roe', 'more', '15%'));

    expect(params.get('minRoe')).toBe('15');
    expect(params.get('maxRoe')).toBeNull();
  });

  it.each([
    ['market_cap', 'minMcap', '10000'],
    ['trailing_pe', 'minPeTrailing', '10'],
    ['forward_pe', 'minPeForward', '10'],
    ['peg_ratio', 'minPeg', '10'],
    ['price_book', 'minPb', '10'],
    ['price_sales', 'minPs', '10'],
    ['dividend_yield', 'minDiv', '10'],
    ['roe', 'minRoe', '10'],
    ['roa', 'minRoa', '10'],
    ['debt_equity', 'minDe', '10'],
    ['current_ratio', 'minCurrentRatio', '10'],
    ['revenue_growth', 'minRevGrowth', '10'],
    ['eps_growth', 'minEpsGrowth', '10'],
    ['gross_margin', 'minGrossMargin', '10'],
    ['operating_margin', 'minOpMargin', '10'],
    ['net_margin', 'minNetMargin', '10'],
    ['free_cash_flow', 'minFcf', '10000'],
    ['total_debt', 'minTotalDebt', '10000'],
  ])('maps %s custom "more" bounds to %s', (fieldId, param, expected) => {
    const value = fieldId === 'market_cap' || fieldId === 'free_cash_flow' || fieldId === 'total_debt'
      ? '10B'
      : '10';
    const params = getApiParamsFromFilters(numericCustom(fieldId, 'more', value));

    expect(params.get(param)).toBe(expected);
  });

  it('serializes equal bounds to both min and max', () => {
    const params = getApiParamsFromFilters(numericCustom('trailing_pe', 'equal', '20'));

    expect(params.get('minPeTrailing')).toBe('20');
    expect(params.get('maxPeTrailing')).toBe('20');
  });

  it('serializes less-than bounds to max only', () => {
    const params = getApiParamsFromFilters(numericCustom('debt_equity', 'less', '1.5'));

    expect(params.get('minDe')).toBeNull();
    expect(params.get('maxDe')).toBe('1.5');
  });

  it('ignores categorical values assigned to numeric metric ids', () => {
    const filters: FilterState = {
      roe: { kind: 'categorical', selected: ['x'] },
    };

    expect(getApiParamsFromFilters(filters).get('minRoe')).toBeNull();
  });
});

describe('buildScreenerParams', () => {
  it('appends sort, pagination, and search parameters in a stable order', () => {
    const params = buildScreenerParams({
      filters: { sector: { kind: 'categorical', selected: ['Technology'] } },
      searchQuery: 'AAPL',
      sortBy: 'price',
      sortOrder: 'asc',
      page: 2,
      limit: 20,
    });

    expect(params.toString()).toBe(
      'exchange=ALL&sector=Technology&sortBy=price&sortOrder=asc&page=2&limit=20&q=AAPL'
    );
  });

  it('omits the search parameter when the query is whitespace only', () => {
    const params = buildScreenerParams({
      filters: {},
      searchQuery: '   ',
      sortBy: 'market_cap',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    });

    expect(params.get('q')).toBeNull();
    expect(params.get('page')).toBe('1');
  });
});

describe('filter activity helpers', () => {
  it('detects active presets, custom bounds, and categorical selections', () => {
    expect(isFilterActive(undefined)).toBe(false);
    expect(isFilterActive({ kind: 'numeric' })).toBe(false);
    expect(isFilterActive({ kind: 'numeric', preset: 'mid' })).toBe(true);
    expect(
      isFilterActive({ kind: 'numeric', custom: { operator: 'more', value1: '  ', value2: '' } })
    ).toBe(false);
    expect(
      isFilterActive({ kind: 'numeric', custom: { operator: 'between', value1: '', value2: '5' } })
    ).toBe(true);
    expect(isFilterActive({ kind: 'categorical', selected: [] })).toBe(false);
    expect(isFilterActive({ kind: 'categorical', selected: ['Technology'] })).toBe(true);
  });

  it('summarizes presets, custom bounds, and categorical selections', () => {
    const marketCap = getMetricById('market_cap');
    const sector = getMetricById('sector');

    expect(marketCap).toBeDefined();
    expect(sector).toBeDefined();

    expect(
      summarizeFilter(marketCap!, { kind: 'numeric', preset: 'mid' })
    ).toBe('Mid Cap ($2B - $10B)');
    expect(
      summarizeFilter(marketCap!, {
        kind: 'numeric',
        custom: { operator: 'between', value1: '1', value2: '2' },
      })
    ).toBe('$1 \u2013 $2');
    expect(
      summarizeFilter(sector!, { kind: 'categorical', selected: ['Technology'] })
    ).toBe('Technology');
    expect(
      summarizeFilter(sector!, { kind: 'categorical', selected: ['Technology', 'Energy'] })
    ).toBe('2 selected');
    expect(summarizeFilter(marketCap!, undefined)).toBeNull();
  });
});

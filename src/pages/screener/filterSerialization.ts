import type {
  FilterState,
  NumericFilterValue,
  SortOrder,
} from './types';

export function parseAbbreviatedNumber(valStr: string): number | null {
  const clean = valStr.toUpperCase().replace(/[$,]/g, '').trim();
  if (!clean) return null;
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  if (clean.endsWith('B')) return num * 1000; // in millions
  if (clean.endsWith('M')) return num;
  if (clean.endsWith('T')) return num * 1000000;
  if (clean.endsWith('K')) return num / 1000;
  return num; // assume already in millions or simple number
}

export function getApiParamsFromFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Exchange
  const exchangeVal = filters['exchange'];
  if (exchangeVal?.kind === 'categorical' && exchangeVal.selected.length > 0) {
    params.append('exchange', exchangeVal.selected.join(','));
  } else {
    params.append('exchange', 'ALL');
  }

  // Sector
  const sectorVal = filters['sector'];
  if (sectorVal?.kind === 'categorical' && sectorVal.selected.length > 0) {
    params.append('sector', sectorVal.selected.join(','));
  } else {
    params.append('sector', 'ALL');
  }

  // Helper numeric serializer
  const serializeNumeric = (
    fieldId: string,
    minParam: string,
    maxParam: string,
    _isPercent = false,
    isCurrency = false
  ) => {
    const fVal = filters[fieldId] as NumericFilterValue | undefined;
    if (!fVal || fVal.kind !== 'numeric') return;

    if (fVal.preset) {
      if (fieldId === 'market_cap') {
        if (fVal.preset === 'small') params.append(maxParam, '2000');
        else if (fVal.preset === 'mid') { params.append(minParam, '2000'); params.append(maxParam, '10000'); }
        else if (fVal.preset === 'large') { params.append(minParam, '10000'); params.append(maxParam, '200000'); }
        else if (fVal.preset === 'mega') params.append(minParam, '200000');
      } else if (fieldId === 'trailing_pe' || fieldId === 'forward_pe') {
        if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === '0to20') { params.append(minParam, '0'); params.append(maxParam, '20'); }
        else if (fVal.preset === '0to15') { params.append(minParam, '0'); params.append(maxParam, '15'); }
        else if (fVal.preset === '15to30') { params.append(minParam, '15'); params.append(maxParam, '30'); }
        else if (fVal.preset === '20to50') { params.append(minParam, '20'); params.append(maxParam, '50'); }
        else if (fVal.preset === '50to80') { params.append(minParam, '50'); params.append(maxParam, '80'); }
        else if (fVal.preset === 'above80') params.append(minParam, '80');
        else if (fVal.preset === 'above30') params.append(minParam, '30');
      } else if (fieldId === 'peg_ratio' || fieldId === 'price_book' || fieldId === 'price_sales') {
        if (fVal.preset === 'below1') params.append(maxParam, '1');
        else if (fVal.preset === '1to2') { params.append(minParam, '1'); params.append(maxParam, '2'); }
        else if (fVal.preset === '1to3') { params.append(minParam, '1'); params.append(maxParam, '3'); }
        else if (fVal.preset === '1to5') { params.append(minParam, '1'); params.append(maxParam, '5'); }
        else if (fVal.preset === '2to3') { params.append(minParam, '2'); params.append(maxParam, '3'); }
        else if (fVal.preset === '3to6') { params.append(minParam, '3'); params.append(maxParam, '6'); }
        else if (fVal.preset === '5to10') { params.append(minParam, '5'); params.append(maxParam, '10'); }
        else if (fVal.preset === 'above3') params.append(minParam, '3');
        else if (fVal.preset === 'above6') params.append(minParam, '6');
        else if (fVal.preset === 'above10') params.append(minParam, '10');
      } else if (fieldId === 'dividend_yield') {
        if (fVal.preset === 'none') params.append(maxParam, '0');
        else if (fVal.preset === '0to2') { params.append(minParam, '0'); params.append(maxParam, '2'); }
        else if (fVal.preset === '2to4') { params.append(minParam, '2'); params.append(maxParam, '4'); }
        else if (fVal.preset === 'above4') params.append(minParam, '4');
      } else if (fieldId === 'roe' || fieldId === 'roa') {
        if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === '0to10') { params.append(minParam, '0'); params.append(maxParam, '10'); }
        else if (fVal.preset === '0to5') { params.append(minParam, '0'); params.append(maxParam, '5'); }
        else if (fVal.preset === '5to10') { params.append(minParam, '5'); params.append(maxParam, '10'); }
        else if (fVal.preset === '10to20') { params.append(minParam, '10'); params.append(maxParam, '20'); }
        else if (fVal.preset === 'above10') params.append(minParam, '10');
        else if (fVal.preset === 'above20') params.append(minParam, '20');
      } else if (fieldId === 'debt_equity' || fieldId === 'current_ratio') {
        if (fVal.preset === 'below0.5') params.append(maxParam, '0.5');
        else if (fVal.preset === 'below1') params.append(maxParam, '1.0');
        else if (fVal.preset === '0.5to1') { params.append(minParam, '0.5'); params.append(maxParam, '1.0'); }
        else if (fVal.preset === '1to2') { params.append(minParam, '1.0'); params.append(maxParam, '2.0'); }
        else if (fVal.preset === '2to3') { params.append(minParam, '2.0'); params.append(maxParam, '3.0'); }
        else if (fVal.preset === 'above2') params.append(minParam, '2.0');
        else if (fVal.preset === 'above3') params.append(minParam, '3.0');
      } else if (fieldId === 'revenue_growth' || fieldId === 'eps_growth' || fieldId === 'gross_margin' || fieldId === 'operating_margin' || fieldId === 'net_margin') {
        if (fVal.preset === 'negative') params.append(maxParam, '0');
        else if (fVal.preset === 'below0') params.append(maxParam, '0');
        else if (fVal.preset === 'below20') params.append(maxParam, '20');
        else if (fVal.preset === '0to10') { params.append(minParam, '0'); params.append(maxParam, '10'); }
        else if (fVal.preset === '10to25') { params.append(minParam, '10'); params.append(maxParam, '25'); }
        else if (fVal.preset === '20to40') { params.append(minParam, '20'); params.append(maxParam, '40'); }
        else if (fVal.preset === '10to20') { params.append(minParam, '10'); params.append(maxParam, '20'); }
        else if (fVal.preset === '40to60') { params.append(minParam, '40'); params.append(maxParam, '60'); }
        else if (fVal.preset === 'above25') params.append(minParam, '25');
        else if (fVal.preset === 'above20') params.append(minParam, '20');
        else if (fVal.preset === 'above60') params.append(minParam, '60');
      } else if (fieldId === 'free_cash_flow' || fieldId === 'total_debt') {
        if (fVal.preset === 'negative') params.append(maxParam, '0');
        else if (fVal.preset === 'under100m') params.append(maxParam, '100');
        else if (fVal.preset === '0to100m') { params.append(minParam, '0'); params.append(maxParam, '100'); }
        else if (fVal.preset === '100mto1b') { params.append(minParam, '100'); params.append(maxParam, '1000'); }
        else if (fVal.preset === '1bto10b') { params.append(minParam, '1000'); params.append(maxParam, '10000'); }
        else if (fVal.preset === 'above1b') params.append(minParam, '1000');
        else if (fVal.preset === 'above10b') params.append(minParam, '10000');
      }
    } else if (fVal.custom) {
      const { operator, value1, value2 } = fVal.custom;
      const cleanFloat = (v: string) => {
        const clean = v.replace(/[$,%]/g, '').trim();
        return clean ? parseFloat(clean) : NaN;
      };
      const num1 = isCurrency ? parseAbbreviatedNumber(value1) : cleanFloat(value1);
      const num2 = isCurrency ? parseAbbreviatedNumber(value2) : cleanFloat(value2);
      if (operator === 'more' && num1 !== null && !isNaN(num1)) params.append(minParam, num1.toString());
      else if (operator === 'less' && num1 !== null && !isNaN(num1)) params.append(maxParam, num1.toString());
      else if (operator === 'equal' && num1 !== null && !isNaN(num1)) {
        params.append(minParam, num1.toString());
        params.append(maxParam, num1.toString());
      } else if (operator === 'between') {
        if (num1 !== null && !isNaN(num1)) params.append(minParam, num1.toString());
        if (num2 !== null && !isNaN(num2)) params.append(maxParam, num2.toString());
      }
    }
  };

  // Map all 20 metrics parameters
  serializeNumeric('market_cap', 'minMcap', 'maxMcap', false, true);
  serializeNumeric('trailing_pe', 'minPeTrailing', 'maxPeTrailing');
  serializeNumeric('forward_pe', 'minPeForward', 'maxPeForward');
  serializeNumeric('peg_ratio', 'minPeg', 'maxPeg');
  serializeNumeric('price_book', 'minPb', 'maxPb');
  serializeNumeric('price_sales', 'minPs', 'maxPs');
  serializeNumeric('dividend_yield', 'minDiv', 'maxDiv', true);

  serializeNumeric('roe', 'minRoe', 'maxRoe', true);
  serializeNumeric('roa', 'minRoa', 'maxRoa', true);
  serializeNumeric('debt_equity', 'minDe', 'maxDe');
  serializeNumeric('current_ratio', 'minCurrentRatio', 'maxCurrentRatio');

  serializeNumeric('revenue_growth', 'minRevGrowth', 'maxRevGrowth', true);
  serializeNumeric('eps_growth', 'minEpsGrowth', 'maxEpsGrowth', true);
  serializeNumeric('gross_margin', 'minGrossMargin', 'maxGrossMargin', true);
  serializeNumeric('operating_margin', 'minOpMargin', 'maxOpMargin', true);
  serializeNumeric('net_margin', 'minNetMargin', 'maxNetMargin', true);

  serializeNumeric('free_cash_flow', 'minFcf', 'maxFcf', false, true);
  serializeNumeric('total_debt', 'minTotalDebt', 'maxTotalDebt', false, true);

  return params;
}

export interface ScreenerParamsInput {
  filters: FilterState;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

export function buildScreenerParams({
  filters,
  searchQuery = '',
  sortBy = 'market_cap',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
}: ScreenerParamsInput): URLSearchParams {
  const params = getApiParamsFromFilters(filters);
  params.append('sortBy', sortBy);
  params.append('sortOrder', sortOrder);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  if (searchQuery.trim()) {
    params.append('q', searchQuery);
  }

  return params;
}

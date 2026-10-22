import { fredService as baseFredService } from '../../fred.js';

export interface FredData {
  fedFundsRate: number | null;
  gdpGrowth: number | null;
}

interface FredObservation {
  value: string;
}

interface FredSeriesResponse {
  observations?: FredObservation[];
}

function validValues(observations: FredObservation[] | undefined): number[] {
  if (!observations) return [];

  return observations
    .filter((obs) => obs.value !== '.')
    .map((obs) => parseFloat(obs.value))
    .filter((value) => Number.isFinite(value));
}

export async function fetchFredData(): Promise<FredData> {
  try {
    // Federal Funds Effective Rate (FEDFUNDS)
    const fedRes = (await baseFredService.getSeries('FEDFUNDS')) as FredSeriesResponse | undefined;
    const fedValues = validValues(fedRes?.observations);
    const fedFundsRate = fedValues.length > 0 ? fedValues[fedValues.length - 1] : null;

    // Real Gross Domestic Product (GDPC1)
    const gdpRes = (await baseFredService.getSeries('GDPC1')) as FredSeriesResponse | undefined;
    const gdpValues = validValues(gdpRes?.observations);
    let gdpGrowth = null;
    if (gdpValues.length >= 2) {
      const gdpCurrent = gdpValues[gdpValues.length - 1];
      const gdpPrevious = gdpValues[gdpValues.length - 2];
      if (gdpPrevious !== 0) {
        gdpGrowth = ((gdpCurrent - gdpPrevious) / gdpPrevious) * 100;
      }
    }

    return {
      fedFundsRate,
      gdpGrowth
    };
  } catch (error) {
    console.warn('Error fetching FRED data for report:', error);
    return {
      fedFundsRate: null,
      gdpGrowth: null
    };
  }
}

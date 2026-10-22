export function formatPercentInput(
  value: number | undefined,
  digits: number
): number | '' {
  if (value === undefined || isNaN(value)) return '';
  return Number((value * 100).toFixed(digits));
}

export function formatDecimalInput(
  value: number | undefined,
  digits: number
): number | '' {
  if (value === undefined || isNaN(value)) return '';
  return Number(value.toFixed(digits));
}

export function parsePercentInput(rawValue: string): number {
  const value = parseFloat(rawValue);
  return isNaN(value) ? 0 : value / 100;
}

export function parseNumberInput(rawValue: string, fallback: number): number {
  const value = parseFloat(rawValue);
  return isNaN(value) ? fallback : value;
}

export function parseNonNegativeInput(rawValue: string): number {
  return Math.max(parseFloat(rawValue) || 0, 0);
}

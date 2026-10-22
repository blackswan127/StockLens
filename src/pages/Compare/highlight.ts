import type { BetterDirection } from './types.js';

export function getCellHighlight(
  rowValues: (number | null)[],
  currentValue: number | null,
  isBetter: BetterDirection = 'high',
  highlightEnabled = true
): string {
  if (!highlightEnabled || currentValue === null || currentValue === undefined) return '';

  const validValues = rowValues.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v)
  );
  if (validValues.length < 2) return '';

  const max = Math.max(...validValues);
  const min = Math.min(...validValues);

  if (max === min) return '';

  if (currentValue === max) {
    return isBetter === 'high'
      ? 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-500'
      : 'bg-rose-50 text-rose-700 font-medium border-l-2 border-rose-500';
  }

  if (currentValue === min) {
    return isBetter === 'high'
      ? 'bg-rose-50 text-rose-700 font-medium border-l-2 border-rose-500'
      : 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-500';
  }

  return '';
}

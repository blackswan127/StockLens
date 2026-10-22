import type { CompareColumn } from './types.js';

interface CompareScoreRowProps {
  columns: CompareColumn[];
  scores: number[];
}

export function CompareScoreRow({ columns, scores }: CompareScoreRowProps) {
  return (
    <tr className="bg-emerald-50/30 border-t-2 border-emerald-500">
      <td className="py-4 px-4 text-sm font-black text-emerald-900 sticky left-0 z-10 bg-emerald-50/80 backdrop-blur-xs border-r border-emerald-100 flex flex-col">
        <span>Overall Winner</span>
        <span className="text-[10px] text-emerald-600/80 font-semibold uppercase tracking-wider mt-0.5">
          Metrics Won
        </span>
      </td>
      {columns.map((column, index) => {
        const cellKey = `${column.symbol || 'empty'}-${index}`;

        if (!column.symbol || column.loading || column.details?.error) {
          return (
            <td
              key={cellKey}
              className="py-4 px-4 text-center text-gray-300 font-mono text-xs"
            >
              —
            </td>
          );
        }
        const isWinner =
          scores[index] ===
          Math.max(...scores.filter((_, scoreIndex) => columns[scoreIndex]?.details));
        return (
          <td
            key={cellKey}
            className={`py-4 px-4 text-center text-xl font-black font-mono ${
              isWinner
                ? 'text-emerald-600 bg-emerald-100/50 border-x border-emerald-200'
                : 'text-gray-400'
            }`}
          >
            {scores[index]}{' '}
            <span className="text-[10px] text-gray-400 font-sans tracking-wide uppercase">
              wins
            </span>
            {isWinner && (
              <div className="text-[10px] font-sans text-emerald-600 bg-emerald-200/50 inline-block px-2 py-0.5 rounded-full ml-2 uppercase tracking-widest align-middle">
                Winner
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

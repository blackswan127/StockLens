import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { CompanyRatios } from './companyTypes.js';
import type { FinancialStatements } from './financialRows.js';
import {
  formatChartLabel,
  getGrowthColorClass,
  getGrowthLabel,
  getIncomeStatementHistory,
  getPercentageHistory,
  type HistoryPoint,
} from './analysisMetrics.js';

interface GrowthTrendsGridProps {
  upperSymbol: string;
  ratios: CompanyRatios | undefined;
  financials: FinancialStatements | null;
}

interface TrendCardData {
  title: string;
  history: HistoryPoint[];
  yr1: string;
  yr3: string;
  yr5: string;
}

interface ChartLabelProps {
  x?: number;
  y?: number;
  value?: string | number;
}

const CustomLabel: React.FC<ChartLabelProps> = ({ x = 0, y = 0, value }) => {
  const label = formatChartLabel(value);
  if (!label) return null;

  const width = Math.max(28, label.length * 6 + 6);
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 18}
        width={width}
        height={14}
        fill="#0D111A"
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={x}
        y={y - 8}
        fill="#F1F5F9"
        fontSize={8}
        fontFamily="JetBrains Mono, monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
};

const TrendCard = React.memo(function TrendCard({ title, history, yr1, yr3, yr5 }: TrendCardData) {
  return (
    <div className="p-4 bg-[#080B11] border border-slate-800 rounded-xl space-y-4 shadow-3d card-3d-tilt flex flex-col justify-between min-h-[220px]">
      <div className="flex items-center gap-1.5">
        <h4 className="text-xs font-mono text-slate-200 font-bold block uppercase">{title}</h4>
      </div>

      <div
        className="h-[90px] w-full"
        role="img"
        aria-label={`${title} historical trend chart`}
      >
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 22, right: 15, left: 15, bottom: 5 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={2}
                label={<CustomLabel />}
                dot={{ r: 2.5, fill: '#080B11', stroke: '#10B981', strokeWidth: 1.5 }}
                activeDot={{ r: 4.5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-xs text-slate-500">
            No history available
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-slate-800/80">
        <div>
          <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase">
            1 Year
          </span>
          <span className={`font-mono font-bold text-xs mt-1 block ${getGrowthColorClass(yr1)}`}>
            {yr1}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase">
            3 Year
          </span>
          <span className={`font-mono font-bold text-xs mt-1 block ${getGrowthColorClass(yr3)}`}>
            {yr3}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-mono font-bold block uppercase">
            5 Year
          </span>
          <span className={`font-mono font-bold text-xs mt-1 block ${getGrowthColorClass(yr5)}`}>
            {yr5}
          </span>
        </div>
      </div>
    </div>
  );
});

export const GrowthTrendsGrid: React.FC<GrowthTrendsGridProps> = ({
  upperSymbol,
  ratios,
  financials,
}) => {
  const cards = useMemo<TrendCardData[]>(
    () => [
      {
        title: 'Sales Growth',
        history: getIncomeStatementHistory(financials, 'revenue', upperSymbol),
        yr1: getGrowthLabel(financials, 'revenue', 1),
        yr3: getGrowthLabel(financials, 'revenue', 3),
        yr5: getGrowthLabel(financials, 'revenue', 5),
      },
      {
        title: 'Profit Growth',
        history: getIncomeStatementHistory(financials, 'netIncome', upperSymbol),
        yr1: getGrowthLabel(financials, 'netIncome', 1),
        yr3: getGrowthLabel(financials, 'netIncome', 3),
        yr5: getGrowthLabel(financials, 'netIncome', 5),
      },
      {
        title: 'ROE %',
        history: getPercentageHistory(financials, ratios?.roe, upperSymbol),
        yr1: ratios?.roe || '—',
        yr3: '—',
        yr5: '—',
      },
      {
        title: 'ROCE %',
        history: getPercentageHistory(financials, ratios?.roce, upperSymbol),
        yr1: ratios?.roce || '—',
        yr3: '—',
        yr5: '—',
      },
    ],
    [financials, ratios, upperSymbol]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {cards.map((card) => (
        <TrendCard
          key={card.title}
          title={card.title}
          history={card.history}
          yr1={card.yr1}
          yr3={card.yr3}
          yr5={card.yr5}
        />
      ))}
    </div>
  );
};

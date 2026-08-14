import React, { useState } from 'react';

interface AgentScore {
  name: string;
  philosophy: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface RadarInvestorChartProps {
  agents: Record<string, { signal: 'bullish' | 'bearish' | 'neutral'; confidence?: number }>;
  symbol?: string;
  size?: number;
}

export const RadarInvestorChart: React.FC<RadarInvestorChartProps> = ({
  agents,
  symbol = 'EQUITY',
  size = 320,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const agentMeta: { key: string; name: string; philosophy: string }[] = [
    { key: 'warrenBuffett', name: 'Buffett', philosophy: 'Economic Moats & FCF' },
    { key: 'charlieMunger', name: 'Munger', philosophy: 'High ROIC & Quality' },
    { key: 'benGraham', name: 'Graham', philosophy: 'Net-Net & Margin of Safety' },
    { key: 'philFisher', name: 'Fisher', philosophy: 'Scuttlebutt & Growth' },
    { key: 'stanDruckenmiller', name: 'Druckenmiller', philosophy: 'Macro Momentum & Catalysts' },
    { key: 'billAckman', name: 'Ackman', philosophy: 'Concentrated Activism' },
    { key: 'cathieWood', name: 'Wood', philosophy: 'Disruptive Innovation & TAM' },
  ];

  const agentData: AgentScore[] = agentMeta.map((meta) => {
    const raw = agents[meta.key];
    const signal = raw?.signal || 'neutral';
    const confidence = typeof raw?.confidence === 'number' ? raw.confidence : 0.6;
    return {
      name: meta.name,
      philosophy: meta.philosophy,
      signal,
      confidence,
    };
  });

  const center = size / 2;
  const radius = size * 0.36;
  const numAxes = agentData.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Convert signal + confidence into normalized radius score (0.15 to 1.0)
  const getNormalizedScore = (item: AgentScore) => {
    let base = 0.5;
    if (item.signal === 'bullish') base = 0.85;
    if (item.signal === 'bearish') base = 0.25;
    const adjusted = base * (0.8 + item.confidence * 0.4);
    return Math.max(0.15, Math.min(adjusted, 1.0));
  };

  // Polygon vertices
  const polygonPoints = agentData.map((item, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const score = getNormalizedScore(item);
    const r = radius * score;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, score, angle };
  });

  const polygonPath = polygonPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '') + ' Z';

  // Concentric background rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background concentric rings */}
        {rings.map((ringScale, idx) => (
          <polygon
            key={idx}
            points={agentData
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = radius * ringScale;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(' ')}
            fill={idx === rings.length - 1 ? '#090D15' : 'transparent'}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={1}
            strokeDasharray={idx < 3 ? '3 3' : 'none'}
          />
        ))}

        {/* Radial axis lines */}
        {agentData.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={1}
            />
          );
        })}

        {/* Filled Radar Polygon */}
        <path
          d={polygonPath}
          fill="rgba(16, 185, 129, 0.18)"
          stroke="#10B981"
          strokeWidth={2}
          className="transition-all duration-500"
        />

        {/* Interactive Vertex Nodes */}
        {polygonPoints.map((pt, i) => {
          const item = agentData[i];
          const isHovered = hoveredIdx === i;
          const nodeColor =
            item.signal === 'bullish'
              ? '#10B981'
              : item.signal === 'bearish'
              ? '#F43F5E'
              : '#F59E0B';

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill={nodeColor}
                stroke="#06080D"
                strokeWidth={2}
                className="transition-all duration-200"
              />
              {isHovered && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={10}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth={1}
                  className="animate-ping"
                />
              )}
            </g>
          );
        })}

        {/* Outer Axis Labels */}
        {agentData.map((item, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = radius + 24;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);
          const isHovered = hoveredIdx === i;

          const signalBadgeColor =
            item.signal === 'bullish'
              ? '#10B981'
              : item.signal === 'bearish'
              ? '#F43F5E'
              : '#F59E0B';

          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`font-sans text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                isHovered ? 'fill-emerald-400 font-extrabold scale-105' : 'fill-slate-400'
              }`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {item.name}
            </text>
          );
        })}
      </svg>

      {/* Interactive Tooltip Card at Center/Bottom */}
      {hoveredIdx !== null ? (
        <div className="mt-2 text-center px-3 py-1.5 rounded-lg bg-[#141A26] border border-slate-700/80 shadow-lg text-xs animate-fade-in max-w-[260px]">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-200">
            <span>{agentData[hoveredIdx].name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                agentData[hoveredIdx].signal === 'bullish'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : agentData[hoveredIdx].signal === 'bearish'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {agentData[hoveredIdx].signal}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{agentData[hoveredIdx].philosophy}</p>
        </div>
      ) : (
        <div className="mt-2 text-center text-[11px] text-slate-500 font-mono">
          Hover over agents to view philosophy breakdown
        </div>
      )}
    </div>
  );
};

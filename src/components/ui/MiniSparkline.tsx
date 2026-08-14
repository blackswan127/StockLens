import React, { useId } from 'react';

interface MiniSparklineProps {
  data?: number[];
  isUp?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showGradient?: boolean;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data = [],
  isUp = true,
  width = 64,
  height = 24,
  strokeWidth = 1.5,
  showGradient = true,
  className = '',
}) => {
  const gradientId = useId();

  // If insufficient points, generate pseudo-points based on isUp
  const points =
    data && data.length >= 2
      ? data
      : isUp
      ? [10, 12, 11, 14, 13, 17, 16, 20]
      : [20, 18, 19, 15, 16, 12, 13, 10];

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 2;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const coords = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * innerWidth;
    const y = height - padding - ((val - min) / range) * innerHeight;
    return { x, y };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  const strokeColor = isUp ? '#10B981' : '#F43F5E';
  const fillColor = isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {showGradient && <path d={areaD} fill={`url(#${gradientId})`} />}

      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={2}
          fill={strokeColor}
          className="animate-pulse"
        />
      )}
    </svg>
  );
};

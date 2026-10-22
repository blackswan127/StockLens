import React from 'react';

interface ShareholdingDonutProps {
  promoters: number;
  dii: number;
  fii: number;
  publicPct: number;
}

export const ShareholdingDonut: React.FC<ShareholdingDonutProps> = ({
  promoters,
  dii,
  fii,
  publicPct,
}) => {
  const r = 35;
  const strokeWidth = 16;
  const circ = 2 * Math.PI * r;

  const pLen = (promoters / 100) * circ;
  const dLen = (dii / 100) * circ;
  const fLen = (fii / 100) * circ;
  const pubLen = (publicPct / 100) * circ;

  const pOffset = 0;
  const dOffset = pLen;
  const fOffset = pLen + dLen;
  const pubOffset = pLen + dLen + fLen;

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 100 100"
      className="transform -rotate-90"
      role="img"
      aria-label={`Shareholding split: promoters ${promoters}%, DII ${dii}%, FII ${fii}%, public ${publicPct}%`}
    >
      <title>Shareholding pattern donut chart</title>
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="transparent"
        stroke="#059669"
        strokeWidth={strokeWidth}
        strokeDasharray={`${pLen} ${circ - pLen}`}
        strokeDashoffset={-pOffset}
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="transparent"
        stroke="#0EA5E9"
        strokeWidth={strokeWidth}
        strokeDasharray={`${dLen} ${circ - dLen}`}
        strokeDashoffset={-dOffset}
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="transparent"
        stroke="#6366F1"
        strokeWidth={strokeWidth}
        strokeDasharray={`${fLen} ${circ - fLen}`}
        strokeDashoffset={-fOffset}
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="transparent"
        stroke="#CBD5E1"
        strokeWidth={strokeWidth}
        strokeDasharray={`${pubLen} ${circ - pubLen}`}
        strokeDashoffset={-pubOffset}
      />
      <circle cx="50" cy="50" r={r - strokeWidth / 2} fill="#FFFFFF" />
    </svg>
  );
};

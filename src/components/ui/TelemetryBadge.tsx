import React from 'react';

export type TelemetryVariant = 'emerald' | 'rose' | 'amber' | 'indigo' | 'violet' | 'slate';

interface TelemetryBadgeProps {
  variant?: TelemetryVariant;
  label: React.ReactNode;
  pulse?: boolean;
  icon?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const TelemetryBadge: React.FC<TelemetryBadgeProps> = ({
  variant = 'emerald',
  label,
  pulse = false,
  icon,
  size = 'sm',
  className = '',
}) => {
  const variantStyles: Record<TelemetryVariant, { badge: string; dot: string }> = {
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400 shadow-emerald-500/50',
    },
    rose: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400 shadow-rose-500/50',
    },
    amber: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400 shadow-amber-500/50',
    },
    indigo: {
      badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      dot: 'bg-indigo-400 shadow-indigo-500/50',
    },
    violet: {
      badge: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
      dot: 'bg-violet-400 shadow-violet-500/50',
    },
    slate: {
      badge: 'bg-slate-800 text-slate-400 border-slate-700',
      dot: 'bg-slate-500 shadow-slate-600/50',
    },
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  };

  const currentVariant = variantStyles[variant] || variantStyles.emerald;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-medium tracking-wide shrink-0 ${currentVariant.badge} ${sizeStyles[size]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentVariant.dot}`}
          />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${currentVariant.dot}`} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
};

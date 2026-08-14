import React, { useState } from 'react';

interface TerminalCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  glow?: boolean;
  noPadding?: boolean;
}

export const TerminalCard: React.FC<TerminalCardProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = '',
  headerClassName = '',
  glow = false,
  noPadding = false,
}) => {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl border border-slate-800/80 bg-[#0D111A]/95 text-slate-100 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-slate-700/80 hover:shadow-2xl hover:shadow-emerald-950/10 overflow-hidden ${
        glow ? 'border-emerald-500/30 shadow-emerald-950/20' : ''
      } ${className}`}
    >
      {/* Subtle mouse spotlight glow */}
      {mousePos && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.06), transparent 80%)`,
          }}
        />
      )}

      {/* Top subtle highlight gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />

      {/* Card Header (if title or icon provided) */}
      {(title || icon || badge || actions) && (
        <div
          className={`flex items-center justify-between border-b border-slate-800/70 px-5 py-3.5 ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="text-emerald-400 shrink-0">{icon}</div>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-sans font-bold text-sm text-slate-100 tracking-tight truncate flex items-center gap-2">
                  {title}
                  {badge}
                </h3>
              )}
              {subtitle && (
                <p className="font-mono text-[11px] text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Card Content Body */}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};

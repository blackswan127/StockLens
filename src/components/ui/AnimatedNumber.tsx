import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 500,
  className = '',
  formatFn,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(typeof value === 'number' ? value : 0);
  const prevValueRef = useRef<number>(typeof value === 'number' ? value : 0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) return;

    const startVal = prevValueRef.current;
    const endVal = value;
    const startTime = performance.now();

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const updateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animRef.current = requestAnimationFrame(updateValue);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, duration]);

  if (value === null || value === undefined || isNaN(value)) {
    return <span className={`font-mono text-slate-500 ${className}`}>—</span>;
  }

  const formattedNumber = formatFn
    ? formatFn(displayValue)
    : displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span className={`font-mono tabular-nums inline-flex items-center ${className}`}>
      {prefix && <span>{prefix}</span>}
      <span>{formattedNumber}</span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

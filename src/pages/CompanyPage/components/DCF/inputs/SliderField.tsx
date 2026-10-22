import type { FC } from 'react';
import { HelpCircle } from 'lucide-react';

interface SliderFieldProps {
  id: string;
  labelText: string;
  helpTitle?: string;
  autoLabel?: string;
  min: number;
  max: number;
  step: number;
  rangeValue: number;
  numberValue: number | string;
  unit: string;
  unitClassName?: string;
  onRangeChange: (rawValue: string) => void;
  onNumberChange: (rawValue: string) => void;
}

export const SliderField: FC<SliderFieldProps> = ({
  id,
  labelText,
  helpTitle,
  autoLabel,
  min,
  max,
  step,
  rangeValue,
  numberValue,
  unit,
  unitClassName,
  onRangeChange,
  onNumberChange,
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <span
        id={`${id}-label`}
        className="font-semibold text-slate-600 flex items-center gap-1"
      >
        {labelText}
        {helpTitle && (
          <span className="text-slate-400 cursor-help" title={helpTitle}>
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      {autoLabel && <span className="font-mono text-slate-500 text-[11px]">{autoLabel}</span>}
    </div>
    <div className="flex items-center gap-3">
      <input
        type="range"
        aria-label={`${labelText} slider`}
        min={min}
        max={max}
        step={step}
        value={rangeValue}
        onChange={(event) => onRangeChange(event.target.value)}
        className="flex-1 accent-[#059669] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
      />
      <input
        id={id}
        type="number"
        aria-labelledby={`${id}-label`}
        value={numberValue}
        onChange={(event) => onNumberChange(event.target.value)}
        className="w-16 px-1.5 py-1 bg-white border border-[#E5E8EF] rounded text-right text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700"
      />
      <span className={`text-xs text-slate-400 font-semibold ${unitClassName ?? ''}`}>{unit}</span>
    </div>
  </div>
);

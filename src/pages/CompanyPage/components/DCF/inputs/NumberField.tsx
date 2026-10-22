import type { FC } from 'react';
import { HelpCircle } from 'lucide-react';
import { ProvenanceTooltip } from '../ProvenanceTooltip.js';
import type { ProvenanceData } from './types.js';

export const WACC_INPUT_CLASS =
  'w-full px-2.5 py-1.5 bg-white border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:border-[#059669] text-slate-700';
export const FINANCE_INPUT_CLASS =
  'w-full px-2.5 py-1.5 bg-slate-50 border border-[#E5E8EF] rounded-lg text-xs font-mono focus:outline-none focus:bg-white text-slate-700';

interface NumberFieldProps {
  id: string;
  labelText: string;
  value: number | string;
  step?: string;
  min?: number;
  onChange: (rawValue: string) => void;
  provenanceData?: ProvenanceData;
  helpTitle?: string;
  helperText?: string;
  inputClassName?: string;
}

export const NumberField: FC<NumberFieldProps> = ({
  id,
  labelText,
  value,
  step,
  min,
  onChange,
  provenanceData,
  helpTitle,
  helperText,
  inputClassName,
}) => (
  <div className="space-y-1">
    <div className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
      <span id={`${id}-label`}>{labelText}</span>
      {provenanceData ? (
        <ProvenanceTooltip provenanceData={provenanceData} />
      ) : helpTitle ? (
        <span className="text-slate-400 cursor-help" title={helpTitle}>
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
    <input
      id={id}
      type="number"
      aria-labelledby={`${id}-label`}
      step={step}
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClassName ?? WACC_INPUT_CLASS}
    />
    {helperText && (
      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
        {helperText}
      </span>
    )}
  </div>
);

import type { FC } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import type { DCFResult } from '../../../../utils/dcfCalculator.js';
import type { DcfGuardrails } from '../../hooks/dcfGuardrails.js';

interface DcfWarningsProps {
  guardrails: DcfGuardrails;
  dcfResult: DCFResult | null;
  taxRate: number;
  onAcknowledgeFinancial: () => void;
}

export const DcfWarnings: FC<DcfWarningsProps> = ({
  guardrails,
  dcfResult,
  taxRate,
  onAcknowledgeFinancial,
}) => (
  <div className="space-y-2">
    {guardrails.isNegativeFcf && (
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Negative Cash Flow: </span>
          This company has negative historical free cash flow. Intrinsic calculations may be
          unreliable or turn negative. Consider custom modeling below.
        </div>
      </div>
    )}

    {guardrails.needsFinancialAcknowledgement && (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2.5 text-xs text-red-900">
        <div className="flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Financial sector stock blocked: </span>
            DCF calculations are fundamentally flawed for financial institutions (banks, insurers)
            because debt is raw material, not capital. Proceeding will likely yield nonsensical
            valuations.
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAcknowledgeFinancial();
          }}
          className="self-end px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold transition cursor-pointer"
        >
          I understand, proceed anyway
        </button>
      </div>
    )}

    {guardrails.isRevenueZero && (
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Zero Revenue Warning: </span>
          Latest revenue is set to zero. Projections will result in a $0 fair value. Please enter a
          valid revenue value below.
        </div>
      </div>
    )}

    {guardrails.isTaxRateAtypical && (
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
        <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Atypical Tax Rate: </span>
          Effective tax rate is atypical ({(taxRate * 100).toFixed(1)}%). Standard statutory rates
          (e.g. 21% for US, 25% for India) are recommended for cost of debt.
        </div>
      </div>
    )}

    {guardrails.isWaccLow && dcfResult && (
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Atypical WACC (Floor): </span>
          WACC is exceptionally low ({(dcfResult.wacc * 100).toFixed(2)}%). This can lead to
          excessively high/unrealistic valuations.
        </div>
      </div>
    )}

    {guardrails.isWaccHigh && dcfResult && (
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Atypical WACC (Ceiling): </span>
          WACC is exceptionally high ({(dcfResult.wacc * 100).toFixed(2)}%). This heavily discounts
          future cash flows and may undervalue the business.
        </div>
      </div>
    )}
  </div>
);

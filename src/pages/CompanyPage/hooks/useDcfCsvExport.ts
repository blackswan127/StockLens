import { useCallback } from 'react';
import type { DCFResult } from '../../../utils/dcfCalculator.js';
import type { DCFData } from './useDCFData.js';
import type { DcfInputState } from '../components/DCF/dcfTypes.js';

export interface DcfCsvExportParams {
  symbol: string;
  data: DCFData;
  inputs: DcfInputState;
  dcfResult: DCFResult;
}

export function buildDcfCsv(
  { symbol, data, inputs, dcfResult }: DcfCsvExportParams,
  generatedAt: Date = new Date()
): string {
  let csvContent = `data:text/csv;charset=utf-8,`;
  csvContent += `Discounted Cash Flow (DCF) Model Export - ${symbol} (${data.companyName})\r\n`;
  csvContent += `Generated On,${generatedAt.toLocaleString()}\r\n`;
  csvContent += `Current Stock Price,${data.currentPrice}\r\n`;
  csvContent += `DCF Fair Value per Share,${dcfResult.fairValuePerShare.toFixed(2)}\r\n`;
  csvContent += `Valuation Gap,${dcfResult.upsidePercent.toFixed(2)}%\r\n\r\n`;

  csvContent += `1. Assumptions\r\n`;
  csvContent += `Assumption,Value\r\n`;
  csvContent += `Revenue Growth Rate (Base),${(inputs.revenueGrowth * 100).toFixed(2)}%\r\n`;
  csvContent += `FCF Margin (Initial),${(inputs.fcfMargin * 100).toFixed(2)}%\r\n`;
  csvContent += `FCF Margin (Target Year N),${(inputs.targetFcfMargin * 100).toFixed(2)}%\r\n`;
  csvContent += `Projection Years,${inputs.projectionYears}\r\n`;
  csvContent += `Terminal Growth Rate (g),${(inputs.terminalGrowth * 100).toFixed(2)}%\r\n`;
  csvContent += `Risk-Free Rate,${(inputs.riskFreeRate * 100).toFixed(2)}%\r\n`;
  csvContent += `Equity Risk Premium (ERP),${(inputs.equityRiskPremium * 100).toFixed(2)}%\r\n`;
  csvContent += `Beta,${inputs.beta.toFixed(2)}\r\n`;
  csvContent += `Cost of Debt (after tax),${(inputs.costOfDebt * (1 - inputs.taxRate) * 100).toFixed(2)}%\r\n`;
  csvContent += `Effective Tax Rate,${(inputs.taxRate * 100).toFixed(2)}%\r\n`;
  csvContent += `Mid-Year Discounting,${inputs.midYearConvention ? 'Yes' : 'No'}\r\n`;
  csvContent += `Shares Outstanding,${inputs.sharesOutstanding}\r\n`;
  csvContent += `Total Debt,${inputs.totalDebt}\r\n`;
  csvContent += `Cash & Equivalents,${inputs.cashAndEquivalents}\r\n\r\n`;

  csvContent += `2. Year-by-Year Cash Flow Projections\r\n`;
  csvContent += `Year,Projected Revenue,Revenue Growth,FCF Margin,Free Cash Flow,Discounted FCF\r\n`;
  dcfResult.projectedYears.forEach((year) => {
    csvContent += `${year.year},${year.revenue.toFixed(0)},${(year.growthRate * 100).toFixed(2)}%,${(year.fcfMargin * 100).toFixed(2)}%,${year.fcf.toFixed(0)},${year.discountedFcf.toFixed(0)}\r\n`;
  });
  csvContent += `Terminal Value (TV),,,,${dcfResult.terminalValue.toFixed(0)},${dcfResult.pvTerminalValue.toFixed(0)}\r\n\r\n`;

  csvContent += `3. Valuation Valuation Bridge\r\n`;
  csvContent += `Item,Value\r\n`;
  csvContent += `PV of Projected Cash Flows,${dcfResult.pvFcfSum.toFixed(0)}\r\n`;
  csvContent += `PV of Terminal Value,${dcfResult.pvTerminalValue.toFixed(0)}\r\n`;
  csvContent += `Enterprise Value (EV),${dcfResult.enterpriseValue.toFixed(0)}\r\n`;
  csvContent += `Cash & Equivalents (+),${inputs.cashAndEquivalents.toFixed(0)}\r\n`;
  csvContent += `Total Debt (-),${inputs.totalDebt.toFixed(0)}\r\n`;
  csvContent += `Net Debt,${dcfResult.netDebt.toFixed(0)}\r\n`;
  csvContent += `Equity Value,${dcfResult.equityValue.toFixed(0)}\r\n`;
  csvContent += `Shares Outstanding,${inputs.sharesOutstanding}\r\n`;
  csvContent += `Intrinsic Fair Value per Share,${dcfResult.fairValuePerShare.toFixed(2)}\r\n`;

  return csvContent;
}

export function downloadDcfCsv(csvContent: string, symbol: string): void {
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DCF_Model_${symbol}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function useDcfCsvExport(
  symbol: string,
  data: DCFData | null | undefined,
  inputs: DcfInputState,
  dcfResult: DCFResult | null
): () => void {
  return useCallback(() => {
    if (!dcfResult || !data) return;
    const csvContent = buildDcfCsv({ symbol, data, inputs, dcfResult });
    downloadDcfCsv(csvContent, symbol);
  }, [symbol, data, inputs, dcfResult]);
}

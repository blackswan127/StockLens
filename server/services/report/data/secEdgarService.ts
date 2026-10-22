import {
  edgarService,
  EdgarSectionResponse,
  EdgarRiskDiffResponse,
  EdgarProxyStatement
} from '../../edgar.js';
import { cleanSecContent } from '../../edgarParsing.js';

export interface SecData {
  businessDescription: string;
  riskFactors: string;
  riskDiff?: EdgarRiskDiffResponse | null;
  proxyStatement?: EdgarProxyStatement | null;
  congressionalTrades?: unknown[];
}

export async function fetchSecData(ticker: string): Promise<SecData> {
  const sym = ticker.toUpperCase();
  let businessDescription = 'Not available';
  let riskFactors = 'Not available';
  let riskDiff: EdgarRiskDiffResponse | null = null;
  let proxyStatement: EdgarProxyStatement | null = null;

  try {
    const businessSection = await edgarService.getSection(sym, '1');
    const riskSection = await edgarService.getSection(sym, '1A');

    const formatSection = (data: EdgarSectionResponse | null | undefined): string => {
      if (!data || !data.paragraphs || data.paragraphs.length === 0) {
        return 'Not available for this ticker.';
      }
      
      // Filter out likely headers, footers, table of contents artifacts, and placeholder strings
      const cleanParagraphs = data.paragraphs
        .map((p: string) => cleanSecContent(p))
        .filter((trimmed: string) => {
          if (!trimmed) return false;
          // Skip short numeric strings (like page numbers "3." or "12")
          if (/^\d+\.?$/.test(trimmed)) return false;
          // Skip placeholder strings
          if (trimmed.startsWith('[Section Not Applicable') || trimmed.includes('[...Truncated due to length...]')) return false;
          // Skip table of contents artifacts
          if (trimmed.toLowerCase().includes('table of contents') && trimmed.length < 120) return false;
          if (trimmed.toLowerCase().includes('index to') && trimmed.length < 120) return false;
          // Skip short headers with pipes or specific separator symbols
          if (trimmed.includes('|') && trimmed.length < 100) return false;
          // Skip boilerplate Item headers
          if (/^item\s+(1|1a|7)\.?\s*$/i.test(trimmed)) return false;
          if (/^(part\s+[i|v|x]+|item\s+\d+)/i.test(trimmed) && trimmed.length < 40) return false;
          return true;
        });

      if (cleanParagraphs.length === 0) return 'Not available for this ticker.';

      const text = cleanParagraphs.join('\n\n');
      if (text.length <= 2500) return text;
      
      const truncated = text.substring(0, 2500);
      const lastPeriod = truncated.lastIndexOf('.');
      if (lastPeriod > 2000) {
        return truncated.substring(0, lastPeriod + 1) + ' [continued in full 10-K filing]';
      }
      return truncated + '... [continued in full 10-K filing]';
    };

    businessDescription = formatSection(businessSection);
    riskFactors = formatSection(riskSection);
  } catch (error) {
    console.error(`[SEC Service] Error fetching SEC 10-K sections for ${sym}:`, error);
  }

  try {
    riskDiff = await edgarService.getRiskDiff(sym);
  } catch (error) {
    console.error(`[SEC Service] Error fetching SEC Risk Diff for ${sym}:`, error);
  }

  try {
    proxyStatement = await edgarService.getProxyStatement(sym);
  } catch (error) {
    console.error(`[SEC Service] Error fetching SEC Proxy Statement for ${sym}:`, error);
  }

  return {
    businessDescription,
    riskFactors,
    riskDiff,
    proxyStatement
  };
}

import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager } from '../../llm/keyManager.js';
import { ComputedMetrics } from './ratios.js';

export async function generateAnalystNote(
  ticker: string,
  companyName: string,
  sector: string,
  industry: string,
  metrics: ComputedMetrics,
  riskFactors: string,
  hedgeFundSignals: string[]
): Promise<string> {
  const apiKey = geminiKeyManager.getNextKey();
  if (!apiKey) {
    console.warn('No Gemini API key available for analyst note generation.');
    return '';
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a senior equity research analyst at a top-tier investment bank.
Write a concise, professional 3-paragraph "Analyst Thesis" or "Executive Summary" for the company ${companyName} (${ticker}).
Tone: Objective, institutional, analytical. No fluff.

Company Context:
- Sector: ${sector}
- Industry: ${industry}

Financial Snapshot:
- Gross Margin: ${metrics.grossMargin !== null ? metrics.grossMargin.toFixed(1) + '%' : 'N/A'}
- Operating Margin: ${metrics.operatingMargin !== null ? metrics.operatingMargin.toFixed(1) + '%' : 'N/A'}
- Net Margin: ${metrics.netMargin !== null ? metrics.netMargin.toFixed(1) + '%' : 'N/A'}
- Current Ratio: ${metrics.currentRatio !== null ? metrics.currentRatio.toFixed(2) + 'x' : 'N/A'}
- Debt to Equity: ${metrics.debtToEquity !== null ? metrics.debtToEquity.toFixed(2) + 'x' : 'N/A'}
- Return on Equity (ROE): ${metrics.returnOnEquity !== null ? metrics.returnOnEquity.toFixed(1) + '%' : 'N/A'}

Recent Risk Factors (from SEC 10-K):
${riskFactors.length > 800 ? riskFactors.substring(0, 800) + '...' : riskFactors}

Quantitative Agent Signals (Hedge Fund Engine):
${hedgeFundSignals.length > 0 ? hedgeFundSignals.join('\\n') : 'No recent quantitative signals available.'}

Instructions:
1. Paragraph 1: Company overview and core business drivers based on its sector/industry.
2. Paragraph 2: Financial health and profitability analysis, incorporating the provided margins and ratios.
3. Paragraph 3: Risk assessment and final thesis, synthesizing the SEC risks and the quantitative agent signals.
Do not use markdown headers or bullet points. Output only the 3 paragraphs.
`;

  // Priority list starting with Gemini 3.5 Flash Lite
  const envModel = process.env.GEMINI_MODEL;
  const modelsToTry = Array.from(new Set([
    ...(envModel ? [envModel] : []),
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ]));
  
  for (let i = 0; i < geminiKeyManager.getKeyCount(); i++) {
    const currentKey = i === 0 ? apiKey : geminiKeyManager.getNextKey();
    const currentAi = i === 0 ? ai : new GoogleGenAI({ apiKey: currentKey });
    
    for (const model of modelsToTry) {
      try {
        const response = await currentAi.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            temperature: 0.2, // Low temperature for analytical consistency
          }
        });
        
        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        console.error(`[Analyst Note] Error with model ${model} and key ${currentKey.substring(0, 6)}...: ${error?.message}`);
        // If it's just a model not found error, we try the fallback model immediately
        if (error?.message?.includes('not found') || error?.message?.includes('Invalid model')) {
           continue; 
        }
        // For rate limits / quota issues, we break to the outer loop to try the next API key
        if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('exhausted')) {
           break;
        }
      }
    }
  }

  return ''; // Return empty string so the static template fallback takes over
}

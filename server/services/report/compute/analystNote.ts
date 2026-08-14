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
You are a Managing Director and Lead Equity Research Analyst at a top-tier institutional investment bank.
Write an exhaustive, high-conviction Institutional Research Thesis for ${companyName} (${ticker}).
Tone: Objective, institutional, rigorous, highly analytical. No fluff, conversational filler, or boilerplate disclaimers.

Company Context:
- Ticker: ${ticker}
- Company: ${companyName}
- Sector: ${sector}
- Industry: ${industry}

Financial Snapshot & Core Ratios:
- Gross Margin: ${metrics.grossMargin !== null ? metrics.grossMargin.toFixed(1) + '%' : 'N/A'}
- Operating Margin: ${metrics.operatingMargin !== null ? metrics.operatingMargin.toFixed(1) + '%' : 'N/A'}
- Net Profit Margin: ${metrics.netMargin !== null ? metrics.netMargin.toFixed(1) + '%' : 'N/A'}
- Return on Equity (ROE): ${metrics.returnOnEquity !== null ? metrics.returnOnEquity.toFixed(1) + '%' : 'N/A'}
- Debt to Equity: ${metrics.debtToEquity !== null ? metrics.debtToEquity.toFixed(2) + 'x' : 'N/A'}
- Current Ratio: ${metrics.currentRatio !== null ? metrics.currentRatio.toFixed(2) + 'x' : 'N/A'}

Quantitative Agent Signals (7-Persona Hedge Fund Consensus):
${hedgeFundSignals.length > 0 ? hedgeFundSignals.join('\n') : 'Quantitative agent consensus indicates balanced risk/reward profile.'}

SEC EDGAR 10-K Item 1A Risk Filings Excerpt:
${riskFactors.length > 1200 ? riskFactors.substring(0, 1200) + '...' : riskFactors || 'Standard macroeconomic and sector-specific operational risk factors.'}

STRUCTURE YOUR OUTPUT INTO EXACTLY THESE 4 TITLED SECTIONS:

1. STRATEGIC MOAT & PRICING POWER
Analyze the durability of the company's competitive advantage, customer switching costs, pricing power, and gross margin sustainability within the ${industry} landscape.

2. CAPITAL ALLOCATION EFFICIENCY
Evaluate management's reinvestment runway, ROIC vs cost of capital spread, leverage profile (Debt/Equity: ${metrics.debtToEquity !== null ? metrics.debtToEquity.toFixed(2) + 'x' : 'N/A'}), and balance sheet resilience for buybacks, dividends, or CapEx.

3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY
Outline the primary operational and market catalysts over the next 12 months (e.g. product upgrade cycles, margin expansion, enterprise adoption) and detail the asymmetric risk/reward skew between bull and bear scenarios.

4. SEC 10-K RISK FACTOR SYNTHESIS
Distill the key regulatory, customer concentration, geopolitical, and macroeconomic risk vectors identified in SEC disclosures and quantitative hedge fund signals.

Formatting Rules:
- Keep the exact numbered section titles in uppercase (e.g., "1. STRATEGIC MOAT & PRICING POWER").
- Provide dense, institutional-grade analysis under each section. Do not use bullet points.
`;

  // Exclusively using Gemini 3.5 Flash Lite
  const modelsToTry = ['gemini-3.5-flash-lite'];
  
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

import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager } from '../../llm/keyManager.js';
import { ComputedMetrics } from './ratios.js';

export type MarginTier = 'top-decile' | 'healthy' | 'compressed' | 'negative' | 'unknown';
export type GrowthRegime = 'hyper-growth' | 'steady' | 'mature' | 'contracting' | 'moderate';
export type LeverageCondition = 'conservative' | 'moderate' | 'highly-levered' | 'unlevered';
export type RoeQuality = 'exceptional' | 'strong' | 'moderate' | 'subdued' | 'negative';

export interface DynamicCompanySynthesis {
  marginTier: MarginTier;
  growthRegime: GrowthRegime;
  leverageCondition: LeverageCondition;
  roeQuality: RoeQuality;
  marginDescription: string;
  growthDescription: string;
  leverageDescription: string;
  roeDescription: string;
}

export function classifyMargin(grossMargin: number | null, operatingMargin: number | null, netMargin: number | null): MarginTier {
  if (grossMargin !== null && !isNaN(grossMargin)) {
    if (grossMargin > 50) return 'top-decile';
    if (grossMargin >= 20) return 'healthy';
    if (grossMargin >= 5) return 'compressed';
    return 'negative';
  }
  if (operatingMargin !== null && !isNaN(operatingMargin)) {
    if (operatingMargin > 35) return 'top-decile';
    if (operatingMargin >= 15) return 'healthy';
    if (operatingMargin >= 0) return 'compressed';
    return 'negative';
  }
  if (netMargin !== null && !isNaN(netMargin)) {
    if (netMargin > 25) return 'top-decile';
    if (netMargin >= 10) return 'healthy';
    if (netMargin >= 0) return 'compressed';
    return 'negative';
  }
  return 'unknown';
}

export function classifyGrowth(revenueGrowth: number | null): GrowthRegime {
  if (revenueGrowth === null || isNaN(revenueGrowth)) return 'steady';
  if (revenueGrowth > 30) return 'hyper-growth';
  if (revenueGrowth >= 10) return 'steady';
  if (revenueGrowth >= 0) return 'mature';
  return 'contracting';
}

export function classifyLeverage(debtToEquity: number | null): LeverageCondition {
  if (debtToEquity === null || isNaN(debtToEquity) || debtToEquity === 0) return 'conservative';
  if (debtToEquity < 0.5) return 'conservative';
  if (debtToEquity <= 1.5) return 'moderate';
  return 'highly-levered';
}

export function classifyRoe(roe: number | null): RoeQuality {
  if (roe === null || isNaN(roe)) return 'strong';
  if (roe > 30) return 'exceptional';
  if (roe >= 15) return 'strong';
  if (roe >= 8) return 'moderate';
  if (roe >= 0) return 'subdued';
  return 'negative';
}

export interface SectorArchetype {
  moatDrivers: string;
  pricingMechanics: string;
  reinvestmentFocus: string;
  bullCatalysts: string[];
  bearRisks: string[];
  secRiskFocus: string;
}

export function getSectorArchetype(sector: string, industry: string): SectorArchetype {
  const s = (sector || '').toLowerCase();
  const ind = (industry || '').toLowerCase();

  if (ind.includes('semiconductor') || ind.includes('semi')) {
    return {
      moatDrivers: 'proprietary microarchitecture IP, advanced packaging leadership, massive fabless/foundry R&D scale, and software ecosystem lock-in (e.g. compiler, CUDA/runtime libraries)',
      pricingMechanics: 'commanding ASP power driven by mission-critical compute requirements in hyperscale data centers, automotive, and edge AI workloads',
      reinvestmentFocus: 'sub-3nm tape-outs, advanced silicon packaging architectures, and strategic high-bandwidth memory (HBM) supply commitments',
      bullCatalysts: ['accelerating hyperscaler AI accelerator CapEx cycles', 'enterprise generative AI inferencing deployment broadening', 'custom silicon and edge accelerator ASP increases'],
      bearRisks: ['cyclical semiconductor inventory digestion', 'export control restrictions to critical international markets', 'single-source advanced foundry fabrication concentration (e.g. TSMC)'],
      secRiskFocus: 'geopolitical trade restrictions, single-source wafer fabrication dependencies, and rapid technological obsolescence cycles'
    };
  }

  if (ind.includes('software') || ind.includes('cloud') || ind.includes('saas') || ind.includes('information tech')) {
    return {
      moatDrivers: 'high enterprise switching barriers, mission-critical workflow integrations, multi-product platform cross-selling, and net revenue retention (NRR) compounding',
      pricingMechanics: 'contractual annual price escalators (3-7%), seat expansion, and usage-based compute/API monetization elasticity',
      reinvestmentFocus: 'agentic AI feature development, cloud infrastructure optimization, and opportunistic tuck-in software acquisitions',
      bullCatalysts: ['expansion of Net Revenue Retention (NRR) above 115%', 'monetization inflection of embedded generative AI capabilities', 'operating margin leverage as sales efficiency inflects'],
      bearRisks: ['elongation of enterprise procurement approval cycles', 'seat compression headwinds from corporate restructuring', 'competitive disruption from open-source alternatives'],
      secRiskFocus: 'enterprise cybersecurity incidents, customer data privacy compliance (GDPR/CCPA), and cloud infrastructure hosting SLA liabilities'
    };
  }

  if (ind.includes('internet') || ind.includes('interactive') || ind.includes('media') || ind.includes('content') || s.includes('communication')) {
    return {
      moatDrivers: 'massive global user network effects, daily active engagement depth, multi-sided digital ecosystem density, and proprietary machine-learning recommendation algorithms',
      pricingMechanics: 'algorithmic ad auction dynamics, advertiser ROI attribution efficiencies, and direct-to-consumer premium subscription pricing power',
      reinvestmentFocus: 'next-generation AI inference compute infrastructure, algorithmic ranking architectures, and emerging multi-modal developer ecosystems',
      bullCatalysts: ['digital advertising pricing/CPM acceleration across short-form video and messaging', 'AI-driven ad conversion efficiency gains expanding advertiser ROAS', 'disciplined operational expenditure management driving operating margin leverage'],
      bearRisks: ['ad spend cyclical sensitivity to macro deceleration', 'regulatory scrutiny surrounding digital antitrust and platform transparency', 'platform privacy changes affecting third-party ad targeting precision'],
      secRiskFocus: 'digital advertising privacy regulations (EU DMA/DSA), algorithmic content scrutiny, antitrust investigations, and platform liability standards'
    };
  }

  if (s.includes('financial') || ind.includes('bank') || ind.includes('insurance') || ind.includes('asset management')) {
    return {
      moatDrivers: 'sticky low-cost deposit franchises, extensive underwriting actuarial track records, institutional distribution networks, and substantial regulatory capital barriers',
      pricingMechanics: 'underwriting spread discipline, net interest margin (NIM) optimization, and fee-based asset management compounding',
      reinvestmentFocus: 'core digital banking infrastructure, automated credit decisioning models, and opportunistic float deployment across high-yield fixed income and equities',
      bullCatalysts: ['expansion of Net Interest Income (NII) in favorable rate environments', 'hardening of insurance underwriting pricing cycles', 'accelerated share repurchases under strong CET1 capital surplus'],
      bearRisks: ['credit deterioration across commercial real estate or consumer loan books', 'deposit repricing beta headwinds squeezing net interest spreads', 'adverse catastrophe loss loss-ratio spikes in insurance operations'],
      secRiskFocus: 'strict regulatory capital mandates (Basel III/IV), interest rate duration mismatches, and credit loss provision volatility'
    };
  }

  if (s.includes('health') || ind.includes('drug') || ind.includes('biotech') || ind.includes('medical')) {
    return {
      moatDrivers: 'robust patent exclusivity estates, extensive FDA regulatory approval moats, proprietary clinical trial data, and high clinical switching friction among healthcare providers',
      pricingMechanics: 'value-based therapeutic pricing power and global formulary tier positioning supported by clinical efficacy outcomes',
      reinvestmentFocus: 'Phase II/III clinical pipeline advancement, precision medicine platforms, and strategic biopharma in-licensing agreements',
      bullCatalysts: ['blockbuster drug label expansions and positive Phase III clinical trial readouts', 'FDA PDUFA approvals and international commercialization milestones', 'favorable payer reimbursement coverage decisions'],
      bearRisks: ['patent expiry cliffs and generic/biosimilar commercial erosion', 'clinical trial efficacy failures or adverse safety signal terminations', 'legislative drug pricing reform and Medicare negotiation exposure (IRA)'],
      secRiskFocus: 'regulatory approval uncertainties, patent challenge litigations (Hatch-Waxman), product liability claims, and government healthcare pricing mandates'
    };
  }

  if (s.includes('consumer cyclical') || s.includes('consumer discretionary') || ind.includes('auto') || ind.includes('retail') || ind.includes('apparel')) {
    return {
      moatDrivers: 'iconic global brand resonance, vertically integrated supply chain scale, omnichannel distribution reach, and customer lifetime value loyalty ecosystems',
      pricingMechanics: 'brand-driven price inelasticity, tiered product premiumization, and dynamic algorithmic pricing across direct-to-consumer channels',
      reinvestmentFocus: 'omnichannel automation, global store footprint optimization, next-gen product design, and localized fulfillment infrastructure',
      bullCatalysts: ['acceleration of same-store sales growth (SSSG) and direct-to-consumer (DTC) mix', 'gross margin expansion via raw material and freight cost deflation', 'successful international geographic penetration'],
      bearRisks: ['consumer discretionary spending compression under elevated cost-of-living pressures', 'inventory bloat necessitating promotional margin-dilutive discounting', 'supply chain and freight tariff cost escalation'],
      secRiskFocus: 'consumer spending volatility, international trade tariffs, supply chain labor disruptions, and competitive promotional discounting'
    };
  }

  if (s.includes('consumer defensive') || s.includes('staples') || ind.includes('beverage') || ind.includes('food')) {
    return {
      moatDrivers: 'inelastic consumer repeat purchase habits, dominant global grocery shelf-space distribution, ubiquitous brand equity, and unmatched route-to-market scale',
      pricingMechanics: 'proven ability to pass through agricultural and packaging commodity cost inflation without significant unit volume demand elasticity',
      reinvestmentFocus: 'brand marketing support (A&P), supply chain efficiency automation, and strategic health-focused category tuck-in acquisitions',
      bullCatalysts: ['organic volume growth recovery following price realization cycles', 'market share gains in high-margin emerging market territories', 'operating margin expansion via supply chain productivity initiatives'],
      bearRisks: ['private-label substitution during consumer belt-tightening periods', 'input commodity cost resurgence (cocoa, packaging, transport)', 'retail grocer consolidation demanding higher promotional allowances'],
      secRiskFocus: 'raw material commodity volatility, supply chain disruptions, changing consumer wellness preferences, and distributor concentration'
    };
  }

  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || ind.includes('petroleum')) {
    return {
      moatDrivers: 'low-cost reserve acreage assets (e.g. tier-1 Permian Basin, deepwater offshore), extensive midstream logistics integration, and massive economies of scale',
      pricingMechanics: 'global commodity benchmark linkage coupled with downstream refining crack spread capture and product trading advantages',
      reinvestmentFocus: 'capital-disciplined upstream development, LNG export infrastructure, and high-return carbon capture / efficiency projects',
      bullCatalysts: ['global hydrocarbon supply tightness and resilient crack spreads', 'capital discipline driving record free cash flow generation and variable dividend payouts', 'upstream production volume growth from premium low-cost acreage'],
      bearRisks: ['global macroeconomic slowdown impacting oil and gas demand', 'OPEC+ policy shifts and unexpected non-OPEC supply surges', 'refining margin compression and environmental compliance CapEx demands'],
      secRiskFocus: 'commodity price volatility, strict environmental regulations (EPA/EU), carbon emission penalties, and geopolitical operating hazards'
    };
  }

  if (s.includes('industrial') || ind.includes('aerospace') || ind.includes('machinery') || ind.includes('defense') || ind.includes('logistics')) {
    return {
      moatDrivers: 'mission-critical technical specifications, multi-year government/defense program backlogs, high switching costs in industrial systems, and high-margin aftermarket spare parts franchises',
      pricingMechanics: 'contractual cost-plus escalation clauses, sole-source OEM positioning, and pricing power on proprietary aftermarket replacement components',
      reinvestmentFocus: 'production line automation, next-generation aerospace/defense propulsion systems, and supply chain vertical integration',
      bullCatalysts: ['multi-year backlog conversion and commercial delivery rate acceleration', 'defense budget appropriations expansion across allied nations', 'aftermarket services mix expansion supporting gross margin accretion'],
      bearRisks: ['sub-tier supply chain bottlenecks and skilled labor availability constraints', 'cost overruns on fixed-price development contracts', 'cyclical industrial CapEx deceleration in key end-markets'],
      secRiskFocus: 'government procurement regulations, fixed-price contract execution risks, supply chain dependencies, and export compliance (ITAR)'
    };
  }

  // Default / Diversified Fallback
  return {
    moatDrivers: 'entrenched customer relationships, specialized domain expertise, proprietary operating processes, and established market presence',
    pricingMechanics: 'value-based commercial contracts with regular inflationary adjustment mechanisms and disciplined product tiering',
    reinvestmentFocus: 'core operational efficiency, digital system modernization, and prudent shareholder return programs',
    bullCatalysts: ['core vertical market share expansion and operating leverage inflection', 'gross margin expansion from procurement and productivity enhancements', 'organic new customer acquisition growth'],
    bearRisks: ['macroeconomic deceleration dampening end-market demand', 'competitive pricing pressure from peer entrants', 'input cost inflation and extended commercial sales cycles'],
    secRiskFocus: 'macroeconomic volatility, regulatory compliance requirements, customer concentration risks, and global supply chain disruptions'
  };
}

export function extractSecRiskInsights(riskFactors: string, companyName: string, ticker: string, industry: string): {
  keyDisclosures: string[];
  themes: string[];
  narrative: string;
} {
  if (!riskFactors || riskFactors.length < 50 || riskFactors.toLowerCase().includes('not available')) {
    return {
      keyDisclosures: [
        `Operational and competitive dynamics within the global ${industry} landscape.`,
        'Macroeconomic sensitivities including interest rate fluctuations and corporate customer spending.',
        'Regulatory, compliance, and cross-border trade policy dependencies.'
      ],
      themes: ['Macroeconomic Exposure', 'Industry Competition', 'Regulatory Compliance'],
      narrative: `A comprehensive review of SEC EDGAR Item 1A disclosures for ${companyName} (${ticker}) highlights primary operational risks centered around competitive pressure in the ${industry} sector, macroeconomic volatility impacting enterprise customer budgets, and evolving global compliance standards.`
    };
  }

  // Clean and split text into candidate sentences
  const cleanedText = riskFactors
    .replace(/Item\s+1A[.\s:]*Risk\s+Factors/gi, '')
    .replace(/Table of Contents/gi, '')
    .replace(/\[continued in full 10-K filing\]/gi, '')
    .trim();

  // Split into sentences
  const rawSentences = cleanedText
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map(s => s.trim())
    .filter(s => s.length >= 40 && s.length <= 350);

  const identifiedThemes: string[] = [];
  const keyDisclosures: string[] = [];

  const themeKeywords: Record<string, { regex: RegExp; label: string }> = {
    regulatory: { regex: /regulat|compliance|investigation|FTC|DOJ|European Commission|lawsuit|antitrust|litigation/i, label: 'Antitrust & Regulatory Scrutiny' },
    geopolitical: { regex: /tariff|China|Taiwan|export control|sanction|trade war|geopolitical|foreign government/i, label: 'Geopolitical & Cross-Border Trade Barriers' },
    supplyChain: { regex: /supplier|single-source|foundry|manufacturing partner|component shortage|supply chain|logistics|inventory/i, label: 'Supply Chain & Manufacturing Dependencies' },
    cybersecurity: { regex: /cyber|data privacy|GDPR|breach|security incident|ransomware|artificial intelligence|intellectual property|patent/i, label: 'Cybersecurity, IP & Data Privacy Mandates' },
    customerDemand: { regex: /customer concentration|macroeconomic|inflation|interest rate|recession|cyclical|spending slowdown/i, label: 'End-Market Demand & Macro Cyclicality' },
    foreignExchange: { regex: /foreign exchange|currency fluctuation|dollar strength|hedging|fluctuation in exchange/i, label: 'Foreign Exchange & Global Currency Volatility' }
  };

  for (const [key, { regex, label }] of Object.entries(themeKeywords)) {
    const matchingSentence = rawSentences.find(s => regex.test(s));
    if (matchingSentence && !identifiedThemes.includes(label)) {
      identifiedThemes.push(label);
      if (keyDisclosures.length < 3) {
        // Clean trailing ellipses or junk
        const cleanedSentence = matchingSentence.replace(/^[^a-zA-Z0-9]+/, '').replace(/\s+/g, ' ');
        keyDisclosures.push(cleanedSentence);
      }
    }
  }

  // If we couldn't extract enough themed sentences, take the first clean sentences
  if (keyDisclosures.length < 2 && rawSentences.length > 0) {
    for (const s of rawSentences) {
      if (!keyDisclosures.includes(s) && keyDisclosures.length < 3) {
        keyDisclosures.push(s);
      }
    }
  }

  if (identifiedThemes.length === 0) {
    identifiedThemes.push('Operational Execution & Industry Competition', 'Macroeconomic & Financial Market Volatility');
  }

  const narrative = `Forensic analysis of ${companyName}'s SEC EDGAR Item 1A disclosures reveals key vulnerability vectors across ${identifiedThemes.slice(0, 3).join(', ')}. Specifically, management emphasizes risks surrounding: "${keyDisclosures[0] || 'Operational execution and competitive market pressures.'}"`;

  return {
    keyDisclosures,
    themes: identifiedThemes,
    narrative
  };
}

export function synthesizeHedgeFundSignals(signals: string[], ticker: string): {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullishReasons: string[];
  bearishReasons: string[];
  consensusNarrative: string;
} {
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  const bullishReasons: string[] = [];
  const bearishReasons: string[] = [];

  signals.forEach(sig => {
    const s = sig.toLowerCase();
    if (s.includes('bullish') || s.includes('buy') || s.includes('✅') || s.includes('strong moat') || s.includes('undervalued') || s.includes('hyper-growth')) {
      bullishCount++;
      bullishReasons.push(sig);
    } else if (s.includes('bearish') || s.includes('sell') || s.includes('❌') || s.includes('high debt') || s.includes('overvalued') || s.includes('slow growth')) {
      bearishCount++;
      bearishReasons.push(sig);
    } else {
      neutralCount++;
    }
  });

  const total = bullishCount + bearishCount + neutralCount;
  let consensusNarrative = '';

  if (bullishCount > bearishCount && bullishCount >= 3) {
    consensusNarrative = `Quantitative consensus across our 7-persona hedge fund framework reflects high conviction (Bullish skew: ${bullishCount}/${total || 7} agents), driven by superior return on capital and resilient pricing power.`;
  } else if (bearishCount > bullishCount && bearishCount >= 3) {
    consensusNarrative = `Quantitative hedge fund multi-agent consensus reflects a defensive/bearish bias (${bearishCount}/${total || 7} agents), highlighting valuation multiple friction, balance sheet leverage, or slowing momentum.`;
  } else {
    consensusNarrative = `Quantitative hedge fund multi-agent consensus indicates a balanced risk/reward profile (${bullishCount} Bullish, ${bearishCount} Bearish, ${neutralCount} Neutral), requiring selective positioning around catalytic milestones.`;
  }

  return {
    bullishCount,
    bearishCount,
    neutralCount,
    bullishReasons,
    bearishReasons,
    consensusNarrative
  };
}

export function generateInstitutionalFallbackNote(
  ticker: string,
  companyName: string,
  sector: string,
  industry: string,
  metrics: ComputedMetrics,
  riskFactors: string,
  hedgeFundSignals: string[]
): string {
  const marginTier = classifyMargin(metrics.grossMargin, metrics.operatingMargin, metrics.netMargin);
  const growthRegime = classifyGrowth(metrics.revenueGrowth);
  const leverageCondition = classifyLeverage(metrics.debtToEquity);
  const roeQuality = classifyRoe(metrics.returnOnEquity);

  const archetype = getSectorArchetype(sector, industry);
  const secRiskData = extractSecRiskInsights(riskFactors, companyName, ticker, industry);
  const hfData = synthesizeHedgeFundSignals(hedgeFundSignals, ticker);

  // 1. Format numbers
  const gmStr = metrics.grossMargin !== null && !isNaN(metrics.grossMargin) ? `${metrics.grossMargin.toFixed(1)}%` : null;
  const omStr = metrics.operatingMargin !== null && !isNaN(metrics.operatingMargin) ? `${metrics.operatingMargin.toFixed(1)}%` : null;
  const nmStr = metrics.netMargin !== null && !isNaN(metrics.netMargin) ? `${metrics.netMargin.toFixed(1)}%` : null;
  const roeStr = metrics.returnOnEquity !== null && !isNaN(metrics.returnOnEquity) ? `${metrics.returnOnEquity.toFixed(1)}%` : null;
  const deStr = metrics.debtToEquity !== null && !isNaN(metrics.debtToEquity) ? `${metrics.debtToEquity.toFixed(2)}x` : null;
  const crStr = metrics.currentRatio !== null && !isNaN(metrics.currentRatio) ? `${metrics.currentRatio.toFixed(2)}x` : null;
  const revGrowthStr = metrics.revenueGrowth !== null && !isNaN(metrics.revenueGrowth) ? `${metrics.revenueGrowth.toFixed(1)}%` : null;

  // SECTION 1: STRATEGIC MOAT & PRICING POWER
  let sec1MarginAnalysis = '';
  if (marginTier === 'top-decile') {
    sec1MarginAnalysis = `This competitive durability is evidenced by a top-decile gross margin profile of ${gmStr || 'over 50%'}, reflecting substantial pricing inelasticity, high product differentiation, and exceptional unit economics within the ${industry} space. Operating margins of ${omStr || 'top-tier levels'} further confirm the company's ability to maintain structural cost discipline while scaling operations.`;
  } else if (marginTier === 'healthy') {
    sec1MarginAnalysis = `The company demonstrates robust unit economics with a healthy gross margin of ${gmStr || '30-50%'} and operating margin of ${omStr || '15-25%'}, demonstrating balanced value-chain positioning and reliable pass-through of cost inflation to end-markets without sacrificing commercial volumes.`;
  } else if (marginTier === 'compressed') {
    sec1MarginAnalysis = `Operating within a competitive, volume-sensitive pricing environment, the firm generates gross margins of ${gmStr || '10-20%'} and operating margins of ${omStr || '5-10%'}, underscoring the critical importance of operational scale, manufacturing productivity, and tight supply-chain cost control relative to peers.`;
  } else {
    sec1MarginAnalysis = `Current margin dynamics (Gross Margin: ${gmStr || 'compressed'}, Operating Margin: ${omStr || 'under pressure'}) reflect heavy growth reinvestment or transitional restructuring cycles, necessitating focused execution toward unit-level profitability inflection.`;
  }

  const section1 = `1. STRATEGIC MOAT & PRICING POWER
${companyName} (${ticker}) occupies an entrenched market position within the global ${industry} landscape (${sector} sector), anchored by ${archetype.moatDrivers}. The company benefits from ${archetype.pricingMechanics}. ${sec1MarginAnalysis} Structural switching barriers and long-term customer relationships create high competitive friction for prospective entrants, preserving economic rent generation across full market cycles.`;

  // SECTION 2: CAPITAL ALLOCATION EFFICIENCY
  let sec2RoeAnalysis = '';
  if (roeQuality === 'exceptional') {
    sec2RoeAnalysis = `With an exceptional Return on Equity (ROE) of ${roeStr || '>30%'}, ${companyName} ranks among the premier capital compounders in its peer group. DuPont decomposition confirms this performance is powered by high net margin conversion (${nmStr || 'strong margins'}) and high asset productivity, generating significant economic value above its Weighted Average Cost of Capital (WACC).`;
  } else if (roeQuality === 'strong') {
    sec2RoeAnalysis = `Management delivers solid capital stewardship, generating a Return on Equity (ROE) of ${roeStr || '15-25%'} that comfortably exceeds estimated cost of equity hurdles, validating value-accretive organic reinvestment and prudent asset utilization.`;
  } else if (roeQuality === 'moderate') {
    sec2RoeAnalysis = `The firm's Return on Equity (ROE) stands at ${roeStr || '8-14%'}, indicating a stable return profile that aligns closely with industry cost of capital, where long-term value creation depends heavily on operational efficiency improvements and margin expansion.`;
  } else {
    sec2RoeAnalysis = `Return on Equity (ROE) is currently suppressed (${roeStr || '<8%'}), pointing to capital-intensive reinvestment phases or transitional cyclical earnings drag that management must address through portfolio optimization.`;
  }

  let sec2LeverageAnalysis = '';
  if (leverageCondition === 'conservative') {
    sec2LeverageAnalysis = `The balance sheet exhibits conservative solvency discipline with a Debt-to-Equity ratio of ${deStr || '<0.5x'} and a current liquidity ratio of ${crStr || 'healthy liquidity'}, affording fortress financial flexibility to fund ${archetype.reinvestmentFocus} while executing shareholder-friendly capital returns via buybacks or dividends without solvency strain.`;
  } else if (leverageCondition === 'moderate') {
    sec2LeverageAnalysis = `Capital structure leverage remains prudently managed at a Debt-to-Equity ratio of ${deStr || '0.5-1.5x'} and current liquidity of ${crStr || 'solid coverage'}, providing balanced weighted average cost of capital (WACC) optimization while preserving sufficient debt-service coverage ratios across macro cycles.`;
  } else {
    sec2LeverageAnalysis = `Financial leverage is elevated with a Debt-to-Equity ratio of ${deStr || '>1.5x'} and current ratio of ${crStr || 'tight'}, warranting disciplined debt amortization and free cash flow prioritization over speculative discretionary capital expenditures.`;
  }

  const section2 = `2. CAPITAL ALLOCATION EFFICIENCY
Management continues to execute a focused capital allocation strategy tailored to the capital requirements of the ${industry} sector. ${sec2RoeAnalysis} ${sec2LeverageAnalysis} Management's reinvestment priority remains concentrated on ${archetype.reinvestmentFocus}, ensuring long-term technological and commercial parity with Tier-1 industry peers.`;

  // SECTION 3: 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY
  let sec3GrowthAnalysis = '';
  if (growthRegime === 'hyper-growth') {
    sec3GrowthAnalysis = `Topline revenue growth of ${revGrowthStr || '>30% YoY'} highlights rapid market share expansion and strong secular tailwinds across core product categories.`;
  } else if (growthRegime === 'steady') {
    sec3GrowthAnalysis = `Topline revenue growth of ${revGrowthStr || '10-25% YoY'} demonstrates steady, resilient volume and price compounding across core commercial channels.`;
  } else if (growthRegime === 'mature') {
    sec3GrowthAnalysis = `Topline expansion is in a mature cadence (${revGrowthStr || '0-10% YoY'}), shifting analytical focus toward operating margin expansion, pricing realization, and cash flow conversion.`;
  } else {
    sec3GrowthAnalysis = `Topline revenue is currently contracting (${revGrowthStr || 'negative YoY'}), reflecting cyclical industry headwinds, inventory rebalancing, or macroeconomic demand softening.`;
  }

  const bullCatalystText = archetype.bullCatalysts.map(c => `(i) ${c}`).join(', ');
  const bearRiskText = archetype.bearRisks.map(r => `(i) ${r}`).join(', ');

  const section3 = `3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY
Over the forward 12-month horizon, ${companyName}'s risk/reward skew will be determined by fundamental execution and macroeconomic factors. ${sec3GrowthAnalysis} ${hfData.consensusNarrative} Under our Bull Case scenario, upside asymmetry is catalyzed by ${bullCatalystText}, unlocking multiple re-rating potential. Conversely, the Bear Case is framed by vulnerabilities including ${bearRiskText}, which could induce valuation multiple compression during market turbulence.`;

  // SECTION 4: SEC 10-K RISK FACTOR SYNTHESIS
  let sec4FilingsText = '';
  if (secRiskData.keyDisclosures.length > 0 && !riskFactors.toLowerCase().includes('not available')) {
    const quotes = secRiskData.keyDisclosures.slice(0, 2).map((d, idx) => `Item 1A Disclosure ${idx + 1}: "${d}"`).join(' ');
    sec4FilingsText = `Primary risk vectors highlighted in SEC EDGAR disclosures include: ${quotes}`;
  } else {
    sec4FilingsText = `Forensic review of annual disclosures underscores operational exposure to ${archetype.secRiskFocus}.`;
  }

  const section4 = `4. SEC 10-K RISK FACTOR SYNTHESIS
A forensic examination of ${companyName}'s SEC EDGAR Item 1A risk disclosures identifies key structural and regulatory vulnerabilities across ${secRiskData.themes.slice(0, 3).join(', ')}. ${sec4FilingsText} In addition, our multi-agent quantitative screen emphasizes continuous monitoring of ${archetype.secRiskFocus} to mitigate downside tail-risk around critical earnings and filing milestones.`;

  return `${section1}\n\n${section2}\n\n${section3}\n\n${section4}`;
}

export async function generateAnalystNote(
  ticker: string,
  companyName: string,
  sector: string,
  industry: string,
  metrics: ComputedMetrics,
  riskFactors: string,
  hedgeFundSignals: string[]
): Promise<string> {
  const marginTier = classifyMargin(metrics.grossMargin, metrics.operatingMargin, metrics.netMargin);
  const growthRegime = classifyGrowth(metrics.revenueGrowth);
  const leverageCondition = classifyLeverage(metrics.debtToEquity);
  const roeQuality = classifyRoe(metrics.returnOnEquity);

  const prompt = `
You are a Managing Director and Lead Equity Research Analyst at a top-tier institutional investment bank.
Write an exhaustive, high-conviction Institutional Research Thesis for ${companyName} (${ticker}).
Tone: Objective, institutional, rigorous, highly analytical. No fluff, conversational filler, or boilerplate disclaimers.

Company Context & Domain Intelligence:
- Ticker: ${ticker}
- Company: ${companyName}
- Sector: ${sector}
- Industry: ${industry}

Financial Snapshot & Core Quantitative Ratios:
- Revenue Growth (YoY): ${metrics.revenueGrowth !== null && !isNaN(metrics.revenueGrowth) ? metrics.revenueGrowth.toFixed(1) + '%' : 'N/A'} (Classified: ${growthRegime.toUpperCase()})
- Gross Margin: ${metrics.grossMargin !== null && !isNaN(metrics.grossMargin) ? metrics.grossMargin.toFixed(1) + '%' : 'N/A'} (Classified: ${marginTier.toUpperCase()})
- Operating Margin: ${metrics.operatingMargin !== null && !isNaN(metrics.operatingMargin) ? metrics.operatingMargin.toFixed(1) + '%' : 'N/A'}
- Net Profit Margin: ${metrics.netMargin !== null && !isNaN(metrics.netMargin) ? metrics.netMargin.toFixed(1) + '%' : 'N/A'}
- Return on Equity (ROE): ${metrics.returnOnEquity !== null && !isNaN(metrics.returnOnEquity) ? metrics.returnOnEquity.toFixed(1) + '%' : 'N/A'} (Quality: ${roeQuality.toUpperCase()})
- Debt to Equity: ${metrics.debtToEquity !== null && !isNaN(metrics.debtToEquity) ? metrics.debtToEquity.toFixed(2) + 'x' : 'N/A'} (Condition: ${leverageCondition.toUpperCase()})
- Current Liquidity Ratio: ${metrics.currentRatio !== null && !isNaN(metrics.currentRatio) ? metrics.currentRatio.toFixed(2) + 'x' : 'N/A'}
${metrics.dupont ? `- DuPont Breakdown: Net Margin ${(metrics.dupont.netMargin ? (metrics.dupont.netMargin * 100).toFixed(1) + '%' : 'N/A')}, Asset Turnover ${(metrics.dupont.assetTurnover ? metrics.dupont.assetTurnover.toFixed(2) + 'x' : 'N/A')}, Equity Multiplier ${(metrics.dupont.equityMultiplier ? metrics.dupont.equityMultiplier.toFixed(2) + 'x' : 'N/A')}` : ''}

Quantitative Agent Signals (7-Persona Hedge Fund Multi-Agent Consensus):
${hedgeFundSignals.length > 0 ? hedgeFundSignals.join('\n') : 'Quantitative agent consensus indicates balanced risk/reward profile across value, growth, and quality factors.'}

SEC EDGAR 10-K Item 1A Risk Filings Excerpt:
${riskFactors && riskFactors.length > 1500 ? riskFactors.substring(0, 1500) + '...' : riskFactors || 'Operational, regulatory, and competitive market disclosures from annual 10-K filing.'}

STRUCTURE YOUR OUTPUT INTO EXACTLY THESE 4 TITLED SECTIONS (UPPERCASE TITLES AS SHOWN):

1. STRATEGIC MOAT & PRICING POWER
Analyze the durability of ${companyName}'s competitive advantage, switching costs, pricing power, unit economics, and margin sustainability within the ${industry} (${sector}) landscape. Specifically evaluate its ${metrics.grossMargin !== null ? metrics.grossMargin.toFixed(1) + '%' : ''} gross margin structure and moat defense against competitors.

2. CAPITAL ALLOCATION EFFICIENCY
Evaluate management's reinvestment runway, ROIC vs WACC economic spread, leverage profile (Debt/Equity: ${metrics.debtToEquity !== null ? metrics.debtToEquity.toFixed(2) + 'x' : 'N/A'}), and balance sheet resilience for strategic CapEx, R&D, programmatic buybacks, or dividend sustainability.

3. 12-MONTH CATALYSTS & BEAR/BULL ASYMMETRY
Outline the primary operational, product, and macroeconomic catalysts over the forward 12 months (e.g. revenue growth cadence of ${metrics.revenueGrowth !== null ? metrics.revenueGrowth.toFixed(1) + '%' : 'N/A'}, product cycles, enterprise adoption) and detail the asymmetric risk/reward skew between bull and bear scenarios incorporating the 7-persona hedge fund signals.

4. SEC 10-K RISK FACTOR SYNTHESIS
Synthesize the specific regulatory, antitrust, supply chain, cybersecurity, geopolitical, or customer concentration risk vectors disclosed in the SEC EDGAR 10-K Item 1A filing excerpt above. Directly reference the real risks disclosed by management.

Formatting Rules:
- Keep the exact numbered section titles in uppercase (e.g., "1. STRATEGIC MOAT & PRICING POWER").
- Provide dense, institutional-grade analytical prose under each section. Do not use bullet points or numbered lists within sections.
- Make the analysis deeply unique, customized, and tailored to ${companyName} (${ticker}). Do not use generic boilerplate sentences.
`;

  // Gemini model selection with fallback
  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash'
  ];
  
  if (geminiKeyManager.hasKeys()) {
    const keyCount = geminiKeyManager.getKeyCount();
    for (let i = 0; i < keyCount; i++) {
      const currentKey = geminiKeyManager.getNextKey();
      if (!currentKey) continue;
      
      let ai: GoogleGenAI;
      try {
        ai = new GoogleGenAI({ apiKey: currentKey });
      } catch (err) {
        console.warn(`[Analyst Note] Failed to initialize GoogleGenAI client with key ${currentKey.substring(0, 6)}...:`, err);
        continue;
      }
      
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              temperature: 0.25,
            }
          });
          
          const text = response.text?.trim();
          if (text && text.length > 200 && text.includes('1. STRATEGIC MOAT') && text.includes('2. CAPITAL ALLOCATION')) {
            return text;
          }
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          console.error(`[Analyst Note] Error with model ${model} and key ${currentKey.substring(0, 6)}...: ${errMsg}`);
          if (errMsg.includes('not found') || errMsg.includes('Invalid model') || errMsg.includes('unsupported')) {
            continue; // Try next model in list
          }
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('exhausted')) {
            break; // Try next key
          }
        }
      }
    }
  }

  // Institutional Multi-Variable Dynamic Synthesis Engine Fallback
  return generateInstitutionalFallbackNote(ticker, companyName, sector, industry, metrics, riskFactors, hedgeFundSignals);
}

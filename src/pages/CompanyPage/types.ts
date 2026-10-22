export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  weburl: string;
  ipo: string;
  description: string;
}

export interface Ratios {
  symbol: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  debt_equity: string;
  eps: string;
  market_cap: number;
  dividend_yield: string;
  enterprise_value?: number | null;
  shares_outstanding?: number | null;
  book_value?: number | null;
  total_cash?: number | null;
  total_debt?: number | null;
  sales_growth?: string | null;
  profit_growth?: string | null;
}

export interface Peer {
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  pe: number;
  pb: number;
  roe: string;
  exchange: string;
}

export interface CompanyNews {
  id: string;
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
}

export interface CompanyQuote {
  price: number;
  change: number;
  changePercent: number;
  updated_at?: string;
}

export interface WatchlistItem {
  symbol: string;
}

export interface FinancialStatementRow {
  year?: number | string;
  date?: string;
  quarter?: string;
  revenue?: number | null;
  grossProfit?: number | null;
  netIncome?: number | null;
  assets?: number | null;
  liabilities?: number | null;
  equity?: number | null;
  operating?: number | null;
  investing?: number | null;
  financing?: number | null;
  eps?: number | null;
}

export interface CompanyFinancials {
  incomeStatement?: FinancialStatementRow[];
  balanceSheet?: FinancialStatementRow[];
  cashFlow?: FinancialStatementRow[];
  quarterly?: FinancialStatementRow[];
}

export interface ShareholdingMajorHolders {
  insidersPercentHeld: number | null;
  institutionsPercentHeld: number | null;
  institutionsFloatPercentHeld: number | null;
  institutionsCount: number | null;
}

export interface ShareholdingHolder {
  organization?: string;
  position?: number | null;
  value?: number | null;
  pctHeld?: number | null;
  reportDate?: string | null;
}

export interface CompanyShareholding {
  majorHolders?: ShareholdingMajorHolders;
  institutionalHolders?: ShareholdingHolder[];
  mutualFundHolders?: ShareholdingHolder[];
}

export interface EdgarStatementRow {
  label: string;
  values: Record<string, number | string | null>;
}

export interface EdgarFinancials {
  incomeStatement?: EdgarStatementRow[];
  balanceSheet?: EdgarStatementRow[];
  cashFlow?: EdgarStatementRow[];
}

export interface EdgarInsiderTransaction {
  name: string;
  relationship: string;
  date: string;
  action: string;
  code: string;
  shares: number;
  price: number;
  value: number;
  secLink: string;
}

export interface EdgarInsiders {
  transactions?: EdgarInsiderTransaction[];
}

export interface EdgarHolding {
  ticker: string;
  name: string;
  value: number;
  shares: number;
  option?: string | null;
  qoqChange: string;
}

export interface EdgarHoldings {
  managerName: string;
  portfolioDate: string;
  holdings?: EdgarHolding[];
}

export interface EdgarSection {
  title: string;
  paragraphs: string[];
}

export type EdgarRiskDiffStatus = 'added' | 'removed' | 'unchanged';

export interface EdgarRiskDiffParagraph {
  text: string;
  status: EdgarRiskDiffStatus;
}

export interface EdgarRiskDiff {
  paragraphs: EdgarRiskDiffParagraph[];
}

export interface ProxyExecutive {
  name: string;
  title: string;
  salary: number | null;
  bonus: number | null;
  stockAwards: number | null;
  optionAwards: number | null;
  nonEquityIncentive: number | null;
  otherCompensation: number | null;
  total: number | null;
}

export interface ProxyDirector {
  name: string;
  independent: boolean | null;
  committees: string[];
  feesEarned: number | null;
  stockAwards: number | null;
  total: number | null;
}

export interface ProxyAuditFeeYear {
  year: string;
  auditFee: number | null;
  auditRelatedFee: number | null;
  taxFee: number | null;
  allOtherFee: number | null;
  total: number | null;
}

export interface ProxyShareholderProposal {
  item: string;
  description: string;
  boardRecommendation: string | null;
}

export interface EdgarProxyData {
  symbol: string;
  filedDate: string;
  periodOfReport: string;
  secUrl: string;
  annualMeeting: {
    meetingDate: string | null;
    recordDate: string | null;
    meetingType: 'virtual' | 'in-person' | 'hybrid' | null;
    location: string | null;
  };
  executiveCompensation: {
    year: string;
    executives: ProxyExecutive[];
  }[];
  boardOfDirectors: {
    directors: ProxyDirector[];
  };
  auditFees: ProxyAuditFeeYear[];
  shareholderProposals: ProxyShareholderProposal[];
}

export interface EdgarPyPFactsValue {
  fy: number | null;
  fp: string | null;
  end: string | null;
  start: string | null;
  val: number;
  accn: string;
  form: string;
}

export interface EdgarPyPConcept {
  tag: string;
  label: string;
  unit: string;
  values: EdgarPyPFactsValue[];
}

export interface EdgarPayVersusPerformance {
  symbol: string;
  cik: string;
  available: boolean;
  reason?: string;
  concepts: EdgarPyPConcept[];
  sourceUrl: string;
}

export interface QuerySection<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
}

export interface CompanySecData {
  financials: QuerySection<EdgarFinancials>;
  compareFinancials: QuerySection<EdgarFinancials>;
  insiders: QuerySection<EdgarInsiders>;
  holdings: QuerySection<EdgarHoldings>;
  section1: QuerySection<EdgarSection>;
  section1A: QuerySection<EdgarSection>;
  section7: QuerySection<EdgarSection>;
  riskDiff: QuerySection<EdgarRiskDiff>;
  proxy: QuerySection<EdgarProxyData>;
  payVersusPerformance: QuerySection<EdgarPayVersusPerformance>;
}

export interface DetailEssentials {
  marketCapCr: string;
  enterpriseValue: string;
  pe: string;
  pb: string;
  roe: string;
  roce: string;
  epsTTM: string;
  debt: string;
  cash: string;
  sharesOutstanding: string;
  salesGrowth: string;
  profitGrowth: string;
}

export interface DetailGrowthSeries {
  yr1: string;
  yr3: string;
  yr5: string;
  history: number[];
}

export interface DetailRatiosHistorical {
  salesGrowth: { yr1: string; yr3: string; yr5: string };
  profitGrowth: { yr1: string; yr3: string; yr5: string };
  roe: DetailGrowthSeries;
  roce: DetailGrowthSeries;
}

export interface FinancialTableRow {
  particulars: string;
  periods: string[];
  values: string[][];
}

export interface CompanyDetailData {
  essentials: DetailEssentials;
  ratiosHistorical: DetailRatiosHistorical;
  annualPnL: FinancialTableRow[];
  balanceSheet: FinancialTableRow[];
  cashFlows: FinancialTableRow[];
}

export const PRIMARY_TABS = ['overview', 'info', 'financials', 'sec', 'analysis'] as const;
export type PrimaryTab = (typeof PRIMARY_TABS)[number];

export const SEC_SUB_TABS = ['standardized', 'insiders', 'holdings', 'tenk', 'proxy'] as const;
export type SecSubTab = (typeof SEC_SUB_TABS)[number];

export const SEC_STATEMENTS = ['income', 'balance', 'cash'] as const;
export type SecStatement = (typeof SEC_STATEMENTS)[number];

export const TEN_K_TABS = ['business', 'risk', 'mda'] as const;
export type TenKTab = (typeof TEN_K_TABS)[number];

export const RISK_DIFF_FILTERS = ['all', 'changes', 'added', 'removed'] as const;
export type RiskDiffFilter = (typeof RISK_DIFF_FILTERS)[number];

export function isPrimaryTab(value: string | null): value is PrimaryTab {
  return value !== null && (PRIMARY_TABS as readonly string[]).includes(value);
}

export function isSecSubTab(value: string | null): value is SecSubTab {
  return value !== null && (SEC_SUB_TABS as readonly string[]).includes(value);
}

export function parsePrimaryTab(value: string | null): PrimaryTab {
  return isPrimaryTab(value) ? value : 'overview';
}

export function parseSecSubTab(value: string | null): SecSubTab {
  return isSecSubTab(value) ? value : 'standardized';
}

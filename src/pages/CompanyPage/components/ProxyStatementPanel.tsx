import React, { useState } from 'react';
import { Calendar, DollarSign, Users, FileText, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '../../../utils/formatters.js';

interface Executive {
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

interface Director {
  name: string;
  independent: boolean | null;
  committees: string[];
  feesEarned: number | null;
  stockAwards: number | null;
  total: number | null;
}

interface AuditFeeYear {
  year: string;
  auditFee: number | null;
  auditRelatedFee: number | null;
  taxFee: number | null;
  allOtherFee: number | null;
  total: number | null;
}

interface ShareholderProposal {
  item: string;
  description: string;
  boardRecommendation: string | null;
}

interface ProxyData {
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
    executives: Executive[];
  }[];
  boardOfDirectors: {
    directors: Director[];
  };
  auditFees: AuditFeeYear[];
  shareholderProposals: ShareholderProposal[];
}

interface ProxyStatementPanelProps {
  data: ProxyData | null;
  isPending: boolean;
  isError: boolean;
  upperSymbol: string;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
};

export const ProxyStatementPanel: React.FC<ProxyStatementPanelProps> = ({
  data,
  isPending,
  isError,
  upperSymbol
}) => {
  const [selectedCompYear, setSelectedCompYear] = useState<string>('');

  if (isPending) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-16 bg-slate-800/40 rounded-xl border border-slate-800 p-4 flex flex-col justify-center space-y-2">
          <div className="h-4 bg-slate-700/60 rounded w-1/4" />
          <div className="h-3 bg-slate-700/40 rounded w-1/2" />
        </div>

        {/* Info Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="h-3 bg-slate-700/40 rounded w-1/3" />
              <div className="h-4 bg-slate-700/60 rounded w-2/3" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-800/40 border border-slate-800 rounded-xl p-5" />
          <div className="h-64 bg-slate-800/40 border border-slate-800 rounded-xl p-5" />
        </div>
      </div>
    );
  }

  const isInvalidData = !data || typeof data !== 'object' || typeof data.annualMeeting !== 'object';
  if (isError || isInvalidData) {
    return (
      <div className="bg-[#111827]/70 border border-slate-800 rounded-xl p-6 text-center space-y-3 max-w-2xl mx-auto my-4">
        <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-200">Proxy Statement Unavailable</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Could not retrieve DEF 14A proxy statement for {upperSymbol}. This typically happens for foreign private issuers or newly public companies.
          </p>
        </div>
        <div className="pt-2">
          <a
            href={`https://www.sec.gov/edgar/searchedgar/companysearch`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            <span>Search SEC EDGAR</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const compYears = data?.executiveCompensation || [];
  const activeYear = selectedCompYear || (compYears[0]?.year || '');
  const activeExecutives = compYears.find(y => y.year === activeYear)?.executives || [];
  const directors = data?.boardOfDirectors?.directors || [];
  const auditFees = data?.auditFees || [];
  const shareholderProposals = data?.shareholderProposals || [];
  const annualMeeting = data?.annualMeeting || { meetingDate: null, recordDate: null, meetingType: null, location: null };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* ─── HEADER BANNER ─── */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">DEF 14A</span>
            <h4 className="text-sm font-bold text-slate-100">Annual Meeting & Proxy Statement Details</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Period of Report: FY {data.periodOfReport} · Filed on {formatDate(data.filedDate)}
          </p>
        </div>
        <a
          href={data.secUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-[#141A26] border border-slate-700 hover:border-emerald-500/50 text-slate-200 rounded-lg shadow-sm transition"
        >
          <span>View on SEC.gov</span>
          <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
        </a>
      </div>

      {/* ─── ANNUAL MEETING DETAILS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Meeting Date Card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Meeting Date</span>
            <div className="text-xs font-bold text-slate-200 font-mono">
              {annualMeeting.meetingDate || 'To Be Announced'}
            </div>
          </div>
        </div>

        {/* Record Date Card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Record Date</span>
            <div className="text-xs font-bold text-slate-200 font-mono">
              {annualMeeting.recordDate || 'Not Specified'}
            </div>
          </div>
        </div>

        {/* Meeting Type Card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Format / Type</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-slate-200 capitalize">
                {annualMeeting.meetingType || 'virtual'} Meeting
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT PANEL GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Executive Compensation Card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Executive Compensation (NEO Pay)</span>
              </h5>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Summary Compensation Table (SCT) details</p>
            </div>
            
            {/* Year Selector */}
            {compYears.length > 1 && (
              <div className="flex bg-[#080B11] border border-slate-800 p-0.5 rounded-lg text-[10px] font-mono">
                {compYears.map(y => (
                  <button
                    key={y.year}
                    onClick={() => setSelectedCompYear(y.year)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      activeYear === y.year
                        ? 'bg-[#141A26] text-emerald-400 border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {y.year}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-800 text-[12px] font-sans">
              <thead>
                <tr className="bg-[#0B0F19] text-emerald-400 text-left text-[10px] font-bold uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Executive & Title</th>
                  <th className="py-2.5 px-3 text-right">Salary</th>
                  <th className="py-2.5 px-3 text-right">Stock Awards</th>
                  <th className="py-2.5 px-3 text-right">Total Comp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {activeExecutives.length > 0 ? (
                  activeExecutives.map((exec, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100 text-[12px]">{exec.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{exec.title}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{formatCurrency(exec.salary)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{formatCurrency(exec.stockAwards)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(exec.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500 font-mono">No executive compensation reported.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Board of Directors Card */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>Board of Directors Governance</span>
              </h5>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Independence & Committee structure</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{directors.length} Directors</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-800 text-[12px] font-sans">
              <thead>
                <tr className="bg-[#0B0F19] text-emerald-400 text-left text-[10px] font-bold uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Director Name</th>
                  <th className="py-2.5 px-3 text-center">Independent</th>
                  <th className="py-2.5 px-3">Committees</th>
                  <th className="py-2.5 px-3 text-right">Director Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {directors.length > 0 ? (
                  directors.map((dir, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">{dir.name}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {dir.independent === true ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            <CheckCircle className="h-3 w-3" /> Yes
                          </span>
                        ) : dir.independent === false ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {dir.committees && dir.committees.length > 0 ? (
                            dir.committees.map((c, cIdx) => (
                              <span key={cIdx} className="text-[9px] font-mono bg-[#141A26] border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap">{formatCurrency(dir.total || dir.feesEarned)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500 font-mono">No director roster parsed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── AUDIT FEES & PROPOSALS ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Audit Fees Table */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Independent Auditor Fees Breakdown
            </h5>
            <span className="text-[10px] font-mono text-slate-400">PCAOB Audit</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-[12px] font-sans">
              <thead>
                <tr className="bg-[#0B0F19] text-emerald-400 text-left text-[10px] font-bold uppercase tracking-wider font-mono">
                  <th className="py-2 px-2.5">Year</th>
                  <th className="py-2 px-2.5 text-right">Audit Fees</th>
                  <th className="py-2 px-2.5 text-right">Audit Related</th>
                  <th className="py-2 px-2.5 text-right">Tax Fees</th>
                  <th className="py-2 px-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditFees.length > 0 ? (
                  auditFees.map((af, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition">
                      <td className="py-2 px-2.5 font-bold font-mono text-slate-200">{af.year}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300">{formatCurrency(af.auditFee)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300">{formatCurrency(af.auditRelatedFee)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300">{formatCurrency(af.taxFee)}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">{formatCurrency(af.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-xs text-slate-500 font-mono">No audit fee disclosure found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shareholder Proposals Table */}
        <div className="bg-[#0D111A] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Shareholder Ballot Proposals
            </h5>
            <span className="text-[10px] font-mono text-slate-400">{shareholderProposals.length} Items</span>
          </div>

          <div className="overflow-y-auto max-h-56 space-y-2">
            {shareholderProposals.length > 0 ? (
              shareholderProposals.map((prop, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 flex justify-between items-start gap-2">
                  <div className="space-y-0.5 flex-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">{prop.item}</span>
                    <p className="text-xs text-slate-200 font-medium leading-snug">{prop.description}</p>
                  </div>
                  {prop.boardRecommendation && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase whitespace-nowrap ${
                      prop.boardRecommendation.toUpperCase().includes('FOR')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      Board: {prop.boardRecommendation}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">No ballot proposals extracted.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

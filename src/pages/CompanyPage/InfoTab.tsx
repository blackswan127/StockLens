import React from 'react';

interface InfoTabProps {
  detailData: any;
  companyNews: any[] | undefined;
  isCompanyNewsPending: boolean;
}

export const InfoTab: React.FC<InfoTabProps> = ({
  detailData,
  companyNews,
  isCompanyNewsPending,
}) => {
  return (
    <div id="info" className="space-y-6 scroll-mt-20 animate-fade-in font-sans">
      {/* Equity news bulletins block card list */}
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-3 flex items-center gap-2">
          <span>📰 Corporate Actions & Bulletins Feed</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          {isCompanyNewsPending ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-[#080B11] space-y-3 animate-pulse">
                <div className="h-3 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded" />
                <div className="h-3 w-5/6 bg-slate-800 rounded" />
                <div className="h-3 w-4/6 bg-slate-800 rounded" />
              </div>
            ))
          ) : companyNews && companyNews.length > 0 ? (
            companyNews.slice(0, 4).map((item: any, idx: number) => {
              const pubDate = new Date(item.datetime * 1000).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <div key={item.id || idx} className="p-4 rounded-xl border border-slate-800 bg-[#080B11] flex flex-col justify-between hover:border-emerald-500/30 transition">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                      {pubDate} · {item.source}
                    </span>
                    <h4 
                      onClick={() => item.url && item.url !== '#' && window.open(item.url, '_blank')}
                      className="font-bold text-xs text-slate-200 line-clamp-2 hover:text-emerald-400 cursor-pointer transition"
                    >
                      {item.headline}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                  <button 
                    onClick={() => item.url && item.url !== '#' && window.open(item.url, '_blank')}
                    className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 text-left mt-4 uppercase cursor-pointer"
                  >
                    Continue Reading →
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-slate-500 font-mono">
              No corporate news bulletins available at this time.
            </div>
          )}
        </div>
      </div>

      {/* Slim Upsell Banner */}
      <div className="bg-[#0D111A] border border-slate-800 border-l-4 border-l-emerald-500 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 select-none">PRO</div>
          <p className="text-xs font-medium text-slate-300 text-center md:text-left">
            Get DuPont Analysis, historic 10-year filings, and 50 premium stock templates on <span className="font-bold text-emerald-400">StockLens PRO & TickerPlus</span>.
          </p>
        </div>
        <div className="relative group">
          <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 font-mono text-xs font-bold rounded-lg cursor-not-allowed shrink-0 border border-slate-700">
            CLAIM 7-DAY FREE TRIAL
          </button>
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#141A26] border border-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap left-1/2 -translate-x-1/2 font-mono">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};

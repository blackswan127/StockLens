import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export const NotFound: React.FC = () => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="not-found-heading"
      className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8"
    >
      <div aria-hidden="true" className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 shadow-3d">
        <AlertTriangle aria-hidden="true" className="h-8 w-8 text-rose-400" />
      </div>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">
        Error 404
      </p>
      <h1
        id="not-found-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-sans text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl focus:outline-none"
      >
        Signal Not Found
      </h1>
      <p className="mt-4 max-w-md font-mono text-sm text-slate-500">
        The route you requested is not listed on this exchange. Verify the ticker or return to the terminal dashboard.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Return to Terminal
      </Link>
    </section>
  );
};

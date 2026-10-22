import pLimit from 'p-limit';
import { SEED_STOCKS } from './seeds.js';
import { yahooService, resetYahooSession } from './yahoo.js';

// ESM/CJS interop compatibility resolver for bundlers (e.g. esbuild/webpack)
let pLimitFn: any = pLimit;
if (pLimitFn && typeof pLimitFn.default === 'function') {
  pLimitFn = pLimitFn.default;
}

// If this many calls in a row fail, assume the Yahoo cookie/crumb session
// has died mid-run (a known yahoo-finance2 failure mode - see
// github.com/gadicc/yahoo-finance2 issues #741 and #764) and force a fresh
// session before continuing, rather than letting the rest of the batch fail.
const FAILURE_STREAK_RESET_THRESHOLD = 5;

// How many times to retry symbols that failed on the previous pass.
const MAX_RETRY_PASSES = 2;

let isWarming = false;

interface WarmResult {
  succeeded: string[];
  failed: string[];
}

const WARMER_INTERVAL_MS = (4 * 60 * 60 * 1000) / SEED_STOCKS.length; // ~7200ms

async function warmBatch(symbols: string[], passLabel: string): Promise<WarmResult> {
  const limit = pLimitFn(1);
  const succeeded: string[] = [];
  const failed: string[] = [];

  let consecutiveFailures = 0;
  let done = 0;

  const tasks = symbols.map((symbol, i) =>
    limit(async () => {
      // Stagger start time based on index to spread across 4 hours
      await new Promise(r => setTimeout(r, i * WARMER_INTERVAL_MS));

      try {
        const data = await yahooService.getBasicFinancials(symbol);

        const hasAnyData = data?.metric && Object.values(data.metric).some(
          (v) => v !== null && v !== undefined
        );

        if (!hasAnyData) {
          throw new Error('Empty metric payload (likely session/auth failure)');
        }

        succeeded.push(symbol);
        consecutiveFailures = 0;
      } catch (err: any) {
        failed.push(symbol);
        consecutiveFailures++;
        console.warn(`[RATIOS WARMER:${passLabel}] Failed for ${symbol}:`, err?.message);

        if (consecutiveFailures >= FAILURE_STREAK_RESET_THRESHOLD) {
          console.warn(
            `[RATIOS WARMER:${passLabel}] ${consecutiveFailures} consecutive failures - ` +
            `forcing a fresh Yahoo session before continuing.`
          );
          resetYahooSession();
          consecutiveFailures = 0;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      done++;
      if (done % 50 === 0) {
        console.log(`[RATIOS WARMER:${passLabel}] Progress: ${done}/${symbols.length}`);
      }
    })
  );

  await Promise.all(tasks);
  return { succeeded, failed };
}

export async function warmAllRatios(): Promise<void> {
  if (isWarming) {
    console.log('[RATIOS WARMER] Already running, skipping this trigger.');
    return;
  }
  isWarming = true;

  try {
    const allSymbols = SEED_STOCKS.map((s) => s.symbol);
    console.log(`[RATIOS WARMER] Starting warm-up for ${allSymbols.length} symbols...`);

    let pending = allSymbols;
    let totalSucceeded = 0;
    const overallFailed = new Set<string>(pending);

    for (let pass = 0; pass <= MAX_RETRY_PASSES && pending.length > 0; pass++) {
      const label = pass === 0 ? 'PASS1' : `RETRY${pass}`;
      if (pass > 0) {
        console.log(
          `[RATIOS WARMER] Retry pass ${pass}/${MAX_RETRY_PASSES} for ${pending.length} ` +
          `symbols that failed previously...`
        );
        resetYahooSession();
        await new Promise((resolve) => setTimeout(resolve, 2000 * pass));
      }

      const { succeeded, failed } = await warmBatch(pending, label);
      totalSucceeded += succeeded.length;
      for (const sym of succeeded) overallFailed.delete(sym);
      pending = failed;
    }

    console.log(
      `[RATIOS WARMER] Completed. ${totalSucceeded}/${allSymbols.length} succeeded, ` +
      `${overallFailed.size} permanently failed after ${MAX_RETRY_PASSES} retries.`
    );
    if (overallFailed.size > 0) {
      console.warn(
        `[RATIOS WARMER] Permanently failed symbols (will retry on next scheduled run): ` +
        `${Array.from(overallFailed).join(', ')}`
      );
    }
  } finally {
    isWarming = false;
  }
}

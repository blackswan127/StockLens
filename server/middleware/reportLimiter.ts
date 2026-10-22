import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Redis | undefined;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  redisClient.on('error', (err) => console.error('[REDIS REPORT LIMITER ERROR]', err));
}

function createStore(prefix: string): RedisStore | undefined {
  const client = redisClient;
  if (!client) return undefined;

  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => client.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
  });
}

export interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: { error: string; message: string };
  prefix?: string;
}

export function createLimiter({ windowMs, limit, message, prefix = 'rl:report:' }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    store: createStore(prefix),
    message,
  });
}

export const reportLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    error: 'Too many report requests',
    message: 'Report generation is limited to 5 requests per 15 minutes per IP. Please try again later.',
  },
});

export const MAX_CONCURRENT_REPORTS = 2;

let activeReportGenerations = 0;

export function tryAcquireReportSlot(): boolean {
  if (activeReportGenerations >= MAX_CONCURRENT_REPORTS) {
    return false;
  }
  activeReportGenerations += 1;
  return true;
}

export function releaseReportSlot(): void {
  if (activeReportGenerations > 0) {
    activeReportGenerations -= 1;
  }
}

export function getActiveReportGenerations(): number {
  return activeReportGenerations;
}

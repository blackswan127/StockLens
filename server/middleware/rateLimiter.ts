import rateLimit, { type Options as RateLimitOptions } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Redis | undefined;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  redisClient.on('error', (err) => console.error('[REDIS RATE LIMITER ERROR]', err));
}

export interface RateLimitMessagePayload {
  status: number;
  message: string;
}

const createRedisStore = (): RedisStore | undefined => {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]): Promise<RedisReply> =>
      redisClient!.call(args[0], ...args.slice(1)) as unknown as Promise<RedisReply>,
  });
};

const apiLimiterOptions: Partial<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: createRedisStore(),
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  } as RateLimitMessagePayload
};

// Standard general API rate limit
export const apiLimiter = rateLimit(apiLimiterOptions);

const searchLimiterOptions: Partial<RateLimitOptions> = {
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 search queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  message: {
    status: 429,
    message: 'Too many search requests. Please slow down.'
  } as RateLimitMessagePayload
};

// Tightened rate limit for search to prevent abuse
export const searchLimiter = rateLimit(searchLimiterOptions);

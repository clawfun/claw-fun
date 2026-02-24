import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Redis key prefixes
export const REDIS_KEYS = {
  TOKEN_PRICE: (mint: string) => `token:${mint}:price`,
  TOKEN_MCAP: (mint: string) => `token:${mint}:mcap`,
  TOKEN_TRADES: (mint: string) => `token:${mint}:trades`,
  TRENDING_TOKENS: "trending:tokens",
  LEADERBOARD: "leaderboard:traders",
} as const;

// Cache TTLs in seconds
export const CACHE_TTL = {
  TOKEN_PRICE: 10,
  TOKEN_MCAP: 30,
  TRENDING: 60,
  LEADERBOARD: 300,
} as const;

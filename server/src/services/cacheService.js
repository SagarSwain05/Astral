/**
 * Cache Service
 * Redis-backed cache (when REDIS_URL is set) with an in-memory fallback,
 * used to shield the NASA API from rate limits and speed up hot endpoints.
 */

import Redis from "ioredis";

let redis = null;
const memory = new Map(); // key -> { value, expiresAt }

const stats = { hits: 0, misses: 0 };

export const initCache = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("🗃️  Cache: REDIS_URL not set, using in-memory cache");
    return;
  }

  redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
  });

  redis.on("ready", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => console.warn("⚠️ Redis error:", err.message));
};

const redisReady = () => redis && redis.status === "ready";

export const cacheGet = async (key) => {
  try {
    if (redisReady()) {
      const raw = await redis.get(key);
      if (raw !== null) {
        stats.hits++;
        return JSON.parse(raw);
      }
      stats.misses++;
      return null;
    }
  } catch (err) {
    console.warn("⚠️ Cache get failed:", err.message);
  }

  const entry = memory.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    stats.hits++;
    return entry.value;
  }
  if (entry) memory.delete(key);
  stats.misses++;
  return null;
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    if (redisReady()) {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    }
  } catch (err) {
    console.warn("⚠️ Cache set failed:", err.message);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const cacheDelPattern = async (prefix) => {
  try {
    if (redisReady()) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(keys);
    }
  } catch (err) {
    console.warn("⚠️ Cache invalidate failed:", err.message);
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
};

/**
 * Return cached value for key, or compute it with fn() and cache the result.
 */
export const cached = async (key, ttlSeconds, fn) => {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const value = await fn();
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
};

export const getCacheStatus = () => ({
  backend: redisReady() ? "redis" : "memory",
  redisStatus: redis ? redis.status : "disabled",
  memoryKeys: memory.size,
  hits: stats.hits,
  misses: stats.misses,
});

export default {
  initCache,
  cacheGet,
  cacheSet,
  cacheDelPattern,
  cached,
  getCacheStatus,
};

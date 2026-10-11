/**
 * STEP 9: Cache abstraction.
 * - Redis via ioredis when REDIS_URL is set (lazy, optional dependency)
 * - In-memory TTL Map fallback (dev / no Redis available)
 * Same interface either way: get/set/del/flush/wrap
 */

class MemoryStore {
  constructor() {
    this.map = new Map(); // key -> { value, expiresAt }
    this.max = 5000;
  }
  _sweep() {
    if (this.map.size <= this.max) return;
    const now = Date.now();
    for (const [k, v] of this.map) {
      if (v.expiresAt && v.expiresAt <= now) this.map.delete(k);
    }
    // hard trim oldest if still over
    if (this.map.size > this.max) {
      const excess = this.map.size - this.max;
      let i = 0;
      for (const k of this.map.keys()) {
        if (i++ >= excess) break;
        this.map.delete(k);
      }
    }
  }
  async get(key) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt && e.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e.value;
  }
  async set(key, value, ttlSec) {
    this._sweep();
    this.map.set(key, { value, expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null });
  }
  async del(key) {
    this.map.delete(key);
  }
  async delPrefix(prefix) {
    for (const k of this.map.keys()) if (k.startsWith(prefix)) this.map.delete(k);
  }
  async flush() {
    this.map.clear();
  }
  get kind() {
    return 'memory';
  }
}

class RedisStore {
  constructor(client) {
    this.client = client;
  }
  async get(key) {
    const raw = await this.client.get(key);
    return raw == null ? null : JSON.parse(raw);
  }
  async set(key, value, ttlSec) {
    const raw = JSON.stringify(value);
    if (ttlSec) await this.client.set(key, raw, 'EX', ttlSec);
    else await this.client.set(key, raw);
  }
  async del(key) {
    await this.client.del(key);
  }
  async delPrefix(prefix) {
    const keys = await this.client.keys(`${prefix}*`);
    if (keys.length) await this.client.del(...keys);
  }
  async flush() {
    await this.client.flushdb();
  }
  get kind() {
    return 'redis';
  }
}

const store = new MemoryStore();

export const cache = {
  async init() {
    const url = process.env.REDIS_URL;
    if (!url) return store;
    try {
      const { default: Redis } = await import('ioredis');
      const client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        retryStrategy: () => null, // fail fast -> memory fallback
      });
      client.on('error', err => console.error('[redis]', err.message));
      await client.connect();
      const redisStore = new RedisStore(client);
      // swap in place so consumers keep same `cache` object
      Object.setPrototypeOf(store, RedisStore.prototype);
      Object.assign(store, redisStore);
      console.log('[cache] Redis connected:', url.replace(/:\/\/.*@/, '://***@'));
    } catch (err) {
      console.error('[cache] Redis unavailable, using memory fallback:', err.message);
    }
    return store;
  },
  get kind() {
    return store.kind;
  },
  async get(key) {
    try {
      return await store.get(key);
    } catch (err) {
      console.error('[cache] get failed:', err.message);
      return null;
    }
  },
  async set(key, value, ttlSec) {
    try {
      return await store.set(key, value, ttlSec);
    } catch (err) {
      console.error('[cache] set failed:', err.message);
    }
  },
  async del(key) {
    try {
      return await store.del(key);
    } catch (err) {
      console.error('[cache] del failed:', err.message);
    }
  },
  async delPrefix(prefix) {
    try {
      return await store.delPrefix(prefix);
    } catch (err) {
      console.error('[cache] delPrefix failed:', err.message);
    }
  },
  async flush() {
    try {
      return await store.flush();
    } catch (err) {
      console.error('[cache] flush failed:', err.message);
    }
  },
  /** Cache-through helper (fail-open: cache errors never break reads) */
  async wrap(key, ttlSec, fn) {
    let hit = null;
    try {
      hit = await store.get(key);
    } catch (err) {
      console.error('[cache] wrap get failed:', err.message);
    }
    if (hit !== null && hit !== undefined) return hit;
    const value = await fn();
    if (value !== undefined && value !== null) {
      try {
        await store.set(key, value, ttlSec);
      } catch (err) {
        console.error('[cache] wrap set failed:', err.message);
      }
    }
    return value;
  },
};

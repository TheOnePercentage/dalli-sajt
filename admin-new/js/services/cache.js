/**
 * Cache Service - Multi-layer caching (Memory + IndexedDB + SW)
 * Provides fast reads with persistent storage fallback
 */

import { openDB } from 'idb';

const CACHE_DB_NAME = 'imperium-cache';
const CACHE_DB_VERSION = 2;
const MAX_MEMORY_ENTRIES = 500;
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_WHILE_REVALIDATE = 0; // millis a stale entry may still be served

class CacheService {
  constructor(options = {}) {
    this.options = {
      maxMemoryEntries: options.maxMemoryEntries || MAX_MEMORY_ENTRIES,
      defaultTTL: options.defaultTTL || DEFAULT_TTL,
      enableIndexedDB: options.enableIndexedDB !== false,
      enableServiceWorker: options.enableServiceWorker !== false,
      ...options,
    };
    this.options.staleWhileRevalidate =
      this.options.staleWhileRevalidate ?? DEFAULT_STALE_WHILE_REVALIDATE;

    this.memoryCache = new Map();
    this.memoryAccessOrder = new Set();
    this.pendingRequests = new Map();
    this.db = null;
    this.dbReady = this.initIndexedDB();
  }

  async initIndexedDB() {
    if (!this.options.enableIndexedDB || typeof indexedDB === 'undefined') return;

    try {
      this.db = await openDB(CACHE_DB_NAME, CACHE_DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Version 1: Initial schema
          if (oldVersion < 1) {
            const responsesStore = db.createObjectStore('responses', { keyPath: 'key' });
            responsesStore.createIndex('timestamp', 'timestamp', { unique: false });
            responsesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });

            db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
          }

          // Version 2: Add schemaVersion metadata store for future migrations
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('meta')) {
              const metaStore = db.createObjectStore('meta', { keyPath: 'key' });
              // Initialize schema version
              metaStore.put({ key: 'schemaVersion', value: 2 });
            }
          }

          // Future migrations can be added here:
          // if (oldVersion < 3) { ... }
        },
        blocked() {
          console.warn('[Cache] IndexedDB blocked, waiting for other tabs to close');
        },
        blocking() {
          console.warn('[Cache] IndexedDB blocking other tabs');
        },
      });
    } catch (e) {
      console.warn('[Cache] IndexedDB init failed:', e);
    }
  }

  generateKey(url, options = {}) {
    const params = new URLSearchParams(options.params || {}).toString();
    const method = (options.method || 'GET').toUpperCase();
    return `${method}:${url}${params ? '?' + params : ''}`;
  }

  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  isStale(entry) {
    const elapsed = Date.now() - entry.timestamp;
    const window = this.options.staleWhileRevalidate || 0;
    return elapsed > entry.ttl && elapsed <= entry.ttl + window;
  }

  async get(key, options = {}) {
    await this.dbReady;

    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry)) {
      this.touchMemory(key);
      return { data: memEntry.data, source: 'memory', stale: false };
    }

    if (memEntry && this.isStale(memEntry)) {
      return { data: memEntry.data, source: 'memory', stale: true };
    }

    if (this.options.enableIndexedDB && this.db) {
      try {
        const entry = await this.getFromIDB(key);
        if (entry && !this.isExpired(entry)) {
          this.setMemory(key, entry.data, entry.ttl, entry.tags);
          return { data: entry.data, source: 'indexeddb', stale: false };
        }
        if (entry && this.isStale(entry)) {
          this.setMemory(key, entry.data, entry.ttl, entry.tags);
          return { data: entry.data, source: 'indexeddb', stale: true };
        }
      } catch (e) {
        console.warn('[Cache] IDB read failed:', e);
      }
    }

    return null;
  }

  async set(key, data, ttlOrOptions = {}, tagsOrUndefined) {
    let ttl;
    let tags;
    if (typeof ttlOrOptions === 'number') {
      ttl = ttlOrOptions;
      tags = Array.isArray(tagsOrUndefined) ? tagsOrUndefined : [];
    } else {
      ttl = ttlOrOptions.ttl;
      tags = ttlOrOptions.tags;
    }
    ttl = ttl || this.options.defaultTTL;
    tags = tags || [];
    const entry = { data, ttl, tags, timestamp: Date.now() };

    this.setMemory(key, data, ttl, tags);

    if (this.options.enableIndexedDB && this.db) {
      try {
        await this.setInIDB(key, entry);
      } catch (e) {
        console.warn('[Cache] IDB write failed:', e);
      }
    }

    return entry;
  }

  setMemory(key, data, ttl, tags) {
    if (this.memoryCache.size >= this.options.maxMemoryEntries) {
      const oldestKey = this.memoryAccessOrder.values().next().value;
      if (oldestKey) {
        this.memoryAccessOrder.delete(oldestKey);
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, { data, ttl, tags, timestamp: Date.now() });
    this.memoryAccessOrder.add(key);
  }

  touchMemory(key) {
    this.memoryAccessOrder.delete(key);
    this.memoryAccessOrder.add(key);
  }

  async getFromIDB(key) {
    if (!this.db) return null;
    try {
      return await this.db.get('responses', key);
    } catch (e) {
      console.warn('[Cache] IDB read failed:', e);
      return null;
    }
  }

  async setInIDB(key, entry) {
    if (!this.db) return;
    try {
      await this.db.put('responses', { key, ...entry });
    } catch (e) {
      console.warn('[Cache] IDB write failed:', e);
    }
  }

  async invalidate(key) {
    this.memoryCache.delete(key);
    this.memoryAccessOrder.delete(key);

    if (this.options.enableIndexedDB && this.db) {
      try {
        await this.db.delete('responses', key);
      } catch (e) {
        console.warn('[Cache] IDB invalidate failed:', e);
      }
    }
  }

  async invalidateByTag(tag) {
    const keysToDelete = [];

    for (const [key, entry] of this.memoryCache) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => this.invalidate(k));

    if (this.options.enableIndexedDB && this.db) {
      try {
        const keys = await this.db.getAllKeysFromIndex('responses', 'tags', tag);
        const tx = this.db.transaction('responses', 'readwrite');
        await Promise.all([...keys.map(key => tx.store.delete(key)), tx.done]);
      } catch (e) {
        console.warn('[Cache] IDB tag invalidate failed:', e);
      }
    }
  }

  async clear() {
    this.memoryCache.clear();
    this.memoryAccessOrder.clear();

    if (this.options.enableIndexedDB && this.db) {
      try {
        await this.db.clear('responses');
      } catch (e) {
        console.warn('[Cache] IDB clear failed:', e);
      }
    }
  }

  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      maxMemoryEntries: this.options.maxMemoryEntries,
      indexedDBAvailable: !!this.db,
    };
  }
}

const cacheService = new CacheService();

export { CacheService, cacheService };
export default cacheService;

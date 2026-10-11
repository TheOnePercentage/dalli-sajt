/**
 * Cache Service Integration Tests
 * Tests for multi-layer caching (Memory + IndexedDB)
 */

import { mockLocalStorage, mockSessionStorage, flushPromises } from './setup.js';

describe('CacheService', () => {
  let cacheService;
  let CacheService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
    const module = await import('../js/services/cache.js');
    CacheService = module.CacheService;
    cacheService = new CacheService({ enableIndexedDB: false });
    await cacheService.dbReady;
  });

  describe('Basic Operations', () => {
    test('should store and retrieve from memory cache', async () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const ttl = 60000;

      await cacheService.set(key, data, ttl);
      const result = await cacheService.get(key);

      expect(result.data).toEqual(data);
      expect(result.source).toBe('memory');
      expect(result.stale).toBe(false);
    });

    test('should return stale data when expired but within stale-while-revalidate', async () => {
      const cache = new (await import('../js/services/cache.js')).CacheService({ 
        defaultTTL: 1000, 
        enableIndexedDB: false,
        staleWhileRevalidate: 5000
      });
      await cache.dbReady;

      await cache.set('stale-key', { value: 'stale' }, 1000);
      
      // Manually expire the entry by manipulating timestamp
      const memEntry = cache.memoryCache.get('stale-key');
      memEntry.timestamp = Date.now() - 2000; // Expired 2 seconds ago

      const result = await cache.get('stale-key');
      expect(result.data).toEqual({ value: 'stale' });
      expect(result.source).toBe('memory');
      expect(result.stale).toBe(true);
    });

    test('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('should respect TTL and expire entries', async () => {
      const cache = new (await import('../js/services/cache.js')).CacheService({ defaultTTL: 50, enableIndexedDB: false });
      await cache.dbReady;
      
      await cache.set('expire-key', { data: 'test' }, 50);
      
      // Wait for expiration
      await new Promise(r => setTimeout(r, 60));
      
      const result = await cache.get('expire-key');
      expect(result).toBeNull();
    });
  });

  describe('LRU Eviction', () => {
    test('should evict LRU entries when max memory exceeded', async () => {
      const cache = new (await import('../js/services/cache.js')).CacheService({ 
        maxMemoryEntries: 3, 
        enableIndexedDB: false 
      });
      await cache.dbReady;

      // Fill cache to capacity
      await cache.set('key1', { id: 1 });
      await cache.set('key2', { id: 2 });
      await cache.set('key3', { id: 3 });
      
      // Access key1 to make it recently used
      await cache.get('key1');
      
      // Add 4th item, should evict key2 (least recently used)
      await cache.set('key4', { id: 4 });
      
      expect(cache.memoryCache.has('key1')).toBe(true);
      expect(cache.memoryCache.has('key2')).toBe(false); // Evicted
      expect(cache.memoryCache.has('key3')).toBe(true);
      expect(cache.memoryCache.has('key4')).toBe(true);
    });
  });

  describe('Tag-based Invalidation', () => {
    test('should invalidate by tags', async () => {
      await cacheService.set('key1', { data: 1 }, 60000, ['tag1', 'tag2']);
      await cacheService.set('key2', { data: 2 }, 60000, ['tag1']);
      await cacheService.set('key3', { data: 3 }, 60000, ['tag3']);

      await cacheService.invalidateByTag('tag1');

      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      const result3 = await cacheService.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).not.toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    test('should return correct stats', async () => {
      await cacheService.set('key1', { a: 1 });
      await cacheService.set('key2', { a: 2 });
      await cacheService.set('key3', { a: 3 });

      const stats = cacheService.getStats();
      expect(stats.memoryEntries).toBe(3);
      expect(stats.maxMemoryEntries).toBe(500);
    });
  });

  describe('Error Handling', () => {
    test('should handle IndexedDB errors gracefully', async () => {
      const cache = new (await import('../js/services/cache.js')).CacheService({ enableIndexedDB: true });
      // Mock IDB to fail
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn(() => {
        const req = {
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          result: {}
        };
        setTimeout(() => {
          if (req.onerror) req.onerror({ target: { error: new Error('IDB failed') } });
        }, 0);
        return req;
      });

      // Should not throw
      await expect(cache.get('test-key')).resolves.toBeNull();
      
      indexedDB.open = originalOpen;
    });
  });
});

export { };
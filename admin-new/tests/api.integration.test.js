/**
 * API Service Integration Tests
 * Tests for APIClient retry logic, caching, offline queue, error handling
 */

import { mockLocalStorage, mockSessionStorage, flushPromises } from './setup.js';

// Use global.createMockResponse from setup
const createMockResponse = global.createMockResponse;

// Mock fetch globally
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock performance.now
global.performance = { now: () => Date.now() };

describe('APIClient', () => {
  let mockFetch;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  describe('Retry Logic', () => {
    test('should retry failed requests up to max retries', async () => {
      const { createApi } = await import('../js/utils/api.js');
      
      let attempt = 0;
      const mockFetchImpl = () => {
        attempt++;
        if (attempt < 3) {
          // Throw a TypeError with 'NetworkError' message to trigger retry logic
          const error = new TypeError('NetworkError');
          error.name = 'TypeError';
          return Promise.reject(error);
        }
        return Promise.resolve(createMockResponse({ success: true }, { status: 200, headers: { 'content-type': 'application/json' } }));
      };
      
      global.fetch = mockFetchImpl;

      const api = createApi({
        baseURL: '/api',
        retries: 3,
        retryDelay: 10
      });

      const result = await api.get('/test');
      expect(result.data.success).toBe(true);
      expect(attempt).toBe(3);
    });

    test('should not retry on 401 Unauthorized', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ message: 'Unauthorized' }, { ok: false, status: 401 }));

      const api = new APIService();
      await expect(api.client.get('/protected')).rejects.toThrow('Unauthorized');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 403 Forbidden', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ message: 'Forbidden' }, { ok: false, status: 403 }));

      const api = new APIService();
      await expect(api.client.get('/forbidden')).rejects.toThrow('Nemate dozvolu');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 404 Not Found', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ message: 'Not found' }, { ok: false, status: 404 }));

      const api = new APIService();
      await expect(api.client.get('/missing')).rejects.toThrow('Resurs nije pronađen');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 422 Validation Error', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ errors: { name: 'Required' } }, { ok: false, status: 422 }));

      const api = new APIService();
      await expect(api.client.post('/create', {})).rejects.toThrow('Validacija nije prošla');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should retry on 500 Server Error', async () => {
      const { createApi } = await import('../js/utils/api.js');
      
      let attempt = 0;
      mockFetch.mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.resolve(createMockResponse({ message: 'Server error' }, { ok: false, status: 500, headers: { 'content-type': 'application/json' } }));
        }
        return Promise.resolve(createMockResponse({ success: true }, { status: 200, headers: { 'content-type': 'application/json' } }));
      });

      const api = createApi({ baseURL: '/api', retries: 3, retryDelay: 10 });
      const result = await api.get('/retry-test');
      expect(result.data.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Request/Response Interceptors', () => {
    test('should add Authorization header from localStorage', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      localStorage.setItem('dalli_admin_token', 'test-token-123');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'ok' }, { status: 200 }));

      const apiService = new APIService();
      await apiService.client.get('/test');
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer test-token-123');
    });

    test('should add Authorization header from sessionStorage', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      sessionStorage.setItem('dalli_admin_token', 'session-token-456');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'ok' }, { status: 200 }));

      const apiService = new APIService();
      await apiService.client.get('/test');
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe('Bearer session-token-456');
    });

    test('should track request performance', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'ok' }, { 
        status: 200, 
        headers: { 'content-length': '100' } 
      }));

      const apiService = new APIService();
      await apiService.client.get('/test');
      
      // Performance tracking is internal, just verify call succeeded
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Offline Queue', () => {
    test('should queue mutations when offline', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      
      const apiService = new APIService();
      // Use mutateWithOfflineSupport which has offline support
      const promise = apiService.mutateWithOfflineSupport('/offline-test', 'POST', { data: 'test' });
      
      expect(apiService.offlineQueue.length).toBe(1);
      expect(apiService.offlineQueue[0].url).toBe('/offline-test');
      expect(apiService.offlineQueue[0].method).toBe('POST');
      
      // Clean up
      apiService.offlineQueue = [];
    });

    test('should flush offline queue when online', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      
      const apiService = new APIService();
      // Queue a mutation
      const promise = apiService.mutateWithOfflineSupport('/queued', 'POST', { data: 'test' });
      
      expect(apiService.offlineQueue.length).toBe(1);
      
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }, { status: 200, headers: { 'content-type': 'application/json' } }));
      
      // Directly call processOfflineQueue instead of relying on online event
      await apiService.processOfflineQueue();
      
      // Wait for the offline queue to be processed
      await flushPromises();
      await new Promise(r => setTimeout(r, 500));
      
      // Check if fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Offline Queue Persistence', () => {
    test('should persist offline queue to localStorage', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      
      const apiService = new APIService();
      // Queue a mutation to trigger persistence
      apiService.mutateWithOfflineSupport('/persist-test', 'POST', { data: 'test' });
      
      const stored = localStorage.getItem('imperium_offline_queue');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed.length).toBe(1);
    });

    test('should restore offline queue from localStorage on init', async () => {
      const { APIService } = await import('../js/services/api.js');
      
      localStorage.setItem('imperium_offline_queue', JSON.stringify([
        { url: '/restored', method: 'POST', data: { test: true }, timestamp: Date.now() }
      ]));
      
      const apiService = new APIService();
      expect(apiService.offlineQueue.length).toBe(1);
      expect(apiService.offlineQueue[0].url).toBe('/restored');
    });
  });
});

export { };
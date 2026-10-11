import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  const store = {};
  return {
    getItem: vi.fn((key) => {
      const item = store[key];
      return item ? JSON.parse(item) : null;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.stringify(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  const store = {};
  return {
    getItem: vi.fn((key) => {
      const item = store[key];
      return item ? JSON.parse(item) : null;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.stringify(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob())
});

// Ensure a working Web Crypto implementation in the jsdom environment.
// jsdom does not always expose crypto.getRandomValues, which is required by
// services such as SecurityService.generateNonce().
const webCryptoMock = {
  getRandomValues(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  subtle: {
    digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
    importKey: vi.fn(() => Promise.resolve({})),
    encrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(16))),
    decrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(16)))
  }
};

function ensureWebCrypto() {
  if (
    typeof globalThis.crypto === 'undefined' ||
    typeof globalThis.crypto.getRandomValues !== 'function'
  ) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webCryptoMock,
      writable: true,
      configurable: true
    });
  }
}

ensureWebCrypto();

// jsdom may reinstall a partial `crypto` global between the setup phase and the
// test run, so make sure the mock is present before every test.
beforeEach(() => {
  ensureWebCrypto();
});

// Mock localStorage for state management
const mockState = {
  theme: 'system',
  user: null,
  cart: [],
  language: 'sr',
  currency: 'RSD'
};

vi.stubGlobal('state', mockState);

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Restore console for debugging when needed
global.__originalConsole = originalConsole;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock performance.now
Object.defineProperty(global.performance, 'now', {
  value: () => Date.now()
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  localStorage.clear();
  sessionStorage.clear();
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
// Jest setup file
// This file runs before each test suite

// Mock browser APIs
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    getManifest: () => ({ version: '0.1.0' }),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  bookmarks: {
    getTree: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onCreated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
} as any;

// Mock browser (Firefox) API - point to chrome mock
global.browser = global.chrome as any;

// Polyfill structuredClone for Node.js < 17
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => global.structuredClone(item));
    }
    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = global.structuredClone(obj[key]);
      }
    }
    return cloned;
  };
}

// Mock IndexedDB (used by Dexie)
import 'fake-indexeddb/auto';

// Suppress console errors in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';

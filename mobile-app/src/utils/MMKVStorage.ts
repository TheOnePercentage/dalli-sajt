import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

// Create MMKV instance
const storage = new MMKV({
  id: 'dalli-storage',
  encryptionKey: 'dalli-secure-key-2024',
  path: undefined, // Use default path
});

/**
 * MMKV Storage Utility
 * High-performance key-value storage for React Native
 * Uses MMKV (Mobile Key-Value) - faster than AsyncStorage
 */
export class MMKVStorage {
  private static instance: MMKV | null = null;

  static getInstance(): MMKV {
    if (!this.instance) {
      this.instance = new MMKV({
        id: 'dalli-storage',
        encryptionKey: 'dalli-secure-key-2024',
        path: undefined,
      });
    }
    return this.instance;
  }

  // String operations
  static setString(key: string, value: string): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, value);
    } catch (e) {
      console.error('MMKV setString failed:', e);
      return false;
    }
  }

  static getString(key: string): string | undefined {
    try {
      const storage = this.getInstance();
      return storage.getString(key);
    } catch (e) {
      console.error('MMKV getString failed:', e);
      return undefined;
    }
  }

  static setBoolean(key: string, value: boolean): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, value);
    } catch (e) {
      console.error('MMKV setBoolean failed:', e);
      return false;
    }
  }

  static getBoolean(key: string): boolean {
    try {
      const storage = this.getInstance();
      return storage.getBoolean(key) ?? false;
    } catch (e) {
      console.error('MMKV getBoolean failed:', e);
      return false;
    }
  }

  static setNumber(key: string, value: number): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, value);
    } catch (e) {
      console.error('MMKV setNumber failed:', e);
      return false;
    }
  }

  static getNumber(key: string): number {
    try {
      const storage = this.getInstance();
      return storage.getNumber(key) ?? 0;
    } catch (e) {
      console.error('MMKV getNumber failed:', e);
      return 0;
    }
  }

  // JSON operations
  static setJSON(key: string, value: any): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error('MMKV setJSON failed:', e);
      return false;
    }
  }

  static getJSON<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const storage = this.getInstance();
      const value = storage.getString(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return defaultValue;
    } catch (e) {
      console.error('MMKV getJSON failed:', e);
      return defaultValue;
    }
  }

  static setArray(key: string, value: any[]): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error('MMKV setArray failed:', e);
      return false;
    }
  }

  static getArray<T>(key: string, defaultValue: T[] = []): T[] {
    try {
      const storage = this.getInstance();
      const value = storage.getString(key);
      if (value) {
        return JSON.parse(value) as T[];
      }
      return defaultValue;
    } catch (e) {
      console.error('MMKV getArray failed:', e);
      return defaultValue;
    }
  }

  static setObject(key: string, value: object): boolean {
    try {
      const storage = this.getInstance();
      return storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error('MMKV setObject failed:', e);
      return false;
    }
  }

  static getObject<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const storage = this.getInstance();
      const value = storage.getString(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return defaultValue;
    } catch (e) {
      console.error('MMKV getObject failed:', e);
      return defaultValue;
    }
  }

  static delete(key: string): boolean {
    try {
      const storage = this.getInstance();
      storage.delete(key);
      return true;
    } catch (e) {
      console.error('MMKV delete failed:', e);
      return false;
    }
  }

  static deleteAll(): boolean {
    try {
      const storage = this.getInstance();
      storage.clearAll();
      return true;
    } catch (e) {
      console.error('MMKV deleteAll failed:', e);
      return false;
    }
  }

  static getAllKeys(): string[] {
    try {
      const storage = this.getInstance();
      return storage.getAllKeys();
    } catch (e) {
      console.error('MMKV getAllKeys failed:', e);
      return [];
    }
  }

  static contains(key: string): boolean {
    try {
      const storage = this.getInstance();
      return storage.contains(key);
    } catch (e) {
      return false;
    }
  }

  static getSize(): number {
    try {
      const storage = this.getInstance();
      return storage.size();
    } catch (e) {
      return 0;
    }
  }

  // Batch operations for performance
  static multiSet(keyValuePairs: [string, string][]): boolean {
    try {
      const storage = this.getInstance();
      storage.multiSet(keyValuePairs);
      return true;
    } catch (e) {
      console.error('MMKV multiSet failed:', e);
      return false;
    }
  }

  static multiGet(keys: string[]): (string | undefined)[] {
    try {
      const storage = this.getInstance();
      return storage.multiGet(keys);
    } catch (e) {
      console.error('MMKV multiGet failed:', e);
      return keys.map(() => undefined);
    }
  }

  static multiRemove(keys: string[]): boolean {
    try {
      const storage = this.getInstance();
      storage.multiRemove(keys);
      return true;
    } catch (e) {
      console.error('MMKV multiRemove failed:', e);
      return false;
    }
  }

  // Utility methods
  static async setItem(key: string, value: string): Promise<void> {
    this.setString(key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    const value = this.getString(key);
    return value ?? null;
  }

  static async removeItem(key: string): Promise<void> {
    this.delete(key);
  }

  static async clear(): Promise<void> {
    this.deleteAll();
  }

  static async getAllKeys(): Promise<string[]> {
    return this.getAllKeys();
  }

  // Encryption helpers
  static encrypt(value: string, key?: string): string {
    // In production, use proper encryption
    // This is a simple base64 encoding for demo
    return btoa(value);
  }

  static decrypt(value: string, key?: string): string {
    // In production, use proper decryption
    return atob(value);
  }

  // Namespace support
  static namespace(namespace: string) {
    return {
      setString: (key: string, value: string) => this.setString(`${namespace}:${key}`, value),
      getString: (key: string) => this.getString(`${namespace}:${key}`),
      setJSON: (key: string, value: any) => this.setJSON(`${namespace}:${key}`, value),
      getJSON: <T>(key: string, defaultValue?: T) => this.getJSON<T>(`${namespace}:${key}`, defaultValue),
      delete: (key: string) => this.delete(`${namespace}:${key}`),
      getAllKeys: () => this.getAllKeys().filter(k => k.startsWith(`${namespace}:`)),
      clear: () => {
        this.getAllKeys()
          .filter(k => k.startsWith(`${namespace}:`))
          .forEach(k => this.delete(k));
      },
    };
  }

  // Namespace instances for different domains
  static auth = this.namespace('auth');
  static cart = this.namespace('cart');
  static wishlist = this.namespace('wishlist');
  static user = this.namespace('user');
  static settings = this.namespace('settings');
  static cache = this.namespace('cache');
  static analytics = this.namespace('analytics');
}

export default MMKVStorage;
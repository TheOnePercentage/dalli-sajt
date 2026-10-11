/**
 * Crypto Utilities for Token Encryption
 * Uses Web Crypto API (AES-GCM 256-bit)
 */

const ENCRYPTION_KEY_NAME = 'dalli-social-tokens';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit for GCM

export class CryptoManager {
  constructor() {
    this.key = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Try to get existing key from IndexedDB
    this.key = await this.getOrCreateKey();
    this.initialized = true;
  }

  async getOrCreateKey() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DALLI_Crypto', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
      
      request.onsuccess = async (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get(ENCRYPTION_KEY_NAME);
        
        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            // Import existing key
            const key = await crypto.subtle.importKey(
              'raw',
              getRequest.result,
              { name: ALGORITHM },
              false,
              ['encrypt', 'decrypt']
            );
            resolve(key);
          } else {
            // Generate new key
            const key = await crypto.subtle.generateKey(
              { name: ALGORITHM, length: KEY_LENGTH },
              true, // extractable
              ['encrypt', 'decrypt']
            );
            
            // Export and store raw key
            const rawKey = await crypto.subtle.exportKey('raw', key);
            const storeTransaction = db.transaction(['keys'], 'readwrite');
            const keyStore = storeTransaction.objectStore('keys');
            keyStore.put(rawKey, ENCRYPTION_KEY_NAME);
            
            resolve(key);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async encrypt(data) {
    if (!this.initialized) await this.init();
    
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      this.key,
      plaintext
    );
    
    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData) {
    if (!this.initialized) await this.init();
    
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      this.key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
  }

  async encryptToken(token) {
    return this.encrypt({ token, timestamp: Date.now() });
  }

  async decryptToken(encryptedToken) {
    const data = await this.decrypt(encryptedToken);
    return data.token;
  }
}

// Singleton instance
export const cryptoManager = new CryptoManager();

// Helper functions for easy use
export async function encryptToken(token) {
  return cryptoManager.encryptToken(token);
}

export async function decryptToken(encryptedToken) {
  return cryptoManager.decryptToken(encryptedToken);
}

export async function encryptData(data) {
  return cryptoManager.encrypt(data);
}

export async function decryptData(encryptedData) {
  return cryptoManager.decrypt(encryptedData);
}

export default CryptoManager;
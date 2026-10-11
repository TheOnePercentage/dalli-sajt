/**
 * Secrets Management Utility
 * Secure handling of sensitive configuration at runtime
 */

class SecretsManager {
  constructor() {
    this.cache = new Map();
    this.encryptionKey = null;
    this.initialized = false;
  }

  static getInstance() {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  async initialize(masterKey) {
    if (this.initialized) return;

    if (masterKey) {
      this.encryptionKey = await this.deriveKey(masterKey);
    } else {
      this.encryptionKey = await this.getOrCreateKey();
    }

    await this.loadFromStorage();
    this.initialized = true;
  }

  async deriveKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = encoder.encode('imperium-admin-salt-v1');
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async getOrCreateKey() {
    const stored = localStorage.getItem('imperium_master_key');
    if (stored) {
      const keyData = JSON.parse(stored);
      return crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const jwk = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem('imperium_master_key', JSON.stringify(jwk));
    return key;
  }

  async setSecret(name, value, options = {}) {
    if (!this.initialized) await this.initialize();

    const now = new Date().toISOString();
    const metadata = {
      name,
      version: options.version || this.generateVersion(),
      createdAt: now,
      expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn).toISOString() : undefined,
      rotationInterval: options.rotationInterval,
    };

    let storedValue;
    let encrypted = false;

    if (this.encryptionKey && this.isSensitive(name)) {
      storedValue = await this.encrypt(value);
      encrypted = true;
    } else {
      storedValue = value;
    }

    const secret = { value: storedValue, metadata, encrypted };
    this.cache.set(name, secret);
    await this.persistToStorage(name, secret);
  }

  async getSecret(name) {
    if (!this.initialized) await this.initialize();

    const secret = this.cache.get(name);
    if (!secret) return null;

    if (secret.metadata.expiresAt && new Date(secret.metadata.expiresAt) < new Date()) {
      await this.deleteSecret(name);
      return null;
    }

    if (secret.encrypted && this.encryptionKey) {
      return this.decrypt(secret.value);
    }

    return secret.value;
  }

  async deleteSecret(name) {
    this.cache.delete(name);
    localStorage.removeItem(`imperium_secret_${name}`);
  }

  async rotateSecret(name, newValue) {
    const existing = this.cache.get(name);
    const version = existing ? this.incrementVersion(existing.metadata.version) : this.generateVersion();
    await this.setSecret(name, newValue, { version });
  }

  async getAllSecrets() {
    if (!this.initialized) await this.initialize();

    const result = {};
    for (const [name, secret] of this.cache) {
      if (secret.metadata.expiresAt && new Date(secret.metadata.expiresAt) < new Date()) {
        await this.deleteSecret(name);
        continue;
      }
      result[name] = {
        value: secret.encrypted && this.encryptionKey ? await this.decrypt(secret.value) : secret.value,
        metadata: secret.metadata,
      };
    }
    return result;
  }

  async checkRotationNeeded() {
    const now = Date.now();
    const toRotate = [];

    for (const [name, secret] of this.cache) {
      if (secret.metadata.rotationInterval) {
        const created = new Date(secret.metadata.createdAt).getTime();
        const nextRotation = created + secret.metadata.rotationInterval;
        if (now >= nextRotation) {
          toRotate.push(name);
        }
      }
    }

    return toRotate;
  }

  isSensitive(name) {
    const sensitivePatterns = [
      /key$/i,
      /secret$/i,
      /token$/i,
      /password$/i,
      /dsn$/i,
      /api_key/i,
      /private/i,
      /credential/i,
    ];
    return sensitivePatterns.some(p => p.test(name));
  }

  generateVersion() {
    return `v${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
  }

  incrementVersion(version) {
    const match = version.match(/^v(\d+)([a-z0-9]+)$/);
    if (match) {
      return `v${parseInt(match[1], 10) + 1}${match[2]}`;
    }
    return this.generateVersion();
  }

  async encrypt(plaintext) {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(ciphertext) {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  async loadFromStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('imperium_secret_')) {
        try {
          const name = key.replace('imperium_secret_', '');
          const stored = JSON.parse(localStorage.getItem(key));
          this.cache.set(name, stored);
        } catch (e) {
          console.warn(`[Secrets] Failed to load secret ${key}:`, e);
        }
      }
    }
  }

  async persistToStorage(name, secret) {
    localStorage.setItem(`imperium_secret_${name}`, JSON.stringify(secret));
  }

  clearCache() {
    this.cache.clear();
  }

  async exportSecrets(includeValues = false) {
    const secrets = await this.getAllSecrets();
    const exportData = includeValues
      ? secrets
      : Object.fromEntries(
          Object.entries(secrets).map(([k, v]) => [k, { ...v, value: '[REDACTED]' }])
        );
    return JSON.stringify(exportData, null, 2);
  }

  async importSecrets(json, overwrite = false) {
    const data = JSON.parse(json);
    for (const [name, { value, metadata }] of Object.entries(data)) {
      if (!overwrite && this.cache.has(name)) continue;
      await this.setSecret(name, value, {
        version: metadata.version,
        rotationInterval: metadata.rotationInterval,
      });
    }
  }
}

const secretsManager = SecretsManager.getInstance();
export default secretsManager;
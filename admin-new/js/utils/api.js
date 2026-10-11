/**
 * API Client - HTTP Client with Interceptors
 * Flexible fetch wrapper with request/response interceptors
 */

const DEFAULT_OPTIONS = {
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  credentials: 'same-origin',
  retries: 3,
  retryDelay: 1000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504]
};

export class APIClient {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.interceptors = {
      request: [],
      response: [],
      error: []
    };
    this.cancelTokens = new Map();
  }

  setBaseURL(baseURL) {
    this.options.baseURL = baseURL;
  }

  setHeader(key, value) {
    this.options.headers[key] = value;
  }

  removeHeader(key) {
    delete this.options.headers[key];
  }

  setAuthToken(token) {
    if (token) {
      this.options.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.options.headers.Authorization;
    }
  }

  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
    return () => this._removeInterceptor(this.interceptors.request, interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
    return () => this._removeInterceptor(this.interceptors.response, interceptor);
  }

  addErrorInterceptor(interceptor) {
    this.interceptors.error.push(interceptor);
    return () => this._removeInterceptor(this.interceptors.error, interceptor);
  }

  _removeInterceptor(array, interceptor) {
    const idx = array.indexOf(interceptor);
    if (idx > -1) array.splice(idx, 1);
  }

  async request(config) {
    let mergedConfig = { ...this.options, ...config };
    const url = this._buildURL(mergedConfig.url);

    if (mergedConfig.params) {
      const searchParams = new URLSearchParams(mergedConfig.params);
      const separator = mergedConfig.url.includes('?') ? '&' : '?';
      mergedConfig.url += separator + new URLSearchParams(mergedConfig.params).toString();
    }

    // Apply request interceptors first
    for (const interceptor of this.interceptors.request) {
      const result = await interceptor(mergedConfig, this);
      if (result) mergedConfig = { ...mergedConfig, ...result };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeout || this.options.timeout);

    let finalConfig = {
      method: (mergedConfig.method || 'GET').toUpperCase(),
      headers: { ...this.options.headers, ...mergedConfig.headers },
      credentials: mergedConfig.credentials || this.options.credentials,
      signal: controller.signal,
      cache: mergedConfig.cache || 'no-cache'
    };

    if (mergedConfig.data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(finalConfig.method)) {
      if (mergedConfig.data instanceof FormData) {
        finalConfig.body = mergedConfig.data;
        delete finalConfig.headers['Content-Type'];
      } else if (typeof mergedConfig.data === 'object') {
        finalConfig.body = JSON.stringify(mergedConfig.data);
      } else {
        finalConfig.body = mergedConfig.data;
      }
    }

    let attempt = 0;
    const maxAttempts = (mergedConfig.retries ?? this.options.retries) + 1;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(this._buildURL(mergedConfig.url), finalConfig);

        let responseData;
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType?.includes('text/')) {
          responseData = await response.text();
        } else {
          responseData = await response.blob();
        }

        const responseObj = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config: mergedConfig,
          request: mergedConfig
        };

        let responseResult = responseObj;
        for (const interceptor of this.interceptors.response) {
          const result = await interceptor(responseResult, this);
          if (result !== undefined) responseResult = result;
        }

        // Check for retryable status codes after response interceptors
        if (responseResult.status && responseResult.config?.retryStatusCodes?.includes(responseResult.status)) {
          const error = new Error(`HTTP ${responseResult.status}`);
          error.status = responseResult.status;
          error.config = mergedConfig;
          throw error;
        }

        return responseResult;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw this._createError('ECONNABORTED', 'Request aborted', mergedConfig);
        }

        const isRetryable = this._isRetryableError(error, mergedConfig);
        const isLastAttempt = attempt >= (mergedConfig.retries ?? this.options.retries);

        if (isRetryable && !isLastAttempt) {
          attempt++;
          const delay = this._calculateRetryDelay(attempt, mergedConfig);
          await this._sleep(delay);
          continue;
        }

        let apiError;
        for (const interceptor of this.interceptors.error) {
          const result = await interceptor(error, this);
          if (result !== undefined) {
            if (result === false) return Promise.reject(error);
            if (result instanceof Error) throw result;
            throw result;
          }
        }

        throw error;
      }
    }

    clearTimeout(timeoutId);
    throw this._createError('ETIMEDOUT', 'Request timeout', mergedConfig);
  }

  _buildURL(url) {
    if (!url) return this.options.baseURL;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url.startsWith('/') ? `${this.options.baseURL}${url}` : url;
    }
    return `${this.options.baseURL.replace(/\/$/, '')}/${url}`;
  }

  _isRetryableError(error, config) {
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) return true;
    if (error.status && config.retryStatusCodes?.includes(error.status)) return true;
    return false;
  }

  _calculateRetryDelay(attempt, config) {
    const baseDelay = config.retryDelay ?? this.options.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _createError(code, message, config) {
    const error = new Error(message);
    error.code = code;
    error.config = config;
    error.isAxiosError = true;
    error.toJSON = () => ({
      message: error.message,
      name: error.name,
      code: error.code,
      config: config
    });
    return error;
  }

  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  head(url, config = {}) {
    return this.request({ ...config, method: 'HEAD', url });
  }

  options(url, config = {}) {
    return this.request({ ...config, method: 'OPTIONS', url });
  }

  async upload(url, formData, config = {}) {
    return this.request({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: { ...config.headers }
    });
  }

  download(url, config = {}) {
    return this.request({
      ...config,
      method: 'GET',
      url,
      responseType: 'blob'
    });
  }

  createCancelToken() {
    const controller = new AbortController();
    const token = {
      cancel: (message) => controller.abort(message),
      promise: new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(controller.signal.reason));
      })
    };
    return token;
  }

  createFormData(data) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(`${key}[]`, v));
        } else if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return formData;
  }

  static create(config) {
    return new APIClient(config);
  }
}

export const api = new APIClient();

export function createApi(config) {
  return new APIClient(config);
}

export default APIClient;
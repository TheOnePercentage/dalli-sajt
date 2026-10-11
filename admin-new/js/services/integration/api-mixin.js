/**
 * API Mixin - Adds API capabilities to section components
 */

export const APIMixin = {
  api: null,
  isLoading: false,

  initAPI() {
    this.api = window.apiService || window.imperium?.apiService;
    if (!this.api) {
      console.warn('[API] API service not available, using mock data');
    }
  },

  async loadData(apiCall, options = {}) {
    const { silent = false, onSuccess, onError, finally: finallyCb } = options;

    if (this.isLoading) return;
    this.isLoading = true;
    this.setLoadingState?.(true);

    if (!silent) {
      this.setLoadingState?.(true);
    }

    try {
      const data = await this.api[apiCall]();
      if (onSuccess) await onSuccess(data);
      return data;
    } catch (error) {
      console.error(`[API] ${apiCall} failed:`, error);
      if (!silent) {
        this.admin?.toastContainer?.error(error.message || 'Greška pri učitavanju podataka');
      }
      if (onError) await onError(error);
      throw error;
    } finally {
      this.isLoading = false;
      if (!silent) {
        this.setLoadingState?.(false);
      }
      if (finallyCb) await finallyCb();
    }
  },

  async apiCall(method, ...args) {
    if (!this.api) {
      console.warn('[API] Service not available');
      return null;
    }
    if (!this.api[method]) {
      console.warn(`[API] Method ${method} not found`);
      return null;
    }
    return this.api[method](...args);
  },

  async optimisticUpdate(apiCall, optimisticData, options = {}) {
    const { onSuccess, onError, rollbackOnError = true } = options;

    if (options.onOptimistic) {
      options.onOptimistic(optimisticData);
    }

    try {
      const result = await this.apiCall(apiCall, optimisticData);
      if (onSuccess) await onSuccess(result);
      return result;
    } catch (error) {
      if (rollbackOnError && options.onRollback) {
        options.onRollback();
      }
      if (onError) await onError(error);
      throw error;
    }
  },

  async batchCalls(calls) {
    const results = await Promise.allSettled(
      calls.map(({ method, args }) => this.apiCall(method, ...args))
    );
    return results.map((result, i) => ({
      method: calls[i].method,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }
};
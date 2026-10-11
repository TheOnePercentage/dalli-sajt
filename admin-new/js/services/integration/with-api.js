/**
 * Higher-order component to add API capabilities
 */
export function withAPI(ComponentClass) {
  return class extends ComponentClass {
    constructor(options = {}) {
      super(options);
      this.api = window.apiService || window.imperium?.apiService;
    }

    initAPI() {
      this.api = window.apiService || window.imperium?.apiService;
    }
  };
}
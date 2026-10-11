/**
 * EventBus - Centralized event system for admin panel
 * Decouples components via publish/subscribe pattern
 */
export class EventBus {
  constructor() {
    this._handlers = new Map();
    this._onceHandlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler);
      handler(...args);
    };
    return this.on(event, onceHandler);
  }

  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler);
      if (this._handlers.get(event).size === 0) {
        this._handlers.delete(event);
      }
    }
  }

  emit(event, ...args) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).forEach(handler => {
        try {
          handler(...args);
        } catch (err) {
          console.error(`EventBus error in handler for "${event}":`, err);
        }
      });
    }
  }

  clear(event) {
    if (event) {
      this._handlers.delete(event);
    } else {
      this._handlers.clear();
    }
  }

  listenerCount(event) {
    return this._handlers.has(event) ? this._handlers.get(event).size : 0;
  }

  eventNames() {
    return Array.from(this._handlers.keys());
  }
}

export const AdminEvents = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_ROLE_CHANGED: 'auth:roleChanged',
  AUTH_SESSION_EXPIRED: 'auth:sessionExpired',
  TOAST_SHOW: 'toast:show',
  TOAST_HIDE: 'toast:hide',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  MODAL_CLOSE_ALL: 'modal:closeAll',
  NAV_TAB_CHANGED: 'nav:tabChanged',
  NAV_ROUTE_CHANGED: 'nav:routeChanged',
  DATA_ORDERS_CHANGED: 'data:ordersChanged',
  DATA_COMPLAINTS_CHANGED: 'data:complaintsChanged',
  DATA_ADS_CHANGED: 'data:adsChanged',
  DATA_EMPLOYEES_CHANGED: 'data:employeesChanged',
  DATA_PRODUCTS_CHANGED: 'data:productsChanged',
  DATA_SETTINGS_CHANGED: 'data:settingsChanged',
  FORM_DIRTY: 'form:dirty',
  FORM_CLEAN: 'form:clean',
  FORM_SUBMIT: 'form:submit',
  FORM_RESET: 'form:reset',
  SHORTCUT_REGISTERED: 'shortcut:registered',
  SHORTCUT_UNREGISTERED: 'shortcut:unregistered',
  SHORTCUT_TRIGGERED: 'shortcut:triggered',
  THEME_CHANGED: 'theme:changed',
  EMPLOYEE_ADDED: 'employee:added',
  EMPLOYEE_UPDATED: 'employee:updated',
  EMPLOYEE_DELETED: 'employee:deleted',
  EMPLOYEE_ROLE_CHANGED: 'employee:roleChanged',
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  ORDER_STATUS_CHANGED: 'order:statusChanged',
  COMPLAINT_CREATED: 'complaint:created',
  COMPLAINT_UPDATED: 'complaint:updated',
  COMPLAINT_DELETED: 'complaint:deleted',
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCT_VARIANT_CHANGED: 'product:variantChanged',
};

// Singleton instance for backward compatibility
const eventBusInstance = new EventBus();

// Export for window global (backward compat)
if (typeof window !== 'undefined') {
  window.AdminEventBus = eventBusInstance;
  window.AdminEvents = AdminEvents;
}

export default eventBusInstance;

class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }
    this.onceEvents.get(event).add(handler);
    return () => this.offOnce(event, handler);
  }

  off(event, handler) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.events.delete(event);
    }
  }

  offOnce(event, handler) {
    const handlers = this.onceEvents.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.onceEvents.delete(event);
    }
  }

  emit(event, data) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`EventBus: error in handler for "${event}"`, err);
        }
      });
    }

    const onceHandlers = this.onceEvents.get(event);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`EventBus: error in once handler for "${event}"`, err);
        }
      });
      this.onceEvents.delete(event);
    }
  }

  clear(event) {
    if (event) {
      this.events.delete(event);
      this.onceEvents.delete(event);
    } else {
      this.events.clear();
      this.onceEvents.clear();
    }
  }

  hasListeners(event) {
    return (this.events.get(event)?.size ?? 0) > 0 || (this.onceEvents.get(event)?.size ?? 0) > 0;
  }
}

export const eventBus = new EventBus();

export const on = (event, handler) => eventBus.on(event, handler);
export const once = (event, handler) => eventBus.once(event, handler);
export const off = (event, handler) => eventBus.off(event, handler);
export const emit = (event, data) => eventBus.emit(event, data);

export const createEvent = (name) => ({
  name,
  emit: (data) => emit(name, data),
  on: (handler) => on(name, handler),
  once: (handler) => once(name, handler),
  off: (handler) => off(name, handler)
});

export const DOM_EVENTS = {
  CART_CHANGED: 'dalli:cart:changed',
  CART_ITEM_ADDED: 'dalli:cart:item-added',
  CART_ITEM_REMOVED: 'dalli:cart:item-removed',
  CART_ITEM_UPDATED: 'dalli:cart:item-updated',
  CART_CLEARED: 'dalli:cart:cleared',

  USER_LOGGED_IN: 'dalli:user:logged-in',
  USER_LOGGED_OUT: 'dalli:user:logged-out',
  USER_UPDATED: 'dalli:user:updated',

  THEME_CHANGED: 'dalli:theme:changed',
  LANGUAGE_CHANGED: 'dalli:language:changed',
  CURRENCY_CHANGED: 'dalli:currency:changed',

  DRAWER_OPENED: 'dalli:drawer:opened',
  DRAWER_CLOSED: 'dalli:drawer:closed',
  MODAL_OPENED: 'dalli:modal:opened',
  MODAL_CLOSED: 'dalli:modal:closed',

  PRODUCT_LOADED: 'dalli:product:loaded',
  PRODUCTS_LOADED: 'dalli:products:loaded',
  FEATURED_TAB_CHANGED: 'dalli:featured:tab-changed',

  TOAST_SHOW: 'dalli:toast:show',
  TOAST_HIDE: 'dalli:toast:hide',

  ANALYTICS_TRACK: 'dalli:analytics:track',

  MARKET_CHANGED: 'dalli:market:changed',
  NETWORK_STATUS: 'dalli:network:status',

  VTO_OPEN: 'dalli:vto:open',
  VTO_CLOSE: 'dalli:vto:close',
  VTO_STEP_CHANGE: 'dalli:vto:step-change',
  VTO_RESULT: 'dalli:vto:result',
  VTO_ERROR: 'dalli:vto:error',

  PRODUCT360_OPEN: 'dalli:product360:open',
  PRODUCT360_CLOSE: 'dalli:product360:close'
};
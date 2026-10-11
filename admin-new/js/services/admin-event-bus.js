import { log, createLogger } from '../utils/logger.js';
import { getEventBus } from '../core/event-bus.js';

const logger = createLogger('AdminEventBus');
const globalEventBus = getEventBus();

export class AdminEventBus {
  constructor(admin) {
    this.admin = admin;
    this.listeners = new Map();
    this.delegatedEvents = new Map();
  }

  emit(event, detail = {}) {
    // Emit to internal listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(detail);
        } catch (error) {
          logger.error({ err: error }, `Error in event handler for ${event}`);
        }
      });
    }

    // Emit to global event bus
    globalEventBus.emit(event, detail);

    // Emit as custom DOM event for backward compatibility
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`dalli:${event}`, { detail }));
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  once(event, handler) {
    const unsubscribe = this.on(event, (detail) => {
      unsubscribe();
      handler(detail);
    });
    return unsubscribe;
  }

  delegate(eventType, selector, handler) {
    const key = `${eventType}:${selector}`;
    
    if (this.delegatedEvents.has(key)) {
      return; // Already delegated
    }

    const wrappedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler(e, target);
      }
    };

    document.addEventListener(eventType, wrappedHandler);
    this.delegatedEvents.set(key, { eventType, selector, handler: wrappedHandler });

    return () => {
      document.removeEventListener(eventType, wrappedHandler);
      this.delegatedEvents.delete(key);
    };
  }

  undelegate(eventType, selector) {
    const key = `${eventType}:${selector}`;
    const delegated = this.delegatedEvents.get(key);
    if (delegated) {
      document.removeEventListener(delegated.eventType, delegated.handler);
      this.delegatedEvents.delete(key);
    }
  }

  broadcast(eventType, payload) {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('dalli-admin');
      channel.postMessage({ type: eventType, payload, timestamp: Date.now() });
    }
  }

  initMultiTabSync() {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('dalli-admin');
    
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'theme-change':
          this.admin.store.setState({ theme: payload.theme });
          break;
        case 'locale-change':
          this.admin.setLocale(payload.locale);
          break;
        case 'sidebar-toggle':
          this.admin.toggleSidebar(payload.collapsed);
          break;
        case 'logout':
          this.admin.authManager.handleLogout();
          break;
        case 'notification':
          this.admin.toastContainer.show({ ...payload, type: payload.type || 'info' });
          break;
      }
    };

    // Store channel for cleanup
    this.broadcastChannel = channel;
  }

  destroy() {
    this.listeners.clear();
    
    this.delegatedEvents.forEach(({ eventType, handler }) => {
      document.removeEventListener(eventType, handler);
    });
    this.delegatedEvents.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
/**
 * Unified Event Bus - Single source of truth for all events
 * Replaces: document.dispatchEvent('dalli:*'), App.eventBus, Component.emit/onEvent
 * 
 * Usage:
 *   import { eventBus } from './core/event-bus.js';
 *   eventBus.on('section:change', handler);
 *   eventBus.emit('section:change', { section: 'orders' });
 *   eventBus.off('section:change', handler);
 *   
 *   // In Components/Sections with injected eventBus:
 *   this.eventBus.on('section:change', handler);
 *   this.eventBus.emit('action:save', data);
 */

export class EventBus {
  constructor() {
    this.target = new EventTarget();
    this.handlers = new Map(); // for tracking and cleanup
  }

  on(event, handler, options) {
    const wrapped = (e) => handler(e.detail, e);
    this.target.addEventListener(event, wrapped, options);
    this._track(event, handler, wrapped);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const key = `${event}:${handler.name || handler.toString()}`;
    if (this.handlers.has(key)) {
      const { wrapped } = this.handlers.get(key);
      this.target.removeEventListener(event, wrapped);
      this.handlers.delete(key);
    }
  }

  once(event, handler) {
    const wrapper = (e) => {
      handler(e.detail, e);
      this.off(event, handler);
    };
    this.target.addEventListener(event, wrapper);
    this._track(event, handler, wrapper);
    return () => this.off(event, handler);
  }

  emit(event, detail) {
    this.target.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
  }

  _track(event, handler, wrapped) {
    const key = `${event}:${handler.name || handler.toString()}`;
    this.handlers.set(key, { event, handler, wrapped });
  }

  clear() {
    this.handlers.forEach(({ event, wrapped }) => {
      this.target.removeEventListener(event, wrapped);
    });
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Helper for components/sections to get eventBus
export function getEventBus() {
  return eventBus;
}

// Component mixin for easy eventBus integration
export function withEventBus(ComponentClass) {
  return class extends ComponentClass {
    constructor(options = {}) {
      super(options);
      this.eventBus = options.eventBus || getEventBus();
      this._eventCleanup = [];
    }

    on(event, handler) {
      return this.eventBus.on(event, handler.bind(this));
    }

    off(event, handler) {
      return this.eventBus.off(event, handler.bind(this));
    }

    once(event, handler) {
      return this.eventBus.once(event, handler.bind(this));
    }

    emit(event, detail) {
      this.eventBus.emit(event, detail);
    }

    onEvent(event, handler) {
      return this.eventBus.on(event, handler.bind(this));
    }

    destroy() {
      if (this._eventCleanup) {
        this._eventCleanup.forEach(cleanup => cleanup());
        this._eventCleanup = [];
      }
      super.destroy?.();
    }
  };
}

export default eventBus;
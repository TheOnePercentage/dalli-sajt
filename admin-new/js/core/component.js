import { getEventBus } from './event-bus.js';

export class Component {
  constructor(options = {}) {
    this.options = options;
    this.element = null;
    this.children = new Map();
    this.eventHandlers = new Map();
    this.state = options.initialState || {};
    this.props = options.props || {};
    this.refs = new Map();
    this.mounted = false;
    this.destroyed = false;
    // Use unified event bus
    this.eventBus = options.eventBus || (typeof getEventBus === 'function' ? getEventBus() : null);
  }

  createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  render() {
    return '<div></div>';
  }

  mount(container) {
    if (this.destroyed) return;
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (!container) {
      console.error('Mount container not found');
      return;
    }

    // Support both render patterns:
    //  1) render() returns an HTML string (the component's root element)
    //  2) render() writes into this.element.innerHTML and returns nothing
    if (!this.element) {
      this.element = document.createElement('div');
    }

    const html = this.render();

    if (typeof html === 'string' && html.trim()) {
      const parsed = this.createElement(html);
      if (parsed) this.element = parsed;
      else this.element.innerHTML = html;
    } else if (html && typeof html === 'object') {
      this.element = html;
    }

    if (!this.element.parentNode) {
      container.appendChild(this.element);
    }

    this.bindEvents();
    this.mounted = true;
    this.onMount();
  }

  unmount() {
    this.onUnmount();
    this.destroyed = true;
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(({ element, handler, options }) => {
        if (element) element.removeEventListener(event, handler, options);
      });
    });
    this.eventHandlers.clear();
    this.children.forEach(child => child.unmount());
    this.children.clear();
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.mounted = false;
  }

  onMount() {}
  onUnmount() {}

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.update();
  }

  setProps(props) {
    this.props = { ...this.props, ...props };
    this.update();
  }

  update() {
    if (!this.mounted || this.destroyed) return;
    if (!this.element) this.element = document.createElement('div');
    const newHtml = this.render();
    if (typeof newHtml === 'string' && newHtml.trim()) {
      const newElement = this.createElement(newHtml);
      if (newElement) {
        this.transferRefs(this.element, newElement);
        this.element.replaceWith(newElement);
        this.element = newElement;
        this.bindEvents();
      } else {
        this.element.innerHTML = newHtml;
      }
    }
    // If render() mutated this.element.innerHTML, nothing more to do.
  }

  transferRefs(oldElement, newElement) {
    const oldRefs = oldElement.querySelectorAll('[data-ref]');
    const newRefs = newElement.querySelectorAll('[data-ref]');
    oldRefs.forEach((oldEl, index) => {
      const refName = oldEl.dataset.ref;
      if (newRefs[index]) {
        this.refs.set(refName, newRefs[index]);
      }
    });
  }

  bindEvents() {
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(({ selector, handler, options }) => {
        const elements = selector ? this.element.querySelectorAll(selector) : [this.element];
        elements.forEach(el => el.addEventListener(event, handler, options));
      });
    });
  }

  on(event, selector, handler, options) {
    if (typeof selector === 'function') {
      options = handler;
      handler = selector;
      selector = null;
    }

    const wrappedHandler = e => {
      if (selector) {
        const target = e.target.closest(selector);
        if (!target || !this.element.contains(target)) return;
        e.delegateTarget = target;
      }
      handler.call(this, e);
    };

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push({ selector, handler: wrappedHandler, options });

    if (this.mounted) {
      const elements = selector ? this.element.querySelectorAll(selector) : [this.element];
      elements.forEach(el => el.addEventListener(event, wrappedHandler, options));
    }
  }

  off(event, selector, handler) {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const index = handlers.findIndex(h => h.selector === selector && h.handler === handler);
    if (index > -1) {
      const { handler: wrappedHandler } = handlers[index];
      if (this.mounted) {
        const elements = selector ? this.element.querySelectorAll(selector) : [this.element];
        elements.forEach(el => el.removeEventListener(event, wrappedHandler));
      }
      handlers.splice(index, 1);
    }
  }

  emit(event, detail) {
    if (this.eventBus) {
      this.eventBus.emit(event, detail);
    } else if (this.element) {
      // Fallback to element-based events
      this.element.dispatchEvent(
        new CustomEvent(`dalli:${event}`, {
          detail,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  onEvent(event, handler) {
    if (this.eventBus) {
      return this.eventBus.on(event, handler);
    } else if (this.element) {
      this.element.addEventListener(`dalli:${event}`, handler);
      return () => this.element.removeEventListener(`dalli:${event}`, handler);
    }
  }

  ref(name, element = null) {
    if (element) {
      this.refs.set(name, element);
      return element;
    }
    return (
      this.refs.get(name) ||
      (this.element ? this.element.querySelector(`[data-ref="${name}"]`) : null)
    );
  }

  query(selector) {
    return this.element?.querySelector(selector);
  }

  queryAll(selector) {
    return this.element?.querySelectorAll(selector) || [];
  }

  delegate(eventType, selector, handler) {
    // Try to use admin's delegate method if available
    if (this.admin && typeof this.admin.delegate === 'function') {
      return this.admin.delegate(eventType, selector, (e, target) => handler.call(this, e, target));
    }
    // Fallback to direct event delegation
    const boundHandler = e => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(this, e, target);
      }
    };
    document.addEventListener(eventType, boundHandler);
    return () => document.removeEventListener(eventType, boundHandler);
  }

  // Programmatic confirmation dialog using ModalManager
  async confirm(message, options = {}) {
    const modalManager = window.ModalManager;
    if (!modalManager) {
      // Fallback to native confirm if ModalManager not available
      return window.confirm(message);
    }
    return modalManager.confirm({
      message,
      title: options.title || 'Potvrda',
      confirmText: options.confirmText || 'Da',
      cancelText: options.cancelText || 'Ne',
      variant: options.variant || 'danger',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }

  findComponent(name) {
    return this.children.get(name);
  }

  addComponent(name, component) {
    this.children.set(name, component);
    return component;
  }

  removeComponent(name) {
    const component = this.children.get(name);
    if (component) {
      component.unmount();
      this.children.delete(name);
    }
  }

  $(selector) {
    return this.query(selector);
  }

  $$(selector) {
    return this.queryAll(selector);
  }
}

export const defineComponent = (name, ComponentClass) => {
  if (typeof customElements !== 'undefined' && !customElements.get(name)) {
    customElements.define(
      name,
      class extends HTMLElement {
        connectedCallback() {
          this.component = new ComponentClass({
            initialState: this.dataset
              ? Object.fromEntries(Object.entries(this.dataset).map(([k, v]) => [k, JSON.parse(v)]))
              : {},
          });
          this.component.mount(this);
        }
        disconnectedCallback() {
          this.component?.unmount();
        }
        attributeChangedCallback(name, oldValue, newValue) {
          this.component?.setProps({ [name]: newValue });
        }
      }
    );
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Component, defineComponent };
}

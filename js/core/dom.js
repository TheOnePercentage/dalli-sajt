export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export const toggleClass = (el, cls, force) => el?.classList.toggle(cls, force);
export const addClass = (el, cls) => el?.classList.add(cls);
export const removeClass = (el, cls) => el?.classList.remove(cls);
export const hasClass = (el, cls) => el?.classList.contains(cls);

export const show = (el) => el?.classList.remove('hidden');
export const hide = (el) => el?.classList.add('hidden');
export const toggle = (el) => el?.classList.toggle('hidden');

export const setAttr = (el, attrs) => {
  Object.entries(attrs).forEach(([k, v]) => el?.setAttribute(k, v));
};

export const getAttr = (el, attr) => el?.getAttribute(attr);

export const removeAttr = (el, attr) => el?.removeAttribute(attr);

export const on = (el, event, handler, options) => {
  if (!el) return () => {};
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
};

export const once = (el, event, handler, options) => {
  if (!el) return;
  const wrapped = (...args) => {
    el.removeEventListener(event, wrapped, options);
    handler(...args);
  };
  el.addEventListener(event, wrapped, options);
};

export const delegate = (parent, selector, event, handler) => {
  if (!parent) return () => {};
  const handlerWrapper = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  };
  parent.addEventListener(event, handlerWrapper);
  return () => parent.removeEventListener(event, handlerWrapper);
};

export const trapFocus = (el) => {
  if (!el) return () => {};
  const focusable = el.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  el.addEventListener('keydown', handler);
  first?.focus();
  return () => el.removeEventListener('keydown', handler);
};

export const focusFirst = (el) => {
  if (!el) return;
  const focusable = el.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus();
};

export const scrollToEl = (el, options = { behavior: 'smooth', block: 'center' }) => {
  el?.scrollIntoView(options);
};

export const setStyles = (el, styles) => {
  Object.entries(styles).forEach(([prop, val]) => {
    el.style[prop] = val;
  });
};

export const getStyles = (el, ...props) => {
  const computed = getComputedStyle(el);
  return props.reduce((acc, prop) => {
    acc[prop] = computed.getPropertyValue(prop);
    return acc;
  }, {});
};

export const createEl = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  });
  return el;
};

export const ready = (fn) => {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
};
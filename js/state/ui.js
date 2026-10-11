import { createSignal } from '../core/signals.js';
import { emit, DOM_EVENTS } from '../core/events.js';

export const drawerSignals = {
  search: createSignal(false),
  menu: createSignal(false),
  cart: createSignal(false),
  user: createSignal(false)
};

export const modalSignals = {
  auth: createSignal(false),
  profile: createSignal(false)
};

export const authModeSignal = createSignal('login');
export const toastSignal = createSignal([]);

const DRAWER_STORAGE_KEY = 'dalli_drawers';

Object.entries(drawerSignals).forEach(([name, signal]) => {
  signal.subscribe((open) => {
    if (open) {
      emit(DOM_EVENTS.DRAWER_OPENED, { drawer: name });
    } else {
      emit(DOM_EVENTS.DRAWER_CLOSED, { drawer: name });
    }
  });
});

Object.entries(modalSignals).forEach(([name, signal]) => {
  signal.subscribe((open) => {
    if (open) {
      emit(DOM_EVENTS.MODAL_OPENED, { modal: name });
    } else {
      emit(DOM_EVENTS.MODAL_CLOSED, { modal: name });
    }
  });
});

toastSignal.subscribe((toasts) => {
  if (toasts.length > 0) {
    emit(DOM_EVENTS.TOAST_SHOW, { toasts });
  }
});

export const openDrawer = (name) => {
  if (drawerSignals[name]) {
    drawerSignals[name].set(true);
    document.body.style.overflow = 'hidden';
  }
};

export const closeDrawer = (name) => {
  if (drawerSignals[name]) {
    drawerSignals[name].set(false);
    if (!Object.values(drawerSignals).some(s => s.get())) {
      document.body.style.overflow = '';
    }
  }
};

export const toggleDrawer = (name) => {
  const signal = drawerSignals[name];
  if (signal) {
    signal.set(!signal.get());
  }
};

export const closeAllDrawers = () => {
  Object.keys(drawerSignals).forEach(name => drawerSignals[name].set(false));
  document.body.style.overflow = '';
};

export const openModal = (name) => {
  if (modalSignals[name]) {
    closeAllDrawers();
    modalSignals[name].set(true);
    document.body.style.overflow = 'hidden';
  }
};

export const closeModal = (name) => {
  if (modalSignals[name]) {
    modalSignals[name].set(false);
    if (!Object.values(modalSignals).some(s => s.get())) {
      document.body.style.overflow = '';
    }
  }
};

export const closeAllModals = () => {
  Object.keys(modalSignals).forEach(name => modalSignals[name].set(false));
  if (!Object.values(drawerSignals).some(s => s.get())) {
    document.body.style.overflow = '';
  }
};

export const setAuthMode = (mode) => {
  if (mode === 'login' || mode === 'register') {
    authModeSignal.set(mode);
  }
};

export const getAuthMode = () => authModeSignal.get();

export const showToast = (message, type = 'info', duration = 4000) => {
  const id = 'toast_' + Date.now();
  const toast = { id, message, type, duration };
  const current = toastSignal.get();
  toastSignal.set([...current, toast]);

  if (duration > 0) {
    setTimeout(() => {
      hideToast(id);
    }, duration);
  }
  return id;
};

export const hideToast = (id) => {
  const current = toastSignal.get();
  toastSignal.set(current.filter(t => t.id !== id));
};

export const clearToasts = () => toastSignal.set([]);

export const subscribeToDrawer = (name, fn) => drawerSignals[name]?.subscribe(fn);
export const subscribeToModal = (name, fn) => modalSignals[name]?.subscribe(fn);
export const subscribeToAuthMode = (fn) => authModeSignal.subscribe(fn);
export const subscribeToToasts = (fn) => toastSignal.subscribe(fn);

export const getOpenDrawers = () => Object.entries(drawerSignals).filter(([, s]) => s.get()).map(([k]) => k);
export const getOpenModals = () => Object.entries(modalSignals).filter(([, s]) => s.get()).map(([k]) => k);
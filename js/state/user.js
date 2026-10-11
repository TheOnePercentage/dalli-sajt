import { createSignal } from '../core/signals.js';
import { emit, DOM_EVENTS } from '../core/events.js';

export const USER_STORAGE_KEY = 'dalli_user';

export const userSignal = createSignal(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null'));

userSignal.subscribe((user) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    emit(DOM_EVENTS.USER_LOGGED_IN, { user });
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
    emit(DOM_EVENTS.USER_LOGGED_OUT, {});
  }
});

export const getUser = () => userSignal.get();

export const isLoggedIn = () => !!userSignal.get();

export const hasCryptoWallet = () => userSignal.get()?.cryptoWallet === true;

export const getUserDiscount = () => userSignal.get()?.discount || 0;

export const loginUser = (userData) => {
  userSignal.set(userData);
  emit(DOM_EVENTS.USER_LOGGED_IN, { user: userData });
  return Promise.resolve(userData);
};

export const registerUser = (userData) => {
  userSignal.set(userData);
  emit(DOM_EVENTS.USER_LOGGED_IN, { user: userData });
  return Promise.resolve(userData);
};

export const logoutUser = () => {
  userSignal.set(null);
  emit(DOM_EVENTS.USER_LOGGED_OUT, {});
};

export const updateUser = (updates) => {
  const current = userSignal.get();
  if (!current) return null;
  const updated = { ...current, ...updates };
  userSignal.set(updated);
  emit(DOM_EVENTS.USER_UPDATED, { user: updated });
  return updated;
};

export const setCryptoWallet = (enabled) => {
  const current = userSignal.get();
  if (!current) return false;
  const updated = { ...current, cryptoWallet: enabled };
  userSignal.set(updated);
  emit(DOM_EVENTS.USER_UPDATED, { user: updated });
  return true;
};

export const subscribeToUser = (fn) => userSignal.subscribe(fn);
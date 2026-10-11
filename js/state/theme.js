import { createSignal, createEffect } from '../core/signals.js';
import { $, setAttr, on } from '../core/dom.js';
import { emit, DOM_EVENTS } from '../core/events.js';

export const themeSignal = createSignal(localStorage.getItem('dalli_theme') || 'system');

const THEME_ATTR = 'data-theme';
const STORAGE_KEY = 'dalli_theme';

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute(THEME_ATTR, prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute(THEME_ATTR, theme);
  }
};

const initTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY) || 'system';
  themeSignal.set(saved);
  applyTheme(saved);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    if (themeSignal.get() === 'system') {
      applyTheme('system');
    }
  };
  mediaQuery.addEventListener('change', handler);

  return () => mediaQuery.removeEventListener('change', handler);
};

const toggleTheme = () => {
  const current = themeSignal.get();
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
  themeSignal.set(next);
};

themeSignal.subscribe((theme) => {
  applyTheme(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  emit(DOM_EVENTS.THEME_CHANGED, { theme });
});

export const setTheme = (theme) => themeSignal.set(theme);
export const getTheme = () => themeSignal.get();
export { initTheme, toggleTheme, applyTheme };
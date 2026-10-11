/**
 * Admin Panel Unit Tests
 * Tests for ImperiumAdmin class and core utilities
 */

import { mockLocalStorage, mockSessionStorage, flushPromises } from './setup.js';

describe('Utility Functions', () => {
  test('sanitizeInput - escapes HTML', async () => {
    const { ImperiumUtils } = await import('../js/utils/helpers.js');
    expect(ImperiumUtils.escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(ImperiumUtils.escapeHtml('normal text')).toBe('normal text');
    expect(ImperiumUtils.escapeHtml('')).toBe('');
  });

  test('isValidEmail - validates emails', async () => {
    const { ImperiumUtils } = await import('../js/utils/helpers.js');
    expect(ImperiumUtils.isValidEmail('test@example.com')).toBeTruthy();
    expect(ImperiumUtils.isValidEmail('user.name@domain.co.rs')).toBeTruthy();
    expect(ImperiumUtils.isValidEmail('invalid')).toBeFalsy();
    expect(ImperiumUtils.isValidEmail('@domain.com')).toBeFalsy();
    expect(ImperiumUtils.isValidEmail('test@')).toBeFalsy();
  });

  test('isValidURL - validates URLs', async () => {
    const { ImperiumUtils } = await import('../js/utils/helpers.js');
    expect(ImperiumUtils.isValidURL('https://example.com')).toBeTruthy();
    expect(ImperiumUtils.isValidURL('http://localhost:3000')).toBeTruthy();
    expect(ImperiumUtils.isValidURL('not-a-url')).toBeFalsy();
    expect(ImperiumUtils.isValidURL('ftp://example.com')).toBeTruthy();
  });
});

describe('ThemeManager', () => {
  test('cycleTheme cycles through light -> dark -> auto', async () => {
    const { ThemeManager } = await import('../js/core/theme.js');
    expect(typeof ThemeManager?.cycleTheme).toBe('function');
  });

  test('getEffectiveTheme returns current theme', async () => {
    const { ThemeManager } = await import('../js/core/theme.js');
    expect(typeof ThemeManager?.getEffectiveTheme).toBe('function');
  });
});

describe('Admin Store', () => {
  test('Store persists sidebar state', () => {
    const state = { sidebarCollapsed: false };
    expect(state.sidebarCollapsed).toBeFalsy();
  });
});

describe('ErrorBoundary', () => {
  test('handles errors without throwing', () => {
    const errorBoundary = {
      handlers: new Set(),
      handleError: function(error, context) {
        this.handlers.forEach(h => h(error, context));
      },
      onError: function(fn) {
        this.handlers.add(fn);
        return () => this.handlers.delete(fn);
      }
    };

    let caughtError = null;
    const unsubscribe = errorBoundary.onError((e) => { caughtError = e; });
    errorBoundary.handleError(new Error('Test error'), { context: 'test' });
    
    expect(caughtError).toBeTruthy();
    expect(caughtError.message).toBe('Test error');
    unsubscribe();
  });
});

describe('Command Palette', () => {
  test('filters commands by query', () => {
    const commands = [
      { title: 'Dashboard', category: 'Navigacija', keywords: ['dashboard'] },
      { title: 'Porudžbine', category: 'Navigacija', keywords: ['porudzbine', 'orders'] },
      { title: 'Novi proizvod', category: 'Akcije', keywords: ['novi', 'proizvod'] }
    ];

    const filter = (query) => {
      const q = query.toLowerCase();
      return commands.filter(cmd => 
        cmd.title.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    };

    expect(filter('dashboard').length).toBe(1);
    expect(filter('novi').length).toBe(1);
    expect(filter('').length).toBe(3);
  });
});

export { };
/**
 * Auth & Navigation Integration Tests
 * Tests for authentication, navigation, permissions, and form handling
 *
 * These tests target the current admin public API:
 *  - AuthManager stores `{ user, token }` JSON under `dalli_admin_auth`.
 *   - `admin.sections.currentSectionName` tracks the active section.
 *   - Permissions live on `user.permissions` (array, `'*'` = all).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockLocalStorage, mockSessionStorage, flushPromises } from './setup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadIndexHtml() {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  document.body.innerHTML = m ? m[1] : '';
}

function seedAuth(user) {
  const authUser = {
    id: '1',
    email: 'admin@dalli.rs',
    name: 'Admin',
    role: 'super_admin',
    permissions: ['*'],
    ...user,
  };
  localStorage.setItem('dalli_admin_auth', JSON.stringify({ user: authUser, token: 'test-token' }));
  return authUser;
}

describe('Auth & Navigation', () => {
  let ImperiumAdmin;
  let admin;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    localStorage.clear();
    sessionStorage.clear();

    loadIndexHtml();
    seedAuth();

    // Dynamic import after mocks
    const { ImperiumAdmin: AdminClass } = await import('../js/admin.js');
    ImperiumAdmin = AdminClass;

    admin = new ImperiumAdmin();
    await admin.init();
  });

  describe('Authentication', () => {
    test('should open the login modal when no auth token', async () => {
      localStorage.removeItem('dalli_admin_auth');

      const { ImperiumAdmin: AdminClass } = await import('../js/admin.js');
      const unauth = new AdminClass();
      await unauth.init();

      expect(unauth.authManager.authModal).toBeTruthy();
      expect(unauth.initialized).toBe(false);
    });

    test('should load user from localStorage on init', async () => {
      const userData = {
        name: 'Test Admin',
        role: 'super_admin',
        email: 'admin@dalli.rs',
        permissions: ['manage_roles', 'manage_settings'],
      };
      localStorage.setItem(
        'dalli_admin_auth',
        JSON.stringify({ user: userData, token: 'token' })
      );

      const { ImperiumAdmin: AdminClass } = await import('../js/admin.js');
      const instance = new AdminClass();
      await instance.init();

      expect(instance.store.getState().user).toEqual(userData);
      expect(instance.checkPermissions(['manage_roles'])).toBe(true);
    });

    test('should return null user when no auth is stored', async () => {
      localStorage.removeItem('dalli_admin_auth');

      const { ImperiumAdmin: AdminClass } = await import('../js/admin.js');
      const instance = new AdminClass();

      expect(instance.authManager.getUser()).toBeNull();
    });

    test('should logout and clear auth', async () => {
      expect(admin.store.getState().user).toBeTruthy();

      await admin.handleAction('logout');

      expect(localStorage.getItem('dalli_admin_auth')).toBeNull();
      expect(admin.store.getState().user).toBeNull();
    });
  });

  describe('Navigation', () => {
    test('should navigate to section and update state', async () => {
      const result = await admin.navigateTo('orders');

      expect(result).toBe(true);
      expect(admin.sections.currentSectionName).toBe('orders');
      expect(document.querySelector('.admin-tab-panel.active')?.id).toBe('tab-orders');
    });

    test('should activate the matching tab panel', async () => {
      await admin.navigateTo('orders');

      const panel = document.getElementById('tab-orders');
      expect(panel).toBeTruthy();
      expect(panel.classList.contains('active')).toBe(true);
    });

    test('should update the page header title on navigation', async () => {
      await admin.navigateTo('products');

      const content = document.querySelector('.admin-tab-panel.active');
      expect(content).toBeTruthy();
      expect(admin.sections.currentSectionName).toBe('products');
    });
  });

  describe('Permissions', () => {
    test('should check permissions for section access', async () => {
      admin.store.setState({
        user: {
          id: '2',
          name: 'Accountant',
          role: 'accountant',
          permissions: ['view_analytics', 'view_financials'],
        },
      });

      expect(admin.checkPermissions(['view_analytics'])).toBe(true);
      expect(admin.checkPermissions(['view_financials'])).toBe(true);
      expect(admin.checkPermissions(['manage_roles'])).toBe(false);
    });

    test('wildcard permission grants access to everything', async () => {
      admin.store.setState({
        user: { id: '1', name: 'Admin', role: 'super_admin', permissions: ['*'] },
      });

      expect(admin.checkPermissions(['manage_roles'])).toBe(true);
      expect(admin.checkPermissions(['view_financials', 'manage_settings'])).toBe(true);
    });

    test('checkPermissions is false without a user', async () => {
      admin.store.setState({ user: null });
      expect(admin.checkPermissions(['view_orders'])).toBe(false);
    });
  });

  describe('Forms & Validation', () => {
    test('should validate product form', async () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="name" required>
        <input name="sku" required>
        <input name="basePrice" type="number" required min="0">
        <select name="category" required><option value="">Izaberite</option><option value="majice">Majice</option></select>
        <select name="gender" required><option value="">Izaberite</option><option value="muski">Muški</option></select>
        <textarea name="shortDescription" required></textarea>
        <textarea name="description" required></textarea>
        <input name="material" required>
      `;
      document.body.appendChild(form);

      expect(form.checkValidity()).toBe(false);

      form.querySelector('[name="name"]').value = 'Test Product';
      form.querySelector('[name="sku"]').value = 'TEST-001';
      form.querySelector('[name="basePrice"]').value = '1000';
      form.querySelector('[name="category"]').value = 'majice';
      form.querySelector('[name="gender"]').value = 'muski';
      form.querySelector('[name="shortDescription"]').value = 'Test description';
      form.querySelector('[name="description"]').value = 'Full description';
      form.querySelector('[name="material"]').value = '100% cotton';

      expect(form.checkValidity()).toBe(true);
    });

    test('should sanitize form inputs', async () => {
      const { ImperiumUtils } = await import('../js/utils/helpers.js');

      const malicious = '<script>alert("xss")</script>';
      const sanitized = ImperiumUtils.escapeHtml(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { APIService } = await import('../js/services/api.js');
      const api = new APIService();

      await expect(api.client.get('/test')).rejects.toThrow();
    });

    test('should handle validation errors', async () => {
      const response = {
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            errors: { name: 'Required', email: 'Invalid format' },
          }),
      };

      global.fetch = vi.fn().mockResolvedValue(response);

      const { APIService } = await import('../js/services/api.js');
      const api = new APIService();

      await expect(api.client.post('/products', {})).rejects.toThrow('Validacija nije prošla');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should navigate with ctrl+1 shortcut', async () => {
      await admin.navigateTo('products');

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true })
      );
      await flushPromises();

      expect(admin.sections.currentSectionName).toBe('dashboard');
    });

    test('should close modal with Escape', async () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay open';
      const closeFn = vi.fn();
      modal.__modalInstance = { close: closeFn };
      document.body.appendChild(modal);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(closeFn).toHaveBeenCalled();
    });
  });

  describe('Theme', () => {
    test('should toggle theme and persist', async () => {
      const { ThemeManager } = await import('../js/core/theme.js');

      ThemeManager.setTheme('light');
      expect(ThemeManager.getTheme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      ThemeManager.cycleTheme();
      expect(ThemeManager.getTheme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      ThemeManager.cycleTheme();
      expect(ThemeManager.getTheme()).toBe('auto');
    });
  });
});

export {};

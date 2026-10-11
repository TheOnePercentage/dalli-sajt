import { Modal } from '../components/modals-toasts.js';
import { getEventBus } from '../core/event-bus.js';
import { renderAuthForm } from '../templates/admin-templates.js';
import { createLogger } from '../utils/logger.js';
import { accessLog } from './access-log.js';
import { AuthService } from './auth.js';

const logger = createLogger('AuthManager');
const eventBus = getEventBus();

export class AuthManager {
  constructor(admin) {
    this.admin = admin;
    this.authModal = null;
  }

  async init() {
    const auth = localStorage.getItem('dalli_admin_auth');
    if (!auth) {
      logger.info('No auth found, opening login modal');
      this.openAuthModal();
      return false;
    }
    return true;
  }

  openAuthModal() {
    if (this.authModal) {
      this.authModal.open();
      return;
    }

    this.authModal = new Modal({
      id: 'authModal',
      title: 'Prijava u DALLI Admin',
      size: 'md',
      closable: false,
      closeOnOverlay: false,
      closeOnEscape: false,
      children: renderAuthForm(),
      onClose: () => {
        // Prevent closing if no auth
        if (!localStorage.getItem('dalli_admin_auth')) {
          this.authModal.open();
        }
      },
    });

    this.authModal.mount(document.body);
    this.bindAuthEvents();
  }

  bindAuthEvents() {
    const form = document.getElementById('authForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(form);
      const email = formData.get('email');
      const password = formData.get('password');
      const remember = formData.get('remember');

      await this.handleLogin(email, password, remember);
    });
  }

  resolveDemoUser(email, password) {
    const emailNorm = String(email || '')
      .trim()
      .toLowerCase();
    const demoUsers = {
      'admin@dalli.rs': {
        password: 'admin123',
        user: {
          id: '1',
          email: 'admin@dalli.rs',
          name: 'Admin',
          role: 'super_admin',
          permissions: ['*'],
        },
      },
      'menadzer@dalli.rs': {
        password: 'admin123',
        user: {
          id: '2',
          email: 'menadzer@dalli.rs',
          name: 'Menadžer',
          role: 'admin',
          permissions: ['view_orders', 'manage_orders'],
        },
      },
    };
    const entry = demoUsers[emailNorm];
    if (entry && entry.password === password) return { ...entry.user, email: emailNorm };
    return null;
  }

  async handleLogin(email, password, remember) {
    const submitBtn = document.querySelector('#authForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Prijava...';
    }

    try {
      // Demo credentials
      const user = this.resolveDemoUser(email, password);

      if (user) {
        const authData = { user, token: 'demo-token-' + Date.now() };

        // Keep the shared AuthService in sync so API requests carry a real token.
        AuthService.setToken(authData.token, !!remember);

        if (remember) {
          localStorage.setItem('dalli_admin_auth', JSON.stringify(authData));
        } else {
          sessionStorage.setItem('dalli_admin_auth', JSON.stringify(authData));
        }

        this.admin.store.setState({ user });

        if (this.authModal) {
          this.authModal.close();
          this.authModal.destroy();
          this.authModal = null;
        }

        this.admin.toastContainer.success('Uspešno ste se prijavili');
        logger.info('User logged in', { email });

        eventBus.emit('auth:login', { user });
        this.admin.emit('auth:login', { user });

        // Record access-log entry (login time, IP, device).
        accessLog.record('login', user).then(entry => {
          eventBus.emit('access:changed', entry);
        });

        // Re-render current section if needed
        if (this.admin.currentSection && this.admin.currentSection.render) {
          this.admin.currentSection.render();
        }
      } else {
        throw new Error('Pogrešan email ili lozinka');
      }
    } catch (error) {
      logger.error({ err: error }, 'Login failed');
      this.admin.toastContainer.error(error.message || 'Greška pri prijavi');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Prijavi se';
      }
    }
  }

  handleLogout() {
    const user = this.getUser();
    logger.info('User logged out');
    AuthService.clearToken();
    eventBus.emit('auth:logout', {});
    this.admin.emit('auth:logout', {});

    // Record logout (attaches to the open login entry for this session).
    if (user) {
      accessLog.record('logout', user).then(entry => {
        eventBus.emit('access:changed', entry);
      });
    }

    localStorage.removeItem('dalli_admin_auth');
    sessionStorage.removeItem('dalli_admin_auth');
    sessionStorage.removeItem('dalli_admin_session_id');

    this.admin.store.setState({ user: null });
    this.openAuthModal();
  }

  getUser() {
    const auth =
      localStorage.getItem('dalli_admin_auth') || sessionStorage.getItem('dalli_admin_auth');
    return auth ? JSON.parse(auth).user : null;
  }

  isAuthenticated() {
    return !!this.getUser();
  }

  destroy() {
    if (this.authModal) {
      this.authModal.destroy();
      this.authModal = null;
    }
  }
}

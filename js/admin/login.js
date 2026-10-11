/**
 * Admin Login Handler
 * Handles login form submission for admin-login.html
 * Redirects to new admin panel on port 5173
 */
(function() {
  'use strict';

  const ADMIN_PASSWORD_KEY = 'dalli_admin_password';
  const ADMIN_USERNAME_KEY = 'dalli_admin_username';
  const DEFAULT_ADMIN_PASSWORD = 'lenovo123';
  const DEFAULT_ADMIN_USERNAME = 'harissacirovic';

  function getEmployees() {
    const s = localStorage.getItem('dalli_employees');
    if (s) return JSON.parse(s);
    const def = [
      { id: 'EMP-001', email: 'harissacirovic', name: 'Hariss Acircovic (Vlasnik)', password: 'lenovo123', role: 'vlasnik', permissions: {}, status: 'active', hardDeleteAllowed: true, createdAt: new Date().toISOString(), createdBy: 'system', lastLogin: null },
      { id: 'EMP-002', email: 'dalilapepic', name: 'Dalila Pepic (Admin)', password: 'poslodavac123', role: 'vlasnik', permissions: {}, status: 'active', hardDeleteAllowed: true, createdAt: new Date().toISOString(), createdBy: 'system', lastLogin: null },
    ];
    localStorage.setItem('dalli_employees', JSON.stringify(def));
    return def;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span><button class="toast-close" aria-label="Zatvori">&times;</button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
  }

  function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const savedTheme = localStorage.getItem('theme') || 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeToggle.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  function initAdminLogin() {
    const savedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY);
    const savedUsername = localStorage.getItem(ADMIN_USERNAME_KEY);
    if (!savedPassword) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, DEFAULT_ADMIN_PASSWORD);
    }
    if (!savedUsername) {
      localStorage.setItem(ADMIN_USERNAME_KEY, DEFAULT_ADMIN_USERNAME);
    }

    const form = document.getElementById('adminLoginForm');
    const toggleBtn = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const errorEl = document.getElementById('loginError');

    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        const eyeIcon = toggleBtn.querySelector('.eye-icon');
        if (eyeIcon) {
          eyeIcon.textContent = passwordInput.type === 'password' ? '👁' : '🙈';
        }
        toggleBtn.setAttribute('aria-pressed', passwordInput.type === 'text');
      });
    }

    function showError(message) {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      }
    }

    function hideError() {
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        hideError();
        
        const enteredPassword = passwordInput ? passwordInput.value : '';
        const enteredUsername = usernameInput ? usernameInput.value : '';
        const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY);
        const storedUsername = localStorage.getItem(ADMIN_USERNAME_KEY);
        const normalizedEnteredPassword = enteredPassword.toLowerCase();
        const normalizedEnteredUsername = enteredUsername.toLowerCase();
        const normalizedStoredPassword = storedPassword ? storedPassword.toLowerCase() : '';
        const normalizedStoredUsername = storedUsername ? storedUsername.toLowerCase() : '';

        const matchStored = normalizedEnteredPassword === normalizedStoredPassword && normalizedEnteredUsername === normalizedStoredUsername;
        const matchAlternative = normalizedEnteredPassword === 'lenovo123' && normalizedEnteredUsername.toLowerCase() === 'harissacirovic';

        const employees = getEmployees();
        let matchedEmployee = null;
        for (const emp of employees) {
          const normalizedEmpEmail = emp.email ? emp.email.toLowerCase() : '';
          const normalizedEmpPassword = emp.password ? emp.password.toLowerCase() : '';
          if (normalizedEnteredUsername === normalizedEmpEmail && normalizedEnteredPassword === normalizedEmpPassword) {
            matchedEmployee = emp;
            break;
          }
        }
        const matchEmployee = matchedEmployee !== null;

        if (matchStored || matchAlternative || matchEmployee) {
          localStorage.setItem('dalli_admin_auth', 'true');
          localStorage.setItem('dalli_admin_role', 'admin');
          localStorage.setItem('dalli_admin_username', enteredUsername);

          let userName = enteredUsername;
          let userRole = 'Admin';
          let userEmail = enteredUsername + '@dalli.rs';
          let userRoleKey = 'admin';

          if (matchEmployee && matchedEmployee) {
            userName = matchedEmployee.name;
            userRole = matchedEmployee.role === 'vlasnik' ? 'Vlasnik' : 'Admin';
            userRoleKey = matchedEmployee.role === 'vlasnik' ? 'vlasnik' : 'admin';
            userEmail = matchedEmployee.email;
            localStorage.setItem('dalli_admin_employee_id', matchedEmployee.id);
            localStorage.setItem('dalli_admin_employee_name', matchedEmployee.name);
          }

          localStorage.setItem('dalli_admin_role', userRoleKey);
          localStorage.setItem('user', JSON.stringify({
            name: userName,
            role: userRole,
            email: userEmail,
            avatar: null
          }));

          showToast('Uspešna prijava! Preusmeravanje...', 'success');
          
          // Redirect to NEW admin panel on port 5173
          setTimeout(() => {
            window.location.href = 'http://localhost:5173/admin/';
          }, 800);
        } else {
          showError('Pogrešno korisničko ime ili lozinka!');
          if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
        }
      });

      if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        });
      }
      if (usernameInput) {
        usernameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            passwordInput?.focus();
          }
        });
      }
    } else {
      console.error('Login form not found!');
    }
  }


  async function initBiometricLogin() {
    const btn = document.getElementById('biometricBtn');
    if (!btn) return;
    if (!window.PublicKeyCredential) {
      btn.style.display = 'none';
      return;
    }
    const storedCredentialId = localStorage.getItem('dalli_webauthn_id');
    if (!storedCredentialId) {
      btn.style.display = 'none';
      return;
    }
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const publicKey = {
          challenge: challenge,
          allowCredentials: [{
            type: 'public-key',
            id: Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0))
          }],
          timeout: 60000,
          userVerification: 'preferred'
        };
        const assertion = await navigator.credentials.get({ publicKey });
        if (assertion) {
          localStorage.setItem('dalli_admin_auth', 'true');
          localStorage.setItem('dalli_admin_role', 'vlasnik');
          showToast('Uspešna biometrijska prijava!', 'success');
          setTimeout(() => {
            window.location.href = 'http://localhost:5173/admin/';
          }, 800);
        }
      } catch (err) {
        console.error('Biometric login failed:', err);
        showToast('Biometrijska prijava nije uspela', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdminLogin();
      initThemeToggle();
      initBiometricLogin();
    });
  } else {
    initAdminLogin();
    initThemeToggle();
    initBiometricLogin();
  }

  // Export for manual init
  window.AdminLogin = { init: initAdminLogin };
})();
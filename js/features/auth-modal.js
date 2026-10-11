import { loginUser, registerUser, logoutUser, getUser, subscribeToUser, updateUser } from '../state/user.js';
import { $, $$, show, hide, on } from '../core/dom.js';
import { openModal, closeModal, closeAllModals, setAuthMode, getAuthMode, subscribeToAuthMode } from '../state/ui.js';
import { showToast } from '../core/dom.js';

let isInitialized = false;
let passwordToggleHandler = null;

const initElements = () => {
  return {
    loginForm: $('#loginForm'),
    registerForm: $('#registerForm'),
    loginEmail: $('#loginEmail'),
    loginPassword: $('#loginPassword'),
    regFirstName: $('#regFirstName'),
    regLastName: $('#regLastName'),
    regUsername: $('#regUsername'),
    regEmail: $('#regEmail'),
    regPhone: $('#regPhone'),
    regPassword: $('#regPassword'),
    regConfirmPassword: $('#regConfirmPassword'),
    authModalTitle: $('#authModalTitle'),
    togglePasswordBtns: $$('.toggle-password')
  };
};

const handleLogin = async (e) => {
  e.preventDefault();
  const els = initElements();
  const email = els.loginEmail?.value;
  const password = els.loginPassword?.value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = 'Prijavljivanje...';
  try {
    await loginUser(email, password);
    e.target.reset();
    closeAllModals();
  } catch (err) {
    showToast('Pogrešan email ili lozinka', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Prijavi se';
  }
};

const handleRegister = async (e) => {
  e.preventDefault();
  const els = initElements();
  const data = {
    firstName: els.regFirstName?.value,
    lastName: els.regLastName?.value,
    username: els.regUsername?.value,
    email: els.regEmail?.value,
    phone: els.regPhone?.value,
    password: els.regPassword?.value,
    confirmPassword: els.regConfirmPassword?.value
  };
  if (data.password !== data.confirmPassword) {
    showToast('Lozinke se ne podudaraju', 'error');
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = 'Registracija...';
  try {
    await registerUser(data);
    e.target.reset();
    closeAllModals();
  } catch (err) {
    showToast('Greška pri registraciji', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Registruj se';
  }
};

const bindPasswordToggle = () => {
  const els = initElements();
  els.togglePasswordBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.target;
      const input = document.getElementById(inputId);
      if (!input) return;
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      btn.setAttribute('aria-pressed', type === 'text');
      btn.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
    });
  });
};

const bindAuthLinks = () => {
  $$('.auth-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = link.textContent.includes('Registrujte') ? 'register' : 'login';
      setAuthMode(mode);
    });
  });
};

const syncAuthModeToDOM = (mode) => {
  const els = initElements();
  if (mode === 'register') {
    hide(els.loginForm);
    show(els.registerForm);
    if (els.authModalTitle) els.authModalTitle.textContent = 'Registracija';
  } else {
    show(els.loginForm);
    hide(els.registerForm);
    if (els.authModalTitle) els.authModalTitle.textContent = 'Prijava';
  }
};

export const initAuthModal = () => {
  if (isInitialized) return;

  const els = initElements();

  // Bind form submissions
  on(els.loginForm, 'submit', handleLogin);
  on(els.registerForm, 'submit', handleRegister);

  // Password toggle
  bindPasswordToggle();

  // Auth mode links
  bindAuthLinks();

  // Subscribe to auth mode changes
  subscribeToAuthMode(syncAuthModeToDOM);

  // Global helpers
  window.openAuthModal = (mode) => {
    setAuthMode(mode);
    openModal('auth');
  };
  window.closeModal = (name) => closeModal(name);
  window.saveProfile = () => {
    showToast('Profil sačuvan', 'success');
  };
  window.goToCheckout = () => {
    closeAllModals();
    window.location.href = '/checkout.html';
  };
  window.togglePassword = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    btn.setAttribute('aria-pressed', type === 'text');
    btn.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
  };

  isInitialized = true;
  return { handleLogin, handleRegister };
};

if (typeof window !== 'undefined') {
  window.DALLI_AuthModal = { initAuthModal };
}
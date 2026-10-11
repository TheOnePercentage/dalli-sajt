let memoryToken = null;

export const AuthService = {
  setToken(token, remember = false) {
    memoryToken = token;
    if (remember) {
      localStorage.setItem('dalli_admin_token', token);
    } else {
      sessionStorage.setItem('dalli_admin_token', token);
    }
  },

  getToken() {
    if (memoryToken) return memoryToken;
    const sessionToken = sessionStorage.getItem('dalli_admin_token');
    if (sessionToken) return sessionToken;
    return localStorage.getItem('dalli_admin_token');
  },

  clearToken() {
    memoryToken = null;
    localStorage.removeItem('dalli_admin_token');
    sessionStorage.removeItem('dalli_admin_token');
  },

  hasToken() {
    return !!this.getToken();
  },

  isRemembered() {
    return !!localStorage.getItem('dalli_admin_token');
  }
};

export default AuthService;
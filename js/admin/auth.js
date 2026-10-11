/**
 * AuthManager - Authentication & authorization for admin panel
 * Handles login, logout, session, roles, permissions
 */
(function () {
  'use strict';

  const STORAGE_KEYS = {
    AUTH: 'dalli_admin_auth',
    ROLE: 'dalli_admin_role',
    USERNAME: 'dalli_admin_username',
    EMPLOYEE_ID: 'dalli_admin_employee_id',
    EMPLOYEE_NAME: 'dalli_admin_employee_name',
    PASSWORD: 'dalli_admin_password',
    USERNAME_KEY: 'dalli_admin_username',
  };

  const DEFAULT_CREDENTIALS = {
    username: 'harissacirovic',
    password: 'lenovo123',
  };

  const ROLES = {
    vlasnik: 'vlasnik',
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    EMPLOYEE: 'employee',
    READ_ONLY: 'read_only',
  };

  const ROLE_LABELS = {
    vlasnik: 'Vlasnik',
    admin: 'Admin',
    accountant: 'Književni',
    employee: 'Zaposleni',
    read_only: 'Samo čitanje',
  };

  const DEFAULT_PERMISSIONS = {
    [ROLES.vlasnik]: {
      orders: true,
      complaints: true,
      ads: true,
      accounting: true,
      analytics: true,
      trash: true,
      customers: true,
      employees: true,
      settings: true,
      markets: true,
      products: true,
      experienceCenter: true,
    },
    [ROLES.ADMIN]: {
      orders: true,
      complaints: true,
      ads: true,
      accounting: true,
      analytics: true,
      trash: true,
      customers: true,
      settings: true,
      markets: true,
      products: true,
      experienceCenter: false,
    },
    [ROLES.ACCOUNTANT]: {
      orders: true,
      complaints: true,
      accounting: true,
      analytics: true,
      customers: true,
      experienceCenter: false,
    },
    [ROLES.EMPLOYEE]: {
      orders: true,
      complaints: true,
      ads: true,
      trash: true,
      experienceCenter: false,
    },
    [ROLES.READ_ONLY]: { orders: true, complaints: true, ads: true, experienceCenter: false },
  };

  function getEventBus() {
    return window.AdminEventBus;
  }

  function getStore() {
    return window.AdminStore;
  }

  function getEvents() {
    return window.AdminEvents;
  }

  function emit(event, data) {
    const bus = getEventBus();
    if (bus) bus.emit(event, data);
  }

  class AuthManager {
    constructor() {
      this._initialized = false;
      this._sessionCheckInterval = null;
    }

    // Initialize auth system
    init() {
      if (this._initialized) return;
      this._ensureDefaults();
      this._initialized = true;
    }

    // Ensure default credentials exist
    _ensureDefaults() {
      if (!localStorage.getItem(STORAGE_KEYS.PASSWORD)) {
        localStorage.setItem(STORAGE_KEYS.PASSWORD, DEFAULT_CREDENTIALS.password);
      }
      if (!localStorage.getItem(STORAGE_KEYS.USERNAME_KEY)) {
        localStorage.setItem(STORAGE_KEYS.USERNAME_KEY, DEFAULT_CREDENTIALS.username);
      }
    }

    // Check if user is authenticated
    isAuthenticated() {
      return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    }

    // Get current role
    getRole() {
      return localStorage.getItem(STORAGE_KEYS.ROLE) || 'employee';
    }

    // Get role label for display
    getRoleLabel(role) {
      return ROLE_LABELS[role] || role;
    }

    // Get permissions for a role
    // Core RBAC (DEFAULT_PERMISSIONS) is the single source of truth.
    // Experience Center only reads this permission - it never writes it.
    getPermissions(role) {
      const base = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS[ROLES.EMPLOYEE];
      return { ...base };
    }

    // Check if role has specific permission
    hasPermission(role, permission) {
      const perms = this.getPermissions(role);
      return perms[permission] === true;
    }

    // Check if current user has permission
    currentUserHas(permission) {
      const role = this.getRole();
      return this.hasPermission(role, permission);
    }

    // Get allowed tabs for role
    getAllowedTabs(role) {
      const tabs = {
        [ROLES.vlasnik]: [
          'orders',
          'complaints',
          'ads',
          'accounting',
          'analytics',
          'trash',
          'customers',
          'employees',
          'settings',
          'markets',
          'products-cms',
        ],
        [ROLES.ADMIN]: [
          'orders',
          'complaints',
          'ads',
          'accounting',
          'analytics',
          'trash',
          'customers',
          'settings',
          'markets',
          'products-cms',
        ],
        [ROLES.ACCOUNTANT]: ['orders', 'complaints', 'accounting', 'analytics', 'customers'],
        [ROLES.EMPLOYEE]: ['orders', 'complaints', 'ads', 'trash'],
        [ROLES.READ_ONLY]: ['orders', 'complaints', 'ads'],
      };
      const allowed = tabs[role] ? [...tabs[role]] : [];
      if (this.hasPermission(role, 'experienceCenter') && !allowed.includes('experience-center')) {
        allowed.push('experience-center');
      }
      return allowed;
    }

    // Login with username/password
    login(username, password, remember = false) {
      const storedUsername =
        localStorage.getItem(STORAGE_KEYS.USERNAME_KEY) || DEFAULT_CREDENTIALS.username;
      const storedPassword =
        localStorage.getItem(STORAGE_KEYS.PASSWORD) || DEFAULT_CREDENTIALS.password;

      const normalizedUsername = username.toLowerCase().trim();
      const normalizedPassword = password.toLowerCase().trim();
      const normalizedStoredUsername = storedUsername.toLowerCase().trim();
      const normalizedStoredPassword = storedPassword.toLowerCase().trim();

      // Check default/admin credentials
      const matchDefault =
        normalizedUsername === DEFAULT_CREDENTIALS.username.toLowerCase() &&
        normalizedPassword === DEFAULT_CREDENTIALS.password.toLowerCase();
      const matchStored =
        normalizedUsername === normalizedStoredUsername &&
        normalizedPassword === normalizedStoredPassword;

      // Check employee credentials
      const employees = this.getEmployees();
      let matchedEmployee = null;
      for (const emp of employees) {
        if (emp.email && emp.password) {
          const normalizedEmpEmail = emp.email.toLowerCase().trim();
          const normalizedEmpPassword = emp.password.toLowerCase().trim();
          if (
            normalizedUsername === normalizedEmpEmail &&
            normalizedPassword === normalizedEmpPassword
          ) {
            matchedEmployee = emp;
            break;
          }
        }
      }

      const isValid = matchDefault || matchStored || matchedEmployee;

      if (!isValid) {
        return { success: false, error: 'Pogrešno korisničko ime ili lozinka!' };
      }

      // Determine role and user info
      let role = 'admin';
      let userName = username;
      let userEmail = username + '@dalli.rs';
      let userRoleKey = 'admin';
      let employeeId = null;
      let employeeName = null;

      if (matchedEmployee) {
        role = matchedEmployee.role;
        userName = matchedEmployee.name;
        userRoleKey = matchedEmployee.role;
        userEmail = matchedEmployee.email;
        employeeId = matchedEmployee.id;
        employeeName = matchedEmployee.name;
      } else if (username.toLowerCase() === DEFAULT_CREDENTIALS.username.toLowerCase()) {
        role = 'vlasnik';
        userName = 'Hariss Acircovic (Vlasnik)';
        userRoleKey = 'vlasnik';
        userEmail = DEFAULT_CREDENTIALS.username + '@dalli.rs';
      }

      // Set session
      localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
      localStorage.setItem(STORAGE_KEYS.ROLE, role);
      localStorage.setItem(STORAGE_KEYS.USERNAME, username);
      localStorage.setItem(STORAGE_KEYS.USERNAME_KEY, username);

      if (employeeId) {
        localStorage.setItem('dalli_admin_employee_id', employeeId);
        localStorage.setItem('dalli_admin_employee_name', employeeName);
      } else {
        localStorage.removeItem('dalli_admin_employee_id');
        localStorage.removeItem('dalli_admin_employee_name');
      }

      // Update store
      const store = window.AdminStore;
      if (store) {
        store.setAuth({
          user: { name: userName, role: this.getRoleLabel(role), email: userEmail },
          role: role,
          employeeId: employeeId,
          employeeName: employeeId ? userName : null,
        });
      }

      // Emit event
      const bus = window.AdminEventBus;
      if (bus) {
        bus.emit('auth:login', { username, role, employeeId });
      }

      return { success: true, role, userName, employeeId };
    }

    // Logout current user
    logout() {
      localStorage.removeItem('dalli_admin_auth');
      localStorage.removeItem('dalli_admin_role');
      localStorage.removeItem('dalli_admin_employee_id');
      localStorage.removeItem('dalli_admin_employee_name');

      const store = window.AdminStore;
      if (store) {
        store.logout();
      }

      const bus = window.AdminEventBus;
      if (bus) {
        bus.emit('auth:logout', {});
      }
    }

    // Check authentication and redirect if needed
    checkAuth(redirectOnFail = true) {
      const auth = localStorage.getItem('dalli_admin_auth');
      if (!auth) {
        if (redirectOnFail) {
          window.location.href = 'admin-login.html';
        }
        return false;
      }
      return true;
    }

    // Get current user info from localStorage
    getCurrentUser() {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          return null;
        }
      }
      return {
        name: localStorage.getItem(STORAGE_KEYS.USERNAME) || 'Admin',
        role: this.getRoleLabel(this.getRole()),
        email: localStorage.getItem(STORAGE_KEYS.USERNAME) + '@dalli.rs',
        avatar: null,
      };
    }

    // Update user info in localStorage
    updateUserInfo(userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }

    // Change password for current user (admin or employee)
    async changePassword(currentPassword, newPassword) {
      // Validate inputs
      if (!currentPassword || !newPassword) {
        return { success: false, error: 'Trenutna i nova lozinka su obavezne' };
      }

      if (newPassword.length < 8) {
        return { success: false, error: 'Nova lozinka mora imati minimum 8 karaktera' };
      }

      if (
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return {
          success: false,
          error: 'Nova lozinka mora sadržati: veliko slovo, malo slovo, broj, specijalni karakter',
        };
      }

      // Get stored password
      const storedPassword =
        localStorage.getItem(STORAGE_KEYS.PASSWORD) || DEFAULT_CREDENTIALS.password;
      const normalizedStored = storedPassword.toLowerCase().trim();
      const normalizedCurrent = currentPassword.toLowerCase().trim();

      // Check default/admin credentials
      const matchDefault = normalizedCurrent === DEFAULT_CREDENTIALS.password.toLowerCase().trim();
      const matchStored = normalizedCurrent === normalizedStored;

      // Check employee credentials
      const employees = this.getEmployees();
      let matchedEmployee = null;
      for (const emp of employees) {
        if (emp.email && emp.password) {
          const normalizedEmpEmail = emp.email.toLowerCase().trim();
          const normalizedEmpPassword = emp.password.toLowerCase().trim();
          if (
            normalizedCurrent === normalizedEmpEmail &&
            currentPassword.toLowerCase().trim() === normalizedEmpPassword
          ) {
            matchedEmployee = emp;
            break;
          }
        }
      }

      const isValid = matchDefault || matchStored || matchedEmployee;

      if (!isValid) {
        return { success: false, error: 'Trenutna lozinka je pogrešna' };
      }

      // Validate new password
      if (newPassword.length < 8) {
        return { success: false, error: 'Nova lozinka mora imati minimum 8 karaktera' };
      }

      if (
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return {
          success: false,
          error: 'Nova lozinka mora sadržati: veliko slovo, malo slovo, broj, specijalni karakter',
        };
      }

      if (currentPassword === newPassword) {
        return { success: false, error: 'Nova lozinka ne sme biti ista kao trenutna' };
      }

      // Update password based on who is logged in
      const isEmployeeLogin = this.isEmployeeLogin();

      if (isEmployeeLogin) {
        // Update employee password
        const employeeId = localStorage.getItem('dalli_admin_employee_id');
        const employees = this.getEmployees();
        const empIndex = employees.findIndex(
          e => e.id === localStorage.getItem('dalli_admin_employee_id')
        );

        if (empIndex !== -1) {
          employees[empIndex].password = newPassword;
          this.saveEmployees(employees);
          localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
        }
      } else {
        // Admin/default user - update admin password
        localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
      }

      emit('auth:passwordChanged', {
        isEmployee: isEmployeeLogin,
        username: localStorage.getItem(STORAGE_KEYS.USERNAME),
      });

      return { success: true };
    }

    // Get employees list
    // Get employees list
    getEmployees() {
      const s = localStorage.getItem('dalli_employees');
      if (s) return JSON.parse(s);
      const def = [
        {
          id: 'EMP-001',
          email: 'harissacirovic',
          name: 'Hariss Acircovic (Vlasnik)',
          password: 'lenovo123',
          role: 'vlasnik',
          permissions: {},
          status: 'active',
          hardDeleteAllowed: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          lastLogin: null,
        },
        {
          id: 'EMP-002',
          email: 'dalilapepic',
          name: 'Dalila Pepic (Admin)',
          password: 'poslodavac123',
          role: 'vlasnik',
          permissions: {},
          status: 'active',
          hardDeleteAllowed: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          lastLogin: null,
        },
      ];
      localStorage.setItem('dalli_employees', JSON.stringify(def));
      return def;
    }

    // Save employees
    saveEmployees(employees) {
      localStorage.setItem('dalli_employees', JSON.stringify(employees));
    }

    // Check if current session is employee login
    isEmployeeLogin() {
      return !!localStorage.getItem('dalli_admin_employee_id');
    }

    // Get employee info
    getEmployeeInfo() {
      return {
        id: localStorage.getItem('dalli_admin_employee_id'),
        name: localStorage.getItem('dalli_admin_employee_name'),
      };
    }

    // Validate session (for periodic checks)
    validateSession() {
      if (!this.isAuthenticated()) return false;
      // Could add token expiry check here if using JWT
      return true;
    }

    // Start periodic session validation
    startSessionValidation(intervalMs = 60000) {
      if (this._sessionCheckInterval) return;
      this._sessionCheckInterval = setInterval(() => {
        if (!this.validateSession()) {
          this.logout();
          window.location.href = 'admin-login.html';
        }
      }, intervalMs);
    }

    stopSessionValidation() {
      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
        this._sessionCheckInterval = null;
      }
    }
  }

  // Export singleton
  window.AuthManager = new AuthManager();
})();

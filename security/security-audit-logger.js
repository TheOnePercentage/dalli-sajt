/**
 * Security Audit Logger
 * Comprehensive security event logging and monitoring
 */

class SecurityAuditLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.logDestination = options.logDestination || 'console';
    this.logRetentionDays = options.logRetentionDays || 90;
    this.maxLogSize = options.maxLogSize || 100 * 1024 * 1024; // 100MB
    this.logs = [];
    this.maxLogs = 10000;
    this.alertThresholds = {
      failedLogins: 5,
      failedPayments: 10,
      errorRate: 0.05,
      responseTime: 5000,
    };
    this.alertCallbacks = [];
  }

  // Log levels
  static LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4
  };

  // Event types for categorization
  static EVENT_TYPES = {
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AUTH_FAILED: 'auth.failed',
    AUTH_BRUTE_FORCE: 'auth.brute_force',
    AUTH_PASSWORD_RESET: 'auth.password_reset',
    AUTH_MFA_ENABLED: 'auth.mfa_enabled',
    AUTH_MFA_DISABLED: 'auth.mfa_disabled',
    AUTH_PASSWORD_CHANGED: 'auth.password_changed',
    
    AUTHZ_ACCESS_DENIED: 'authz.access_denied',
    AUTHZ_PRIVILEGE_ESCALATION: 'authz.privilege_escalation',
    
    DATA_ACCESS: 'data.access',
    DATA_EXPORT: 'data.export',
    DATA_DELETION: 'data.deletion',
    DATA_MODIFICATION: 'data.modification',
    DATA_BREACH: 'data.breach',
    
    PAYMENT_ATTEMPT: 'payment.attempt',
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_REFUND: 'payment.refund',
    PAYMENT_DISPUTE: 'payment.dispute',
    PAYMENT_CHARGEBACK: 'payment.chargeback',
    
    ADMIN_ACTION: 'admin.action',
    ADMIN_USER_CREATE: 'admin.user.create',
    ADMIN_USER_DELETE: 'admin.user.delete',
    ADMIN_ROLE_CHANGE: 'admin.role.change',
    ADMIN_CONFIG_CHANGE: 'admin.config.change',
    
    API_REQUEST: 'api.request',
    API_ERROR: 'api.error',
    API_RATE_LIMIT: 'api.rate_limit',
    
    SECURITY_CSP_VIOLATION: 'security.csp_violation',
    SECURITY_XSS_ATTEMPT: 'security.xss_attempt',
    SECURITY_SQL_INJECTION: 'security.sql_injection',
    SECURITY_CSRF_ATTEMPT: 'security.csrf_attempt',
    SECURITY_FILE_UPLOAD: 'security.file_upload',
    SECURITY_SCAN_ATTEMPT: 'security.scan_attempt',
    
    API_KEY_CREATED: 'api.key.created',
    API_KEY_REVOKED: 'api.key.revoked',
    API_KEY_ROTATED: 'api.key.rotated',
    
    SESSION_CREATED: 'session.created',
    SESSION_DESTROYED: 'session.destroyed',
    SESSION_HIJACK_ATTEMPT: 'session.hijack_attempt',
    
    FILE_UPLOAD: 'file.upload',
    FILE_DOWNLOAD: 'file.download',
    FILE_DELETED: 'file.deleted',
    FILE_MALWARE_DETECTED: 'file.malware_detected'
  };

  log(event) {
    const logEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: event.level || 'info',
      type: event.type,
      message: event.message,
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      ip: event.ip || null,
      userAgent: event.userAgent || null,
      resource: event.resource || null,
      action: event.action || null,
      outcome: event.outcome || 'unknown',
      riskLevel: event.riskLevel || 'low',
      metadata: event.metadata || {},
      requestId: event.requestId || this.generateId()
    };

    this.logs.push(logEntry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Check alert thresholds
    this.checkAlerts(logEntry);

    // Output to console/file
    this.outputLog(logEntry);

    return logEntry;
  }

  logAuth(event) {
    return this.log({
      ...event,
      level: event.outcome === 'success' ? 'info' : 'warn',
      type: event.type || this.constructor.EVENT_TYPES.AUTH_LOGIN
    });
  }

  logAuthFailure(event) {
    return this.log({
      ...event,
      level: 'warn',
      type: this.constructor.EVENT_TYPES.AUTH_FAILED,
      outcome: 'failure',
      riskLevel: 'medium'
    });
  }

  logBruteForce(ip, userId, attemptCount) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.AUTH_BRUTE_FORCE,
      message: `Brute force attempt detected`,
      ip: event.ip,
      userId: event.userId,
      metadata: { attemptCount },
      riskLevel: 'high'
    });
  }

  logPayment(event) {
    return this.log({
      ...event,
      level: event.outcome === 'success' ? 'info' : 'warn',
      type: event.outcome === 'success' ? 
        this.constructor.EVENT_TYPES.PAYMENT_SUCCESS : this.constructor.EVENT_TYPES.PAYMENT_FAILED,
      riskLevel: event.outcome === 'success' ? 'low' : 'medium'
    });
  }

  logAdminAction(event) {
    return this.log({
      ...event,
      level: 'info',
      type: this.constructor.EVENT_TYPES.ADMIN_ACTION,
      riskLevel: 'medium'
    });
  }

  logSecurityEvent(event) {
    return this.log({
      ...event,
      level: 'warn',
      riskLevel: 'high',
      type: event.type || 'security.event'
    });
  }

  logCSPViolation(report) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.SECURITY_CSP_VIOLATION,
      message: 'CSP violation detected',
      metadata: report,
      riskLevel: 'medium'
    });
  }

  logDataBreach(details) {
    return this.log({
      level: 'critical',
      type: this.constructor.EVENT_TYPES.DATA_BREACH,
      message: 'Potential data breach detected',
      riskLevel: 'critical',
      metadata: details
    });
  }

  logAPIError(event) {
    return this.log({
      ...event,
      level: 'error',
      type: this.constructor.EVENT_TYPES.API_ERROR,
      riskLevel: 'medium'
    });
  }

  logRateLimit(event) {
    return this.log({
      ...event,
      level: 'warn',
      type: this.constructor.EVENT_TYPES.API_RATE_LIMIT,
      riskLevel: 'medium'
    });
  }

  logXSSAttempt(details) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.SECURITY_XSS_ATTEMPT,
      message: 'XSS attempt detected',
      metadata: details,
      riskLevel: 'high'
    });
  }

  logSQLInjectionAttempt(details) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.SECURITY_SQL_INJECTION,
      message: 'SQL injection attempt detected',
      metadata: details,
      riskLevel: 'high'
    });
  }

  logCSRFAttempt(details) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.SECURITY_CSRF_ATTEMPT,
      message: 'CSRF attempt detected',
      metadata: details,
      riskLevel: 'high'
    });
  }

  logFileUpload(event) {
    return this.log({
      ...event,
      level: 'info',
      type: this.constructor.EVENT_TYPES.FILE_UPLOAD,
      riskLevel: event.metadata?.malwareDetected ? 'high' : 'low'
    });
  }

  logMalwareDetected(fileInfo) {
    return this.log({
      level: 'critical',
      type: this.constructor.EVENT_TYPES.FILE_MALWARE_DETECTED,
      message: 'Malware detected in uploaded file',
      metadata: fileInfo,
      riskLevel: 'critical'
    });
  }

  logAPIKeyEvent(event) {
    return this.log({
      ...event,
      level: 'info',
      type: event.action === 'created' ? this.constructor.EVENT_TYPES.API_KEY_CREATED :
          event.action === 'revoked' ? this.constructor.EVENT_TYPES.API_KEY_REVOKED :
          this.constructor.EVENT_TYPES.API_KEY_ROTATED,
      riskLevel: 'low'
    });
  }

  logSessionEvent(event) {
    return this.log({
      ...event,
      level: 'info',
      type: event.type === 'destroyed' ? this.constructor.EVENT_TYPES.SESSION_DESTROYED : this.constructor.EVENT_TYPES.SESSION_CREATED,
      riskLevel: 'low'
    });
  }

  logSessionHijackAttempt(details) {
    return this.log({
      level: 'warn',
      type: this.constructor.EVENT_TYPES.SESSION_HIJACK_ATTEMPT,
      message: 'Session hijack attempt detected',
      metadata: details,
      riskLevel: 'high'
    });
  }

  logFileEvent(event) {
    return this.log({
      ...event,
      level: 'info',
      type: event.type || this.constructor.EVENT_TYPES.FILE_UPLOAD,
      riskLevel: 'low'
    });
  }

  // Alerting
  addAlertCallback(callback) {
    this.alertCallbacks.push(callback);
  }

  checkAlerts(logEntry) {
    // Check for brute force
    if (logEntry.type === this.constructor.EVENT_TYPES.AUTH_FAILED) {
      // In production, check rate of failed logins from same IP/user
    }

    // Check for high error rate
    // Check for payment failures
    // Check for CSP violations
  }

  triggerAlert(alert) {
    this.alertCallbacks.forEach(cb => {
      try {
        cb(alert);
      } catch (e) {
        console.error('Alert callback failed:', e);
      }
    });
  }

  // Output log
  outputLog(logEntry) {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const levelName = levelNames[logEntry.level] || 'UNKNOWN';
    
    const logLine = `[${logEntry.timestamp}] [${levelNames[logEntry.level]}] [${logEntry.type}] ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 0: console.debug(logLine); break;
      case 1: console.info(logLine); break;
      case 2: console.warn(logLine); break;
      case 3: console.error(logLine); break;
      case 4: console.error(logLine); break;
    }

    // In production, also send to logging service (Sentry, Datadog, etc.)
  }

  generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Query logs
  getLogs(filters = {}) {
    let logs = [...this.logs];
    
    if (filters.level !== undefined) {
      logs = logs.filter(l => l.level >= filters.level);
    }
    if (filters.type) {
      logs = logs.filter(l => l.type === filters.type);
    }
    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters.ip) {
      logs = logs.filter(l => l.ip === filters.ip);
    }
    if (filters.startTime) {
      logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startTime));
    }
    if (filters.endTime) {
      logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.endTime));
    }
    if (filters.riskLevel) {
      logs = logs.filter(l => l.riskLevel === filters.riskLevel);
    }
    
    return logs.slice(-1000); // Return last 1000 matching
  }

  // Get security statistics
  getSecurityStats(timeRange = 24 * 60 * 60 * 1000) {
    const since = Date.now() - timeRange;
    const recentLogs = this.logs.filter(l => new Date(l.timestamp).getTime() > since);
    
    return {
      totalEvents: recentLogs.length,
      byLevel: this.countByLevel(recentLogs),
      byType: this.countByType(recentLogs),
      byRiskLevel: this.countByRiskLevel(recentLogs),
      topIPs: this.getTopIPs(recentLogs, 10),
      failedLogins: this.countByType(recentLogs)[this.constructor.EVENT_TYPES.AUTH_FAILED] || 0,
      blockedIPs: this.getBlockedIPs(recentLogs)
    };
  }

  countByLevel(logs) {
    return logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});
  }

  countByType(logs) {
    return logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});
  }

  countByRiskLevel(logs) {
    return logs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
      return acc;
    }, {});
  }

  getTopIPs(logs, limit = 10) {
    const ipCounts = logs.reduce((acc, log) => {
      if (log.ip) acc[log.ip] = (acc[log.ip] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([ip, count]) => ({ ip, count }));
  }

  getBlockedIPs(logs) {
    const failedLogins = logs.filter(l => l.type === 'auth.failed');
    const ipCounts = failedLogins.reduce((acc, log) => {
      if (log.ip) acc[log.ip] = (acc[log.ip] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(ipCounts)
      .filter(([ip, count]) => count >= 5)
      .map(([ip, count]) => ({ ip, count }));
  }

  // Export logs
  exportLogs(filters = {}, format = 'json') {
    const logs = this.getLogs(filters);
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.logsToCSV(logs);
      case 'jsonl':
        return logs.map(l => JSON.stringify(l)).join('\n');
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  logsToCSV(logs) {
    if (!logs.length) return '';
    
    const headers = ['timestamp', 'level', 'type', 'message', 'userId', 'ip', 'userAgent', 'riskLevel'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.type,
      `"${log.message.replace(/"/g, '""')}"`,
      log.userId || '',
      log.ip || '',
      log.userAgent || '',
      log.riskLevel
    ]);
    
    return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  }

  // Cleanup old logs
  cleanup() {
    const cutoff = Date.now() - (this.logRetentionDays * 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
  }
}

module.exports = { SecurityAuditLogger };
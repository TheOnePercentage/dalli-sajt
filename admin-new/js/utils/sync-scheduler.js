/**
 * Sync Scheduler
 * Cron-like scheduler for periodic data synchronization
 * Supports multiple intervals, timezone-aware, with retry logic
 */

import { ImperiumUtils } from '../utils/helpers.js';

export const SyncFrequency = {
  REALTIME: { cron: '* * * * *', ms: 60000, label: 'Real-time (1 min)' },
  FREQUENT: { cron: '*/5 * * * *', ms: 300000, label: 'Every 5 minutes' },
  HOURLY: { cron: '0 * * * *', ms: 3600000, label: 'Hourly' },
  TWICE_DAILY: { cron: '0 */12 * * *', ms: 43200000, label: 'Twice daily' },
  DAILY: { cron: '0 3 * * *', ms: 86400000, label: 'Daily (3 AM)' },
  WEEKLY: { cron: '0 3 * * 0', ms: 604800000, label: 'Weekly (Sunday 3 AM)' },
  CUSTOM: { cron: null, ms: null, label: 'Custom' },
};

class SyncScheduler {
  constructor() {
    this.jobs = new Map();
    this.running = false;
    this.timezone = 'Europe/Belgrade';
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 1000;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`[SyncScheduler] Listener error for ${event}:`, error);
        }
      });
    }
  }

  addJob(jobConfig) {
    const job = {
      id: jobConfig.id || ImperiumUtils.randomString(16),
      name: jobConfig.name || 'Unnamed Job',
      platformId: jobConfig.platformId,
      connector: jobConfig.connector,
      frequency: jobConfig.frequency || SyncFrequency.HOURLY,
      customInterval: jobConfig.customInterval || null,
      enabled: jobConfig.enabled !== false,
      lastRun: null,
      nextRun: null,
      runCount: 0,
      successCount: 0,
      errorCount: 0,
      lastError: null,
      retryCount: 0,
      maxRetries: jobConfig.maxRetries || 3,
      retryDelay: jobConfig.retryDelay || 60000,
      timeout: jobConfig.timeout || 120000,
      priority: jobConfig.priority || 'normal',
      metadata: jobConfig.metadata || {},
      handler: jobConfig.handler,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.calculateNextRun(job);
    this.jobs.set(job.id, job);

    this.emit('job-added', { job });
    return job.id;
  }

  removeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      this.emit('job-removed', { jobId, job });
      return true;
    }
    return false;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  getJobsByPlatform(platformId) {
    return this.getAllJobs().filter(j => j.platformId === platformId);
  }

  enableJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      job.updatedAt = Date.now();
      this.calculateNextRun(job);
      this.emit('job-enabled', { job });
    }
  }

  disableJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      job.updatedAt = Date.now();
      job.nextRun = null;
      this.emit('job-disabled', { job });
    }
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      job.updatedAt = Date.now();
      if (updates.frequency || updates.customInterval) {
        this.calculateNextRun(job);
      }
      this.emit('job-updated', { job });
    }
  }

  calculateNextRun(job) {
    const now = Date.now();

    if (job.frequency === SyncFrequency.CUSTOM && job.customInterval) {
      job.nextRun = now + job.customInterval;
    } else if (job.frequency.ms) {
      const lastRun = job.lastRun || now;
      job.nextRun = lastRun + job.frequency.ms;

      if (job.nextRun <= now) {
        job.nextRun = now + job.frequency.ms;
      }
    } else {
      job.nextRun = this.parseCronNextRun(job.frequency.cron);
    }
  }

  parseCronNextRun(cronExpression) {
    const now = new Date();
    const parts = cronExpression.split(' ');

    if (parts.length !== 5) {
      return now.getTime() + 3600000;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const next = new Date(now);
    next.setSeconds(0, 0);

    const matchMinute = m =>
      minute === '*' ||
      minute.split(',').includes(m.toString()) ||
      (minute.startsWith('*/') && m % parseInt(minute.slice(2)) === 0);
    const matchHour = h =>
      hour === '*' ||
      hour.split(',').includes(h.toString()) ||
      (hour.startsWith('*/') && h % parseInt(hour.slice(2)) === 0);
    const matchDayOfMonth = d => dayOfMonth === '*' || dayOfMonth.split(',').includes(d.toString());
    const matchMonth = m => month === '*' || month.split(',').includes((m + 1).toString());
    const matchDayOfWeek = d => dayOfWeek === '*' || dayOfWeek.split(',').includes(d.toString());

    let found = false;
    for (let i = 0; i < 366 * 24 * 60; i++) {
      const m = next.getMinutes();
      const h = next.getHours();
      const dom = next.getDate();
      const mon = next.getMonth();
      const dow = next.getDay();

      if (
        matchMinute(m) &&
        matchHour(h) &&
        matchDayOfMonth(dom) &&
        matchMonth(mon) &&
        matchDayOfWeek(dow)
      ) {
        if (next > now) {
          found = true;
          break;
        }
      }
      next.setMinutes(next.getMinutes() + 1);
    }

    return found ? next.getTime() : now.getTime() + 3600000;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.runLoop();
    this.emit('started');
  }

  stop() {
    this.running = false;
    this.emit('stopped');
  }

  async runLoop() {
    while (this.running) {
      const now = Date.now();
      const jobsToRun = [];

      for (const job of this.jobs.values()) {
        if (job.enabled && job.nextRun && job.nextRun <= now) {
          jobsToRun.push(job);
        }
      }

      if (jobsToRun.length > 0) {
        jobsToRun.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        });

        for (const job of jobsToRun) {
          await this.executeJob(job);
        }
      }

      await ImperiumUtils.sleep(10000);
    }
  }

  async executeJob(job) {
    const startTime = Date.now();
    job.lastRun = startTime;
    job.runCount++;
    job.retryCount = 0;

    this.emit('job-start', { job });

    try {
      let result;

      if (job.handler) {
        result = await this.withTimeout(job.handler(job), job.timeout);
      } else if (job.connector && typeof job.connector.sync === 'function') {
        result = await this.withTimeout(job.connector.sync(), job.timeout);
      } else {
        throw new Error('No handler or connector for job');
      }

      const duration = Date.now() - startTime;
      job.successCount++;
      job.lastError = null;
      job.retryCount = 0;

      this.addToHistory({
        jobId: job.id,
        jobName: job.name,
        platformId: job.platformId,
        success: true,
        duration,
        timestamp: startTime,
        result: result?.data ? 'data returned' : 'completed',
      });

      this.emit('job-success', { job, result, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      job.errorCount++;
      job.lastError = error.message;
      job.retryCount++;

      this.addToHistory({
        jobId: job.id,
        jobName: job.name,
        platformId: job.platformId,
        success: false,
        duration,
        timestamp: startTime,
        error: error.message,
      });

      this.emit('job-error', { job, error, duration });

      if (job.retryCount < job.maxRetries) {
        setTimeout(() => this.retryJob(job), job.retryDelay * job.retryCount);
      }
    }

    this.calculateNextRun(job);
    job.updatedAt = Date.now();
  }

  async retryJob(job) {
    if (!job.enabled) return;

    job.retryCount++;
    this.emit('job-retry', { job, attempt: job.retryCount });

    try {
      const startTime = Date.now();
      let result;

      if (job.handler) {
        result = await this.withTimeout(job.handler(job), job.timeout);
      } else if (job.connector && typeof job.connector.sync === 'function') {
        result = await this.withTimeout(job.connector.sync(), job.timeout);
      }

      const duration = Date.now() - startTime;
      job.successCount++;
      job.errorCount = Math.max(0, job.errorCount - 1);
      job.lastError = null;

      this.addToHistory({
        jobId: job.id,
        jobName: job.name,
        platformId: job.platformId,
        success: true,
        duration,
        timestamp: startTime,
        result: 'retry success',
      });

      this.emit('job-retry-success', { job, result, duration });
    } catch (error) {
      job.lastError = error.message;

      if (job.retryCount < job.maxRetries) {
        setTimeout(() => this.retryJob(job), job.retryDelay * job.retryCount);
      } else {
        this.emit('job-retry-failed', { job, error });
      }
    }
  }

  async withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Job timeout')), ms)),
    ]);
  }

  addToHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  getHistory(filters = {}) {
    let history = [...this.history];

    if (filters.jobId) {
      history = history.filter(h => h.jobId === filters.jobId);
    }
    if (filters.platformId) {
      history = history.filter(h => h.platformId === filters.platformId);
    }
    if (filters.success !== undefined) {
      history = history.filter(h => h.success === filters.success);
    }
    if (filters.since) {
      history = history.filter(h => h.timestamp >= filters.since);
    }
    if (filters.limit) {
      history = history.slice(0, filters.limit);
    }

    return history;
  }

  getStats() {
    const totalJobs = this.jobs.size;
    const enabledJobs = this.getAllJobs().filter(j => j.enabled).length;
    const totalRuns = this.history.length;
    const successfulRuns = this.history.filter(h => h.success).length;
    const failedRuns = totalRuns - successfulRuns;
    const avgDuration =
      this.history.length > 0
        ? this.history.reduce((sum, h) => sum + h.duration, 0) / this.history.length
        : 0;

    return {
      totalJobs,
      enabledJobs,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration),
      nextJobs: this.getAllJobs()
        .filter(j => j.enabled && j.nextRun)
        .sort((a, b) => a.nextRun - b.nextRun)
        .slice(0, 5)
        .map(j => ({
          id: j.id,
          name: j.name,
          platformId: j.platformId,
          nextRun: j.nextRun,
          frequency: j.frequency.label,
        })),
    };
  }

  getPlatformSchedule(platformId) {
    return this.getJobsByPlatform(platformId).map(job => ({
      id: job.id,
      name: job.name,
      frequency: job.frequency.label,
      enabled: job.enabled,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      successCount: job.successCount,
      errorCount: job.errorCount,
      lastError: job.lastError,
    }));
  }

  destroy() {
    this.stop();
    this.jobs.clear();
    this.listeners.clear();
    this.history = [];
  }
}

export const syncScheduler = new SyncScheduler();
export { SyncScheduler };
export default SyncScheduler;

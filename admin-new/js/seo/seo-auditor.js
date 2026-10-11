/**
 * SEO Auditor Orchestrator
 * Runs all validators, aggregates results, provides unified audit report
 * Supports single-page and multi-page (crawl) audits
 */

import { BaseValidator, ValidationResult } from './validators/base-validator.js';
import { 
  MetaDescriptionValidator, 
  ImageAltValidator, 
  SchemaValidator, 
  CanonicalValidator 
} from './validators/index.js';

export class AuditorConfig {
  constructor(options = {}) {
    // Validator selection
    this.validators = options.validators || [
      'meta-description',
      'image-alt', 
      'schema',
      'canonical'
    ];
    
    // Per-validator configs
    this.validatorConfigs = options.validatorConfigs || {};
    
    // Audit behavior
    this.crawl = options.crawl || false;
    this.maxPages = options.maxPages || 50;
    this.crawlDepth = options.crawlDepth || 2;
    this.followInternalLinks = options.followInternalLinks !== false;
    this.respectRobotsTxt = options.respectRobotsTxt !== false;
    this.requestDelay = options.requestDelay || 100; // ms between requests
    
    // Output
    this.includeRawResults = options.includeRawResults || false;
    this.generateReport = options.generateReport !== false;
    this.reportFormats = options.reportFormats || ['json', 'summary'];
    
    // Scoring weights (must sum to 1.0)
    this.weights = options.weights || {
      'meta-description': 0.25,
      'image-alt': 0.20,
      'schema': 0.30,
      'canonical': 0.25
    };
    
    // Thresholds for overall grade
    this.gradeThresholds = options.gradeThresholds || {
      A: 90,
      B: 75,
      C: 60,
      D: 40,
      F: 0
    };
  }
}

export class PageAuditResult {
  constructor(url, validators = []) {
    this.url = url;
    this.timestamp = new Date().toISOString();
    this.results = new Map();
    this.overallScore = 0;
    this.grade = 'F';
    this.issueCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    this.validators = validators;
  }

  addValidatorResult(validatorName, result) {
    this.results.set(validatorName, result);
    this.aggregateIssues(result);
  }

  aggregateIssues(result) {
    if (result.errors) {
      result.errors.forEach(e => {
        const impact = e.details?.impact || 'medium';
        if (impact === 'critical') this.issueCounts.critical++;
        else if (impact === 'high') this.issueCounts.high++;
        else this.issueCounts.medium++;
      });
    }
    if (result.warnings) {
      this.issueCounts.low += result.warnings.length;
    }
    if (result.infos) {
      this.issueCounts.info += result.infos.length;
    }
  }

  calculateOverallScore(weights) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [name, weight] of Object.entries(weights)) {
      const result = this.results.get(name);
      if (result && result.metadata && typeof result.metadata.score === 'number') {
        totalScore += result.metadata.score * weight;
        totalWeight += weight;
      }
    }
    
    this.overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    this.grade = this.calculateGrade(this.overallScore);
    return this.overallScore;
  }

  calculateGrade(score) {
    // This will be set by auditor based on config
    return 'F';
  }

  getSummary() {
    return {
      url: this.url,
      timestamp: this.timestamp,
      overallScore: this.overallScore,
      grade: this.grade,
      issueCounts: this.issueCounts,
      validatorScores: {}
    };
  }

  toJSON() {
    const summary = this.getSummary();
    const validatorResults = {};
    
    for (const [name, result] of this.results.entries()) {
      validatorResults[name] = this.config?.includeRawResults ? result.toJSON() : {
        score: result.metadata?.score || 0,
        severity: result.severity,
        issueCount: result.issueCount,
        errors: result.errors?.length || 0,
        warnings: result.warnings?.length || 0,
        infos: result.infos?.length || 0,
        passed: result.passed?.length || 0
      };
    }
    
    summary.validatorResults = validatorResults;
    return summary;
  }
}

export class SiteAuditResult {
  constructor(config) {
    this.config = config;
    this.pages = new Map();
    this.startTime = new Date().toISOString();
    this.endTime = null;
    this.crawledUrls = [];
    this.failedUrls = [];
    this.overallScore = 0;
    this.grade = 'F';
    this.siteIssueCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    this.crossPageIssues = [];
  }

  addPageResult(pageResult) {
    this.pages.set(pageResult.url, pageResult);
    this.aggregateSiteIssues(pageResult);
  }

  aggregateSiteIssues(pageResult) {
    for (const [level, count] of Object.entries(pageResult.issueCounts)) {
      this.siteIssueCounts[level] += count;
    }
  }

  calculateOverallScore(weights) {
    if (this.pages.size === 0) {
      this.overallScore = 0;
      this.grade = 'F';
      return 0;
    }

    let totalScore = 0;
    for (const pageResult of this.pages.values()) {
      totalScore += pageResult.overallScore;
    }
    
    this.overallScore = Math.round(totalScore / this.pages.size);
    this.grade = this.calculateGrade(this.overallScore);
    return this.overallScore;
  }

  calculateGrade(score) {
    const thresholds = this.config?.gradeThresholds || {
      A: 90, B: 75, C: 60, D: 40, F: 0
    };
    
    if (score >= thresholds.A) return 'A';
    if (score >= thresholds.B) return 'B';
    if (score >= thresholds.C) return 'C';
    if (score >= thresholds.D) return 'D';
    return 'F';
  }

  getSummary() {
    return {
      auditDate: this.startTime,
      completedDate: this.endTime,
      pagesAudited: this.pages.size,
      pagesFailed: this.failedUrls.length,
      overallScore: this.overallScore,
      grade: this.grade,
      siteIssueCounts: this.siteIssueCounts,
      crossPageIssues: this.crossPageIssues.length,
      topIssues: this.getTopIssues(10)
    };
  }

  getTopIssues(limit = 10) {
    const issues = [];
    
    for (const pageResult of this.pages.values()) {
      for (const [validatorName, result] of pageResult.results.entries()) {
        if (result.errors) {
          result.errors.forEach(e => issues.push({
            url: pageResult.url,
            validator: validatorName,
            severity: e.details?.impact || 'medium',
            message: e.message,
            details: e.details
          }));
        }
        if (result.warnings) {
          result.warnings.forEach(w => issues.push({
            url: pageResult.url,
            validator: validatorName,
            severity: 'low',
            message: w.message,
            details: w.details
          }));
        }
      }
    }
    
    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return issues.slice(0, limit);
  }

  toJSON() {
    const summary = this.getSummary();
    const pages = {};
    
    for (const [url, pageResult] of this.pages.entries()) {
      pages[url] = pageResult.toJSON();
    }
    
    summary.pages = pages;
    summary.crossPageIssues = this.crossPageIssues;
    return summary;
  }
}

export class SEOAuditor {
  constructor(config = {}) {
    this.config = new AuditorConfig(config);
    this.validators = new Map();
    this.initializeValidators();
    this.crawlQueue = [];
    this.visitedUrls = new Set();
    this.currentDepth = 0;
  }

  initializeValidators() {
    // Import validators dynamically or use registry
    this.validatorClasses = {
      'meta-description': MetaDescriptionValidator,
      'image-alt': ImageAltValidator,
      'schema': SchemaValidator,
      'canonical': CanonicalValidator
    };

    for (const name of this.config.validators) {
      const ValidatorClass = this.validatorClasses[name];
      if (ValidatorClass) {
        const config = this.config.validatorConfigs[name] || {};
        this.validators.set(name, new ValidatorClass(config));
      } else {
        console.warn(`Validator "${name}" not found`);
      }
    }
  }

  /**
   * Audit a single page
   * @param {string} url - Page URL
   * @param {Document|string} html - HTML document or string
   * @param {Object} context - Additional context (httpHeaderCanonical, etc.)
   * @returns {Promise<PageAuditResult>}
   */
  async auditPage(url, html, context = {}) {
    const pageResult = new PageAuditResult(url, Array.from(this.validators.keys()));
    pageResult.config = this.config;

    const document = typeof html === 'string' 
      ? new DOMParser().parseFromString(html, 'text/html')
      : html;

    // Run each validator
    for (const [name, validator] of this.validators.entries()) {
      try {
        // Reset validator state if needed
        if (typeof validator.resetResults === 'function') {
          validator.resetResults();
        }
        if (typeof validator.resetUniquenessTracking === 'function') {
          validator.resetUniquenessTracking();
        }

        const result = await validator.validate(document, url, context);
        pageResult.addValidatorResult(name, result);
      } catch (error) {
        console.error(`Validator ${name} failed for ${url}:`, error);
        const errorResult = new (await import('./validators/base-validator.js')).ValidationResult();
        errorResult.addError(`Validator ${name} crashed: ${error.message}`, {
          validator: name,
          error: error.stack
        });
        pageResult.addValidatorResult(name, errorResult);
      }
    }

    // Calculate weighted score
    pageResult.calculateOverallScore(this.config.weights);
    pageResult.grade = this.calculateGrade(pageResult.overallScore);

    return pageResult;
  }

  /**
   * Audit multiple pages (with optional crawling)
   * @param {string} startUrl - Starting URL
   * @param {Function} fetchPage - Function to fetch page HTML (url) => Promise<string>
   * @returns {Promise<SiteAuditResult>}
   */
  async auditSite(startUrl, fetchPage) {
    const siteResult = new SiteAuditResult(this.config);
    siteResult.config = this.config;

    if (this.config.crawl) {
      await this.crawlSite(startUrl, fetchPage, siteResult);
    } else {
      // Single page audit
      try {
        const html = await fetchPage(startUrl);
        const pageResult = await this.auditPage(startUrl, html);
        siteResult.addPageResult(pageResult);
        siteResult.crawledUrls.push(startUrl);
      } catch (error) {
        siteResult.failedUrls.push({ url: startUrl, error: error.message });
      }
    }

    siteResult.endTime = new Date().toISOString();
    siteResult.calculateOverallScore(this.config.weights);

    // Run cross-page analyses
    await this.runCrossPageAnalyses(siteResult);

    return siteResult;
  }

  /**
   * Crawl site starting from startUrl
   * @param {string} startUrl
   * @param {Function} fetchPage
   * @param {SiteAuditResult} siteResult
   */
  async crawlSite(startUrl, fetchPage, siteResult) {
    this.crawlQueue = [{ url: startUrl, depth: 0 }];
    this.visitedUrls.clear();
    const baseUrl = new URL(startUrl).origin;

    while (this.crawlQueue.length > 0 && this.visitedUrls.size < this.config.maxPages) {
      const { url, depth } = this.crawlQueue.shift();
      
      if (this.visitedUrls.has(url)) continue;
      if (depth > this.config.crawlDepth) continue;
      
      const urlObj = new URL(url);
      if (urlObj.origin !== baseObj?.origin) continue; // Stay on same domain

      this.visitedUrls.add(url);

      try {
        const html = await fetchPage(url);
        const pageResult = await this.auditPage(url, html);
        siteResult.addPageResult(pageResult);
        siteResult.crawledUrls.push(url);

        // Extract links for crawling
        if (this.config.followInternalLinks && depth < this.config.crawlDepth) {
          const links = this.extractInternalLinks(html, baseUrl);
          for (const link of links) {
            if (!this.visitedUrls.has(link) && !this.crawlQueue.some(q => q.url === link)) {
              this.crawlQueue.push({ url: link, depth: depth + 1 });
            }
          }
        }

        // Respect crawl delay
        if (this.config.requestDelay > 0) {
          await new Promise(r => setTimeout(r, this.config.requestDelay));
        }
      } catch (error) {
        siteResult.failedUrls.push({ url, error: error.message });
      }
    }
  }

  extractInternalLinks(html, baseUrl) {
    const document = typeof html === 'string' 
      ? new DOMParser().parseFromString(html, 'text/html')
      : html;
    
    const links = this.$$(document, 'a[href]');
    const base = new URL(baseUrl);
    const internalLinks = new Set();

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      
      try {
        const linkUrl = new URL(href, baseUrl.href);
        if (linkUrl.origin === base.origin) {
          // Remove fragment
          linkUrl.hash = '';
          internalLinks.add(linkUrl.href);
        }
      } catch (e) {
        // Invalid URL
      }
    }

    return Array.from(internalLinks);
  }

  /**
   * Run cross-page analyses after all pages audited
   * @param {SiteAuditResult} siteResult
   */
  async runCrossPageAnalyses(siteResult) {
    const allPageResults = Array.from(siteResult.pages.values());

    // Meta Description cross-page uniqueness
    if (this.validators.has('meta-description')) {
      const validator = this.validators.get('meta-description');
      if (typeof MetaDescriptionValidator.checkCrossPageUniqueness === 'function') {
        const crossResult = MetaDescriptionValidator.checkCrossPageUniqueness(
          allPageResults.map(p => p.results.get('meta-description')).filter(Boolean)
        );
        if (crossResult.issueCount > 0) {
          siteResult.crossPageIssues.push({
            type: 'meta-description-uniqueness',
            validator: 'meta-description',
            ...crossResult.toJSON()
          });
        }
      }
    }

    // Image Alt cross-page consistency
    if (this.validators.has('image-alt')) {
      if (typeof ImageAltValidator.checkCrossImageConsistency === 'function') {
        const crossResult = ImageAltValidator.checkCrossImageConsistency(
          allPageResults.map(p => p.results.get('image-alt')).filter(Boolean)
        );
        if (crossResult.issueCount > 0) {
          siteResult.crossPageIssues.push({
            type: 'image-alt-consistency',
            validator: 'image-alt',
            ...crossResult.toJSON()
          });
        }
      }
    }

    // Schema cross-page consistency
    if (this.validators.has('schema')) {
      if (typeof SchemaValidator.checkCrossPageConsistency === 'function') {
        const crossResult = SchemaValidator.checkCrossPageConsistency(
          allPageResults.map(p => p.results.get('schema')).filter(Boolean)
        );
        if (crossResult.issueCount > 0) {
          siteResult.crossPageIssues.push({
            type: 'schema-consistency',
            validator: 'schema',
            ...crossResult.toJSON()
          });
        }
      }
    }

    // Canonical cross-page analysis
    if (this.validators.has('canonical')) {
      if (typeof CanonicalValidator.checkCrossPageCanonicals === 'function') {
        const crossResult = CanonicalValidator.checkCrossPageCanonicals(
          allPageResults.map(p => p.results.get('canonical')).filter(Boolean)
        );
        if (crossResult.issueCount > 0) {
          siteResult.crossPageIssues.push({
            type: 'canonical-consistency',
            validator: 'canonical',
            ...crossResult.toJSON()
          });
        }
      }
    }
  }

  calculateGrade(score) {
    const thresholds = this.config.gradeThresholds;
    if (score >= thresholds.A) return 'A';
    if (score >= thresholds.B) return 'B';
    if (score >= thresholds.C) return 'C';
    if (score >= thresholds.D) return 'D';
    return 'F';
  }

  // Helper methods
  $(document, selector) {
    try { return document.querySelector(selector); } catch (e) { return null; }
  }
  $$(document, selector) {
    try { return document.querySelectorAll(selector); } catch (e) { return []; }
  }

  /**
   * Generate audit report in specified formats
   * @param {SiteAuditResult} siteResult
   * @returns {Object} Reports by format
   */
  generateReport(siteResult) {
    const reports = {};

    if (this.config.reportFormats.includes('json')) {
      reports.json = JSON.stringify(siteResult.toJSON(), null, 2);
    }

    if (this.config.reportFormats.includes('summary')) {
      reports.summary = this.generateSummaryReport(siteResult);
    }

    if (this.config.reportFormats.includes('html')) {
      reports.html = this.generateHtmlReport(siteResult);
    }

    if (this.config.reportFormats.includes('csv')) {
      reports.csv = this.generateCsvReport(siteResult);
    }

    return reports;
  }

  generateSummaryReport(siteResult) {
    const summary = siteResult.getSummary();
    let report = `SEO AUDIT REPORT\n`;
    report += `=================\n\n`;
    report += `Audit Date: ${summary.auditDate}\n`;
    report += `Completed: ${summary.completedDate}\n`;
    report += `Pages Audited: ${summary.pagesAudited}\n`;
    report += `Pages Failed: ${summary.pagesFailed}\n`;
    report += `Overall Score: ${summary.overallScore}/100\n`;
    report += `Grade: ${summary.grade}\n\n`;
    
    report += `ISSUE COUNTS:\n`;
    report += `  Critical: ${summary.siteIssueCounts.critical}\n`;
    report += `  High: ${summary.siteIssueCounts.high}\n`;
    report += `  Medium: ${summary.siteIssueCounts.medium}\n`;
    report += `  Low: ${summary.siteIssueCounts.low}\n`;
    report += `  Info: ${summary.siteIssueCounts.info}\n\n`;

    report += `TOP ISSUES:\n`;
    summary.topIssues.forEach((issue, i) => {
      report += `  ${i+1}. [${issue.severity.toUpperCase()}] ${issue.url}\n`;
      report += `     ${issue.validator}: ${issue.message}\n`;
    });

    report += `\nCROSS-PAGE ISSUES: ${summary.crossPageIssues}\n`;

    return report;
  }

  generateHtmlReport(siteResult) {
    // Generate HTML report - simplified
    const summary = siteResult.getSummary();
    return `<!DOCTYPE html>
<html><head><title>SEO Audit Report</title>
<style>
  body { font-family: system-ui; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  .grade { display: inline-block; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; }
  .grade-A { background: #dcfce7; color: #166534; }
  .grade-B { background: #dbeafe; color: #1e40af; }
  .grade-C { background: #fef9c3; color: #854d0e; }
  .grade-D { background: #fee2e2; color: #991b1b; }
  .grade-F { background: #fecaca; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: 0.5rem; border: 1px solid #e5e7eb; text-align: left; }
  .severity-critical { color: #dc2626; font-weight: bold; }
  .severity-high { color: #ea580c; }
  .severity-medium { color: #ca8a04; }
  .severity-low { color: #16a34a; }
</style></head><body>
  <h1>SEO Audit Report</h1>
  <p><strong>Date:</strong> ${siteResult.startTime} | <strong>Pages:</strong> ${siteResult.pages.size} | <strong>Score:</strong> ${siteResult.overallScore} | <strong>Grade:</strong> <span class="grade grade-${siteResult.grade}">${siteResult.grade}</span></p>
  <h2>Issue Summary</h2>
  <table>
    <tr><th>Severity</th><th>Count</th></tr>
    <tr><td>Critical</td><td>${siteResult.siteIssueCounts.critical}</td></tr>
    <tr><td>High</td><td>${siteResult.siteIssueCounts.high}</td></tr>
    <tr><td>Medium</td><td>${siteResult.siteIssueCounts.medium}</td></tr>
    <tr><td>Low</td><td>${siteResult.siteIssueCounts.low}</td></tr>
    <tr><td>Info</td><td>${siteResult.siteIssueCounts.info}</td></tr>
  </table>
  <h2>Top Issues</h2>
  <table>
    <tr><th>Severity</th><th>Page</th><th>Validator</th><th>Message</th></tr>
    ${siteResult.getTopIssues(20).map(issue => `
      <tr>
        <td class="severity-${issue.severity}">${issue.severity}</td>
        <td>${issue.url}</td>
        <td>${issue.validator}</td>
        <td>${issue.message}</td>
      </tr>
    `).join('')}
  </table>
</body></html>`;
  }

  generateCsvReport(siteResult) {
    let csv = 'URL,Score,Grade,Validator,Severity,Message\n';
    
    for (const pageResult of siteResult.pages.values()) {
      for (const [validatorName, result] of pageResult.results.entries()) {
        if (result.errors) {
          result.errors.forEach(e => {
            csv += `"${pageResult.url}",${pageResult.overallScore},${pageResult.grade},"${validatorName}","${e.details?.impact || 'medium'}","${e.message.replace(/"/g, '""')}"\n`;
          });
        }
        if (result.warnings) {
          result.warnings.forEach(w => {
            csv += `"${pageResult.url}",${pageResult.overallScore},${pageResult.grade},"${validatorName}","low","${w.message.replace(/"/g, '""')}"\n`;
          });
        }
      }
    }
    
    return csv;
  }
}

export default SEOAuditor;
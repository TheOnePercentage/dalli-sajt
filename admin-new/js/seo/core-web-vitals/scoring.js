/**
 * Core Web Vitals - Scoring Engine
 * Calculates scores, ratings, percentiles, and provides analysis
 */

import { 
  CWV_METRICS, 
  CWV_RATINGS,
  CWV_THRESHOLDS,
  CWV_METRIC_ORDER,
  getRating,
  getMetricScore,
  getOverallScore,
  getOverallRating,
  formatValue,
  getColorForRating
} from './models.js';

/**
 * @typedef {Object} ScoreBreakdown
 * @property {string} metric - Metric name
 * @property {number} value - Raw metric value
 * @property {number} score - 0-100 score
 * @property {string} rating - 'good' | 'needs-improvement' | 'poor'
 * @property {number} weight - Metric weight
 * @property {number} weightedScore - Weighted contribution
 */

/**
 * CWV Scoring Engine - Calculates scores and ratings
 */
class CWVScoringEngine {
  constructor(config = {}) {
    this.config = {
      weights: CWV_METRIC_ORDER.reduce((acc, metric) => {
        acc[metric] = 1 / CWV_METRIC_ORDER.length;
        return acc;
      }, {}),
      ...config
    };
  }

  /**
   * Calculate score for a single metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} [thresholds] - Custom thresholds
   * @returns {Object} Score breakdown
   */
  scoreMetric(metric, value, thresholds = CWV_THRESHOLDS[metric]) {
    if (!thresholds) {
      return {
        metric,
        value,
        score: 0,
        rating: CWV_RATINGS.POOR,
        weight: this.config.weights[metric] || 0,
        weightedScore: 0
      };
    }

    const score = getMetricScore(value, thresholds);
    const rating = getRating(value, thresholds);
    const weight = this.config.weights[metric] || 0;
    const weightedScore = score * weight;

    return {
      metric,
      value,
      score,
      rating,
      weight,
      weightedScore
    };
  }

  /**
   * Calculate overall score from multiple metrics
   * @param {Object} metrics - Object of metric values { LCP: 2000, CLS: 0.05, ... }
   * @returns {ScoringResult}
   */
  calculateScore(metrics) {
    const breakdown = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let metricCount = 0;

    for (const metric of CWV_METRIC_ORDER) {
      const value = metrics[metric];
      if (value === undefined || value === null) continue;

      const result = this.scoreMetric(metric, value);
      breakdown.push(result);
      weightedSum += result.weightedScore;
      totalWeight += result.weight;
      metricCount++;
    }

    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const overallRating = this.getOverallRating(overallScore);

    return {
      overallScore,
      overallRating,
      breakdown,
      totalWeight,
      metricCount
    };
  }

  /**
   * Get overall rating from score
   * @param {number} score - 0-100 score
   * @returns {string} Rating
   */
  getOverallRating(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Calculate percentiles from array of values
   * @param {number[]} values - Array of values
   * @returns {Object} Percentile data
   */
  calculatePercentiles(values) {
    if (!values || values.length === 0) {
      return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p) => {
      const index = Math.ceil(p / 100 * sorted.length) - 1;
      return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    };

    return {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      count: sorted.length
    };
  }

  /**
   * Compare two scoring results
   * @param {ScoringResult} current - Current score
   * @param {ScoringResult} previous - Previous score
   * @returns {Object} Comparison result
   */
  compareScores(current, previous) {
    const scoreDiff = current.overallScore - previous.overallScore;
    const ratingChanged = current.overallRating !== previous.overallRating;
    
    return {
      scoreDiff,
      ratingChanged,
      improved: scoreDiff > 0,
      regression: scoreDiff < -5,
      significantChange: Math.abs(scoreDiff) >= 5
    };
  }
}

// Runtime classes for validation/creation
class ScoreBreakdownClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

class ScoringResultClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

class PercentileDataClass {
  constructor(data) {
    Object.assign(this, data);
  }
}

export const ScoreBreakdown = ScoreBreakdownClass;
export const ScoringResult = ScoringResultClass;
export const PercentileData = PercentileDataClass;

export { CWVScoringEngine };

// Export singleton instance
export const cwvScoringEngine = new CWVScoringEngine();
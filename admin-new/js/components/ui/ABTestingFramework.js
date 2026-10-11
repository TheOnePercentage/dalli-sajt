/**
 * AB Testing Framework
 * A/B test management, statistical analysis, variant allocation
 */

export class ABTestingFramework {
  constructor() {
    this.experiments = new Map();
    this.loadExperiments();
  }

  loadExperiments() {
    try {
      const stored = localStorage.getItem('ab_experiments');
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach(exp => {
          exp.startDate = new Date(exp.startDate);
          exp.endDate = exp.endDate ? new Date(exp.endDate) : null;
          exp.createdAt = new Date(exp.createdAt);
          exp.updatedAt = new Date(exp.updatedAt);
          exp.results = new Map(Object.entries(exp.results || []));
          this.experiments.set(exp.id, exp);
        });
      }
    } catch (e) {
      console.warn('Failed to load experiments:', e);
    }
  }

  saveExperiments() {
    const data = Array.from(this.experiments.values()).map(exp => ({
      id: exp.id,
      name: exp.name,
      hypothesis: exp.hypothesis,
      description: exp.description,
      status: exp.status,
      variants: exp.variants,
      targetMetric: exp.targetMetric,
      secondaryMetrics: exp.secondaryMetrics,
      targeting: exp.targeting,
      trafficAllocation: exp.trafficAllocation,
      startDate: exp.startDate.toISOString(),
      endDate: exp.endDate?.toISOString(),
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      createdBy: exp.createdBy,
      results: Object.fromEntries(exp.results),
      segments: exp.segments
    }));
    localStorage.setItem('ab_experiments', JSON.stringify(data));
  }

  static generateId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  static createExperiment(config) {
    const variants = config.variants.map((v, i) => ({
      id: v.id || 'variant_' + i,
      name: v.name,
      description: v.description,
      trafficPercent: v.trafficPercent || Math.floor(100 / config.variants.length),
      config: v.config || {},
      isControl: i === 0
    }));

    const experiment = {
      id: this.generateId(),
      name: config.name,
      hypothesis: config.hypothesis,
      description: config.description,
      status: 'draft',
      variants: variants,
      targetMetric: config.targetMetric,
      secondaryMetrics: config.secondaryMetrics || [],
      targeting: config.targeting || {},
      trafficAllocation: config.trafficAllocation || 100,
      startDate: config.startDate ? new Date(config.startDate) : new Date(),
      endDate: config.endDate ? new Date(config.endDate) : null,
      minSampleSize: config.minSampleSize || 1000,
      confidenceLevel: config.confidenceLevel || 0.95,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: config.createdBy,
      results: new Map(),
      segments: config.segments || []
    };

    this.experiments.set(experiment.id, experiment);
    this.saveExperiments();
    return experiment;
  }

  static getExperiment(id) {
    return this.experiments.get(id);
  }

  static getAllExperiments() {
    return Array.from(this.experiments.values());
  }

  static getActiveExperiments() {
    const now = new Date();
    return Array.from(this.experiments.values()).filter(exp => 
      exp.status === 'running' && 
      exp.startDate <= new Date() && 
      (!exp.endDate || exp.endDate > new Date())
    );
  }

  static updateExperiment(id, updates) {
    const experiment = this.experiments.get(id);
    if (!experiment) return { success: false, error: 'Experiment not found' };

    Object.assign(experiment, updates, { updatedAt: new Date().toISOString() });
    this.experiments.set(id, experiment);
    this.saveExperiments();
    return { success: true, experiment };
  }

  static deleteExperiment(id) {
    const experiment = this.experiments.get(id);
    if (!experiment) return { success: false, error: 'Experiment not found' };
    
    this.experiments.delete(id);
    this.saveExperiments();
    return { success: true };
  }

  static startExperiment(id) {
    const experiment = this.experiments.get(id);
    if (!experiment) return { success: false, error: 'Experiment not found' };
    
    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();
    this.experiments.set(id, experiment);
    this.saveExperiments();
    return { success: true, experiment };
  }

  static pauseExperiment(id) {
    const experiment = this.experiments.get(id);
    if (!experiment) return { success: false, error: 'Experiment not found' };
    
    experiment.status = 'paused';
    experiment.updatedAt = new Date();
    this.experiments.set(id, experiment);
    this.saveExperiments();
    return { success: true, experiment };
  }

  static completeExperiment(id) {
    const experiment = this.experiments.get(id);
    if (!experiment) return { success: false, error: 'Experiment not found' };
    
    experiment.status = 'completed';
    experiment.endDate = new Date();
    experiment.updatedAt = new Date();
    this.experiments.set(id, experiment);
    this.saveExperiments();
    return { success: true, experiment };
  }

  static recordEvent(experimentId, variantId, event, value = 1) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return;

    if (!experiment.results.has(variantId)) {
      experiment.results.set(variantId, { conversions: 0, visitors: 0, revenue: 0 });
    }
    const stats = experiment.results.get(variantId);
    stats.visitors += 1;
    if (event === 'conversion') {
      stats.conversions += 1;
      stats.revenue += value;
    }
  }

  static getExperimentResults(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const results = {};
    for (const [variantId, stats] of experiment.results) {
      results[variantId] = {
        ...stats,
        conversionRate: stats.visitors > 0 ? stats.conversions / stats.visitors : 0,
        revenuePerVisitor: stats.visitors > 0 ? stats.revenue / stats.visitors : 0
      };
    }
    return results;
  }

  static getExperimentReport(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const results = this.getExperimentResults(experimentId);
    const totalVisitors = Object.values(experiment.results).reduce((sum, s) => sum + s.visitors, 0);
    const totalConversions = Object.values(experiment.results).reduce((sum, s) => sum + s.conversions, 0);
    const totalRevenue = Object.values(experiment.results).reduce((sum, s) => sum + s.revenue, 0);

    return {
      experiment,
      totalVisitors,
      totalConversions,
      totalRevenue,
      overallConversionRate: totalVisitors > 0 ? totalConversions / totalVisitors : 0,
      results
    };
  }
}

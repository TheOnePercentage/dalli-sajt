import { Component } from '../core/component.js';

export class Monitoring {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  increment(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  gauge(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
  }

  histogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.getKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    const values = this.histograms.get(key);
    values.push(value);
    if (values.length > 1000) values.shift();
  }

  getKey(name: string, labels: Record<string, string> = {}): string {
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(',');
    return `${name}{${labelStr}}`;
  }

  getMetrics(): any[] {
    const metrics: any[] = [];

    for (const [key, value] of this.counters) {
      metrics.push({ type: 'counter', name: key, value });
    }

    for (const [key, value] of this.gauges) {
      metrics.push({ type: 'gauge', name: key, value });
    }

    for (const [key, values] of this.histograms) {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const count = values.length;
        const avg = sum / count;
        const p50 = sorted[Math.floor(values.length * 0.5)];
        const p95 = sorted[Math.floor(values.length * 0.95)];
        const p99 = sorted[Math.floor(values.length * 0.99)];

        metrics.push({
          type: 'histogram',
          name: key,
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg,
          p50,
          p95,
          p99
        });
      }
    }

    return metrics;
  }

  toPrometheusFormat(): string {
    const metrics = this.getMetrics();
    let output = '';

    for (const metric of metrics) {
      if (metric.type === 'counter') {
        output += `# TYPE ${metric.name} counter\n${metric.name} ${metric.value}\n`;
      } else if (metric.type === 'gauge') {
        output += `# TYPE ${metric.name} gauge\n${metric.name} ${metric.value}\n`;
      } else if (metric.type === 'histogram') {
        output += `# TYPE ${metric.name} histogram\n`;
        output += `${metric.name}_bucket{le="0.05"} ${metric.p50}\n`;
        output += `${metric.name}_bucket{le="0.1"} ${metric.p50}\n`;
        output += `${metric.name}_bucket{le="0.2"} ${metric.p95}\n`;
        output += `${metric.name}_bucket{le="0.5"} ${metric.p95}\n`;
        output += `${metric.name}_bucket{le="1"} ${metric.p99}\n`;
        output += `${metric.name}_bucket{le="+Inf"} ${metric.count}\n`;
        output += `${metric.name}_sum ${metric.sum}\n`;
        output += `${metric.name}_count ${metric.count}\n`;
      }
    }

    return output;
  }
}

export const monitoring = new Monitoring();

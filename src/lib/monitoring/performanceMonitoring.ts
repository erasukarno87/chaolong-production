/**
 * Performance Monitoring System
 * 
 * Tracks application performance metrics including:
 * - Page load times
 * - API response times
 * - Component render times
 * - User interactions
 */

import { errorTracker } from './errorTracking';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PageLoadMetrics {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  dom: number;
  load: number;
  total: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 500;
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
    this.trackPageLoad();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    // Observe long tasks (> 50ms)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long_task',
              value: entry.duration,
              unit: 'ms',
              tags: {
                type: entry.entryType,
              },
            });

            // Log warning for very long tasks
            if (entry.duration > 100) {
              errorTracker.captureMessage(
                `Long task detected: ${entry.duration.toFixed(2)}ms`,
                'warning',
                {
                  component: 'PerformanceMonitor',
                  metadata: { duration: entry.duration },
                }
              );
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported');
      }

      // Observe layout shifts (CLS)
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as any;
            if (!layoutShift.hadRecentInput) {
              this.recordMetric({
                name: 'layout_shift',
                value: layoutShift.value,
                unit: 'count',
                tags: {
                  type: 'cls',
                },
              });
            }
          }
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported');
      }

      // Observe largest contentful paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.recordMetric({
            name: 'largest_contentful_paint',
            value: lastEntry.startTime,
            unit: 'ms',
            tags: {
              type: 'lcp',
            },
          });
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported');
      }

      // Observe first input delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const firstInput = entry as any;
            const fid = firstInput.processingStart - firstInput.startTime;
            
            this.recordMetric({
              name: 'first_input_delay',
              value: fid,
              unit: 'ms',
              tags: {
                type: 'fid',
              },
            });
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported');
      }
    }
  }

  /**
   * Track page load performance
   */
  private trackPageLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      // Wait a bit for all metrics to be available
      setTimeout(() => {
        const metrics = this.getPageLoadMetrics();
        
        if (metrics) {
          // Record individual metrics
          Object.entries(metrics).forEach(([key, value]) => {
            this.recordMetric({
              name: `page_load_${key}`,
              value,
              unit: 'ms',
              tags: {
                type: 'page_load',
              },
            });
          });

          // Log slow page loads
          if (metrics.total > 3000) {
            errorTracker.captureMessage(
              `Slow page load: ${metrics.total.toFixed(2)}ms`,
              'warning',
              {
                component: 'PerformanceMonitor',
                metadata: metrics,
              }
            );
          }
        }
      }, 0);
    });
  }

  /**
   * Get page load metrics
   */
  getPageLoadMetrics(): PageLoadMetrics | null {
    if (typeof window === 'undefined' || !window.performance) return null;

    const timing = window.performance.timing;
    const navigation = timing.navigationStart;

    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - navigation,
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      ...metric,
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (import.meta.env.MODE === 'development') {
      console.log(
        `[Performance] ${metric.name}: ${metric.value.toFixed(2)}${metric.unit}`,
        metric.tags
      );
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
      });
      return duration;
    };
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'success' },
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags: { ...tags, status: 'error' },
      });
      
      throw error;
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ) {
    this.recordMetric({
      name: 'api_call',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: status.toString(),
      },
    });

    // Log slow API calls
    if (duration > 1000) {
      errorTracker.captureMessage(
        `Slow API call: ${method} ${endpoint} (${duration.toFixed(2)}ms)`,
        'warning',
        {
          component: 'PerformanceMonitor',
          metadata: { endpoint, method, duration, status },
        }
      );
    }
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, duration: number) {
    this.recordMetric({
      name: 'component_render',
      value: duration,
      unit: 'ms',
      tags: {
        component: componentName,
      },
    });

    // Log slow renders
    if (duration > 16) { // 60fps = 16.67ms per frame
      errorTracker.captureMessage(
        `Slow component render: ${componentName} (${duration.toFixed(2)}ms)`,
        'warning',
        {
          component: componentName,
          metadata: { duration },
        }
      );
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(metricName?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const filtered = metricName
      ? this.metrics.filter(m => m.name === metricName)
      : this.metrics;

    if (filtered.length === 0) return null;

    const values = filtered.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
  } {
    const lcp = this.metrics
      .filter(m => m.name === 'largest_contentful_paint')
      .slice(-1)[0]?.value;

    const fid = this.metrics
      .filter(m => m.name === 'first_input_delay')
      .slice(-1)[0]?.value;

    const clsMetrics = this.metrics.filter(m => m.name === 'layout_shift');
    const cls = clsMetrics.reduce((sum, m) => sum + m.value, 0);

    return { lcp, fid, cls };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Disconnect all observers
   */
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export const recordMetric = (metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) =>
  performanceMonitor.recordMetric(metric);

export const startTimer = (name: string) => performanceMonitor.startTimer(name);

export const measureAsync = <T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
) => performanceMonitor.measureAsync(name, operation, tags);

export const trackApiCall = (
  endpoint: string,
  method: string,
  duration: number,
  status: number
) => performanceMonitor.trackApiCall(endpoint, method, duration, status);

export const trackComponentRender = (componentName: string, duration: number) =>
  performanceMonitor.trackComponentRender(componentName, duration);

export default performanceMonitor;
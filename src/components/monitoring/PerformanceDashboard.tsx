/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics and error logs
 * Only visible in development mode or for admin users
 */

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Clock, TrendingUp, X } from 'lucide-react';
import { performanceMonitor } from '@/lib/monitoring/performanceMonitoring';
import { errorTracker } from '@/lib/monitoring/errorTracking';
import { useAuth } from '@/contexts/AuthContext';

export function PerformanceDashboard() {
  const { effectiveRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'errors'>('performance');
  const [metrics, setMetrics] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [webVitals, setWebVitals] = useState<any>(null);

  // Only show in development or for super_admin
  const isDev = import.meta.env.MODE === 'development';
  const canView = isDev || effectiveRole === 'super_admin';

  useEffect(() => {
    if (!canView || !isOpen) return;

    const interval = setInterval(() => {
      // Update performance metrics
      const summary = performanceMonitor.getMetricsSummary();
      setMetrics(summary);

      // Update web vitals
      const vitals = performanceMonitor.getCoreWebVitals();
      setWebVitals(vitals);

      // Update errors
      const recentErrors = errorTracker.getRecentErrors(10);
      setErrors(recentErrors);
    }, 1000);

    return () => clearInterval(interval);
  }, [canView, isOpen]);

  if (!canView) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        title="Performance Monitor"
      >
        <Activity className="h-5 w-5" />
      </button>

      {/* Dashboard Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <h3 className="font-semibold">Performance Monitor</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance
              </div>
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'errors'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Errors ({errors.length})
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'performance' && (
              <div className="space-y-4">
                {/* Core Web Vitals */}
                {webVitals && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Core Web Vitals
                    </h4>
                    <div className="space-y-2">
                      {webVitals.lcp !== undefined && (
                        <MetricCard
                          label="LCP (Largest Contentful Paint)"
                          value={webVitals.lcp}
                          unit="ms"
                          threshold={2500}
                          goodThreshold={2500}
                          poorThreshold={4000}
                        />
                      )}
                      {webVitals.fid !== undefined && (
                        <MetricCard
                          label="FID (First Input Delay)"
                          value={webVitals.fid}
                          unit="ms"
                          threshold={100}
                          goodThreshold={100}
                          poorThreshold={300}
                        />
                      )}
                      {webVitals.cls !== undefined && (
                        <MetricCard
                          label="CLS (Cumulative Layout Shift)"
                          value={webVitals.cls}
                          unit=""
                          threshold={0.1}
                          goodThreshold={0.1}
                          poorThreshold={0.25}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Overall Metrics */}
                {metrics && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Overall Performance
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Average</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {metrics.avg.toFixed(2)}ms
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">P95</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {metrics.p95.toFixed(2)}ms
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Max</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {metrics.max.toFixed(2)}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Load Metrics */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Page Load
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>Refresh to see page load metrics</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'errors' && (
              <div className="space-y-2">
                {errors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No errors recorded</p>
                  </div>
                ) : (
                  errors.map((error) => (
                    <div
                      key={error.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            error.severity === 'error'
                              ? 'bg-red-200 text-red-800'
                              : error.severity === 'warning'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          {error.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        {error.message}
                      </p>
                      {error.context?.component && (
                        <p className="text-xs text-gray-600">
                          Component: {error.context.component}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {isDev ? 'Development Mode' : 'Admin View'}
            </span>
            <button
              onClick={() => {
                performanceMonitor.clearMetrics();
                errorTracker.clearErrors();
                setMetrics(null);
                setErrors([]);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  unit,
  threshold,
  goodThreshold,
  poorThreshold,
}: {
  label: string;
  value: number;
  unit: string;
  threshold: number;
  goodThreshold: number;
  poorThreshold: number;
}) {
  const status =
    value <= goodThreshold ? 'good' : value <= poorThreshold ? 'needs-improvement' : 'poor';

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    'needs-improvement': 'bg-yellow-50 border-yellow-200 text-yellow-800',
    poor: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`rounded-lg border p-3 ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-sm font-bold">
          {value.toFixed(2)}
          {unit}
        </span>
      </div>
      <div className="mt-1 text-xs opacity-75 capitalize">{status.replace('-', ' ')}</div>
    </div>
  );
}
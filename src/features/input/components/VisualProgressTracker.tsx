/**
 * Visual Progress Tracker Component
 * Advanced visual indicators dan progress tracking untuk Input Laporan
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Activity,
  BarChart3,
  Zap,
  Timer,
  Shield,
  FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types untuk progress tracking
interface ProgressData {
  step: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  timeSpent: number;
  estimatedTime: number;
  issues: string[];
  achievements: string[];
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Visual Progress Tracker dengan advanced indicators
 */
export function VisualProgressTracker() {
  const [progressData] = useState<ProgressData[]>([
    {
      step: 'setup',
      status: 'completed',
      progress: 100,
      timeSpent: 180, // 3 minutes
      estimatedTime: 180,
      issues: [],
      achievements: ['Smart target set', 'Auto-assigned operators']
    },
    {
      step: 'first_check',
      status: 'in-progress',
      progress: 65,
      timeSpent: 240, // 4 minutes
      estimatedTime: 300,
      issues: ['Operator skill gap detected'],
      achievements: ['5F5L checklist 65% complete']
    },
    {
      step: 'output',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      estimatedTime: 60,
      issues: [],
      achievements: []
    },
    {
      step: 'ng',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      estimatedTime: 120,
      issues: [],
      achievements: []
    },
    {
      step: 'downtime',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      estimatedTime: 120,
      issues: [],
      achievements: []
    },
    {
      step: 'last_check',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      estimatedTime: 180,
      issues: [],
      achievements: []
    },
    {
      step: 'summary',
      status: 'pending',
      progress: 0,
      timeSpent: 0,
      estimatedTime: 120,
      issues: [],
      achievements: []
    }
  ]);

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    const totalSteps = progressData.length;
    const completedSteps = progressData.filter(step => step.status === 'completed').length;
    const inProgressSteps = progressData.filter(step => step.status === 'in-progress').length;
    const totalProgress = progressData.reduce((sum, step) => sum + step.progress, 0) / totalSteps;
    const totalTimeSpent = progressData.reduce((sum, step) => sum + step.timeSpent, 0);
    const totalEstimatedTime = progressData.reduce((sum, step) => sum + step.estimatedTime, 0);
    const efficiency = totalEstimatedTime > 0 ? (totalEstimatedTime - totalTimeSpent) / totalEstimatedTime * 100 : 0;

    return {
      completionRate: (completedSteps / totalSteps) * 100,
      overallProgress: totalProgress,
      totalTimeSpent,
      totalEstimatedTime,
      efficiency,
      activeSteps: inProgressSteps,
      issuesCount: progressData.reduce((sum, step) => sum + step.issues.length, 0),
      achievementsCount: progressData.reduce((sum, step) => sum + step.achievements.length, 0)
    };
  }, [progressData]);

  // Live metrics cards
  const metricCards: MetricCard[] = [
    {
      title: 'Progress',
      value: `${Math.round(overallMetrics.overallProgress)}%`,
      icon: Activity,
      color: 'blue',
      trend: overallMetrics.overallProgress > 50 ? 'up' : 'stable'
    },
    {
      title: 'Efficiency',
      value: `${Math.round(overallMetrics.efficiency)}%`,
      icon: TrendingUp,
      color: 'green',
      trend: overallMetrics.efficiency > 0 ? 'up' : 'down'
    },
    {
      title: 'Time Saved',
      value: `${Math.round((overallMetrics.totalEstimatedTime - overallMetrics.totalTimeSpent) / 60)} min`,
      icon: Timer,
      color: 'purple',
      trend: overallMetrics.efficiency > 0 ? 'up' : 'stable'
    },
    {
      title: 'Issues',
      value: overallMetrics.issuesCount,
      icon: AlertTriangle,
      color: overallMetrics.issuesCount > 0 ? 'red' : 'green',
      trend: overallMetrics.issuesCount > 2 ? 'up' : 'stable'
    }
  ];

  // Step icon mapping
  const stepIcons: Record<string, any> = {
    setup: Target,
    first_check: Shield,
    output: BarChart3,
    ng: AlertTriangle,
    downtime: Clock,
    last_check: Shield,
    summary: FileText
  };

  // Status color mapping
  const statusColors: Record<string, string> = {
    'pending': 'bg-gray-100 text-gray-600 border-gray-200',
    'in-progress': 'bg-blue-100 text-blue-600 border-blue-200',
    'completed': 'bg-green-100 text-green-600 border-green-200',
    'error': 'bg-red-100 text-red-600 border-red-200'
  };

  return (
    <div className="visual-progress-tracker space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      `bg-${metric.color}-100 text-${metric.color}-600`
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{metric.title}</p>
                      <p className="text-lg font-semibold">{metric.value}</p>
                    </div>
                  </div>
                  {metric.trend && (
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      metric.trend === 'up' ? 'bg-green-100' : 
                      metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                    )}>
                      <TrendingUp className={cn(
                        "h-3 w-3",
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600 rotate-180' : 'text-gray-600'
                      )} />
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Overall Progress Bar */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Overall Progress</h3>
            <Badge variant="outline" className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              {Math.round(overallMetrics.efficiency)}% Efficient
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completion</span>
              <span>{Math.round(overallMetrics.overallProgress)}%</span>
            </div>
            <Progress value={overallMetrics.overallProgress} className="h-3" />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Time: {Math.round(overallMetrics.totalTimeSpent / 60)} / {Math.round(overallMetrics.totalEstimatedTime / 60)} min</span>
            <span>{overallMetrics.completedSteps} / {progressData.length} steps</span>
          </div>
        </div>
      </Card>

      {/* Step-by-Step Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Step Progress</h3>
        <div className="space-y-4">
          {progressData.map((step, index) => {
            const Icon = stepIcons[step.step];
            const isActive = step.status === 'in-progress';
            const isCompleted = step.status === 'completed';
            
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200",
                  isActive ? 'bg-blue-50 border-blue-200' : 
                  isCompleted ? 'bg-green-50 border-green-200' : 
                  'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Step Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    statusColors[step.status]
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{step.step.replace('_', ' ')}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {step.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(step.timeSpent / 60)} / {Math.round(step.estimatedTime / 60)} min
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={step.progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{Math.round(step.progress)}% complete</span>
                        <span>
                          {step.estimatedTime > 0 ? 
                            Math.round((step.timeSpent / step.estimatedTime) * 100) : 0
                          }% time used
                        </span>
                      </div>
                    </div>

                    {/* Issues */}
                    {step.issues.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {step.issues.map((issue, issueIndex) => (
                          <div key={issueIndex} className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <AlertTriangle className="h-3 w-3" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Achievements */}
                    {step.achievements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {step.achievements.map((achievement, achievementIndex) => (
                          <Badge key={achievementIndex} variant="secondary" className="text-xs">
                            {achievement}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Live Activity Feed */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Live Activity</h3>
        <div className="space-y-3">
          <AnimatePresence>
            {/* Recent activities would be mapped here */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">First Check in progress</p>
                <p className="text-xs text-gray-600">65% completed - 2 issues detected</p>
              </div>
              <span className="text-xs text-gray-500">Just now</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium">Setup completed</p>
                <p className="text-xs text-gray-600">Smart target set, operators assigned</p>
              </div>
              <span className="text-xs text-gray-500">3 min ago</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

/**
 * Mini Progress Indicator untuk digunakan di header
 */
export function MiniProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      <span className="text-sm font-medium text-gray-600">
        {currentStep} / {totalSteps}
      </span>
    </div>
  );
}

/**
 * Step Completion Badge untuk visual feedback
 */
export function StepCompletionBadge({ 
  status, 
  progress, 
  issues 
}: { 
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  issues: number;
}) {
  const getBadgeColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'in-progress': return <Clock className="h-3 w-3" />;
      case 'error': return <AlertTriangle className="h-3 w-3" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  return (
    <Badge className={cn("flex items-center gap-1", getBadgeColor())}>
      {getIcon()}
      {Math.round(progress)}%
      {issues > 0 && (
        <span className="ml-1 text-xs">({issues})</span>
      )}
    </Badge>
  );
}

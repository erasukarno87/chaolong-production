/**
 * Status Dashboard Component
 * Real-time overview cards untuk production setup
 */

import { useMemo } from "react";
import { 
  Monitor, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Shield,
  Clock,
  TrendingUp,
  Activity
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types untuk dashboard metrics
interface DashboardMetrics {
  totalWorkstations: number;
  totalOperators: number;
  readyOperators: number;
  skillCompliant: number;
  absentCount: number;
  issuesCount: number;
  readinessPercentage: number;
  skillCompliancePercentage: number;
}

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

/**
 * Enhanced Status Card dengan better visual hierarchy
 */
function StatusCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  trend, 
  trendValue 
}: StatusCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      trend: 'text-blue-500'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: 'text-green-600',
      trend: 'text-green-500'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      trend: 'text-amber-500'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600',
      trend: 'text-red-500'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      trend: 'text-purple-500'
    }
  };

  const classes = colorClasses[color];

  return (
    <Card className={cn(
      "status-card p-4 transition-all duration-200 hover:shadow-md border-2",
      classes.bg, classes.border
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={cn("text-sm font-medium", classes.text)}>
            {title}
          </p>
          <p className={cn("text-2xl font-bold mt-1", classes.text)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-1">
              {subtitle}
            </p>
          )}
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              classes.trend
            )}>
              <TrendingUp className="h-3 w-3" />
              {trendValue}
            </div>
          )}
        </div>
        
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center ml-4",
          classes.bg
        )}>
          <Icon className={cn("h-6 w-6", classes.icon)} />
        </div>
      </div>
    </Card>
  );
}

/**
 * Main Status Dashboard Component
 */
export function StatusDashboard({ 
  linePOS, 
  posOpAssignments, 
  opSkillsMap 
}: {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
}) {
  // Calculate metrics
  const metrics: DashboardMetrics = useMemo(() => {
    const totalWorkstations = linePOS.length;
    const totalOperators = new Set(linePOS.flatMap(p => p.default_assignments.map((a: any) => a.operator_id))).size;
    const absentCount = Object.values(posOpAssignments).filter((a: any) => a.isAbsent).length;
    const readyOperators = totalOperators - absentCount;
    
    // Calculate skill compliance
    let skillCompliantCount = 0;
    let totalSkillChecks = 0;
    
    linePOS.forEach(pos => {
      pos.default_assignments.forEach((slot: any) => {
        const slotKey = `${pos.id}::${slot.operator_id}`;
        const assignment = posOpAssignments[slotKey] || { isAbsent: false, replacementId: null };
        const effectiveId = assignment.isAbsent ? assignment.replacementId : slot.operator_id;
        
        if (effectiveId) {
          totalSkillChecks++;
          const requirements = pos.process_skill_requirements || [];
          const operatorSkills = opSkillsMap.get(effectiveId) || new Map();
          
          const isCompliant = requirements.every((req: any) => {
            const skill = operatorSkills.get(req.skill_id);
            return skill && skill.level >= req.min_level;
          });
          
          if (isCompliant) skillCompliantCount++;
        }
      });
    });
    
    const readinessPercentage = totalOperators > 0 ? (readyOperators / totalOperators) * 100 : 0;
    const skillCompliancePercentage = totalSkillChecks > 0 ? (skillCompliantCount / totalSkillChecks) * 100 : 0;
    
    // Count issues
    const issuesCount = linePOS.filter(pos => {
      const hasIssues = pos.default_assignments.some((slot: any) => {
        const slotKey = `${pos.id}::${slot.operator_id}`;
        const assignment = posOpAssignments[slotKey] || { isAbsent: false, replacementId: null };
        const effectiveId = assignment.isAbsent ? assignment.replacementId : slot.operator_id;
        
        if (!effectiveId) return true;
        
        const requirements = pos.process_skill_requirements || [];
        const operatorSkills = opSkillsMap.get(effectiveId) || new Map();
        
        return !requirements.every((req: any) => {
          const skill = operatorSkills.get(req.skill_id);
          return skill && skill.level >= req.min_level;
        });
      });
      
      return hasIssues;
    }).length;

    return {
      totalWorkstations,
      totalOperators,
      readyOperators,
      skillCompliant: skillCompliantCount,
      absentCount,
      issuesCount,
      readinessPercentage,
      skillCompliancePercentage
    };
  }, [linePOS, posOpAssignments, opSkillsMap]);

  return (
    <div className="status-dashboard space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Production Setup Overview</h2>
        <p className="text-sm text-gray-600 mt-1">Real-time status of workstations and operators</p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          title="Total Workstations"
          value={metrics.totalWorkstations}
          subtitle="Active stations"
          icon={Monitor}
          color="blue"
          trend="stable"
          trendValue="All operational"
        />
        
        <StatusCard
          title="Operators Ready"
          value={`${metrics.readyOperators}/${metrics.totalOperators}`}
          subtitle={`${Math.round(metrics.readinessPercentage)}% ready`}
          icon={Users}
          color={metrics.readinessPercentage >= 90 ? "green" : metrics.readinessPercentage >= 70 ? "amber" : "red"}
          trend={metrics.readinessPercentage >= 90 ? "up" : metrics.readinessPercentage >= 70 ? "stable" : "down"}
          trendValue={`${Math.round(metrics.readinessPercentage)}%`}
        />
        
        <StatusCard
          title="Skill Compliant"
          value={`${Math.round(metrics.skillCompliancePercentage)}%`}
          subtitle={`${metrics.skillCompliant}/${metrics.totalOperators} compliant`}
          icon={Shield}
          color={metrics.skillCompliancePercentage >= 90 ? "green" : metrics.skillCompliancePercentage >= 70 ? "amber" : "red"}
          trend={metrics.skillCompliancePercentage >= 90 ? "up" : metrics.skillCompliancePercentage >= 70 ? "stable" : "down"}
          trendValue={`${Math.round(metrics.skillCompliancePercentage)}%`}
        />
        
        <StatusCard
          title="Issues Found"
          value={metrics.issuesCount}
          subtitle="Need attention"
          icon={AlertTriangle}
          color={metrics.issuesCount === 0 ? "green" : metrics.issuesCount <= 2 ? "amber" : "red"}
          trend={metrics.issuesCount === 0 ? "up" : "down"}
          trendValue={metrics.issuesCount === 0 ? "All clear" : "Action needed"}
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Production Readiness</p>
              <p className="text-lg font-bold text-blue-900">
                {Math.round((metrics.readinessPercentage + metrics.skillCompliancePercentage) / 2)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Absent Today</p>
              <p className="text-lg font-bold text-purple-900">{metrics.absentCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Setup Progress</p>
              <p className="text-lg font-bold text-green-900">
                {Math.round(((metrics.totalWorkstations - metrics.issuesCount) / metrics.totalWorkstations) * 100)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Status Summary */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              metrics.issuesCount === 0 ? "bg-green-500" : 
              metrics.issuesCount <= 2 ? "bg-amber-500" : "bg-red-500"
            )} />
            <span className="text-sm font-medium text-gray-700">
              Overall Status: {metrics.issuesCount === 0 ? "Ready for Production" : 
              metrics.issuesCount <= 2 ? "Minor Issues" : "Critical Issues"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>
      </Card>
    </div>
  );
}

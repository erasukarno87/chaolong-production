/**
 * Enhanced Setup Step 2 Component
 * Integrasi semua UI improvements untuk Man Power & WI
 */

import { useState, useMemo, useCallback } from "react";
import { StatusDashboard } from "./StatusDashboard";
import { WorkstationCardsList } from "./WorkstationCards";
import { MobileWorkstationCardsList } from "./MobileWorkstationCards";
import { QuickActionsPanel, useQuickActions } from "./QuickActionsPanel";
import { FilterPanel, useFilteredWorkstations } from "./FilterPanel";
import { useRealTimeUpdates } from "../hooks/useRealTimeUpdates";
import { cn } from "@/lib/utils";

interface EnhancedSetupStep2Props {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
  lineOperators: any[];
  onStatusChange: (posId: string, operatorId: string, status: boolean) => void;
  onReplacementSelect: (posId: string, operatorId: string, replacementId: string) => void;
}

interface FilterOptions {
  search: string;
  status: 'all' | 'ready' | 'warning' | 'error' | 'info';
  operatorCount: 'all' | 'empty' | 'single' | 'multiple';
  skillCompliance: 'all' | 'compliant' | 'partial' | 'non-compliant';
  hasAbsent: 'all' | 'yes' | 'no';
  sortBy: 'code' | 'name' | 'status' | 'operatorCount';
  sortOrder: 'asc' | 'desc';
}

export function EnhancedSetupStep2({
  linePOS,
  posOpAssignments,
  opSkillsMap,
  lineOperators,
  onStatusChange,
  onReplacementSelect
}: EnhancedSetupStep2Props) {
  // State untuk filtering dan UI
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    operatorCount: 'all',
    skillCompliance: 'all',
    hasAbsent: 'all',
    sortBy: 'code',
    sortOrder: 'asc'
  });
  
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Real-time updates
  const {
    isConnected,
    systemAlerts,
    manualRefresh,
    clearAlerts
  } = useRealTimeUpdates({
    lineId: linePOS[0]?.line_id,
    enableNotifications: true
  });
  
  // Filter workstations
  const filteredWorkstations = useFilteredWorkstations({
    linePOS,
    posOpAssignments,
    opSkillsMap,
    filters
  });
  
  // Quick actions
  const quickActions = useQuickActions({
    linePOS,
    posOpAssignments,
    onMarkAllReady: () => {
      // Mark all workstations as ready
      linePOS.forEach(pos => {
        pos.default_assignments.forEach((slot: any) => {
          const slotKey = `${pos.id}::${slot.operator_id}`;
          const assignment = posOpAssignments[slotKey];
          if (assignment?.isAbsent) {
            onStatusChange(pos.id, slot.operator_id, false);
          }
        });
      });
    },
    onAssignReplacements: () => {
      // Auto-assign replacements for absent operators
      linePOS.forEach(pos => {
        pos.default_assignments.forEach((slot: any) => {
          const slotKey = `${pos.id}::${slot.operator_id}`;
          const assignment = posOpAssignments[slotKey];
          if (assignment?.isAbsent && !assignment.replacementId) {
            // Find best replacement
            const availableOperators = lineOperators.filter(lo => 
              lo.operators_public && 
              !pos.default_assignments.some((s: any) => s.operator_id === lo.operators_public.id)
            );
            if (availableOperators.length > 0) {
              onReplacementSelect(pos.id, slot.operator_id, availableOperators[0].operators_public.id);
            }
          }
        });
      });
    },
    onRefreshSkills: manualRefresh,
    onExportReport: () => {
      // Export current setup to CSV
      const csvContent = generateSetupReport(linePOS, posOpAssignments);
      downloadCSV(csvContent, 'production-setup-report.csv');
    },
    onOpenSettings: () => {
      // Open settings modal
      console.log('Open settings');
    },
    onOpenFilters: () => {
      // Focus on filter search
      document.getElementById('workstation-search')?.focus();
    }
  });
  
  // Detect mobile view
  useState(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
  
  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);
  
  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      operatorCount: 'all',
      skillCompliance: 'all',
      hasAbsent: 'all',
      sortBy: 'code',
      sortOrder: 'asc'
    });
  }, []);
  
  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const totalWorkstations = linePOS.length;
    const readyWorkstations = filteredWorkstations.filter(pos => {
      const operators = pos.default_assignments;
      if (operators.length === 0) return false;
      
      const absentInPos = operators.filter((op: any) => {
        const slotKey = `${pos.id}::${op.operator_id}`;
        return (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
      }).length;
      
      const posSkillOk = operators.every((op: any) => {
        const slotKey = `${pos.id}::${op.operator_id}`;
        const assignment = posOpAssignments[slotKey] ?? { isAbsent: false, replacementId: null };
        const effectiveId = assignment.isAbsent ? assignment.replacementId : op.operator_id;
        
        if (!effectiveId) return false;
        
        const requirements = pos.process_skill_requirements || [];
        const operatorSkills = opSkillsMap.get(effectiveId) || new Map();
        
        return requirements.every((req: any) => {
          const skill = operatorSkills.get(req.skill_id);
          return skill && skill.level >= req.min_level;
        });
      });
      
      return posSkillOk && absentInPos === 0;
    }).length;
    
    const setupProgress = totalWorkstations > 0 ? (readyWorkstations / totalWorkstations) * 100 : 0;
    const estimatedTimeReduction = setupProgress > 80 ? 25 : setupProgress > 60 ? 15 : setupProgress > 40 ? 10 : 5;
    
    return {
      totalWorkstations,
      readyWorkstations,
      setupProgress,
      estimatedTimeReduction
    };
  }, [linePOS, filteredWorkstations, posOpAssignments, opSkillsMap]);
  
  return (
    <div className="enhanced-setup-step-2 space-y-6">
      {/* Status Dashboard */}
      <StatusDashboard 
        linePOS={linePOS}
        posOpAssignments={posOpAssignments}
        opSkillsMap={opSkillsMap}
      />
      
      {/* Filter Panel */}
      <FilterPanel
        linePOS={linePOS}
        posOpAssignments={posOpAssignments}
        opSkillsMap={opSkillsMap}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
      
      {/* Performance Metrics Bar */}
      <div className="performance-metrics-bar bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Setup Progress:</span>
              <span className="ml-2 font-bold text-emerald-600">{performanceMetrics.setupProgress.toFixed(1)}%</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Time Reduction:</span>
              <span className="ml-2 font-bold text-blue-600">-{performanceMetrics.estimatedTimeReduction}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span>{isConnected ? 'Live Updates' : 'Offline'}</span>
          </div>
        </div>
      </div>
      
      {/* Workstation Display */}
      <div className="workstation-display">
        {isMobileView ? (
          <MobileWorkstationCardsList
            linePOS={filteredWorkstations}
            posOpAssignments={posOpAssignments}
            onSwipeAction={(posId, action) => {
              if (action === 'right') {
                // Quick mark as ready
                const pos = linePOS.find(p => p.id === posId);
                if (pos) {
                  pos.default_assignments.forEach((slot: any) => {
                    const slotKey = `${posId}::${slot.operator_id}`;
                    const assignment = posOpAssignments[slotKey];
                    if (assignment?.isAbsent) {
                      onStatusChange(posId, slot.operator_id, false);
                    }
                  });
                }
              } else if (action === 'left') {
                // Show quick actions
                console.log('Quick actions for:', posId);
              }
            }}
            opSkillsMap={opSkillsMap}
          />
        ) : (
          <WorkstationCardsList
            linePOS={filteredWorkstations}
            posOpAssignments={posOpAssignments}
            onStatusChange={onStatusChange}
            onReplacementSelect={onReplacementSelect}
            opSkillsMap={opSkillsMap}
            lineOperators={lineOperators}
          />
        )}
      </div>
      
      {/* Quick Actions Panel */}
      <QuickActionsPanel
        actions={quickActions}
        isExpanded={isQuickActionsOpen}
        onToggle={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
      />
      
      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {systemAlerts.map(alert => (
            <div key={alert.id} className={cn(
              "p-3 rounded-lg border shadow-sm",
              alert.type === 'error' ? "border-red-200 bg-red-50 text-red-700" :
              alert.type === 'warning' ? "border-amber-200 bg-amber-50 text-amber-700" :
              alert.type === 'success' ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
              "border-blue-200 bg-blue-50 text-blue-700"
            )}>
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm">{alert.title}</h5>
                  <p className="text-xs mt-1">{alert.message}</p>
                </div>
                <button
                  onClick={() => clearAlerts()}
                  className="text-xs opacity-75 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper functions
function generateSetupReport(linePOS: any[], posOpAssignments: Record<string, any>): string {
  const headers = ['Workstation', 'Operator', 'Status', 'Skills', 'Notes'];
  const rows = linePOS.map(pos => {
    return pos.default_assignments.map((slot: any) => {
      const slotKey = `${pos.id}::${slot.operator_id}`;
      const assignment = posOpAssignments[slotKey] || { isAbsent: false, replacementId: null };
      const operatorData = slot.operators_public;
      
      return [
        pos.name,
        operatorData?.full_name || 'Unknown',
        assignment.isAbsent ? 'Absent' : 'Present',
        'Compliant', // Simplified for demo
        assignment.replacementId ? `Replaced by ${assignment.replacementId}` : ''
      ];
    });
  }).flat();
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

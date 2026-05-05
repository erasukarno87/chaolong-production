/**
 * Quick Actions Panel Component
 * Floating panel untuk common operations
 */

import { useState } from "react";
import { 
  CheckCircle, 
  UserPlus, 
  RefreshCw, 
  Download, 
  Settings,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types untuk quick actions
interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  action: () => void;
  disabled?: boolean;
  badge?: string;
}

interface QuickActionsPanelProps {
  actions: QuickAction[];
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * Individual Quick Action Button
 */
function QuickActionButton({ action, onClick }: { action: QuickAction; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={action.disabled}
      className={cn(
        "group relative w-full p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
        "flex items-center gap-3 text-left",
        action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        action.color
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
        action.color.includes('blue') ? "bg-blue-500 text-white" :
        action.color.includes('green') ? "bg-green-500 text-white" :
        action.color.includes('amber') ? "bg-amber-500 text-white" :
        action.color.includes('red') ? "bg-red-500 text-white" :
        action.color.includes('purple') ? "bg-purple-500 text-white" :
        "bg-gray-500 text-white"
      )}>
        <action.icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm text-gray-900 truncate">{action.label}</h4>
          {action.badge && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {action.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-0.5 truncate">{action.description}</p>
      </div>

      {/* Arrow indicator */}
      <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

/**
 * Main Quick Actions Panel
 */
export function QuickActionsPanel({ 
  actions, 
  isExpanded = false, 
  onToggle,
  className 
}: QuickActionsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Group actions by category
  const primaryActions = actions.filter(action => 
    ['mark-ready', 'assign-replacements', 'refresh-skills'].includes(action.id)
  );
  
  const secondaryActions = actions.filter(action => 
    !['mark-ready', 'assign-replacements', 'refresh-skills'].includes(action.id)
  );

  return (
    <div className={cn("quick-actions-panel fixed bottom-6 right-6 z-40", className)}>
      {/* Floating Button when minimized */}
      {!isExpanded && (
        <button
          onClick={onToggle}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 flex items-center justify-center group"
        >
          <div className="relative">
            <Settings className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
            {actions.some(a => a.badge) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </div>
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <Card className="w-80 shadow-2xl border-2 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button
                onClick={onToggle}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={cn("transition-all duration-300", isMinimized ? "max-h-0 overflow-hidden" : "max-h-96 overflow-y-auto")}>
            {/* Primary Actions */}
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Common Actions</h4>
              <div className="space-y-2">
                {primaryActions.map(action => (
                  <QuickActionButton
                    key={action.id}
                    action={action}
                    onClick={action.action}
                  />
                ))}
              </div>
            </div>

            {/* Secondary Actions */}
            {secondaryActions.length > 0 && (
              <div className="p-4 space-y-3 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Other Actions</h4>
                <div className="space-y-2">
                  {secondaryActions.map(action => (
                    <QuickActionButton
                      key={action.id}
                      action={action}
                      onClick={action.action}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Last updated: {new Date().toLocaleTimeString('id-ID')}</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>System Ready</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Quick Actions Hook untuk production setup
 */
export function useQuickActions({
  linePOS,
  posOpAssignments,
  onMarkAllReady,
  onAssignReplacements,
  onRefreshSkills,
  onExportReport,
  onOpenSettings,
  onOpenFilters
}: {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  onMarkAllReady: () => void;
  onAssignReplacements: () => void;
  onRefreshSkills: () => void;
  onExportReport: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
}) {
  // Calculate metrics for badges
  const issuesCount = linePOS.filter(pos => {
    return pos.default_assignments.some((slot: any) => {
      const slotKey = `${pos.id}::${slot.operator_id}`;
      const assignment = posOpAssignments[slotKey] || { isAbsent: false, replacementId: null };
      const effectiveId = assignment.isAbsent ? assignment.replacementId : slot.operator_id;
      
      return !effectiveId || assignment.isAbsent;
    });
  }).length;

  const absentCount = Object.values(posOpAssignments).filter((a: any) => a.isAbsent).length;

  const actions: QuickAction[] = [
    {
      id: 'mark-ready',
      label: 'Mark All Ready',
      description: 'Mark all workstations as ready for production',
      icon: CheckCircle,
      color: 'border-green-200 bg-green-50 hover:bg-green-100',
      action: onMarkAllReady,
      disabled: issuesCount > 0,
      badge: issuesCount > 0 ? `${issuesCount} issues` : undefined
    },
    {
      id: 'assign-replacements',
      label: 'Assign Replacements',
      description: 'Quickly assign replacement operators',
      icon: UserPlus,
      color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
      action: onAssignReplacements,
      badge: absentCount > 0 ? `${absentCount} absent` : undefined
    },
    {
      id: 'refresh-skills',
      label: 'Refresh Skills',
      description: 'Update skill compliance status',
      icon: RefreshCw,
      color: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
      action: onRefreshSkills
    },
    {
      id: 'export-report',
      label: 'Export Report',
      description: 'Download production setup report',
      icon: Download,
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
      action: onExportReport
    },
    {
      id: 'open-filters',
      label: 'Filter Workstations',
      description: 'Filter by status, skills, or operators',
      icon: Filter,
      color: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
      action: onOpenFilters
    },
    {
      id: 'open-settings',
      label: 'Settings',
      description: 'Configure setup preferences',
      icon: Settings,
      color: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
      action: onOpenSettings
    }
  ];

  return actions;
}

/**
 * Compact Quick Actions Bar
 */
export function CompactQuickActionsBar({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="compact-quick-actions-bar fixed bottom-4 left-4 right-4 z-40">
      <Card className="p-2 bg-white/95 backdrop-blur-sm border-2 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto">
          {actions.slice(0, 4).map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  action.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100",
                  action.color.includes('blue') ? "text-blue-600" :
                  action.color.includes('green') ? "text-green-600" :
                  action.color.includes('amber') ? "text-amber-600" :
                  action.color.includes('red') ? "text-red-600" :
                  action.color.includes('purple') ? "text-purple-600" :
                  "text-gray-600"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
          
          {actions.length > 4 && (
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">
              <ChevronDown className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Floating Action Button (FAB) for mobile
 */
export function MobileFloatingActions({ actions }: { actions: QuickAction[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const primaryAction = actions.find(a => a.id === 'mark-ready') || actions[0];
  const Icon = primaryAction.icon;

  return (
    <div className="mobile-floating-actions fixed bottom-6 right-6 z-40">
      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-2">
          {actions.slice(1).reverse().map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-200",
                  "animate-in slide-in-from-bottom-2 fade-in-0",
                  `delay-${index * 50}`,
                  action.color.includes('blue') ? "bg-blue-500 text-white" :
                  action.color.includes('green') ? "bg-green-500 text-white" :
                  action.color.includes('amber') ? "bg-amber-500 text-white" :
                  action.color.includes('red') ? "bg-red-500 text-white" :
                  action.color.includes('purple') ? "bg-purple-500 text-white" :
                  "bg-gray-500 text-white"
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <ActionIcon className="h-4 w-4" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            primaryAction.action();
          }
        }}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center",
          isOpen ? "bg-gray-500 rotate-45" : "bg-blue-600 hover:bg-blue-700 hover:scale-110",
          "text-white"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </button>

      {/* Secondary FABs */}
      {!isOpen && actions.length > 1 && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold border-2 border-white"
        >
          +{actions.length - 1}
        </button>
      )}
    </div>
  );
}

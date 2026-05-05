/**
 * Mobile Workstation Cards Component
 * Enhanced mobile experience dengan swipe gestures
 */

import { useState, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Users,
  Shield
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MobileWorkstationCardProps {
  pos: any;
  operators: any[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
}

/**
 * Mobile Workstation Card dengan swipe gestures
 */
export function MobileWorkstationCard({ 
  pos, 
  operators, 
  onSwipeLeft, 
  onSwipeRight, 
  onTap,
  posOpAssignments,
  opSkillsMap 
}: MobileWorkstationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'left' | 'right' | null>(null);

  // Calculate POS status
  const hasOperators = operators.length > 0;
  const absentCount = operators.filter(op => {
    const slotKey = `${pos.id}::${op.operator_id}`;
    return (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
  }).length;
  
  const posSkillOk = !hasOperators ? true : operators.every(op => {
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

  const posStatus = !hasOperators ? 'info' : 
                    !posSkillOk ? 'error' : 
                    absentCount > 0 ? 'warning' : 'ready';

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    setSwipeAction(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = Math.abs(touch.clientY - dragStart.y);
    
    // Only handle horizontal swipes
    if (deltaY < 50 && Math.abs(deltaX) > 20) {
      e.preventDefault();
      setDragOffset(deltaX);
      
      // Determine swipe action based on threshold
      if (Math.abs(deltaX) > 100) {
        setSwipeAction(deltaX > 0 ? 'right' : 'left');
      } else {
        setSwipeAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (dragOffset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset
    setDragOffset(0);
    setIsDragging(false);
    setSwipeAction(null);
  };

  // Handle mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = Math.abs(e.clientY - dragStart.y);
    
    if (deltaY < 50 && Math.abs(deltaX) > 20) {
      e.preventDefault();
      setDragOffset(deltaX);
      
      if (Math.abs(deltaX) > 100) {
        setSwipeAction(deltaX > 0 ? 'right' : 'left');
      } else {
        setSwipeAction(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (dragOffset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setDragOffset(0);
    setIsDragging(false);
    setSwipeAction(null);
  };

  const statusColors = {
    ready: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50', 
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50'
  };

  const statusBadges = {
    ready: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✓ Ready' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚠ Issues' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: '✗ Problems' },
    info: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ℹ No Formasi' }
  };

  const badge = statusBadges[posStatus];

  return (
    <div className="mobile-workstation-card relative">
      {/* Swipe Action Overlays */}
      {swipeAction && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-200",
          swipeAction === 'left' ? 'bg-blue-500/90' : 'bg-emerald-500/90'
        )}>
          <div className="flex items-center gap-2 text-white">
            {swipeAction === 'left' ? (
              <>
                <ChevronLeft className="h-6 w-6" />
                <span className="font-medium">Quick Action</span>
              </>
            ) : (
              <>
                <span className="font-medium">Mark Ready</span>
                <ChevronRight className="h-6 w-6" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Card */}
      <div
        ref={cardRef}
        className={cn(
          "relative transition-transform duration-200 cursor-pointer",
          statusColors[posStatus]
        )}
        style={{
          transform: `translateX(${dragOffset}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={onTap}
      >
        <Card className="p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Workstation Icon */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {pos.code.split('-').slice(-1)[0] || '—'}
              </div>
              
              {/* Workstation Info */}
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">{pos.name}</h3>
                <p className="text-xs text-gray-600 font-mono">{pos.code}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium", badge.bg, badge.text)}>
              {badge.label}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center gap-1 text-gray-600">
                <Users className="h-3 w-3" />
                <span className="text-xs font-medium">{operators.length}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Operators</p>
            </div>
            
            <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs font-medium">{absentCount}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Absent</p>
            </div>
            
            <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center gap-1">
                <Shield className={cn("h-3 w-3", posSkillOk ? "text-emerald-600" : "text-red-600")} />
                <span className={cn("text-xs font-medium", posSkillOk ? "text-emerald-600" : "text-red-600")}>
                  {posSkillOk ? '✓' : '✗'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Skills</p>
            </div>
          </div>

          {/* Operator Preview */}
          {hasOperators && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Operators:</div>
              <div className="space-y-1">
                {operators.slice(0, 2).map((operator: any) => {
                  const slotKey = `${pos.id}::${operator.operator_id}`;
                  const isAbsent = (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
                  const operatorData = operator.operators_public;
                  
                  return (
                    <div key={operator.operator_id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ 
                          background: operatorData?.avatar_color || "hsl(var(--primary))",
                          opacity: isAbsent ? 0.5 : 1
                        }}
                      >
                        {operatorData?.initials || operatorData?.full_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          isAbsent && "line-through text-gray-500"
                        )}>
                          {operatorData?.full_name}
                        </p>
                        {operatorData?.employee_code && (
                          <p className="text-xs text-gray-500">{operatorData.employee_code}</p>
                        )}
                      </div>
                      {isAbsent && (
                        <div className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Absen
                        </div>
                      )}
                    </div>
                  );
                })}
                {operators.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{operators.length - 2} more operators
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Operators */}
          {!hasOperators && (
            <div className="text-center py-4 text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
              <p className="text-xs font-medium">No operators assigned</p>
            </div>
          )}

          {/* Swipe Hint */}
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
            <ChevronLeft className="h-3 w-3" />
            <span>Swipe for actions</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Mobile Workstation Cards List
 */
export function MobileWorkstationCardsList({ 
  linePOS, 
  posOpAssignments, 
  onSwipeAction,
  opSkillsMap 
}: {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  onSwipeAction: (posId: string, action: 'left' | 'right') => void;
  opSkillsMap: Map<string, Map<string, any>>;
}) {
  const handleSwipeLeft = (posId: string) => {
    onSwipeAction(posId, 'left');
  };

  const handleSwipeRight = (posId: string) => {
    onSwipeAction(posId, 'right');
  };

  const handleTap = (posId: string) => {
    // Handle tap to expand details
    console.log('Tapped on workstation:', posId);
  };

  return (
    <div className="mobile-workstation-cards-list space-y-3">
      {linePOS.map(pos => (
        <MobileWorkstationCard
          key={pos.id}
          pos={pos}
          operators={pos.default_assignments}
          onSwipeLeft={() => handleSwipeLeft(pos.id)}
          onSwipeRight={() => handleSwipeRight(pos.id)}
          onTap={() => handleTap(pos.id)}
          posOpAssignments={posOpAssignments}
          opSkillsMap={opSkillsMap}
        />
      ))}
    </div>
  );
}

/**
 * Touch-friendly Action Sheet
 */
export function MobileActionSheet({ 
  isOpen, 
  onClose, 
  actions 
}: {
  isOpen: boolean;
  onClose: () => void;
  posId: string;
  actions: Array<{
    label: string;
    icon: any;
    color: string;
    action: () => void;
  }>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Action Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl w-full max-h-[80vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Workstation Actions</h3>
          <p className="text-sm text-gray-600">Quick actions for workstation</p>
        </div>
        
        {/* Actions */}
        <div className="py-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                  index === 0 && "border-t border-gray-100"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  action.color
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-gray-900">{action.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Cancel */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 text-center font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

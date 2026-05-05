/**
 * Workstation Cards Component
 * Modern card-based layout untuk menggantikan table view
 */

import { useState } from "react";
import { 
  Users, 
  AlertTriangle, 
  Shield,
  MoreVertical,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types untuk workstation cards
interface WorkstationCardProps {
  pos: any;
  operators: any[];
  onStatusChange: (posId: string, operatorId: string, status: boolean) => void;
  onReplacementSelect: (posId: string, operatorId: string, replacementId: string) => void;
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
  lineOperators: any[];
}

interface StatusBadgeProps {
  status: 'ready' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

/**
 * Enhanced Status Badge dengan better visual design
 */
function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusClasses = {
    ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200", 
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200"
  };

  return (
    <Badge className={cn("px-2.5 py-1 text-xs font-medium border", statusClasses[status])}>
      {children}
    </Badge>
  );
}

/**
 * Operator Row Component
 */
function OperatorRow({ 
  operator, 
  assignment, 
  onStatusChange, 
  onReplacementSelect,
  posId,
  pos,
  opSkillsMap,
  lineOperators 
}: {
  operator: any;
  assignment: any;
  onStatusChange: (posId: string, operatorId: string, status: boolean) => void;
  onReplacementSelect: (posId: string, operatorId: string, replacementId: string) => void;
  posId: string;
  pos: any;
  opSkillsMap: Map<string, Map<string, any>>;
  lineOperators: any[];
}) {
  const isAbsent = assignment?.isAbsent || false;
  const replacementId = assignment?.replacementId;
  
  const effectiveOpId = isAbsent ? replacementId : operator.operator_id;
  const operatorData = operator.operators_public;
  
  // Check skill compliance
  const checkSkillCompliance = (operatorId: string) => {
    const requirements = pos.process_skill_requirements || [];
    const operatorSkills = opSkillsMap.get(operatorId) || new Map();
    
    if (requirements.length === 0) return { status: 'no-req', details: [] };
    
    const details = requirements.map((req: any) => {
      const skill = operatorSkills.get(req.skill_id);
      return {
        name: req.skill_id,
        met: skill ? skill.level >= req.min_level : false,
        actual: skill?.level || 0,
        required: req.min_level,
        wi_pass: skill?.wi_pass || false
      };
    });
    
    const allMet = details.every(d => d.met);
    const someMet = details.some(d => d.met);
    
    return {
      status: allMet ? 'ok' : someMet ? 'partial' : 'fail',
      details
    };
  };
  
  const compliance = checkSkillCompliance(effectiveOpId || operator.operator_id);
  const replacementOp = replacementId ? lineOperators.find(lo => lo.operators_public?.id === replacementId)?.operators_public : null;

  return (
    <div className="operator-row space-y-3">
      {/* Main Operator Row */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {/* Operator Avatar */}
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ 
                background: isAbsent && replacementOp ? 
                  (replacementOp.avatar_color || "hsl(var(--primary))") :
                  (operatorData?.avatar_color || "hsl(var(--primary))")
              }}
            >
              {isAbsent && replacementOp ? 
                (replacementOp.initials || replacementOp.full_name?.slice(0, 2).toUpperCase()) :
                (operatorData?.initials || operatorData?.full_name?.slice(0, 2).toUpperCase())
              }
            </div>
            {isAbsent && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </div>
          
          {/* Operator Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm truncate">
                {isAbsent && replacementOp ? replacementOp.full_name : operatorData?.full_name}
              </h4>
              {isAbsent && operatorData && (
                <span className="text-xs text-gray-500 line-through">
                  {operatorData.full_name}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {operatorData?.employee_code && `${operatorData.employee_code} · `}
              {operatorData?.position}
            </div>
          </div>
        </div>

        {/* Status Controls */}
        <div className="flex items-center gap-2">
          {/* Attendance Toggle */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={isAbsent ? "outline" : "default"}
              onClick={() => onStatusChange(posId, operator.operator_id, false)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                !isAbsent ? "bg-emerald-500 text-white" : "text-emerald-700 border-emerald-300"
              )}
            >
              ✓ Hadir
            </Button>
            <Button
              size="sm"
              variant={isAbsent ? "default" : "outline"}
              onClick={() => onStatusChange(posId, operator.operator_id, true)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                isAbsent ? "bg-red-500 text-white" : "text-red-700 border-red-300"
              )}
            >
              ✗ Absen
            </Button>
          </div>

          {/* Skill Status */}
          <StatusBadge 
            status={
              compliance.status === 'ok' ? 'ready' : 
              compliance.status === 'partial' ? 'warning' : 'error'
            }
          >
            {compliance.status === 'ok' ? '✓ Skill OK' : 
             compliance.status === 'partial' ? '⚠ Partial' : '✗ Kurang'}
          </StatusBadge>
        </div>
      </div>

      {/* Replacement Selector */}
      {isAbsent && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Pengganti untuk {operatorData?.full_name}
            </span>
          </div>
          <select
            className="w-full p-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={replacementId || ""}
            onChange={(e) => onReplacementSelect(posId, operator.operator_id, e.target.value)}
          >
            <option value="">— Pilih pengganti —</option>
            {lineOperators
              .filter(lo => lo.operators_public?.id !== operator.operator_id)
              .map(lo => {
                const o = lo.operators_public;
                if (!o) return null;
                const c = checkSkillCompliance(o.id);
                const badge = c.status === 'ok' ? ' ✓ Skill OK' : 
                            c.status === 'partial' ? ' ⚠ Partial' : ' ✗ Kurang';
                return (
                  <option key={o.id} value={o.id}>
                    {o.full_name}{o.employee_code ? ` (${o.employee_code})` : ""}{badge}
                  </option>
                );
              })}
          </select>
        </div>
      )}

      {/* Skill Details */}
      {compliance.details.length > 0 && compliance.status !== 'ok' && (
        <div className={cn(
          "p-3 rounded-lg border text-xs space-y-1",
          compliance.status === 'fail' ? "bg-red-50 border-red-200 text-red-700" :
          "bg-amber-50 border-amber-200 text-amber-700"
        )}>
          <div className="font-semibold mb-2">
            {compliance.status === 'fail' ? '✗ Skill kurang' : '⚠ Sebagian terpenuhi'}
          </div>
          {compliance.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2 font-mono">
              <span>{detail.met ? '✓' : '✗'}</span>
              <span>{detail.name}: Lvl {detail.actual} / Min {detail.required}</span>
              <span className={cn(
                "px-1 py-0.5 rounded text-[10px]",
                detail.wi_pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                W/I {detail.wi_pass ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main Workstation Card Component
 */
export function WorkstationCard({ 
  pos, 
  operators, 
  onStatusChange, 
  onReplacementSelect,
  posOpAssignments,
  opSkillsMap,
  lineOperators 
}: WorkstationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasOperators = operators.length > 0;
  
  // Calculate POS status
  const absentInPos = operators.filter(op => {
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
                    absentInPos > 0 ? 'warning' : 'ready';

  const statusColors = {
    ready: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50', 
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50'
  };

  return (
    <Card className={cn(
      "workstation-card transition-all duration-200 hover:shadow-lg border-2",
      statusColors[posStatus]
    )}>
      {/* Card Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Workstation Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {pos.code.split('-').slice(-1)[0] || '—'}
            </div>
            
            {/* Workstation Info */}
            <div>
              <h3 className="font-bold text-lg text-gray-900">{pos.name}</h3>
              <p className="text-sm text-gray-600 font-mono">{pos.code}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <StatusBadge status={posStatus}>
              {posStatus === 'ready' ? '✓ Ready' : 
               posStatus === 'warning' ? '⚠ Issues' : 
               posStatus === 'error' ? '✗ Problems' : 'ℹ No Formasi'}
            </StatusBadge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{operators.length} Operator</span>
          </div>
          
          {absentInPos > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{absentInPos} Absen</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-gray-500" />
            <span className={cn(
              "font-medium",
              posSkillOk ? "text-emerald-600" : "text-red-600"
            )}>
              {posSkillOk ? '✓ Skill OK' : '✗ Skill Issue'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {!hasOperators ? (
          <div className="text-center py-6 text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Belum ada operator default</p>
            <p className="text-xs mt-1">Tambahkan formasi di Admin → Group / Regu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {operators.map(operator => (
              <OperatorRow
                key={operator.operator_id}
                operator={operator}
                assignment={posOpAssignments[`${pos.id}::${operator.operator_id}`]}
                onStatusChange={onStatusChange}
                onReplacementSelect={onReplacementSelect}
                posId={pos.id}
                pos={pos}
                opSkillsMap={opSkillsMap}
                lineOperators={lineOperators}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString('id-ID')}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Skills
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              <MoreVertical className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Workstation Cards List Container
 */
export function WorkstationCardsList({ 
  linePOS, 
  posOpAssignments, 
  onStatusChange, 
  onReplacementSelect,
  opSkillsMap,
  lineOperators 
}: {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  onStatusChange: (posId: string, operatorId: string, status: boolean) => void;
  onReplacementSelect: (posId: string, operatorId: string, replacementId: string) => void;
  opSkillsMap: Map<string, Map<string, any>>;
  lineOperators: any[];
}) {
  return (
    <div className="workstation-cards-list space-y-4">
      {linePOS.map(pos => (
        <WorkstationCard
          key={pos.id}
          pos={pos}
          operators={pos.default_assignments}
          onStatusChange={onStatusChange}
          onReplacementSelect={onReplacementSelect}
          posOpAssignments={posOpAssignments}
          opSkillsMap={opSkillsMap}
          lineOperators={lineOperators}
        />
      ))}
    </div>
  );
}

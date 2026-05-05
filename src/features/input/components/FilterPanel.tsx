/**
 * 
 * 
 * Advanced Filter Panel Component
 * Smart filtering dan search functionality untuk production setup
 */

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  SlidersHorizontal,
  RotateCcw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types untuk filtering
interface FilterOptions {
  search: string;
  status: 'all' | 'ready' | 'warning' | 'error' | 'info';
  operatorCount: 'all' | 'empty' | 'single' | 'multiple';
  skillCompliance: 'all' | 'compliant' | 'partial' | 'non-compliant';
  hasAbsent: 'all' | 'yes' | 'no';
  sortBy: 'code' | 'name' | 'status' | 'operatorCount';
  sortOrder: 'asc' | 'desc';
}

interface FilterPanelProps {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  className?: string;
}

/**
 * Filter Tag Component
 */
function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge className="gap-1 pr-1 bg-blue-100 text-blue-700 border-blue-200">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 text-blue-500 hover:text-blue-700 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/**
 * Main Filter Panel Component
 */
export function FilterPanel({ 
  linePOS, 
  posOpAssignments, 
  opSkillsMap,
  onFiltersChange,
  onClearFilters,
  className 
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    operatorCount: 'all',
    skillCompliance: 'all',
    hasAbsent: 'all',
    sortBy: 'code',
    sortOrder: 'asc'
  });

  // Calculate filter statistics
  const filterStats = useMemo(() => {
    let readyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let infoCount = 0;
    let withAbsentCount = 0;
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;
    let emptyCount = 0;
    let singleCount = 0;
    let multipleCount = 0;

    linePOS.forEach(pos => {
      const operators = pos.default_assignments;
      const hasOperators = operators.length > 0;
      
      // Operator count stats
      if (!hasOperators) {
        emptyCount++;
      } else if (operators.length === 1) {
        singleCount++;
      } else {
        multipleCount++;
      }

      if (!hasOperators) {
        infoCount++;
        return;
      }

      // Calculate status
      const absentInPos = operators.filter(op => {
        const slotKey = `${pos.id}::${op.operator_id}`;
        return (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
      }).length;

      const posSkillOk = operators.every(op => {
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

      // Status classification
      if (!posSkillOk) {
        errorCount++;
      } else if (absentInPos > 0) {
        warningCount++;
      } else {
        readyCount++;
      }

      // Absent tracking
      if (absentInPos > 0) {
        withAbsentCount++;
      }

      // Skill compliance
      operators.forEach(op => {
        const slotKey = `${pos.id}::${op.operator_id}`;
        const assignment = posOpAssignments[slotKey] ?? { isAbsent: false, replacementId: null };
        const effectiveId = assignment.isAbsent ? assignment.replacementId : op.operator_id;
        
        if (!effectiveId) return;
        
        const requirements = pos.process_skill_requirements || [];
        const operatorSkills = opSkillsMap.get(effectiveId) || new Map();
        
        if (requirements.length === 0) return;
        
        const metCount = requirements.filter((req: any) => {
          const skill = operatorSkills.get(req.skill_id);
          return skill && skill.level >= req.min_level;
        }).length;
        
        if (metCount === requirements.length) {
          compliantCount++;
        } else if (metCount > 0) {
          partialCount++;
        } else {
          nonCompliantCount++;
        }
      });
    });

    return {
      ready: readyCount,
      warning: warningCount,
      error: errorCount,
      info: infoCount,
      withAbsent: withAbsentCount,
      compliant: compliantCount,
      partial: partialCount,
      nonCompliant: nonCompliantCount,
      empty: emptyCount,
      single: singleCount,
      multiple: multipleCount,
      total: linePOS.length
    };
  }, [linePOS, posOpAssignments, opSkillsMap]);

  // Update filters when they change
  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      status: 'all',
      operatorCount: 'all',
      skillCompliance: 'all',
      hasAbsent: 'all',
      sortBy: 'code',
      sortOrder: 'asc'
    };
    setFilters(defaultFilters);
    onClearFilters();
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false;
      return value !== 'all' && value !== '';
    }).length;
  }, [filters]);

  // Generate filter tags
  const filterTags = useMemo(() => {
    const tags = [];
    
    if (filters.search) {
      tags.push({ key: 'search', label: `Search: "${filters.search}"` });
    }
    if (filters.status !== 'all') {
      tags.push({ key: 'status', label: `Status: ${filters.status}` });
    }
    if (filters.operatorCount !== 'all') {
      tags.push({ key: 'operatorCount', label: `Operators: ${filters.operatorCount}` });
    }
    if (filters.skillCompliance !== 'all') {
      tags.push({ key: 'skillCompliance', label: `Skills: ${filters.skillCompliance}` });
    }
    if (filters.hasAbsent !== 'all') {
      tags.push({ key: 'hasAbsent', label: `Absent: ${filters.hasAbsent}` });
    }
    
    return tags;
  }, [filters]);

  const removeFilterTag = (key: string) => {
    if (key === 'search') updateFilter('search', '');
    else if (key === 'status') updateFilter('status', 'all');
    else if (key === 'operatorCount') updateFilter('operatorCount', 'all');
    else if (key === 'skillCompliance') updateFilter('skillCompliance', 'all');
    else if (key === 'hasAbsent') updateFilter('hasAbsent', 'all');
  };

  return (
    <div className={cn("filter-panel", className)}>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search workstations or operators..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Tags */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterTags.map(tag => (
            <FilterTag
              key={tag.key}
              label={tag.label}
              onRemove={() => removeFilterTag(tag.key)}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                {activeFilterCount}
              </Badge>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show
            </>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card className="p-4 border-2">
          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { value: 'all', label: 'All', count: filterStats.total, icon: SlidersHorizontal },
                { value: 'ready', label: 'Ready', count: filterStats.ready, icon: CheckCircle },
                { value: 'warning', label: 'Warning', count: filterStats.warning, icon: AlertTriangle },
                { value: 'error', label: 'Error', count: filterStats.error, icon: AlertTriangle },
                { value: 'info', label: 'No Formasi', count: filterStats.info, icon: Clock }
              ].map(({ value, label, count, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('status', value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors",
                    filters.status === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Operator Count Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Operator Count</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'all', label: 'All', count: filterStats.total },
                { value: 'empty', label: 'Empty', count: filterStats.empty },
                { value: 'single', label: 'Single', count: filterStats.single },
                { value: 'multiple', label: 'Multiple', count: filterStats.multiple }
              ].map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('operatorCount', value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors",
                    filters.operatorCount === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Users className="h-3 w-3" />
                  <span>{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Skill Compliance Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Skill Compliance</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'all', label: 'All', count: filterStats.total },
                { value: 'compliant', label: 'Compliant', count: filterStats.compliant },
                { value: 'partial', label: 'Partial', count: filterStats.partial },
                { value: 'non-compliant', label: 'Non-Compliant', count: filterStats.nonCompliant }
              ].map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('skillCompliance', value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors",
                    filters.skillCompliance === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Shield className="h-3 w-3" />
                  <span>{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Absent Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Absent Operators</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'all', label: 'All', count: filterStats.total },
                { value: 'yes', label: 'Has Absent', count: filterStats.withAbsent },
                { value: 'no', label: 'All Present', count: filterStats.total - filterStats.withAbsent }
              ].map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('hasAbsent', value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors",
                    filters.hasAbsent === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  <span>{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="code">Workstation Code</option>
                <option value="name">Workstation Name</option>
                <option value="status">Status</option>
                <option value="operatorCount">Operator Count</option>
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => updateFilter('sortOrder', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Hook untuk applying filters
 */
export function useFilteredWorkstations({
  linePOS,
  posOpAssignments,
  opSkillsMap,
  filters
}: {
  linePOS: any[];
  posOpAssignments: Record<string, any>;
  opSkillsMap: Map<string, Map<string, any>>;
  filters: FilterOptions;
}) {
  return useMemo(() => {
    let filtered = [...linePOS];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(pos => {
        // Search in workstation name and code
        const workstationMatch = pos.name.toLowerCase().includes(searchTerm) ||
                               pos.code.toLowerCase().includes(searchTerm);
        
        // Search in operators
        const operatorMatch = pos.default_assignments.some((op: any) => {
          const operatorData = op.operators_public;
          return operatorData?.full_name?.toLowerCase().includes(searchTerm) ||
                 operatorData?.employee_code?.toLowerCase().includes(searchTerm);
        });
        
        return workstationMatch || operatorMatch;
      });
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(pos => {
        const operators = pos.default_assignments;
        const hasOperators = operators.length > 0;
        
        if (!hasOperators) return filters.status === 'info';
        
        const absentInPos = operators.filter(op => {
          const slotKey = `${pos.id}::${op.operator_id}`;
          return (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
        }).length;

        const posSkillOk = operators.every(op => {
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

        switch (filters.status) {
          case 'ready':
            return posSkillOk && absentInPos === 0;
          case 'warning':
            return posSkillOk && absentInPos > 0;
          case 'error':
            return !posSkillOk;
          case 'info':
            return !hasOperators;
          default:
            return true;
        }
      });
    }

    // Apply operator count filter
    if (filters.operatorCount !== 'all') {
      filtered = filtered.filter(pos => {
        const count = pos.default_assignments.length;
        switch (filters.operatorCount) {
          case 'empty':
            return count === 0;
          case 'single':
            return count === 1;
          case 'multiple':
            return count > 1;
          default:
            return true;
        }
      });
    }

    // Apply skill compliance filter
    if (filters.skillCompliance !== 'all') {
      filtered = filtered.filter(pos => {
        const operators = pos.default_assignments;
        
        return operators.some(op => {
          const slotKey = `${pos.id}::${op.operator_id}`;
          const assignment = posOpAssignments[slotKey] ?? { isAbsent: false, replacementId: null };
          const effectiveId = assignment.isAbsent ? assignment.replacementId : op.operator_id;
          
          if (!effectiveId) return false;
          
          const requirements = pos.process_skill_requirements || [];
          const operatorSkills = opSkillsMap.get(effectiveId) || new Map();
          
          if (requirements.length === 0) return false;
          
          const metCount = requirements.filter((req: any) => {
            const skill = operatorSkills.get(req.skill_id);
            return skill && skill.level >= req.min_level;
          }).length;
          
          switch (filters.skillCompliance) {
            case 'compliant':
              return metCount === requirements.length;
            case 'partial':
              return metCount > 0 && metCount < requirements.length;
            case 'non-compliant':
              return metCount === 0;
            default:
              return true;
          }
        });
      });
    }

    // Apply absent filter
    if (filters.hasAbsent !== 'all') {
      filtered = filtered.filter(pos => {
        const absentInPos = pos.default_assignments.filter(op => {
          const slotKey = `${pos.id}::${op.operator_id}`;
          return (posOpAssignments[slotKey] ?? { isAbsent: false }).isAbsent;
        }).length;
        
        return filters.hasAbsent === 'yes' ? absentInPos > 0 : absentInPos === 0;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status': {
          // Calculate status for comparison
          const getStatusScore = (pos: any) => {
            const operators = pos.default_assignments;
            const hasOperators = operators.length > 0;
            
            if (!hasOperators) return 3; // info
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
            
            if (!posSkillOk) return 2; // error
            if (absentInPos > 0) return 1; // warning
            return 0; // ready
          };
          
          comparison = getStatusScore(a) - getStatusScore(b);
          break;
        }
        case 'operatorCount':
          comparison = a.default_assignments.length - b.default_assignments.length;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [linePOS, posOpAssignments, opSkillsMap, filters]);
}

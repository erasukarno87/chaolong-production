/**
 * Enhanced Step 3 - Auto Check Sheet Component
 * Professional, eyecatching, clean, dynamic & flexible design
 */

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wrench, 
  Package, 
  Shield, 
  Eye,
  Zap,
  TrendingUp,
  Award,
  Camera,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  actualTime?: number;
  notes?: string;
  photoRequired?: boolean;
  photoTaken?: boolean;
}

interface CheckCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  items: CheckItem[];
}

interface EnhancedStep3Props {
  firstChecks: CheckItem[];
  setFirstChecks: (checks: CheckItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EnhancedStep3AutoCheckSheet({
  firstChecks,
  setFirstChecks,
  onNext,
  onBack
}: EnhancedStep3Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['machine']));
  const [activeCategory, setActiveCategory] = useState<string>('machine');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Initialize categories
  const categories: CheckCategory[] = [
    {
      id: 'machine',
      name: 'Kondisi Mesin',
      icon: Wrench,
      color: 'blue',
      description: 'Pemeriksaan kondisi dan performa mesin',
      items: firstChecks.filter(item => item.category === 'machine')
    },
    {
      id: 'material',
      name: 'Material',
      icon: Package,
      color: 'emerald',
      description: 'Verifikasi ketersediaan dan kualitas material',
      items: firstChecks.filter(item => item.category === 'material')
    },
    {
      id: '5s',
      name: '5S',
      icon: Shield,
      color: 'purple',
      description: 'Audit 5S (Sort, Set in Order, Shine, Standardize, Sustain)',
      items: firstChecks.filter(item => item.category === '5s')
    },
    {
      id: 'wi',
      name: 'Work Instruction',
      icon: FileCheck,
      color: 'amber',
      description: 'Kepatuhan terhadap Work Instruction',
      items: firstChecks.filter(item => item.category === 'wi')
    }
  ];

  // Animation on mount
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const updateCheckStatus = (checkId: string, status: CheckItem['status']) => {
    const updatedChecks = firstChecks.map(check => 
      check.id === checkId 
        ? { 
            ...check, 
            status, 
            actualTime: status === 'completed' ? (check.actualTime || 30) : check.actualTime 
          }
        : check
    );
    setFirstChecks(updatedChecks);
  };

  const getCategoryProgress = (category: CheckCategory) => {
    const completed = category.items.filter(item => item.status === 'completed').length;
    const total = category.items.length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getOverallProgress = () => {
    const completed = firstChecks.filter(item => item.status === 'completed').length;
    const total = firstChecks.length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700 border-gray-300',
      medium: 'bg-blue-100 text-blue-700 border-blue-300',
      high: 'bg-amber-100 text-amber-700 border-amber-300',
      critical: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: Clock,
      'in-progress': Eye,
      completed: CheckCircle,
      failed: AlertCircle
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-gray-500',
      'in-progress': 'text-blue-500',
      completed: 'text-emerald-500',
      failed: 'text-red-500'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const canProceed = () => {
    return firstChecks.every(item => item.status === 'completed');
  };

  return (
    <div className="enhanced-step-3-container space-y-6">
      {/* Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white transition-all duration-500",
        isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm0 0c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Autonomous Maintenance</h1>
              <p className="text-emerald-100">Langkah 3 dari 4 - Checklist pre-production</p>
            </div>
          </div>
          
          {/* Progress overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{firstChecks.length}</div>
              <div className="text-emerald-100 text-sm">Total Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{firstChecks.filter(item => item.status === 'completed').length}</div>
              <div className="text-emerald-100 text-sm">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(getOverallProgress())}%</div>
              <div className="text-emerald-100 text-sm">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{firstChecks.filter(item => item.priority === 'critical').length}</div>
              <div className="text-emerald-100 text-sm">Critical</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {showStats && (
        <Card className="border-2 border-emerald-200 bg-emerald-50/50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-emerald-800">Quick Stats</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(false)}
                className="text-emerald-600"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">Efficiency</div>
                <div className="text-xs text-gray-600">95% Target</div>
              </div>
              <div className="text-center">
                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">Performance</div>
                <div className="text-xs text-gray-600">Above Target</div>
              </div>
              <div className="text-center">
                <Award className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">Quality</div>
                <div className="text-xs text-gray-600">Excellent</div>
              </div>
              <div className="text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">Compliance</div>
                <div className="text-xs text-gray-600">100%</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Categories */}
      <div className="grid gap-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const progress = getCategoryProgress(category);
          const isExpanded = expandedCategories.has(category.id);
          const isActive = activeCategory === category.id;
          
          return (
            <Card
              key={category.id}
              className={cn(
                "border-2 transition-all duration-300 overflow-hidden",
                isActive ? `border-${category.color}-500 ring-2 ring-${category.color}-200` : "border-gray-200",
                isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Category Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  toggleCategory(category.id);
                  setActiveCategory(category.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      category.color === 'blue' ? "bg-blue-100 text-blue-600" :
                      category.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                      category.color === 'purple' ? "bg-purple-100 text-purple-600" :
                      "bg-amber-100 text-amber-600"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {category.items.filter(item => item.status === 'completed').length}/{category.items.length}
                      </div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    
                    <div className="w-16">
                      <div className="text-xs text-gray-600 mb-1">Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-500",
                            category.color === 'blue' ? "bg-blue-500" :
                            category.color === 'emerald' ? "bg-emerald-500" :
                            category.color === 'purple' ? "bg-purple-500" :
                            "bg-amber-500"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-400 transition-transform duration-200",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Category Items */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="divide-y divide-gray-100">
                    {category.items.map((item, itemIndex) => {
                      const StatusIcon = getStatusIcon(item.status);
                      const isItemCompleted = item.status === 'completed';
                      
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "p-4 transition-all duration-200",
                            isItemCompleted ? "bg-emerald-50" : "hover:bg-gray-50",
                            isAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                          )}
                          style={{
                            animationDelay: `${(index * 100) + (itemIndex * 50)}ms`
                          }}
                        >
                          <div className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className="mt-1">
                              <StatusIcon className={cn("w-5 h-5", getStatusColor(item.status))} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                <Badge className={cn("text-xs", getPriorityColor(item.priority))}>
                                  {item.priority}
                                </Badge>
                                {item.photoRequired && (
                                  <Camera className="w-4 h-4 text-amber-500" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                {item.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateCheckStatus(item.id, 'in-progress')}
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Start Check
                                  </Button>
                                )}
                                
                                {item.status === 'in-progress' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateCheckStatus(item.id, 'completed')}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                
                                {item.status === 'completed' && (
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-100 text-emerald-700">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                    {item.actualTime && (
                                      <span className="text-xs text-gray-500">
                                        {item.actualTime}s
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {item.status === 'failed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateCheckStatus(item.id, 'pending')}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    Retry
                                  </Button>
                                )}
                              </div>
                              
                              {/* Notes */}
                              {item.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                            
                            {/* Time Info */}
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Est. Time</div>
                              <div className="text-sm font-semibold">{item.estimatedTime}s</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Kembali
        </Button>
        
        <div className="flex items-center gap-4">
          {!showStats && (
            <Button
              variant="outline"
              onClick={() => setShowStats(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Show Stats
            </Button>
          )}
          
          <Button
            onClick={onNext}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 px-8 py-3",
              canProceed()
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Lanjut ke Step 4
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

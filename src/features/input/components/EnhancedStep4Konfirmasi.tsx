/**
 * Enhanced Step 4 - Konfirmasi Component
 * Professional, eyecatching, clean, dynamic & flexible design
 */

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Users, 
  Factory, 
  ChevronRight,
  ChevronLeft,
  Play,
  Save,
  Download,
  Eye,
  TrendingUp,
  Award,
  Zap,
  Shield,
  Target,
  Rocket
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step1Data {
  workOrderNo: string;
  shift: string;
  lineId: string;
  groupId: string;
  productId: string;
  quantity: string;
}

interface Step2Summary {
  totalWorkstations: number;
  totalOperators: number;
  readyWorkstations: number;
  absentOperators: number;
}

interface Step3Summary {
  totalChecks: number;
  completedChecks: number;
  criticalChecks: number;
  complianceRate: number;
}

interface EnhancedStep4Props {
  step1: Step1Data;
  step2Summary: Step2Summary;
  step3Summary: Step3Summary;
  setupNotes: string;
  setSetupNotes: (notes: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  lines: any[];
  groups: any[];
  products: any[];
}

export function EnhancedStep4Konfirmasi({
  step1,
  step2Summary,
  step3Summary,
  setupNotes,
  setSetupNotes,
  onSubmit,
  onBack,
  lines,
  groups,
  products
}: EnhancedStep4Props) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [validatedSteps, setValidatedSteps] = useState<Set<number>>(new Set([1, 2, 3]));

  // Animation on mount
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Validate all steps
  useEffect(() => {
    const validated = new Set<number>();
    
    // Validate Step 1
    if (step1.workOrderNo && step1.shift && step1.lineId && step1.productId && step1.quantity) {
      validated.add(1);
    }
    
    // Validate Step 2
    if (step2Summary.readyWorkstations === step2Summary.totalWorkstations && step2Summary.totalOperators > 0) {
      validated.add(2);
    }
    
    // Validate Step 3
    if (step3Summary.completedChecks === step3Summary.totalChecks && step3Summary.complianceRate === 100) {
      validated.add(3);
    }
    
    setValidatedSteps(validated);
  }, [step1, step2Summary, step3Summary]);

  const getLineName = () => {
    const line = lines.find(l => l.id === step1.lineId);
    return line ? `${line.name} - ${line.code}` : 'Not Selected';
  };

  const getGroupName = () => {
    if (!step1.groupId) return 'No Group';
    const group = groups.find(g => g.id === step1.groupId);
    return group ? `${group.name} - ${group.code}` : 'Not Selected';
  };

  const getProductName = () => {
    const product = products.find(p => p.id === step1.productId);
    return product ? `${product.name} - ${product.code}` : 'Not Selected';
  };

  const getShiftLabel = () => {
    const shifts = {
      'PAGI': 'Pagi (06:00 - 14:00)',
      'SIANG': 'Siang (14:00 - 22:00)',
      'MALAM': 'Malam (22:00 - 06:00)'
    };
    return shifts[step1.shift as keyof typeof shifts] || step1.shift;
  };

  const getOverallReadiness = () => {
    const step1Ready = validatedSteps.has(1) ? 33.3 : 0;
    const step2Ready = validatedSteps.has(2) ? 33.3 : 0;
    const step3Ready = validatedSteps.has(3) ? 33.4 : 0;
    return Math.round(step1Ready + step2Ready + step3Ready);
  };

  const canSubmit = () => {
    return validatedSteps.size === 3 && getOverallReadiness() === 100;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    
    setIsSubmitting(true);
    
    // Simulate submission process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onSubmit();
    setIsSubmitting(false);
  };

  return (
    <div className="enhanced-step-4-container space-y-6">
      {/* Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white transition-all duration-500",
        isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M30 30c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm0 0c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Konfirmasi Setup</h1>
              <p className="text-purple-100">Langkah 4 dari 4 - Final confirmation & submit</p>
            </div>
          </div>
          
          {/* Readiness indicator */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-purple-100">Overall Readiness</span>
                <span className="font-bold text-xl">{getOverallReadiness()}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="bg-white rounded-full h-3 transition-all duration-500 ease-out"
                  style={{ width: `${getOverallReadiness()}%` }}
                />
              </div>
            </div>
            
            {canSubmit() && (
              <div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-2 rounded-full">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                <span className="text-emerald-100 font-semibold">Ready to Submit</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Validation Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((step) => {
          const isValidated = validatedSteps.has(step);
          const stepInfo = {
            1: { title: 'Info Dasar', icon: FileText, color: 'blue' },
            2: { title: 'Man Power & WI', icon: Users, color: 'emerald' },
            3: { title: 'Auto Check Sheet', icon: Shield, color: 'purple' }
          };
          
          const info = stepInfo[step as keyof typeof stepInfo];
          const Icon = info.icon;
          
          return (
            <Card
              key={step}
              className={cn(
                "border-2 transition-all duration-300 p-4",
                isValidated 
                  ? `border-${info.color}-500 bg-${info.color}-50/50 ring-2 ring-${info.color}-200`
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isValidated
                    ? info.color === 'blue' ? "bg-blue-500 text-white" :
                    info.color === 'emerald' ? "bg-emerald-500 text-white" :
                    "bg-purple-500 text-white"
                    : "bg-gray-300 text-gray-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Step {step}</h3>
                  <p className="text-sm text-gray-600">{info.title}</p>
                </div>
                <div className="text-right">
                  {isValidated ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary Details */}
      <Card className="border-2 border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Ringkasan Setup Pre-Production</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {showDetails && (
            <div className="space-y-6">
              {/* Step 1 Summary */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informasi Dasar
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Work Order</div>
                    <div className="font-semibold text-blue-900">{step1.workOrderNo || '-'}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Shift</div>
                    <div className="font-semibold text-blue-900">{getShiftLabel()}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Lini Produksi</div>
                    <div className="font-semibold text-blue-900">{getLineName()}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Group</div>
                    <div className="font-semibold text-blue-900">{getGroupName()}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Produk</div>
                    <div className="font-semibold text-blue-900">{getProductName()}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">Quantity</div>
                    <div className="font-semibold text-blue-900">{step1.quantity || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Step 2 Summary */}
              <div className="border-l-4 border-emerald-500 pl-4">
                <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Man Power & Work Instruction
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <Factory className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <div className="text-xs text-emerald-600 mb-1">Workstations</div>
                    <div className="font-bold text-emerald-900">{step2Summary.totalWorkstations}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <div className="text-xs text-emerald-600 mb-1">Total Operators</div>
                    <div className="font-bold text-emerald-900">{step2Summary.totalOperators}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <div className="text-xs text-emerald-600 mb-1">Ready</div>
                    <div className="font-bold text-emerald-900">{step2Summary.readyWorkstations}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <div className="text-xs text-emerald-600 mb-1">Absent</div>
                    <div className="font-bold text-emerald-900">{step2Summary.absentOperators}</div>
                  </div>
                </div>
              </div>

              {/* Step 3 Summary */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Autonomous Maintenance
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-xs text-purple-600 mb-1">Total Checks</div>
                    <div className="font-bold text-purple-900">{step3Summary.totalChecks}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-xs text-purple-600 mb-1">Completed</div>
                    <div className="font-bold text-purple-900">{step3Summary.completedChecks}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <div className="text-xs text-purple-600 mb-1">Critical</div>
                    <div className="font-bold text-purple-900">{step3Summary.criticalChecks}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-xs text-purple-600 mb-1">Compliance</div>
                    <div className="font-bold text-purple-900">{step3Summary.complianceRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="border-2 border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Catatan Setup</h3>
          <textarea
            value={setupNotes}
            onChange={(e) => setSetupNotes(e.target.value)}
            placeholder="Tambahkan catatan atau informasi tambahan untuk setup ini..."
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
            rows={4}
          />
        </div>
      </Card>

      {/* Performance Metrics - Computed from actual setup data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Efficiency - based on readiness (all steps complete = high efficiency) */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
          <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-blue-800">Readiness</div>
          <div className="text-2xl font-bold text-blue-900">{getOverallReadiness()}%</div>
          <div className="text-xs text-blue-600">
            {validatedSteps.size === 3 ? 'Fully Ready' : `${3 - validatedSteps.size} steps pending`}
          </div>
        </div>
        {/* Quality - based on compliance rate from check sheets */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center">
          <Award className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-emerald-800">Compliance</div>
          <div className="text-2xl font-bold text-emerald-900">{step3Summary.complianceRate}%</div>
          <div className="text-xs text-emerald-600">{step3Summary.completedChecks}/{step3Summary.totalChecks} checks</div>
        </div>
        {/* Operator Coverage - ratio of ready operators */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
          <Rocket className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-purple-800">Man Power</div>
          <div className="text-2xl font-bold text-purple-900">
            {step2Summary.totalOperators > 0
              ? Math.round((step2Summary.totalOperators - step2Summary.absentOperators) / step2Summary.totalOperators * 100)
              : 0}%
          </div>
          <div className="text-xs text-purple-600">
            {step2Summary.totalOperators - step2Summary.absentOperators}/{step2Summary.totalOperators} ready
          </div>
        </div>
        {/* Accuracy - based on workstation readiness */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center">
          <Target className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-amber-800">Workstations</div>
          <div className="text-2xl font-bold text-amber-900">
            {step2Summary.totalWorkstations > 0
              ? Math.round((step2Summary.readyWorkstations / step2Summary.totalWorkstations) * 100)
              : 0}%
          </div>
          <div className="text-xs text-amber-600">
            {step2Summary.readyWorkstations}/{step2Summary.totalWorkstations} ready
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className={cn(
              "flex items-center gap-3 px-8 py-4 text-white font-semibold",
              canSubmit() && !isSubmitting
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Mulai Produksi
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

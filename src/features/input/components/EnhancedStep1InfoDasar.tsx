/**
 * Enhanced Step 1 - Info Dasar Component
 * Professional, eyecatching, clean, dynamic & flexible design
 */

import { useState, useEffect, useMemo } from "react";
import { 
  FileText, 
  Factory, 
  Users, 
  Package, 
  Hash,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserGroups } from "@/hooks/useUserGroups";

interface Step1Data {
  workOrderNo: string;
  shift: string;
  lineId: string;
  groupId: string;
  productId: string;
  quantity: string;
}

interface EnhancedStep1Props {
  step1: Step1Data;
  setStep1: (data: Step1Data) => void;
  onNext: () => void;
  lines: Array<{ id: string; name: string; code: string }>;
  groups: Array<{ id: string; name?: string; code: string; line_id?: string }>;
  products: Array<{ id: string; name: string; code: string }>;
  userGroups?: Array<{ id: string; code: string; line_id: string; line?: { code: string } }>;
}

export function EnhancedStep1InfoDasar({
  step1,
  setStep1,
  onNext,
  lines,
  groups,
  products,
  userGroups: userGroupsProp
}: EnhancedStep1Props) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Get user's groups from hook (if not provided via props)
  const { data: hookUserGroups = [] } = useUserGroups();
  const userGroups = userGroupsProp ?? hookUserGroups;

  // Animation on mount
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Validation
  const validateField = (field: string, value: string) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'workOrderNo':
        errors.workOrderNo = value.trim() ? '' : 'Work Order wajib diisi';
        break;
      case 'shift':
        errors.shift = value ? '' : 'Shift wajib dipilih';
        break;
      case 'lineId':
        errors.lineId = value ? '' : 'Lini produksi wajib dipilih';
        break;
      case 'quantity': {
        const qty = parseInt(value);
        errors.quantity = value && qty > 0 ? '' : 'Quantity harus lebih dari 0';
        break;
      }
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (field: keyof Step1Data, value: string) => {
    setStep1({ ...step1, [field]: value });
    validateField(field, value);
  };

  const isFormValid = () => {
    return step1.workOrderNo.trim() && 
           step1.shift && 
           step1.lineId && 
           step1.productId && 
           step1.quantity && 
           parseInt(step1.quantity) > 0 &&
           Object.values(validationErrors).every(error => !error);
  };

  // Auto-select group when line is selected (if user has group for that line)
  useEffect(() => {
    if (step1.lineId && userGroups.length > 0 && !step1.groupId) {
      const matchingGroup = userGroups.find(g => g.line_id === step1.lineId);
      if (matchingGroup) {
        setStep1(prev => ({ ...prev, groupId: matchingGroup.id }));
      }
    }
  }, [step1.lineId, step1.groupId, userGroups, setStep1]);

  // Get progress percentage
  const getProgressPercentage = () => {
    const fields = ['workOrderNo', 'shift', 'lineId', 'productId', 'quantity'];
    const filledFields = fields.filter(field => {
      const value = step1[field as keyof Step1Data];
      return value && value.trim() !== '';
    }).length;
    return (filledFields / fields.length) * 100;
  };

  // Filter groups: show user's groups first, then all groups for selected line
  const filteredGroups = useMemo(() => {
    const userGroupIds = new Set(userGroups.map(g => g.id));
    
    // User's own groups first
    const userOwnGroups = userGroups.map(g => ({
      ...g,
      isUserGroup: true
    }));
    
    // Other groups (excluding user's groups)
    const otherGroups = groups
      .filter(g => !userGroupIds.has(g.id))
      .map(g => ({
        ...g,
        isUserGroup: false
      }));
    
    return [...userOwnGroups, ...otherGroups];
  }, [groups, userGroups]);

  return (
    <div className="enhanced-step-1-container space-y-6">
      {/* Header dengan progress indicator */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white transition-all duration-500",
        isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Info Dasar Produksi</h1>
              <p className="text-blue-100">Langkah 1 dari 4 - Input informasi dasar</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-100">Progress Form</span>
              <span className="font-semibold">{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

        {/* User Groups Banner - Show if user has leader groups */}
        {userGroups.length > 0 && (
          <Card className="border-2 border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-800">Group Terdaftar</h3>
                <p className="text-sm text-emerald-600">
                  Anda terdaftar sebagai leader untuk {userGroups.length} group
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-600" />
            </div>
            {/* Group chips */}
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {userGroups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setStep1(prev => ({ ...prev, groupId: g.id, lineId: g.line_id }));
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    step1.groupId === g.id
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400"
                  )}
                >
                  {g.line?.code ?? '?'} - {g.code}
                </button>
              ))}
            </div>
          </Card>
        )}

      {/* Form Fields */}
      <div className="grid gap-6">
        {/* Work Order Number */}
        <div className={cn(
          "group relative transition-all duration-300",
          focusedField === 'workOrderNo' ? "scale-[1.02]" : ""
        )}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <FileText className={cn(
                "w-5 h-5 transition-colors duration-200",
                focusedField === 'workOrderNo' ? "text-blue-600" : "text-gray-400"
              )} />
            </div>
            <input
              type="text"
              placeholder="Work Order Number"
              value={step1.workOrderNo}
              onChange={(e) => handleInputChange('workOrderNo', e.target.value)}
              onFocus={() => setFocusedField('workOrderNo')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-200 bg-white",
                focusedField === 'workOrderNo' 
                  ? "border-blue-500 ring-4 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300",
                validationErrors.workOrderNo ? "border-red-300" : ""
              )}
            />
            {step1.workOrderNo && !validationErrors.workOrderNo && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
          {validationErrors.workOrderNo && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.workOrderNo}
            </p>
          )}
        </div>

        {/* Shift Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 'PAGI', label: 'Pagi', icon: '🌅', time: '06:00 - 14:00' },
            { value: 'SIANG', label: 'Siang', icon: '☀️', time: '14:00 - 22:00' },
            { value: 'MALAM', label: 'Malam', icon: '🌙', time: '22:00 - 06:00' }
          ].map((shift) => (
            <Card
              key={shift.value}
              onClick={() => handleInputChange('shift', shift.value)}
              className={cn(
                "cursor-pointer transition-all duration-200 p-4 border-2 hover:shadow-lg",
                step1.shift === shift.value
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{shift.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{shift.label}</h4>
                  <p className="text-xs text-gray-500">{shift.time}</p>
                </div>
                {step1.shift === shift.value && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Production Line */}
        <div className={cn(
          "relative transition-all duration-300",
          focusedField === 'lineId' ? "scale-[1.02]" : ""
        )}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Factory className={cn(
                "w-5 h-5 transition-colors duration-200",
                focusedField === 'lineId' ? "text-blue-600" : "text-gray-400"
              )} />
            </div>
            <select
              value={step1.lineId}
              onChange={(e) => handleInputChange('lineId', e.target.value)}
              onFocus={() => setFocusedField('lineId')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-200 bg-white appearance-none cursor-pointer",
                focusedField === 'lineId' 
                  ? "border-blue-500 ring-4 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300",
                validationErrors.lineId ? "border-red-300" : ""
              )}
            >
              <option value="">Pilih Lini Produksi</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name} - {line.code}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          {validationErrors.lineId && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.lineId}
            </p>
          )}
        </div>

        {/* Group Selection - Smart grouping with user's groups first */}
        <div className={cn(
          "relative transition-all duration-300",
          focusedField === 'groupId' ? "scale-[1.02]" : ""
        )}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Users className={cn(
                "w-5 h-5 transition-colors duration-200",
                focusedField === 'groupId' ? "text-blue-600" : "text-gray-400"
              )} />
            </div>
            <select
              value={step1.groupId}
              onChange={(e) => handleInputChange('groupId', e.target.value)}
              onFocus={() => setFocusedField('groupId')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-200 bg-white appearance-none cursor-pointer",
                focusedField === 'groupId' 
                  ? "border-blue-500 ring-4 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <option value="">Pilih Group (Opsional)</option>
              
              {/* User's groups section */}
              {userGroups.length > 0 && (
                <optgroup label="—— Group Saya (Leader) ——">
                  {userGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.line?.code ?? '?'} - {group.code} ⭐
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* All groups section */}
              <optgroup label="—— Semua Group ——">
                {filteredGroups.filter(g => !userGroups.some(ug => ug.id === g.id)).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name ?? group.code}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {userGroups.length > 0 
              ? "Grup berlabel ⭐ adalah group di mana Anda sebagai leader"
              : "Pilih group untuk assign operator dan track formasi"
            }
          </p>
        </div>

        {/* Product Selection */}
        <div className={cn(
          "relative transition-all duration-300",
          focusedField === 'productId' ? "scale-[1.02]" : ""
        )}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Package className={cn(
                "w-5 h-5 transition-colors duration-200",
                focusedField === 'productId' ? "text-blue-600" : "text-gray-400"
              )} />
            </div>
            <select
              value={step1.productId}
              onChange={(e) => handleInputChange('productId', e.target.value)}
              onFocus={() => setFocusedField('productId')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-200 bg-white appearance-none cursor-pointer",
                focusedField === 'productId' 
                  ? "border-blue-500 ring-4 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300",
                validationErrors.productId ? "border-red-300" : ""
              )}
            >
              <option value="">Pilih Produk</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.code}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className={cn(
          "group relative transition-all duration-300",
          focusedField === 'quantity' ? "scale-[1.02]" : ""
        )}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Hash className={cn(
                "w-5 h-5 transition-colors duration-200",
                focusedField === 'quantity' ? "text-blue-600" : "text-gray-400"
              )} />
            </div>
            <input
              type="number"
              placeholder="Quantity Produksi"
              value={step1.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              onFocus={() => setFocusedField('quantity')}
              onBlur={() => setFocusedField(null)}
              min="1"
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all duration-200 bg-white",
                focusedField === 'quantity' 
                  ? "border-blue-500 ring-4 ring-blue-100" 
                  : "border-gray-200 hover:border-gray-300",
                validationErrors.quantity ? "border-red-300" : ""
              )}
            />
            {step1.quantity && !validationErrors.quantity && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
          {validationErrors.quantity && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.quantity}
            </p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!isFormValid()}
          className={cn(
            "group relative px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 flex items-center gap-3",
            isFormValid()
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          <span className="relative z-10">Lanjut ke Step 2</span>
          <ChevronRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
          
          {/* Button shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-blue-600">Est. Time</p>
          <p className="text-lg font-bold text-blue-800">2 min</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <Zap className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-emerald-600">Efficiency</p>
          <p className="text-lg font-bold text-emerald-800">95%</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-2" />
          <p className="text-xs text-purple-600">Accuracy</p>
          <p className="text-lg font-bold text-purple-800">100%</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
          <p className="text-xs text-amber-600">Complete</p>
          <p className="text-lg font-bold text-amber-800">{Math.round(getProgressPercentage())}%</p>
        </div>
      </div>
    </div>
  );
}

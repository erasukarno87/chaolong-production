/**
 * Smart Input Flow Component
 * Professional UI dengan intuitive user flow dan smart defaults
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb,
  Mic,
  Scan,
  Zap,
  Clock,
  Target,
  Shield,
  FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSmartDefaults } from "../hooks/useSmartDefaults";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useBarcodeScanner } from "../hooks/useVoiceInput";
import { toast } from "sonner";

// Types untuk flow steps
type FlowStep = 'setup' | 'first_check' | 'output' | 'ng' | 'downtime' | 'last_check' | 'summary';

interface StepConfig {
  id: FlowStep;
  title: string;
  description: string;
  icon: any;
  estimatedTime: string;
  isRequired: boolean;
  isCompleted: boolean;
  progress: number;
  smartFeatures: string[];
}

/**
 * Smart Input Flow dengan professional UI
 */
export function SmartInputFlow() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('setup');
  const [isAutoFillEnabled, setIsAutoFillEnabled] = useState(true);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);

  // Smart defaults
  const smartDefaults = useSmartDefaults();
  const voiceInput = useVoiceInput();
  const barcodeScanner = useBarcodeScanner();

  // Step configurations
  const steps: StepConfig[] = [
    {
      id: 'setup',
      title: 'Setup Shift',
      description: 'Persiapan awal shift produksi',
      icon: Target,
      estimatedTime: '2-3 menit',
      isRequired: true,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Auto-select line', 'Smart target', 'Operator assignment']
    },
    {
      id: 'first_check',
      title: 'First Check',
      description: 'Verifikasi kesiapan produksi',
      icon: Shield,
      estimatedTime: '5-7 menit',
      isRequired: true,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['5F5L checklist', 'Skill verification', 'Safety check']
    },
    {
      id: 'output',
      title: 'Output Production',
      description: 'Input data produksi per jam',
      icon: Clock,
      estimatedTime: '1 menit/jam',
      isRequired: true,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Auto-calculate', 'Voice input', 'Quick entry']
    },
    {
      id: 'ng',
      title: 'NG Entry',
      description: 'Recording defect dan quality issues',
      icon: AlertCircle,
      estimatedTime: '2-3 menit',
      isRequired: false,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Pattern recognition', 'Photo capture', 'Voice input']
    },
    {
      id: 'downtime',
      title: 'Downtime',
      description: 'Recording downtime events',
      icon: Zap,
      estimatedTime: '2-3 menit',
      isRequired: false,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Auto-categorize', 'Voice input', 'Quick timer']
    },
    {
      id: 'last_check',
      title: 'Last Check',
      description: 'Verifikasi akhir shift',
      icon: Shield,
      estimatedTime: '3-5 menit',
      isRequired: true,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Quick checklist', 'Area verification', 'Handover prep']
    },
    {
      id: 'summary',
      title: 'Summary & Submit',
      description: 'Review final dan submission',
      icon: FileText,
      estimatedTime: '2 menit',
      isRequired: true,
      isCompleted: false,
      progress: 0,
      smartFeatures: ['Auto-summary', 'OEE calculation', 'Instant report']
    }
  ];

  // Calculate overall progress
  const overallProgress = steps.reduce((acc, step) => acc + step.progress, 0) / steps.length;

  // Navigation functions
  const nextStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  }, [currentStep, steps]);

  const previousStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  }, [currentStep, steps]);

  const goToStep = useCallback((stepId: FlowStep) => {
    setCurrentStep(stepId);
  }, []);

  // Auto-fill current step
  const autoFillCurrentStep = useCallback(() => {
    if (!isAutoFillEnabled) return;

    switch (currentStep) {
      case 'setup':
        if (smartDefaults.preferredLine) {
          toast.success('Line otomatis dipilih: ' + smartDefaults.preferredLine.name);
        }
        if (smartDefaults.suggestedTarget) {
          toast.success('Target diset: ' + smartDefaults.suggestedTarget + ' pcs');
        }
        break;
      case 'output':
        toast.info('Voice input aktif, katakan "Target 150" atau "NG 5 scratch"');
        break;
      case 'ng':
        toast.info('Scan barcode defect atau gunakan voice input');
        break;
    }
  }, [currentStep, isAutoFillEnabled, smartDefaults]);

  // Auto-fill on step change
  useEffect(() => {
    autoFillCurrentStep();
  }, [currentStep, autoFillCurrentStep]);

  return (
    <div className="smart-input-flow">
      {/* Header dengan progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Input Laporan Shift</h1>
            <p className="text-gray-600 mt-1">Professional production reporting with smart automation</p>
          </div>
          
          {/* Smart Features Toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant={isAutoFillEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAutoFillEnabled(!isAutoFillEnabled)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Smart Fill
            </Button>
            
            <Button
              variant={showSmartSuggestions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
              className="flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              AI Assistant
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-gray-600">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.progress === 100;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center cursor-pointer transition-all duration-200 ${
                  isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="ml-3 min-w-0">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.estimatedTime}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-300 mx-3" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Step Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  {React.createElement(steps.find(s => s.id === currentStep)?.icon, { className: "h-6 w-6" })}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {steps.find(s => s.id === currentStep)?.title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {steps.find(s => s.id === currentStep)?.description}
                  </p>
                </div>
              </div>
              
              <Badge variant={steps.find(s => s.id === currentStep)?.isRequired ? "default" : "secondary"}>
                {steps.find(s => s.id === currentStep)?.isRequired ? 'Required' : 'Optional'}
              </Badge>
            </div>

            {/* Smart Features */}
            {showSmartSuggestions && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Smart Features Available</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {steps.find(s => s.id === currentStep)?.smartFeatures.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={voiceInput.startListening}
              disabled={voiceInput.isListening}
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              {voiceInput.isListening ? 'Listening...' : 'Voice Input'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={barcodeScanner.startScanning}
              disabled={barcodeScanner.isScanning}
              className="flex items-center gap-2"
            >
              <Scan className="h-4 w-4" />
              {barcodeScanner.isScanning ? 'Scanning...' : 'Scan Barcode'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={autoFillCurrentStep}
              disabled={!isAutoFillEnabled}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Auto Fill
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 'setup'}
              className="flex items-center gap-2"
            >
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
              </span>
            </div>

            <Button
              onClick={nextStep}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Smart Suggestions Panel */}
      {showSmartSuggestions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed right-4 top-20 w-80 space-y-4"
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">AI Suggestions</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-800">Target optimal: {smartDefaults.suggestedTarget || '150'} pcs</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800">Line suggested: {smartDefaults.preferredLine?.name || 'Line 1'}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

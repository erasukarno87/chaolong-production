/**
 * Mobile-Optimized Input Component
 * Responsive design untuk mobile-first experience di Input Laporan
 */

import { useState, useEffect, useCallback } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Mic, 
  Camera, 
  Scan,
  Menu,
  X,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";


interface MobileLayout {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  viewport: { width: number; height: number };
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  action: () => void;
}

/**
 * Mobile-Optimized Input dengan gesture-based interface
 */
export function MobileOptimizedInput() {
  const [layout, setLayout] = useState<MobileLayout>({
    isMobile: false,
    isTablet: false,
    orientation: 'portrait',
    viewport: { width: 0, height: 0 }
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detect device and viewport
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setLayout({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        orientation: width > height ? 'landscape' : 'portrait',
        viewport: { width, height }
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // Quick actions for mobile
  const quickActions: QuickAction[] = [
    {
      id: 'voice',
      label: 'Voice Input',
      icon: Mic,
      color: 'bg-blue-500',
      action: () => console.log('Voice input activated')
    },
    {
      id: 'camera',
      label: 'Photo',
      icon: Camera,
      color: 'bg-green-500',
      action: () => console.log('Camera activated')
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: Scan,
      color: 'bg-purple-500',
      action: () => console.log('Scanner activated')
    },
    {
      id: 'add',
      label: 'Add Entry',
      icon: Plus,
      color: 'bg-orange-500',
      action: () => console.log('Add entry')
    }
  ];

  // Gesture handlers
  const handleSwipeLeft = useCallback(() => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleSwipeRight = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSwipeUp = useCallback(() => {
    setIsBottomSheetOpen(true);
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  }, []);

  // Touch-friendly step navigation
  const StepNavigation = () => (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSwipeRight}
        disabled={currentStep === 0}
        className="p-2"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 mx-4">
        <div className="text-center">
          <h3 className="font-semibold text-sm">Step {currentStep + 1} of 7</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: `${(currentStep / 7) * 100}%` }}
              animate={{ width: `${((currentStep + 1) / 7) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleSwipeLeft}
        disabled={currentStep === 6}
        className="p-2"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );

  // Mobile-optimized content area
  const ContentArea = () => (
    <Swipeable
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwipeUp={handleSwipeUp}
      className="flex-1 overflow-hidden"
    >
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 30 }}
              className="space-y-4"
            >
              {/* Step-specific content would go here */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Step {currentStep + 1} Content
                </h2>
                <p className="text-gray-600">
                  Mobile-optimized content for step {currentStep + 1}
                </p>
                
                {/* Touch-friendly form elements */}
                <div className="mt-6 space-y-4">
                  <div className="touch-manipulation">
                    <label className="block text-sm font-medium mb-2">Target Production</label>
                    <input
                      type="number"
                      className="w-full p-4 text-lg border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter target"
                      style={{ fontSize: '16px' }} // Prevents zoom on iOS
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button className="p-4 text-lg h-auto py-6">
                      Quick Action 1
                    </Button>
                    <Button variant="outline" className="p-4 text-lg h-auto py-6">
                      Quick Action 2
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Status indicators */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">On Track</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">85% complete</p>
                </Card>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">2 min remaining</p>
                </Card>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </PullToRefresh>
    </Swipeable>
  );

  // Floating Action Button for mobile
  const FloatingActionButton = () => (
    <div className="fixed bottom-6 right-6 z-50">
      <FloatingActionMenu
        isOpen={fabOpen}
        onToggle={() => setFabOpen(!fabOpen)}
        mainButton={{
          icon: Plus,
          color: 'bg-blue-500',
          size: 'large'
        }}
        actions={quickActions}
        direction="up"
      />
    </div>
  );

  // Bottom sheet for additional actions
  const BottomSheetComponent = () => (
    <BottomSheet
      isOpen={isBottomSheetOpen}
      onClose={() => setIsBottomSheetOpen(false)}
      snapPoints={[0.5, 0.8, 1]}
      defaultSnap={0.5}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBottomSheetOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={action.action}
              >
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", action.color)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm">{action.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Target set to 150 pcs</span>
              <span className="text-xs text-gray-500">2 min ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Operator assigned</span>
              <span className="text-xs text-gray-500">5 min ago</span>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );

  // Mobile layout
  if (layout.isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="bg-white border-b">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Input Laporan</h1>
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <StepNavigation />
        </div>

        {/* Main Content */}
        <ContentArea />

        {/* Bottom Sheet */}
        <BottomSheetComponent />

        {/* Floating Action Button */}
        <FloatingActionButton />
      </div>
    );
  }

  // Tablet layout
  if (layout.isTablet) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r p-4">
          <h2 className="font-semibold mb-4">Steps</h2>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <Button
                key={step}
                variant={currentStep + 1 === step ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentStep(step - 1)}
              >
                Step {step}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <StepNavigation />
          <ContentArea />
        </div>
      </div>
    );
  }

  // Desktop layout (fallback)
  return (
    <div className="container mx-auto p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          This component is optimized for mobile and tablet devices.
        </p>
      </div>
    </div>
  );
}

/**
 * Touch-friendly form component
 */
export function TouchOptimizedInput({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange 
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="touch-manipulation">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          "w-full p-4 text-lg border-2 rounded-xl transition-all duration-200",
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          focused ? "border-blue-500" : "border-gray-300"
        )}
        style={{ fontSize: '16px' }} // Prevents zoom on iOS
      />
    </div>
  );
}

/**
 * Swipeable card component for mobile
 */
export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight 
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Swipeable
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="touch-manipulation"
    >
      <motion.div
        drag="x"
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        className="bg-white rounded-xl shadow-sm border"
      >
        {children}
      </motion.div>
    </Swipeable>
  );
}

/**
 * Mobile-optimized button with haptic feedback
 */
export function MobileButton({ 
  children, 
  onClick, 
  variant = 'default',
  size = 'default',
  haptic = true
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  haptic?: boolean;
}) {
  const handleClick = () => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(50); // Light haptic feedback
    }
    onClick?.();
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    default: 'p-4 text-base',
    lg: 'p-6 text-lg'
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "touch-manipulation transition-all duration-200 active:scale-95",
        sizeClasses[size]
      )}
    >
      {children}
    </Button>
  );
}

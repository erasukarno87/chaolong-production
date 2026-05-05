.en/**
 * 
 * Accessibility Features Component
 * WCAG 2.1 AA compliance untuk Input Laporan
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Eye, 
  Keyboard, 
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Type,
  Maximize2,
  Minimize2,
  HelpCircle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types untuk accessibility
interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  zoomLevel: number;
}

interface KeyboardShortcuts {
  [key: string]: () => void;
}

/**
 * Accessibility Features dengan WCAG 2.1 AA compliance
 */
export function AccessibilityFeatures() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: false,
    focusVisible: true,
    darkMode: false,
    fontSize: 'medium',
    zoomLevel: 1
  });

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Screen reader announcements - moved before useEffect that uses it
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.cache_controlChild(announcement);
    }, 1000);
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply classes based on settings
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('dark-mode', settings.darkMode);
    root.classList.toggle('screen-reader-mode', settings.screenReader);
    
    // Apply font size
    root.style.fontSize = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px'
    }[settings.fontSize];
    
    // Apply zoom
    root.style.transform = `scale(${settings.zoomLevel})`;
    root.style.transformOrigin = 'top left';
    
    // Apply reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--transition-duration', '0s');
      root.style.setProperty('--animation-duration', '0s');
    }
    
    // Update ARIA labels for screen reader
    if (settings.screenReader) {
      announceToScreenReader("Accessibility settings updated");
    }
  }, [settings, announceToScreenReader]);

  // Focus navigation helpers
  const navigateFocus = useCallback((direction: number) => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length === 0) return;
    
    let newIndex = currentFocusIndex + direction;
    if (newIndex < 0) newIndex = focusableElements.length - 1;
    if (newIndex >= focusableElements.length) newIndex = 0;
    
    focusableElements[newIndex].focus();
    setCurrentFocusIndex(newIndex);
  }, [currentFocusIndex]);

  const navigateFocusToStart = useCallback(() => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      setCurrentFocusIndex(0);
    }
  }, []);

  const navigateFocusToEnd = useCallback(() => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length > 0) {
      const lastIndex = focusableElements.length - 1;
      focusableElements[lastIndex].focus();
      setCurrentFocusIndex(lastIndex);
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!settings.keyboardNavigation) return;
    
    switch (event.key) {
      case 'Tab':
        // Let default tab behavior work
        break;
      case 'Enter':
      case ' ': {
        // Activate focused element
        const focusedElement = document.activeElement as HTMLElement;
        if (focusedElement && focusedElement.click) {
          event.preventDefault();
          focusedElement.click();
        }
        break;
      }
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigateFocus(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigateFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        navigateFocusToStart();
        break;
      case 'End':
        event.preventDefault();
        navigateFocusToEnd();
        break;
      case 'Escape':
        event.preventDefault();
        setIsHelpOpen(false);
        break;
      case 'F1':
        event.preventDefault();
        setIsHelpOpen(true);
        break;
    }
  }, [settings.keyboardNavigation, navigateFocus, navigateFocusToStart, navigateFocusToEnd]);

  // Focus navigation
  const navigateFocus = useCallback((direction: number) => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length === 0) return;
    
    let newIndex = currentFocusIndex + direction;
    if (newIndex < 0) newIndex = focusableElements.length - 1;
    if (newIndex >= focusableElements.length) newIndex = 0;
    
    focusableElements[newIndex].focus();
    setCurrentFocusIndex(newIndex);
  }, [currentFocusIndex]);

  const navigateFocusToStart = useCallback(() => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      setCurrentFocusIndex(0);
    }
  }, []);

  const navigateFocusToEnd = useCallback(() => {
    const focusableElements = focusableElementsRef.current;
    if (focusableElements.length > 0) {
      const lastIndex = focusableElements.length - 1;
      focusableElements[lastIndex].focus();
      setCurrentFocusIndex(lastIndex);
    }
  }, []);

  useEffect(() => {
    if (!settings.keyboardNavigation) return;
    focusableElementsRef.current = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, settings.keyboardNavigation]);

  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Update setting
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Announce change for screen reader
    if (settings.screenReader) {
      announceToScreenReader(`${key} set to ${value}`);
    }
  }, [settings.screenReader, announceToScreenReader]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts]);

  return (
    <div className="accessibility-features">
      {/* Accessibility Toolbar */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Accessibility</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            aria-label="Accessibility help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* High Contrast */}
          <Button
            variant={settings.highContrast ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting('highContrast', !settings.highContrast)}
            className="flex items-center gap-2"
            aria-label="Toggle high contrast"
            aria-pressed={settings.highContrast}
          >
            <Eye className="h-4 w-4" />
            High Contrast
          </Button>

          {/* Large Text */}
          <Button
            variant={settings.largeText ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting('largeText', !settings.largeText)}
            className="flex items-center gap-2"
            aria-label="Toggle large text"
            aria-pressed={settings.largeText}
          >
            <Type className="h-4 w-4" />
            Large Text
          </Button>

          {/* Reduced Motion */}
          <Button
            variant={settings.reducedMotion ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
            aria-pressed={settings.reducedMotion}
          >
            <Settings className="h-4 w-4" />
            Reduced Motion
          </Button>

          {/* Dark Mode */}
          <Button
            variant={settings.darkMode ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting('darkMode', !settings.darkMode)}
            className="flex items-center gap-2"
            aria-label="Toggle dark mode"
            aria-pressed={settings.darkMode}
          >
            {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Dark Mode
          </Button>
        </div>

        {/* Font Size Controls */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm font-medium">Font Size:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = ['small', 'medium', 'large', 'extra-large'];
                const currentIndex = sizes.indexOf(settings.fontSize);
                const newIndex = Math.max(0, currentIndex - 1);
                updateSetting('fontSize', sizes[newIndex]);
              }}
              aria-label="Decrease font size"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[80px] text-center capitalize">
              {settings.fontSize.replace('-', ' ')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = ['small', 'medium', 'large', 'extra-large'];
                const currentIndex = sizes.indexOf(settings.fontSize);
                const newIndex = Math.min(sizes.length - 1, currentIndex + 1);
                updateSetting('fontSize', sizes[newIndex]);
              }}
              aria-label="Increase font size"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm font-medium">Zoom:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSetting('zoomLevel', Math.max(settings.zoomLevel - 0.1, 0.5))}
              aria-label="Zoom out"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(settings.zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSetting('zoomLevel', Math.min(settings.zoomLevel + 0.1, 2))}
              aria-label="Zoom in"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Keyboard Navigation Toggle */}
        <div className="flex items-center gap-4 mt-4">
          <Button
            variant={settings.keyboardNavigation ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting('keyboardNavigation', !settings.keyboardNavigation)}
            className="flex items-center gap-2"
            aria-label="Toggle keyboard navigation"
            aria-pressed={settings.keyboardNavigation}
          >
            <Keyboard className="h-4 w-4" />
            Keyboard Navigation
          </Button>
          
          {settings.keyboardNavigation && (
            <span className="text-xs text-gray-600">
              Use Tab, Arrow keys, Enter, Space, Home, End, Escape
            </span>
          )}
        </div>
      </Card>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Accessibility Help</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Close help"
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
                <div className="space-y-1 text-sm">
                  <div><kbd>Tab</kbd> - Navigate between elements</div>
                  <div><kbd>Enter/Space</kbd> - Activate focused element</div>
                  <div><kbd>Arrow Keys</kbd> - Navigate within groups</div>
                  <div><kbd>Home/End</kbd> - Jump to start/end</div>
                  <div><kbd>Escape</kbd> - Close dialogs/cancel</div>
                  <div><kbd>F1</kbd> - Open this help</div>
                  <div><kbd>Alt + H</kbd> - Toggle help</div>
                  <div><kbd>Alt + C</kbd> - Toggle high contrast</div>
                  <div><kbd>Alt + T</kbd> - Toggle large text</div>
                  <div><kbd>Alt + M</kbd> - Toggle reduced motion</div>
                  <div><kbd>Alt + D</kbd> - Toggle dark mode</div>
                  <div><kbd>Alt + K</kbd> - Toggle keyboard navigation</div>
                  <div><kbd>Alt + +/-</kbd> - Zoom in/out</div>
                </div>
              </div>

              {/* Screen Reader Support */}
              <div>
                <h3 className="font-semibold mb-2">Screen Reader Support</h3>
                <p className="text-sm text-gray-600">
                  This application is optimized for screen readers with proper ARIA labels, 
                  landmarks, and live regions. All interactive elements are keyboard accessible 
                  and provide clear feedback.
                </p>
              </div>

              {/* Visual Adjustments */}
              <div>
                <h3 className="font-semibold mb-2">Visual Adjustments</h3>
                <p className="text-sm text-gray-600">
                  Use the accessibility toolbar to adjust contrast, text size, motion, 
                  and zoom levels to suit your needs. All settings are automatically saved 
                  and applied across the application.
                </p>
              </div>

              {/* Getting Started */}
              <div>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Press <kbd>Tab</kbd> to start navigating</li>
                  <li>Use <kbd>Alt + H</kbd> to toggle this help</li>
                  <li>Adjust visual settings using the toolbar</li>
                  <li>Enable keyboard navigation for full control</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={() => setIsHelpOpen(false)}
                className="w-full"
                aria-label="Close help dialog"
              >
                Got it, thanks!
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Form Component
 */
export function AccessibleForm({
  children,
  onSubmit,
  ariaLabel,
  describedBy
}: {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  ariaLabel?: string;
  describedBy?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      noValidate
    >
      {children}
    </form>
  );
}

/**
 * Accessible Input Component
 */
export function AccessibleInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  error,
  helperText,
  id,
  ...props
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  [key: string]: any;
}) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="Required">*</span>}
      </label>
      
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={cn(
          "w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500"
        )}
        {...props}
      />
      
      {error && (
        <div id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div id={helperId} className="text-sm text-gray-600">
          {helperText}
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Button Component
 */
export function AccessibleButton({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  ariaLabel,
  describedBy,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  describedBy?: string;
  [key: string]: any;
}) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin h-4 w-4 mr-2" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Skip to Main Content Link
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  );
}

/**
 * Focus Management Hook
 */
export function useFocusManagement(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  void onClose;

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus first focusable element
      const firstFocusable = containerRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        firstFocusable.focus();
      }
    } else {
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Trap focus within container
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}

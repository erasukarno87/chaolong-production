/**
 * Enhanced Design System untuk Production Setup
 * Color system, typography, spacing, dan visual hierarchy
 */

// Color System dengan semantic meaning
export const colors = {
  // Primary Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Info Colors
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Purple (for special actions)
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },
};

// Semantic Color Mapping
export const semanticColors = {
  // Status Colors
  ready: {
    bg: colors.success[50],
    border: colors.success[200],
    text: colors.success[700],
    icon: colors.success[600],
    hover: colors.success[100],
  },
  warning: {
    bg: colors.warning[50],
    border: colors.warning[200],
    text: colors.warning[700],
    icon: colors.warning[600],
    hover: colors.warning[100],
  },
  error: {
    bg: colors.error[50],
    border: colors.error[200],
    text: colors.error[700],
    icon: colors.error[600],
    hover: colors.error[100],
  },
  info: {
    bg: colors.info[50],
    border: colors.info[200],
    text: colors.info[700],
    icon: colors.info[600],
    hover: colors.info[100],
  },
  neutral: {
    bg: colors.neutral[50],
    border: colors.neutral[200],
    text: colors.neutral[700],
    icon: colors.neutral[600],
    hover: colors.neutral[100],
  },

  // Interactive Colors
  primary: {
    bg: colors.primary[500],
    hover: colors.primary[600],
    active: colors.primary[700],
    text: 'white',
    disabled: colors.neutral[300],
  },

  // Surface Colors
  surface: {
    primary: 'white',
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    elevated: 'white',
  },

  // Text Colors
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[500],
    quaternary: colors.neutral[400],
    inverse: 'white',
    link: colors.primary[600],
    linkHover: colors.primary[700],
  },

  // Border Colors
  border: {
    primary: colors.neutral[200],
    secondary: colors.neutral[300],
    focus: colors.primary[500],
    error: colors.error[500],
    success: colors.success[500],
    warning: colors.warning[500],
  },
};

// Typography System
export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing System (8-point grid)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem',    // 256px
};

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Animation & Transitions
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

// Z-Index Scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Component-Specific Design Tokens
export const components = {
  // Status Cards
  statusCard: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    border: '2px solid',
    boxShadow: shadows.sm,
    transition: `all ${transitions.duration.normal} ${transitions.easing.easeOut}`,
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: shadows.md,
    },
  },

  // Workstation Cards
  workstationCard: {
    padding: spacing[4],
    borderRadius: borderRadius['2xl'],
    border: '2px solid',
    boxShadow: shadows.base,
    transition: `all ${transitions.duration.normal} ${transitions.easing.easeOut}`,
    hover: {
      transform: 'translateY(-4px)',
      boxShadow: shadows.lg,
    },
  },

  // Action Buttons
  actionButton: {
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borderRadius.lg,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.sm,
    transition: `all ${transitions.duration.fast} ${transitions.easing.easeOut}`,
    hover: {
      transform: 'scale(1.05)',
    },
    active: {
      transform: 'scale(0.95)',
    },
  },

  // Quick Actions Panel
  quickActionsPanel: {
    borderRadius: borderRadius['2xl'],
    boxShadow: shadows['2xl'],
    backdrop: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  // Mobile Cards
  mobileCard: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    border: '2px solid',
    boxShadow: shadows.base,
    touchTarget: {
      minHeight: '44px',
      minWidth: '44px',
    },
  },

  // Form Elements
  form: {
    input: {
      padding: `${spacing[3]} ${spacing[4]}`,
      borderRadius: borderRadius.lg,
      border: `2px solid ${semanticColors.border.primary}`,
      fontSize: typography.fontSize.base,
      transition: `all ${transitions.duration.fast} ${transitions.easing.easeOut}`,
      focus: {
        borderColor: semanticColors.border.focus,
        boxShadow: `0 0 0 3px ${colors.primary[100]}`,
      },
    },
    select: {
      padding: `${spacing[3]} ${spacing[4]}`,
      borderRadius: borderRadius.lg,
      border: `2px solid ${semanticColors.border.primary}`,
      fontSize: typography.fontSize.base,
    },
  },
};

// Utility Classes Generator
export const generateUtilityClasses = () => {
  return {
    // Status Classes
    status: {
      ready: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      error: 'bg-red-50 border-red-200 text-red-700',
      info: 'bg-blue-50 border-blue-200 text-blue-700',
      neutral: 'bg-gray-50 border-gray-200 text-gray-700',
    },

    // Interactive Classes
    interactive: {
      hover: 'hover:shadow-md hover:scale-105 transition-all duration-200',
      active: 'active:scale-95 transition-transform duration-150',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    },

    // Typography Classes
    text: {
      h1: 'text-3xl font-bold text-gray-900 tracking-tight',
      h2: 'text-2xl font-bold text-gray-900 tracking-tight',
      h3: 'text-xl font-semibold text-gray-900',
      h4: 'text-lg font-semibold text-gray-900',
      body: 'text-base text-gray-700',
      caption: 'text-sm text-gray-600',
      small: 'text-xs text-gray-500',
    },

    // Spacing Classes
    spacing: {
      tight: 'space-y-2',
      normal: 'space-y-4',
      loose: 'space-y-6',
      extra: 'space-y-8',
    },

    // Animation Classes
    animation: {
      fadeIn: 'animate-in fade-in-0 duration-200',
      slideUp: 'animate-in slide-in-from-bottom-2 duration-300',
      slideDown: 'animate-in slide-in-from-top-2 duration-300',
      scaleIn: 'animate-in zoom-in-95 duration-200',
    },
  };
};

// CSS Custom Properties Generator
export const generateCSSVariables = () => {
  return `
    :root {
      /* Colors */
      --color-primary-50: ${colors.primary[50]};
      --color-primary-500: ${colors.primary[500]};
      --color-primary-600: ${colors.primary[600]};
      --color-success-50: ${colors.success[50]};
      --color-success-500: ${colors.success[500]};
      --color-success-600: ${colors.success[600]};
      --color-warning-50: ${colors.warning[50]};
      --color-warning-500: ${colors.warning[500]};
      --color-warning-600: ${colors.warning[600]};
      --color-error-50: ${colors.error[50]};
      --color-error-500: ${colors.error[500]};
      --color-error-600: ${colors.error[600]};
      --color-info-50: ${colors.info[50]};
      --color-info-500: ${colors.info[500]};
      --color-info-600: ${colors.info[600]};
      
      /* Semantic Colors */
      --color-ready-bg: ${semanticColors.ready.bg};
      --color-ready-border: ${semanticColors.ready.border};
      --color-ready-text: ${semanticColors.ready.text};
      --color-warning-bg: ${semanticColors.warning.bg};
      --color-warning-border: ${semanticColors.warning.border};
      --color-warning-text: ${semanticColors.warning.text};
      --color-error-bg: ${semanticColors.error.bg};
      --color-error-border: ${semanticColors.error.border};
      --color-error-text: ${semanticColors.error.text};
      
      /* Typography */
      --font-family-sans: ${typography.fontFamily.sans.join(', ')};
      --font-size-xs: ${typography.fontSize.xs};
      --font-size-sm: ${typography.fontSize.sm};
      --font-size-base: ${typography.fontSize.base};
      --font-size-lg: ${typography.fontSize.lg};
      --font-size-xl: ${typography.fontSize.xl};
      
      /* Spacing */
      --spacing-1: ${spacing[1]};
      --spacing-2: ${spacing[2]};
      --spacing-3: ${spacing[3]};
      --spacing-4: ${spacing[4]};
      --spacing-6: ${spacing[6]};
      --spacing-8: ${spacing[8]};
      
      /* Border Radius */
      --border-radius-sm: ${borderRadius.sm};
      --border-radius-md: ${borderRadius.md};
      --border-radius-lg: ${borderRadius.lg};
      --border-radius-xl: ${borderRadius.xl};
      --border-radius-2xl: ${borderRadius['2xl']};
      
      /* Shadows */
      --shadow-sm: ${shadows.sm};
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-xl: ${shadows.xl};
      
      /* Transitions */
      --transition-fast: ${transitions.duration.fast} ${transitions.easing.easeOut};
      --transition-normal: ${transitions.duration.normal} ${transitions.easing.easeOut};
      --transition-slow: ${transitions.duration.slow} ${transitions.easing.easeOut};
      
      /* Z-Index */
      --z-dropdown: ${zIndex.dropdown};
      --z-modal: ${zIndex.modal};
      --z-toast: ${zIndex.toast};
    }
  `;
};

export default {
  colors,
  semanticColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  components,
  generateUtilityClasses,
  generateCSSVariables,
};

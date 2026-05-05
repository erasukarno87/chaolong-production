# Monitoring System Architecture

## Overview

The monitoring system has been completely refactored to follow modern React patterns with separation of concerns, type safety, and production-grade error handling. This document provides a comprehensive overview of the architecture, components, and best practices.

## Architecture Principles

### 1. Separation of Concerns
- **Presentation Layer**: UI components focused only on rendering
- **Data Layer**: Hooks for data fetching and state management
- **Business Logic Layer**: Services for calculations and transformations
- **Type Layer**: Centralized type definitions

### 2. Feature-Based Organization
```
src/features/monitoring/
├── components/          # UI components
├── hooks/              # Custom hooks
├── services/           # Business logic
└── __tests__/         # Test files
```

### 3. Type Safety
- All components and hooks are fully typed
- Centralized type definitions in `monitoring.types.ts`
- Runtime validation with Zod schemas

## Core Components

### 1. Monitoring Page (`pages/Monitoring.tsx`)
```typescript
export default function MonitoringPage() {
  return (
    <MonitoringErrorBoundary component="MonitoringPage">
      <MonitoringDashboardContent />
    </MonitoringErrorBoundary>
  );
}
```

**Features:**
- Error boundary wrapping for graceful error handling
- Clean separation of concerns
- Uses composition with feature components

### 2. Dashboard Hook (`hooks/useMonitoringDashboardSimple.ts`)
```typescript
export function useSimpleMonitoringDashboard(): UseSimpleMonitoringDashboardReturn {
  // UI State Management
  // Data Fetching
  // Calculated Metrics
  // Transformed Data
  // Loading States
}
```

**Responsibilities:**
- Manages all data fetching
- Handles UI state (density, dark mode, active panel)
- Calculates derived metrics
- Provides memoized data transformations

### 3. Business Logic Service (`services/production.calculations.ts`)
```typescript
export class ProductionCalculations {
  static calculateProductionMetrics(...): SimpleProductionMetrics
  static calculateOEEMetrics(...): SimpleOEEMetrics
  static transformCheckSheets(...): SimpleCheckItem[]
  // ... other calculation methods
}
```

**Features:**
- Pure functions for business logic
- No React dependencies
- Easily testable
- Type-safe calculations

## Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │───▶│ Dashboard Hook   │───▶│ Business Logic │
│                 │    │                  │    │                 │
│ - StatusPanel   │    │ - Data Fetching  │    │ - Calculations  │
│ - HourlyChart   │    │ - State Mgmt     │    │ - Transformations│
│ - OEESPanel     │    │ - Memoization    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Error Boundary│    │   React Query    │    │   Supabase API  │
│                 │    │                  │    │                 │
│ - Graceful UI   │    │ - Caching        │    │ - Real-time     │
│ - Error Logging  │    │ - Background Ref │    │ - Data Source   │
│ - User Feedback  │    │ - Offline Support │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Performance Optimizations

### 1. React Performance
- **React.memo()** for component memoization
- **useMemo()** for expensive calculations
- **useCallback()** for event handlers
- **Component splitting** for smaller bundles

### 2. Data Caching
```typescript
// Multi-tier caching strategy
const CACHE_CONFIG = {
  realtime: { staleTime: 30_000, cacheTime: 300_000 },
  hourly: { staleTime: 300_000, cacheTime: 1_800_000 },
  historical: { staleTime: 900_000, cacheTime: 3_600_000 },
  skills: { staleTime: 1_800_000, cacheTime: 14_400_000 },
};
```

### 3. Bundle Optimization
- Tree-shaking for unused code
- Code splitting for large components
- Lazy loading for non-critical features

## Error Handling Strategy

### 1. Error Boundaries
```typescript
<MonitoringErrorBoundary component="MonitoringPage">
  <MonitoringDashboardContent />
</MonitoringErrorBoundary>
```

**Features:**
- Component-level error isolation
- User-friendly error UI
- Error reporting and logging
- Recovery mechanisms

### 2. Global Error Handler
```typescript
export const errorHandler = new ErrorHandler({
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === "production",
  environment: "development",
});
```

**Capabilities:**
- Categorized error reporting
- Remote error logging
- Error statistics
- Support report generation

## Testing Strategy

### 1. Component Testing
```typescript
describe("StatusPanel", () => {
  it("should render production metrics", () => {
    // Test implementation
  });
  
  it("should handle loading states", () => {
    // Test implementation
  });
});
```

### 2. Hook Testing
```typescript
describe("useSimpleMonitoringDashboard", () => {
  it("should calculate metrics correctly", () => {
    // Test implementation
  });
  
  it("should handle state changes", () => {
    // Test implementation
  });
});
```

### 3. Test Coverage Targets
- **Components**: 90% coverage
- **Hooks**: 95% coverage  
- **Services**: 100% coverage
- **Integration**: 80% coverage

## Security & Authorization

### 1. Permission-Based Access
```typescript
<RequirePermission permissions={["monitoring.view"]}>
  <Monitoring />
</RequirePermission>
```

### 2. Permission Matrix
```typescript
export const PERMISSION_MATRIX = {
  super_admin: ["monitoring.view", "monitoring.admin", "shift.input", "admin.all"],
  leader: ["monitoring.view", "shift.input"],
  supervisor: ["monitoring.view"],
  manager: ["monitoring.view"],
};
```

## Deployment & CI/CD

### 1. Build Process
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test

# Building
npm run build
```

### 2. Environment Validation
```typescript
validateEnvironment({
  required: ["REACT_APP_API_URL", "REACT_APP_SUPABASE_URL"],
  optional: ["REACT_APP_ERROR_ENDPOINT"],
});
```

## Best Practices

### 1. Component Development
- Keep components focused and single-purpose
- Use TypeScript for all components
- Implement proper error boundaries
- Add comprehensive tests

### 2. Hook Development
- Use proper dependency arrays
- Implement memoization where appropriate
- Handle loading and error states
- Provide clear return types

### 3. Service Development
- Keep functions pure and testable
- Use centralized type definitions
- Implement proper error handling
- Add comprehensive documentation

### 4. Performance
- Profile components regularly
- Optimize bundle size
- Implement proper caching
- Monitor performance metrics

## Troubleshooting

### Common Issues

1. **Component Not Rendering**
   - Check error boundaries
   - Verify data availability
   - Check console for errors

2. **Performance Issues**
   - Check React DevTools Profiler
   - Verify memoization implementation
   - Monitor bundle size

3. **Data Not Loading**
   - Check network requests
   - Verify cache configuration
   - Check error boundaries

### Debug Tools
- React DevTools
- Network tab in browser
- Error boundary logs
- Performance profiler

## Future Enhancements

### Planned Improvements
1. **Real-time Collaboration**
   - WebSocket connections
   - Live updates across sessions

2. **Advanced Analytics**
   - Performance metrics tracking
   - User behavior analytics

3. **Mobile Optimization**
   - Responsive design improvements
   - Touch-friendly interactions

4. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - ARIA labels

## Conclusion

The monitoring system architecture provides a solid foundation for building scalable, maintainable, and performant React applications. The separation of concerns, comprehensive error handling, and extensive testing ensure production readiness and long-term maintainability.

For questions or contributions, please refer to the development team or create an issue in the project repository.

import { useAuth } from "@/contexts/AuthContext";
import { 
  Permission, 
  AppRole, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  getRolePermissions, 
  getAllRolePermissions,
  canAccessRoute,
  getEffectiveRole as getEffectiveRoleUtil
} from "@/lib/permissions";

export interface PermissionCheck {
  has: boolean;
  reason?: string;
}

export interface UsePermissionsReturn {
  /**
   * Current user's effective role
   */
  effectiveRole: AppRole | null;
  
  /**
   * All user roles
   */
  roles: AppRole[];
  
  /**
   * Check if user has a specific permission
   */
  hasPermission: (permission: Permission) => PermissionCheck;
  
  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission: (permissions: Permission[]) => PermissionCheck;
  
  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions: (permissions: Permission[]) => PermissionCheck;
  
  /**
   * Get all permissions for the user's effective role
   */
  getPermissions: () => Permission[];
  
  /**
   * Get all permissions including inherited ones
   */
  getAllPermissions: () => Permission[];
  
  /**
   * Check if user can access a route
   */
  canAccessRoute: (requiredPermissions: Permission[]) => PermissionCheck;
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Check if user is super admin
   */
  isSuperAdmin: boolean;
  
  /**
   * Check if user is leader or higher
   */
  isLeaderOrHigher: boolean;
  
  /**
   * Check if user is supervisor or higher
   */
  isSupervisorOrHigher: boolean;
}

/**
 * Hook for centralized permission checking
 * Replaces scattered role-based authorization throughout the app
 * 
 * Note: effectiveRole is derived from AuthContext which computes it reliably.
 * Fallback to getEffectiveRoleUtil only when authEffectiveRole is not yet available.
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, roles, loading, effectiveRole: authEffectiveRole } = useAuth();

  // Use AuthContext's computed value, with fallback to utility function
  // This ensures consistency - AuthContext is the primary source
  const effectiveRole = authEffectiveRole ?? (roles.length > 0 ? getEffectiveRoleUtil(roles) : null);

  const hasPermissionCheck = (permission: Permission): PermissionCheck => {
    if (loading) {
      return { has: false, reason: "Loading permissions..." };
    }
    
    if (!effectiveRole) {
      return { has: false, reason: "No role assigned" };
    }

    const has = hasPermission(effectiveRole, permission);
    return { 
      has, 
      reason: has ? undefined : `Role '${effectiveRole}' does not have permission '${permission}'`
    };
  };

  const hasAnyPermissionCheck = (permissions: Permission[]): PermissionCheck => {
    if (loading) {
      return { has: false, reason: "Loading permissions..." };
    }
    
    if (!effectiveRole) {
      return { has: false, reason: "No role assigned" };
    }

    const has = hasAnyPermission(effectiveRole, permissions);
    return { 
      has, 
      reason: has ? undefined : `Role '${effectiveRole}' does not have any of the required permissions`
    };
  };

  const hasAllPermissionsCheck = (permissions: Permission[]): PermissionCheck => {
    if (loading) {
      return { has: false, reason: "Loading permissions..." };
    }
    
    if (!effectiveRole) {
      return { has: false, reason: "No role assigned" };
    }

    const has = hasAllPermissions(effectiveRole, permissions);
    return { 
      has, 
      reason: has ? undefined : `Role '${effectiveRole}' does not have all required permissions`
    };
  };

  const canAccessRouteCheck = (requiredPermissions: Permission[]): PermissionCheck => {
    if (loading) {
      return { has: false, reason: "Loading permissions..." };
    }
    
    if (!effectiveRole) {
      return { has: false, reason: "No role assigned" };
    }

    const can = canAccessRoute(effectiveRole, requiredPermissions);
    return { 
      has: can, 
      reason: can ? undefined : `Role '${effectiveRole}' cannot access this route`
    };
  };

  const getPermissionsList = (): Permission[] => {
    if (!effectiveRole) return [];
    return getRolePermissions(effectiveRole);
  };

  const getAllPermissionsList = (): Permission[] => {
    if (!effectiveRole) return [];
    return getAllRolePermissions(effectiveRole);
  };

  const isAuthenticated = !!user && !loading;
  const isSuperAdmin = effectiveRole === "super_admin";
  const isLeaderOrHigher = effectiveRole === "super_admin" || effectiveRole === "leader";
  const isSupervisorOrHigher = ["super_admin", "leader", "supervisor"].includes(effectiveRole ?? "");

  return {
    effectiveRole,
    roles,
    hasPermission: hasPermissionCheck,
    hasAnyPermission: hasAnyPermissionCheck,
    hasAllPermissions: hasAllPermissionsCheck,
    getPermissions: getPermissionsList,
    getAllPermissions: getAllPermissionsList,
    canAccessRoute: canAccessRouteCheck,
    isAuthenticated,
    isSuperAdmin,
    isLeaderOrHigher,
    isSupervisorOrHigher,
  };
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: Permission[],
  fallback?: React.ComponentType<any> | React.ReactElement | null
) {
  return function PermissionWrapper(props: P) {
    const { hasAnyPermission } = usePermissions();
    const permissionCheck = hasAnyPermission(requiredPermissions);

    if (!permissionCheck.has) {
      if (React.isValidElement(fallback)) {
        return fallback;
      }
      if (typeof fallback === 'function') {
        return React.createElement(fallback);
      }
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Hook for specific permission groups commonly used in the app
 */
export function useMonitoringPermissions() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  return {
    canView: hasPermission("monitoring.view"),
    canViewRealtime: hasPermission("monitoring.realtime"),
    canExport: hasPermission("monitoring.export"),
    canViewOrExport: hasAnyPermission(["monitoring.view", "monitoring.export"]),
  };
}

export function useShiftPermissions() {
  const { hasPermission, hasAllPermissions } = usePermissions();
  
  return {
    canInput: hasPermission("shift.input"),
    canEdit: hasPermission("shift.edit"),
    canDelete: hasPermission("shift.delete"),
    canManage: hasAllPermissions(["shift.input", "shift.edit"]),
    canFullManage: hasAllPermissions(["shift.input", "shift.edit", "shift.delete"]),
  };
}

export function useAdminPermissions() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  
  return {
    canAccessAdmin: hasPermission("admin.all"),
    canManageUsers: hasPermission("admin.users"),
    canManageLines: hasPermission("admin.lines"),
    canManageProducts: hasPermission("admin.products"),
    canManageProcesses: hasPermission("admin.processes"),
    isFullAdmin: isSuperAdmin,
  };
}

export function useTraceabilityPermissions() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  return {
    canView: hasPermission("traceability.view"),
    canExport: hasPermission("traceability.export"),
    canAnalyze: hasPermission("traceability.analyze"),
    canViewOrExport: hasAnyPermission(["traceability.view", "traceability.export"]),
    canFullAccess: hasAnyPermission(["traceability.view", "traceability.export", "traceability.analyze"]),
  };
}

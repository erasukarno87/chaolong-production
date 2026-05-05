/**
 * Centralized Permission Matrix
 * Single source of truth for all application permissions
 */

export type Permission = 
  | "monitoring.view"
  | "monitoring.realtime"
  | "monitoring.export"
  | "shift.input"
  | "shift.edit"
  | "shift.delete"
  | "admin.all"
  | "admin.users"
  | "admin.lines"
  | "admin.products"
  | "admin.processes"
  | "traceability.view"
  | "traceability.export"
  | "traceability.analyze";

export type AppRole = "super_admin" | "leader" | "supervisor" | "manager";

/**
 * Permission matrix mapping permissions to roles
 * This is the single source of truth for authorization
 */
export const PERMISSION_MATRIX: Record<Permission, AppRole[]> = {
  // Monitoring permissions
  "monitoring.view": ["super_admin", "leader", "supervisor", "manager"],
  "monitoring.realtime": ["super_admin", "leader"],
  "monitoring.export": ["super_admin", "leader", "manager"],

  // Shift permissions
  "shift.input": ["super_admin", "leader"],
  "shift.edit": ["super_admin", "leader"],
  "shift.delete": ["super_admin"],

  // Admin permissions
  "admin.all": ["super_admin"],
  "admin.users": ["super_admin"],
  "admin.lines": ["super_admin"],
  "admin.products": ["super_admin"],
  "admin.processes": ["super_admin"],

  // Traceability permissions
  "traceability.view": ["super_admin", "leader", "supervisor", "manager"],
  "traceability.export": ["super_admin", "leader", "manager"],
  "traceability.analyze": ["super_admin", "leader", "manager"],
} as const;

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit all permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<AppRole, AppRole[]> = {
  "super_admin": ["super_admin", "leader", "supervisor", "manager"],
  "leader": ["leader", "supervisor", "manager"],
  "supervisor": ["supervisor", "manager"],
  "manager": ["manager"],
} as const;

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  MONITORING_BASIC: ["monitoring.view"],
  MONITORING_ADVANCED: ["monitoring.view", "monitoring.realtime", "monitoring.export"],
  SHIFT_MANAGEMENT: ["shift.input", "shift.edit"],
  SHIFT_FULL: ["shift.input", "shift.edit", "shift.delete"],
  ADMIN_FULL: ["admin.all"],
  TRACEABILITY_BASIC: ["traceability.view"],
  TRACEABILITY_ADVANCED: ["traceability.view", "traceability.export", "traceability.analyze"],
} as const;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AppRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: AppRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: AppRole): Permission[] {
  return Object.entries(PERMISSION_MATRIX)
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission as Permission);
}

/**
 * Get all permissions for a role including inherited permissions
 */
export function getAllRolePermissions(role: AppRole): Permission[] {
  const inheritedRoles = ROLE_HIERARCHY[role];
  const allPermissions = new Set<Permission>();

  for (const inheritedRole of inheritedRoles) {
    const rolePermissions = getRolePermissions(inheritedRole);
    rolePermissions.forEach(permission => allPermissions.add(permission));
  }

  return Array.from(allPermissions);
}

/**
 * Check if a role can access a route based on required permissions
 */
export function canAccessRoute(role: AppRole, requiredPermissions: Permission[]): boolean {
  if (requiredPermissions.length === 0) return true; // No permissions required
  return hasAnyPermission(role, requiredPermissions);
}

/**
 * Get the highest role in hierarchy from a list of roles
 */
export function getEffectiveRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("leader")) return "leader";
  if (roles.includes("supervisor")) return "supervisor";
  if (roles.includes("manager")) return "manager";
  return null;
}

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "monitoring.view": "View production monitoring dashboard",
  "monitoring.realtime": "Access real-time monitoring data",
  "monitoring.export": "Export monitoring data",
  "shift.input": "Input shift production data",
  "shift.edit": "Edit shift data",
  "shift.delete": "Delete shift records",
  "admin.all": "Full administrative access",
  "admin.users": "Manage user accounts",
  "admin.lines": "Manage production lines",
  "admin.products": "Manage product definitions",
  "admin.processes": "Manage production processes",
  "traceability.view": "View traceability reports",
  "traceability.export": "Export traceability data",
  "traceability.analyze": "Analyze traceability data",
} as const;

/**
 * Role descriptions for UI display
 */
export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  "super_admin": "Full system access with all permissions",
  "leader": "Production leader with monitoring and shift management",
  "supervisor": "Production supervisor with view access",
  "manager": "Manager with view and export capabilities",
} as const;

export type UserRole = "admin" | "organizer" | "attender";

// Super admin email - has unrestricted access to all routes
export const SUPER_ADMIN_EMAIL = "gowthamr@systechusa.com";

// Check if user is super admin
export const isSuperAdmin = (email: string | null | undefined): boolean => {
  return email === SUPER_ADMIN_EMAIL;
};

// Role hierarchy for route access
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  admin: ["admin", "organizer", "attender"],
  organizer: ["organizer", "attender"],
  attender: ["attender"],
};

// Get accessible roles for a user
export const getAccessibleRoles = (role: UserRole): UserRole[] => {
  return ROLE_HIERARCHY[role] || ["attender"];
};

// Check if a role can access a specific route
export const canAccessRoute = (
  userRole: UserRole | null | undefined,
  userEmail: string | null | undefined,
  pathname: string
): boolean => {
  // Super admin can access everything
  if (isSuperAdmin(userEmail)) {
    return true;
  }

  // Not authenticated
  if (!userRole) {
    return false;
  }

  // Extract the role from the pathname (e.g., /admin/... -> admin)
  const pathSegments = pathname.split("/").filter(Boolean);
  const requestedRole = pathSegments[0] as UserRole;

  // Check if the requested role is valid
  if (!["admin", "organizer", "attender"].includes(requestedRole)) {
    return true; // Allow access to non-role-specific routes
  }

  // Check if user's role can access the requested role's routes
  const accessibleRoles = getAccessibleRoles(userRole);
  return accessibleRoles.includes(requestedRole);
};

// Get default dashboard path for a role
export const getDefaultDashboard = (
  role: UserRole | null | undefined
): string => {
  if (!role) {
    return "/";
  }

  const defaultPaths: Record<UserRole, string> = {
    admin: "/admin",
    organizer: "/organizer",
    attender: "/attender",
  };

  return defaultPaths[role] || "/attender";
};

// Check if a path is a dashboard route
export const isDashboardRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/attender")
  );
};

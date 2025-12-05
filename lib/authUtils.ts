// Client-side auth utilities
export type UserRole = "attender" | "examiner" | "admin" | "super_admin";

// Super admin email constant
export const SUPER_ADMIN_EMAIL = "gowthamr@systechusa.com";

// Role hierarchy: super_admin > admin > examiner > attender
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  attender: 1,
  examiner: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Check if a user with a given role can access routes for a target role
 * @param userRole - The role of the current user
 * @param targetRole - The role required to access a route
 * @returns true if user can access the target role's routes
 */
export const canAccessRole = (
  userRole: UserRole | null | undefined,
  targetRole: UserRole
): boolean => {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
};

/**
 * Get the default dashboard path for a given role
 * @param role - User role
 * @returns Default dashboard path
 */
export const getDefaultDashboard = (
  role: UserRole | null | undefined
): string => {
  if (!role) return "/";

  switch (role) {
    case "super_admin":
    case "admin":
      return "/dashboard/admin";
    case "examiner":
      return "/dashboard/examiner";
    case "attender":
      return "/dashboard/attender";
    default:
      return "/";
  }
};

// This function now makes an API call instead of direct database access
export const createOrFetchUser = async (
  email: string,
  name: string | null
): Promise<{ role: UserRole }> => {
  try {
    const response = await fetch("/api/users/get-or-create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name }),
    });

    if (!response.ok) {
      throw new Error("Failed to create or fetch user");
    }

    console.log("User created or fetched successfully:", response);

    return await response.json();
  } catch (error) {
    console.error("Error in createOrFetchUser:", error);
    throw error;
  }
};

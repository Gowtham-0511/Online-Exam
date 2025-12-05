import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Define role hierarchy
const ROLE_HIERARCHY: Record<string, number> = {
  attender: 1,
  examiner: 2,
  admin: 3,
  super_admin: 4,
};

// Define protected routes and their required roles
const PROTECTED_ROUTES: Record<string, string> = {
  "/dashboard/admin": "admin",
  "/dashboard/examiner": "examiner",
  "/dashboard/attender": "attender",
};

/**
 * Check if a user role can access a target role's routes
 */
function canAccessRole(
  userRole: string | null | undefined,
  targetRole: string
): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return userLevel >= targetLevel;
}

/**
 * Get the default dashboard for a role
 */
function getDefaultDashboard(role: string | null | undefined): string {
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
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is a protected dashboard route
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find((route) =>
    pathname.startsWith(route)
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token, redirect to sign in
  if (!token) {
    const url = new URL("/", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const userRole = token.role as string;
  const requiredRole = PROTECTED_ROUTES[matchedRoute];

  // Check if user has permission to access this route
  if (!canAccessRole(userRole, requiredRole)) {
    // Redirect to their appropriate dashboard
    const defaultDashboard = getDefaultDashboard(userRole);
    const url = new URL(defaultDashboard, request.url);
    return NextResponse.redirect(url);
  }

  // User has permission, allow access
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/dashboard/admin/:path*",
    "/dashboard/examiner/:path*",
    "/dashboard/attender/:path*",
  ],
};

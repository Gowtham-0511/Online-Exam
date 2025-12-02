import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  canAccessRoute,
  getDefaultDashboard,
  isDashboardRoute,
} from "./lib/auth/roleUtils";
import type { UserRole } from "./lib/auth/roleUtils";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-dashboard routes
  if (!isDashboardRoute(pathname)) {
    return NextResponse.next();
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated - redirect to login
  if (!token) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Extract user info from token
  const userRole = token.role as UserRole | null;
  const userEmail = token.email as string | null;

  // Check if user can access this route
  const hasAccess = canAccessRoute(userRole, userEmail, pathname);

  if (!hasAccess) {
    // Redirect to user's default dashboard
    const defaultDashboard = getDefaultDashboard(userRole);
    const redirectUrl = new URL(defaultDashboard, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow access
  return NextResponse.next();
}

// Configure which routes should be protected
export const config = {
  matcher: ["/admin/:path*", "/organizer/:path*", "/attender/:path*"],
};

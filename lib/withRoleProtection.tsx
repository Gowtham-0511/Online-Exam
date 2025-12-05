import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, ComponentType } from 'react';
import { canAccessRole, getDefaultDashboard, UserRole } from './authUtils';

interface WithRoleProtectionOptions {
    requiredRole: UserRole;
    redirectTo?: string;
}

/**
 * Higher Order Component for role-based page protection
 * @param Component - The component to protect
 * @param options - Protection options including required role
 */
export function withRoleProtection<P extends object>(
    Component: ComponentType<P>,
    options: WithRoleProtectionOptions
) {
    return function ProtectedComponent(props: P) {
        const { data: session, status } = useSession();
        const router = useRouter();

        useEffect(() => {
            if (status === 'loading') return;

            // Not authenticated
            if (!session) {
                router.push(`/?callbackUrl=${encodeURIComponent(router.pathname)}`);
                return;
            }

            const userRole = session.user?.role as UserRole;

            // Check if user has required role
            if (!canAccessRole(userRole, options.requiredRole)) {
                // Redirect to their default dashboard or specified location
                const redirectPath = options.redirectTo || getDefaultDashboard(userRole);
                router.push(redirectPath);
            }
        }, [session, status, router]);

        // Show loading state while checking authentication
        if (status === 'loading') {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            );
        }

        // Don't render if not authenticated or doesn't have permission
        if (!session || !canAccessRole(session.user?.role as UserRole, options.requiredRole)) {
            return null;
        }

        // User is authenticated and has permission
        return <Component {...props} />;
    };
}

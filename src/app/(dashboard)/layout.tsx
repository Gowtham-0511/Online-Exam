"use client"

import Sidebar from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Menu,
    Home,
    Users,
    ShieldCheck,
    HelpCircle,
    Layers,
    ClipboardCheck,
    KeyRound,
    MonitorPlay,
    ScrollText,
    FilePlus2,
    Clock,
    ClipboardList,
    LineChart,
    ListChecks,
    Trophy,
    Target,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
    Settings,
    LayoutDashboard
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { useMsal } from "@azure/msal-react";
import { Skeleton } from '@/components/ui/skeleton';

export type UserRole = 'admin' | 'organizer' | 'attender';

interface UnifiedDashboardLayoutProps {
    children: React.ReactNode;
}

interface MenuItem {
    id: string;
    navigation: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
}

const ROLE_MENUS: Record<UserRole, MenuItem[]> = {
    admin: [
        {
            id: 'overview',
            navigation: 'index',
            label: 'Overview',
            icon: LayoutDashboard,
            description: 'Dashboard overview'
        },
        {
            id: 'candidate-management',
            navigation: 'user-management',
            label: 'Candidates',
            icon: Users,
            description: 'Manage Candidates',
        },
        {
            id: 'system-user-management',
            navigation: 'system-user-management',
            label: 'System Users',
            icon: ShieldCheck,
            description: 'Manage System Users',
        },
        {
            id: 'questions',
            navigation: 'question-bank',
            label: 'Question Bank',
            icon: HelpCircle,
            description: 'Manage questions'
        },
        {
            id: 'batchManagement',
            navigation: 'batch-management',
            label: 'Batches',
            icon: Layers,
            description: 'Manage batch'
        },
        {
            id: 'assessmentManagement',
            navigation: 'assessment-management',
            label: 'Assessments',
            icon: ClipboardCheck,
            description: 'Create and Manage Assessment'
        },
        {
            id: 'credentialManagement',
            navigation: 'credential-management',
            label: 'Credentials',
            icon: KeyRound,
            description: 'Manage all Credentials'
        },
        // {
        //     id: 'exam-monitoring',
        //     navigation: 'exam-monitoring',
        //     label: 'Monitoring',
        //     icon: MonitorPlay,
        //     description: 'Real-time exam monitoring',
        // },
        {
            id: 'view-results',
            navigation: 'view-results',
            label: 'Results',
            icon: ScrollText,
            description: 'View Results',
        },
    ],
    organizer: [
        {
            id: 'CreateExam',
            navigation: 'index',
            label: 'Create Exam',
            icon: FilePlus2,
            description: 'Create a new exam',
        },
        {
            id: 'schedule',
            navigation: 'schedule',
            label: 'Schedule',
            icon: Clock,
            description: 'Schedule a new exam',
        },
        {
            id: 'ViewExams',
            navigation: 'view-exams',
            label: 'My Exams',
            icon: ClipboardList,
            description: 'View all exams',
        },
        {
            id: 'viewResults',
            navigation: 'organizer-submissions',
            label: 'Submissions',
            icon: ScrollText,
            description: 'View exam results',
        },
        {
            id: 'ExamAnalytics',
            navigation: 'ExamAnalytics',
            label: 'Analytics',
            icon: LineChart,
            description: 'Analyze exam results',
        }
    ],
    attender: [
        {
            id: 'Home',
            navigation: 'index',
            label: 'Home',
            icon: Home,
            description: '',
        },
        {
            id: 'ViewExams',
            navigation: 'view-exams',
            label: 'Assessments',
            icon: ListChecks,
            description: 'View all exams',
        },
        {
            id: 'ExamResults',
            navigation: 'exam-results',
            label: 'My Results',
            icon: Trophy,
            description: 'View all results',
        },
        {
            id: 'practice',
            navigation: 'practice',
            label: 'Practice',
            icon: Target,
            description: 'Practice your personalized questions',
        },
    ]
};

const ROLE_DEFAULT_PAGES: Record<UserRole, string> = {
    admin: 'overview',
    organizer: 'CreateExam',
    attender: 'Home',
};

const Layout = ({ children }: UnifiedDashboardLayoutProps) => {
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { instance, accounts, inProgress } = useMsal();
    const session = accounts[0];
    const status = inProgress === "none" ? "authenticated" : "loading";


    // State to store the verified role from the backend
    const [verifiedRole, setVerifiedRole] = useState<UserRole | null>(null);

    // Determine role: Prioritize verified backend role, then path role, then session role
    const role = useMemo(() => {
        if (verifiedRole) return verifiedRole;

        if (pathname) {
            const segments = pathname.split('/').filter(Boolean);
            const pathRole = segments[0] as UserRole;
            if (['admin', 'organizer', 'attender'].includes(pathRole)) {
                return pathRole;
            }
        }

        // Fallback (initial load)
        const sessionRole = (session?.username) ? (session as any).idTokenClaims?.roles?.[0] : 'attender';
        return (sessionRole || 'attender') as UserRole;
    }, [pathname, session, verifiedRole]);

    // Fetch the true role from the backend
    useEffect(() => {
        if (session?.username && !verifiedRole) {
            import('@/lib/auth/authUtils').then(({ createOrFetchUser }) => {
                createOrFetchUser(session.username, session.name || "")
                    .then((user) => {
                        if (user.role) setVerifiedRole(user.role);
                    })
                    .catch(console.error);
            });
        }
    }, [session, verifiedRole]);

    const menuItems = useMemo(() => ROLE_MENUS[role] || [], [role]);
    const defaultPageId = useMemo(() => ROLE_DEFAULT_PAGES[role] || '', [role]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleDesktopSidebar = useCallback(() => {
        setDesktopSidebarCollapsed(prev => !prev);
    }, []);

    // Client-side route protection
    useEffect(() => {
        if (!mounted || status === 'loading' || !session || !pathname || !verifiedRole) {
            // Wait for verified role before protecting route
            return;
        }

        // Use the verified role for protection checks
        const userRole = verifiedRole;

        // Import and use the canAccessRoute function
        import('@/lib/auth/roleUtils').then(({ canAccessRoute, getDefaultDashboard }) => {
            const hasAccess = canAccessRoute(userRole, pathname);

            if (!hasAccess) {
                console.log(`Access denied for ${userRole} at ${pathname}. Redirecting...`);
                const defaultDashboard = getDefaultDashboard(userRole);
                router.push(defaultDashboard);
            }
        });
    }, [mounted, status, session, pathname, router, verifiedRole]);

    const currentPageId = useMemo(() => {
        if (!pathname) return defaultPageId;

        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        // Check if it's the role's home page
        if (lastSegment === role || lastSegment === 'index' || lastSegment === '') {
            return defaultPageId;
        }

        // Find matching menu item
        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : defaultPageId;
    }, [pathname, role, menuItems, defaultPageId]);

    if (!mounted || status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out",
                    desktopSidebarCollapsed ? "lg:w-20" : "lg:w-64"
                )}
            >
                <Sidebar
                    isCollapsed={desktopSidebarCollapsed}
                    setDesktopSidebarCollapsed={setDesktopSidebarCollapsed}
                    setSidebarOpen={setSidebarOpen}
                />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="p-0 w-72 border-r border-border/50">
                    <Sidebar
                        isCollapsed={false}
                        setDesktopSidebarCollapsed={setDesktopSidebarCollapsed}
                        setSidebarOpen={setSidebarOpen}
                    />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    desktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
                )}
            >
                {/* Header */}
                <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 transition-all duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden -ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        onClick={toggleDesktopSidebar}
                    >
                        {desktopSidebarCollapsed ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <ChevronLeft className="h-5 w-5" />
                        )}
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    <Separator orientation="vertical" className="h-6 hidden lg:block bg-border/50" />

                    <div className="flex-1 flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-foreground tracking-tight">
                            {menuItems.find(item => item.id === currentPageId)?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                            <div className={cn(
                                "w-2 h-2 rounded-full animate-pulse",
                                role === 'admin' ? "bg-red-500" :
                                    role === 'organizer' ? "bg-blue-500" : "bg-green-500"
                            )} />
                            <span className="text-xs font-medium capitalize text-muted-foreground">
                                {role} Mode
                            </span>
                        </div>

                        <ThemeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 animate-in fade-in duration-500">
                    <div className="mx-auto max-w-7xl h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Layout
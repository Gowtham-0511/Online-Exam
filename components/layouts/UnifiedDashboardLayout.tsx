import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Menu,
    BarChart3,
    Users,
    HelpCircle,
    Home,
    CalendarClock,
    ClipboardList,
    LogOut,
    Settings,
    ShieldCheck,
    Layers,
    ClipboardCheck,
    KeyRound,
    MonitorPlay,
    ListChecks,
    Trophy,
    FilePlus2,
    Clock,
    ScrollText,
    LineChart,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface MenuItem {
    id: string;
    navigation: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
}

export type UserRole = 'admin' | 'examiner' | 'attender';

interface UnifiedDashboardLayoutProps {
    children: React.ReactNode;
    role: UserRole;
}

// Role-based menu configurations
const ROLE_MENUS: Record<UserRole, MenuItem[]> = {
    admin: [
        {
            id: 'overview',
            navigation: 'index',
            label: 'Overview',
            icon: Home,
            description: 'Dashboard overview'
        },
        {
            id: 'candidate-management',
            navigation: 'user-management',
            label: 'Candidate Management',
            icon: Users,
            description: 'Manage Candidates',
        },
        {
            id: 'system-user-management',
            navigation: 'system-user-management',
            label: 'User Management',
            icon: ShieldCheck,
            description: 'Manage System Users',
        },
        {
            id: 'questions',
            navigation: 'question-bank',
            label: 'Questions',
            icon: HelpCircle,
            description: 'Manage questions'
        },
        {
            id: 'batchManagement',
            navigation: 'batch-management',
            label: 'Batch Management',
            icon: Layers,
            description: 'Manage batch'
        },
        {
            id: 'assessmentManagement',
            navigation: 'assessment-management',
            label: 'Assessment Management',
            icon: ClipboardCheck,
            description: 'Create and Manage Assessment'
        },
        {
            id: 'credentialManagement',
            navigation: 'credential-management',
            label: 'Credentials Management',
            icon: KeyRound,
            description: 'Manage all Credentials'
        },
        {
            id: 'exam-monitoring',
            navigation: 'exam-monitoring',
            label: 'Exam Monitoring',
            icon: MonitorPlay,
            description: 'Real-time exam monitoring',
        },
    ],
    examiner: [
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
            label: 'Schedule Exam',
            icon: Clock,
            description: 'Schedule a new exam',
        },
        {
            id: 'ViewExams',
            navigation: 'view-exams',
            label: 'View Exams',
            icon: ClipboardList,
            description: 'View all exams',
        },
        {
            id: 'viewResults',
            navigation: 'examiner-submissions',
            label: 'View Results',
            icon: ScrollText,
            description: 'View exam results',
        },
        {
            id: 'ExamAnalytics',
            navigation: 'ExamAnalytics',
            label: 'Exam Analytics',
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
            label: 'View Exams',
            icon: ListChecks,
            description: 'View all exams',
        },
        {
            id: 'ExamResults',
            navigation: 'exam-results',
            label: 'Exam Results',
            icon: Trophy,
            description: 'View all results',
        },
    ]
};

// Role-based default pages
const ROLE_DEFAULT_PAGES: Record<UserRole, string> = {
    admin: 'overview',
    examiner: 'CreateExam',
    attender: 'Home'
};

// Utility functions
const getUserInitials = (name: string): string => {
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getDisplayName = (session: any): string => {
    if (session?.user?.name) return session.user.name;
    if (session?.user?.email) return session.user.email.split('@')[0];
    return 'User';
};

export default function UnifiedDashboardLayout({ children, role }: UnifiedDashboardLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
    const { data: session, status } = useSession();

    // Get menu items based on role
    const menuItems = useMemo(() => ROLE_MENUS[role], [role]);
    const defaultPageId = useMemo(() => ROLE_DEFAULT_PAGES[role], [role]);

    // Memoize current page calculation
    const currentPageId = useMemo(() => {
        const pathname = router.pathname;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        // Check if it's the role's home page
        if (lastSegment === role || lastSegment === 'index' || lastSegment === '') {
            return defaultPageId;
        }

        // Find matching menu item
        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : defaultPageId;
    }, [router.pathname, role, menuItems, defaultPageId]);

    // Memoize user data
    const userData = useMemo(() => ({
        userName: getDisplayName(session),
        userEmail: session?.user?.email || '',
        userImage: session?.user?.image || null,
        userInitials: getUserInitials(getDisplayName(session))
    }), [session]);

    // Callback for sidebar toggle
    const toggleDesktopSidebar = useCallback(() => {
        setDesktopSidebarCollapsed(prev => !prev);
    }, []);

    const closeMobileSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    const getHref = useCallback((item: MenuItem) => {
        return item.navigation === 'index'
            ? `/dashboard/${role}`
            : `/dashboard/${role}/${item.navigation}`;
    }, [role]);

    const handleSignOut = useCallback(async () => {
        await signOut({
            callbackUrl: '/',
            redirect: true
        });
    }, []);

    const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
        <div className="flex flex-col h-full bg-card border-r border-border">
            {/* Logo Section */}
            <div className={cn(
                "flex items-center h-16 px-6 border-b border-border",
                isCollapsed && "px-4 justify-center"
            )}>
                <div className={cn(
                    "flex items-center gap-3",
                    isCollapsed && "gap-0"
                )}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                        <BarChart3 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-lg font-semibold text-foreground">
                            SysRank
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
                    {menuItems.map((item) => {
                        const isActive = currentPageId === item.id;
                        const Icon = item.icon;
                        const href = getHref(item);

                        return (
                            <div key={item.id} className="relative group">
                                <Link
                                    href={href}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                        "flex items-center w-full justify-start h-10 font-normal transition-colors rounded-md",
                                        isCollapsed ? "px-2" : "px-3",
                                        isActive
                                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-5 h-5 shrink-0",
                                        !isCollapsed && "mr-3"
                                    )} />
                                    {!isCollapsed && (
                                        <span className="flex-1 text-left text-sm">
                                            {item.label}
                                        </span>
                                    )}
                                    {!isCollapsed && item.badge && (
                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap border border-border shadow-lg">
                                        {item.label}
                                        {item.badge && (
                                            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User Section */}
            <div className={cn(
                "border-t border-border p-4",
                isCollapsed && "px-2"
            )}>
                {status === 'loading' ? (
                    <div className={cn(
                        "flex items-center gap-3",
                        isCollapsed && "justify-center"
                    )}>
                        <Skeleton className="w-8 h-8 rounded-full" />
                        {!isCollapsed && (
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        )}
                    </div>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full h-auto p-2 hover:bg-accent",
                                    isCollapsed && "justify-center"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center gap-3 w-full",
                                    isCollapsed && "gap-0"
                                )}>
                                    <Avatar className="w-8 h-8 border-2 border-border">
                                        <AvatarImage src={userData.userImage || undefined} alt={userData.userName} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                            {userData.userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {userData.userName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {userData.userEmail}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {role === 'attender' && (
                                <>
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{userData.userName}</p>
                                            <p className="text-xs text-muted-foreground">{userData.userEmail}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                {role === 'attender' ? 'Sign Out' : 'Logout'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
                    desktopSidebarCollapsed ? "lg:w-16" : "lg:w-64"
                )}
            >
                <SidebarContent isCollapsed={desktopSidebarCollapsed} />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="p-0 w-64">
                    <SidebarContent isCollapsed={false} />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div
                className={cn(
                    "lg:pl-64 transition-all duration-300",
                    desktopSidebarCollapsed && "lg:pl-16"
                )}
            >
                {/* Header */}
                <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex"
                        onClick={toggleDesktopSidebar}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>

                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-foreground">
                            {menuItems.find(item => item.id === currentPageId)?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
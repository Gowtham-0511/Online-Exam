import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import ThemeToggle from '@/components/ThemeToggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

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
        {
            id: 'exam-monitoring',
            navigation: 'exam-monitoring',
            label: 'Monitoring',
            icon: MonitorPlay,
            description: 'Real-time exam monitoring',
        },
        {
            id: 'view-results',
            navigation: 'view-results',
            label: 'Results',
            icon: ScrollText,
            description: 'View Results',
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
            navigation: 'examiner-submissions',
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/50">
            {/* Logo Section */}
            <div className={cn(
                "flex items-center h-16 px-4 border-b border-border/50 transition-all duration-300",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <div className={cn(
                    "flex items-center gap-3 overflow-hidden transition-all duration-300",
                    isCollapsed ? "w-8" : "w-full"
                )}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                        <Image src='/logo3.png' alt='logo' width={24} height={24} className="w-6 h-6" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 truncate">
                            SysRank
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className={cn("space-y-1 transition-all duration-300", isCollapsed ? "px-2" : "px-3")}>
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
                                        "flex items-center w-full justify-start h-10 font-medium transition-all duration-200 rounded-lg group",
                                        isCollapsed ? "px-2 justify-center" : "px-3",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-5 h-5 shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                                        !isCollapsed && "mr-3"
                                    )} />
                                    {!isCollapsed && (
                                        <span className="flex-1 text-left text-sm truncate">
                                            {item.label}
                                        </span>
                                    )}
                                    {!isCollapsed && isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary ml-2" />
                                    )}
                                </Link>

                                {/* Tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap border border-border shadow-lg animate-in fade-in slide-in-from-left-1 duration-200">
                                        {item.label}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User Section */}
            <div className={cn(
                "border-t border-border/50 p-3 transition-all duration-300",
                isCollapsed ? "px-2" : "px-3"
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
                                    "w-full h-auto p-2 hover:bg-muted/50 rounded-lg transition-all duration-200",
                                    isCollapsed && "justify-center"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center gap-3 w-full",
                                    isCollapsed && "gap-0 justify-center"
                                )}>
                                    <Avatar className="w-8 h-8 border border-border/50 ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                                        <AvatarImage src={userData.userImage || undefined} alt={userData.userName} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                            {userData.userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {userData.userName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {userData.userEmail}
                                            </p>
                                        </div>
                                    )}
                                    {!isCollapsed && (
                                        <Settings className="w-4 h-4 text-muted-foreground opacity-50" />
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? "start" : "end"} side={isCollapsed ? "right" : "top"} className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{userData.userName}</p>
                                    <p className="text-xs text-muted-foreground">{userData.userEmail}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out",
                    desktopSidebarCollapsed ? "lg:w-20" : "lg:w-64"
                )}
            >
                <SidebarContent isCollapsed={desktopSidebarCollapsed} />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="p-0 w-72 border-r border-border/50">
                    <SidebarContent isCollapsed={false} />
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
                                    role === 'examiner' ? "bg-blue-500" : "bg-green-500"
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
    );
}
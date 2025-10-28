import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Menu,
    BarChart3,
    PlusCircle,
    FileText,
    LogOut,
    Settings,
    LineChart,
    ScrollText,
    ClipboardList,
    FilePlus2,
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

interface MenuItem {
    id: string;
    navigation: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
}

const menuItems: MenuItem[] = [
    {
        id: 'CreateExam',
        navigation: 'index',
        label: 'Create Exam',
        icon: FilePlus2,
        description: 'Create a new exam',
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
];

interface ExaminerLayoutProps {
    children: React.ReactNode;
}

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

export default function ExaminerLayout({ children }: ExaminerLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
    const { data: session, status } = useSession();

    // Memoize current page calculation
    const currentPageId = useMemo(() => {
        const pathname = router.pathname;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        if (lastSegment === 'examiner' || lastSegment === '' || lastSegment === 'index') {
            return 'CreateExam';
        }

        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : 'CreateExam';
    }, [router.pathname]);

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
            ? '/dashboard/examiner'
            : `/dashboard/examiner/${item.navigation}`;
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
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
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
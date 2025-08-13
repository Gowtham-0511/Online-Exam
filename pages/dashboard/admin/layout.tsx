import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Menu,
    LogOut,
    User,
    Settings,
    Bell,
    Search,
    ChevronRight,
    BarChart3,
    Users,
    FileText,
    Building2,
    Brain,
    HelpCircle,
    TrendingUp,
    Home,
    X,
    ChevronLeft
} from 'lucide-react';

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
        id: 'overview',
        navigation: 'index',
        label: 'Overview',
        icon: Home,
        description: 'Dashboard overview'
    },
    {
        id: 'users',
        navigation: 'user-management',
        label: 'User Management',
        icon: Users,
        description: 'Manage all users',
        badge: '12'
    },
    {
        id: 'exams',
        navigation: 'exams',
        label: 'Exams',
        icon: Building2,
        description: 'Manage all exams'
    },
    {
        id: 'skillsets',
        navigation: 'skillset-config',
        label: 'Skillset Config',
        icon: Brain,
        description: 'Map skills to jobs'
    },
    {
        id: 'questions',
        navigation: 'question-bank',
        label: 'Questions',
        icon: HelpCircle,
        description: 'Manage questions'
    },
    {
        id: 'analytics',
        navigation: 'analytics',
        label: 'Analytics',
        icon: TrendingUp,
        description: 'View insights',
        badge: 'New'
    }
];

interface AdminLayoutProps {
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

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
    const { data: session, status } = useSession();

    const getCurrentPageId = () => {
        const pathname = router.pathname;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        if (lastSegment === 'admin' || lastSegment === 'index') {
            return 'overview';
        }

        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : 'overview';
    };

    const currentPageId = getCurrentPageId();

    const handleNavigation = (item: MenuItem) => {
        const targetPath = item.navigation === 'index'
            ? '/dashboard/admin'
            : `/dashboard/admin/${item.navigation}`;
        router.push(targetPath);
        setSidebarOpen(false);
    };

    const handleSignOut = async () => {
        await signOut({
            callbackUrl: '/login'
        });
    };

    const toggleDesktopSidebar = () => {
        setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
    };

    const userName = getDisplayName(session);
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image || null;
    const userInitials = getUserInitials(userName);

    const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <div className={cn(
                "p-6 border-b border-slate-200 dark:border-slate-700 transition-all duration-300",
                isCollapsed ? "px-3" : ""
            )}>
                <div className={cn(
                    "flex items-center transition-all duration-300",
                    isCollapsed ? "justify-center" : "space-x-3"
                )}>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="transition-opacity duration-300">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                SysRank
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Admin Portal</p>
                        </div>
                    )}
                </div>
            </div>

            <ScrollArea className={cn(
                "flex-1 py-6 transition-all duration-300",
                isCollapsed ? "px-2" : "px-4"
            )}>
                <div className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = currentPageId === item.id;
                        const Icon = item.icon;

                        return (
                            <div key={item.id} className="relative group">
                                <Button
                                    variant={isActive ? "default" : "ghost"}
                                    className={cn(
                                        "w-full h-12 mb-1 group transition-all duration-200",
                                        isCollapsed
                                            ? "justify-center px-3"
                                            : "justify-start px-4",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    )}
                                    onClick={() => handleNavigation(item)}
                                >
                                    <Icon className={cn(
                                        "w-5 h-5 transition-colors flex-shrink-0",
                                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300",
                                        !isCollapsed ? "mr-3" : ""
                                    )} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 text-left font-medium">{item.label}</span>
                                            {isActive && (
                                                <ChevronRight className="w-4 h-4 ml-2 text-white" />
                                            )}
                                        </>
                                    )}
                                </Button>

                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                                        {item.label}
                                        {item.badge && (
                                            <span className="ml-1 px-1 py-0.5 bg-blue-600 text-white rounded text-xs">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className={cn(
                "p-4 border-t border-slate-200 dark:border-slate-700 transition-all duration-300",
                isCollapsed ? "px-2" : ""
            )}>
                {status === 'loading' ? (
                    <div className={cn(
                        "flex items-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all duration-300",
                        isCollapsed ? "justify-center space-x-0" : "space-x-3"
                    )}>
                        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                        {!isCollapsed && (
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={cn(
                        "flex items-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all duration-300",
                        isCollapsed ? "justify-center space-x-0" : "space-x-3"
                    )}>
                        <Avatar className="w-10 h-10 ring-2 ring-blue-600/20 flex-shrink-0">
                            <AvatarImage src={userImage || undefined} alt={userName} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {userName}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {userEmail}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className={cn(
                "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 z-30",
                desktopSidebarCollapsed ? "lg:w-20" : "lg:w-72"
            )}>
                <SidebarContent isCollapsed={desktopSidebarCollapsed} />

            </div>

            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="p-0 w-72">
                    <SidebarContent isCollapsed={false} />
                </SheetContent>
            </Sheet>

            <div className={cn(
                "transition-all duration-300",
                desktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
            )}>
                <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden lg:flex hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={toggleDesktopSidebar}
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {menuItems.find(item => item.id === currentPageId)?.label || 'Dashboard'}
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {menuItems.find(item => item.id === currentPageId)?.description || 'Welcome back'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

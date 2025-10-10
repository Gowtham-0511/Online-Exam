import { useState } from 'react';
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
    ChevronRight,
    BarChart3,
    PlusCircle,
    FileText,
    LogOut,
    User,
    Settings
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { signOut } from 'next-auth/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        id: 'Home',
        navigation: 'index',
        label: 'Home',
        icon: PlusCircle,
        description: '',
    },
    {
        id: 'ViewExams',
        navigation: 'view-exams',
        label: 'View Exams',
        icon: FileText,
        description: 'View all exams',
    },
    // {
    //     id: 'viewResults',
    //     navigation: 'examiner-submissions',
    //     label: 'View Results',
    //     icon: BarChart3,
    //     description: 'View exam results',
    // }
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

export default function AttenderLayout({ children }: ExaminerLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
    const { data: session, status } = useSession();

    const getCurrentPageId = () => {
        const pathname = router.pathname;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        console.log(lastSegment);

        if (lastSegment === 'attender' || lastSegment === 'index') {
            return 'Home';
        }

        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : 'overview';
    };

    const currentPageId = getCurrentPageId();

    const handleNavigation = (item: MenuItem) => {
        const targetPath = item.navigation === 'index'
            ? '/dashboard/attender'
            : `/dashboard/attender/${item.navigation}`;
        router.push(targetPath);
        setSidebarOpen(false);
    };

    const toggleDesktopSidebar = () => {
        setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
    };

    const userName = getDisplayName(session);
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image || null;
    const userInitials = getUserInitials(userName);

    const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
        <div className="flex flex-col h-full">
            <div className={cn(
                "p-6 border-b transition-all duration-300",
                isCollapsed ? "px-3" : ""
            )}>
                <div className={cn(
                    "flex items-center transition-all duration-300",
                    isCollapsed ? "justify-center" : "space-x-3"
                )}>
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="transition-opacity duration-300">
                            <h2 className="text-xl font-bold text-primary bg-clip-text">
                                SysRank
                            </h2>
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
                                            ? "bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
                                            : "hover:bg-accent text-foreground"
                                    )}
                                    onClick={() => handleNavigation(item)}
                                >
                                    <Icon className={cn(
                                        "w-5 h-5 transition-colors flex-shrink-0",
                                        isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground",
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
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border">
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

            {/* <div className={cn(
                "p-4 border-t transition-all duration-300",
                isCollapsed ? "px-2" : ""
            )}>
                {status === 'loading' ? (
                    <div className={cn(
                        "flex items-center p-3 rounded-xl bg-muted transition-all duration-300",
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
                    <div className="space-y-2">
                        <div className={cn(
                            "flex items-center p-3 rounded-xl bg-muted transition-all duration-300",
                            isCollapsed ? "justify-center space-x-0" : "space-x-3"
                        )}>
                            <Avatar className="w-10 h-10 ring-2 ring-blue-600/20 flex-shrink-0">
                                <AvatarImage src={userImage || undefined} alt={userName} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {userName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {userEmail}
                                    </p>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full transition-all duration-200 hover:bg-destructive/10 hover:text-destructive",
                                isCollapsed ? "justify-center px-3" : "justify-start px-4"
                            )}
                            onClick={() => signOut({ callbackUrl: '/' })}
                        >
                            <LogOut className={cn(
                                "w-4 h-4",
                                !isCollapsed ? "mr-3" : ""
                            )} />
                            {!isCollapsed && <span>Sign Out</span>}
                        </Button>
                    </div>
                )}
            </div> */}

            <div className={cn(
                "p-4 border-t transition-all duration-300",
                isCollapsed ? "px-2" : ""
            )}>
                {status === 'loading' ? (
                    <div className={cn(
                        "flex items-center p-3 rounded-xl bg-muted transition-all duration-300",
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center p-3 rounded-xl bg-muted hover:bg-muted/80 transition-all duration-300 w-full cursor-pointer",
                                isCollapsed ? "justify-center space-x-0" : "space-x-3"
                            )}>
                                <Avatar className="w-10 h-10 ring-2 ring-primary/20 flex-shrink-0">
                                    <AvatarImage src={userImage || undefined} alt={userName} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {userName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {userEmail}
                                        </p>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56"
                            side={isCollapsed ? "right" : "top"}
                        >
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{userName}</p>
                                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {/* <DropdownMenuItem className="cursor-pointer">
                                <User className="w-4 h-4 mr-2" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem> */}
                            {/* <DropdownMenuSeparator /> */}
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => signOut({ callbackUrl: '/' })}
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

    return (
        <div className="min-h-screen bg-background">
            <div className={cn(
                "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 z-30 bg-card border-r",
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
                <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                    <div className="flex items-center justify-between px-6 py-4">

                        {/* Left side */}
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden hover:bg-accent"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden lg:flex hover:bg-accent"
                                onClick={toggleDesktopSidebar}
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    {menuItems.find(item => item.id === currentPageId)?.label || 'Dashboard'}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {menuItems.find(item => item.id === currentPageId)?.description || 'Welcome back'}
                                </p>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
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
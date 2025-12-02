import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { ClipboardCheck, ClipboardList, Clock, FilePlus2, HelpCircle, KeyRound, Layers, LayoutDashboard, LineChart, ListChecks, LogOut, MonitorPlay, ScrollText, Settings, ShieldCheck, Target, Trophy, Users, UserCircle, Users2, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useMemo, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface MenuItem {
    id: string;
    navigation: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
}

export type UserRole = 'admin' | 'organizer' | 'attender';

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
            id: 'Home',
            navigation: 'index',
            label: 'Home',
            icon: LayoutDashboard,
            description: 'Home',
        },
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
            icon: LayoutDashboard,
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
    organizer: 'Home',
    attender: 'Home',
};

interface SidebarProps {
    isCollapsed?: boolean;
    setDesktopSidebarCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
    setSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar = ({ isCollapsed = false, setDesktopSidebarCollapsed, setSidebarOpen }: SidebarProps) => {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    // Determine role from URL path first, fallback to session role
    const role = useMemo(() => {
        if (pathname) {
            const segments = pathname.split('/').filter(Boolean);
            const pathRole = segments[0] as UserRole;
            if (pathRole === 'admin' || pathRole === 'organizer' || pathRole === 'attender') {
                return pathRole;
            }
        }
        return (session?.user as any)?.role as UserRole || 'attender';
    }, [pathname, session]);

    const userData = useMemo(() => ({
        userName: session?.user?.name || 'User',
        userEmail: session?.user?.email || '',
        userImage: session?.user?.image || '',
        userInitials: session?.user?.name
            ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U'
    }), [session]);

    const menuItems = useMemo(() => ROLE_MENUS[role] || [], [role]);
    const defaultPageId = useMemo(() => ROLE_DEFAULT_PAGES[role] || '', [role]);

    const currentPageId = useMemo(() => {
        if (!pathname) return defaultPageId;

        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        if (lastSegment === role || lastSegment === 'index' || lastSegment === '') {
            return defaultPageId;
        }

        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : defaultPageId;
    }, [pathname, role, menuItems, defaultPageId]);

    const closeMobileSidebar = useCallback(() => {
        if (setSidebarOpen) {
            setSidebarOpen(false);
        }
    }, [setSidebarOpen]);

    const getHref = useCallback((item: MenuItem) => {
        return item.navigation === 'index'
            ? `/${role}`
            : `/${role}/${item.navigation}`;
    }, [role]);

    const handleSignOut = useCallback(async () => {
        await signOut({
            callbackUrl: '/',
            redirect: true
        });
    }, []);

    // Get user's actual role from session (not the current path role)
    const userSessionRole = useMemo(() => {
        return (session?.user as any)?.role as UserRole || 'attender';
    }, [session]);

    // Determine which roles the user can access based on their session role
    const accessibleRoles = useMemo(() => {
        const roleHierarchy: Record<UserRole, UserRole[]> = {
            admin: ['admin', 'organizer', 'attender'],
            organizer: ['organizer', 'attender'],
            attender: ['attender']
        };
        return roleHierarchy[userSessionRole] || ['attender'];
    }, [userSessionRole]);

    // Helper to get role display info
    const getRoleInfo = useCallback((roleType: UserRole) => {
        const roleConfig = {
            admin: {
                label: 'Admin',
                icon: ShieldCheck,
                color: 'text-red-500',
                bgColor: 'bg-red-500/10',
                description: 'Full system access'
            },
            organizer: {
                label: 'Organizer',
                icon: Users2,
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10',
                description: 'Manage exams & results'
            },
            attender: {
                label: 'Attender',
                icon: UserCircle,
                color: 'text-green-500',
                bgColor: 'bg-green-500/10',
                description: 'Take exams & view results'
            }
        };
        return roleConfig[roleType];
    }, []);

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/20 border-r border-border/40 overflow-hidden relative">
            {/* Ambient gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

            {/* Logo Section */}
            <div className={cn(
                "relative flex items-center h-16 px-4 border-b border-border/40 bg-card/30 backdrop-blur-sm transition-all duration-300",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <div className={cn(
                    "flex items-center gap-3 overflow-hidden transition-all duration-300",
                    isCollapsed ? "w-10" : "w-full"
                )}>
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 shrink-0 group-hover:shadow-primary/30 transition-shadow">
                        <Image
                            src='/logo3.png'
                            alt='logo'
                            width={24}
                            height={24}
                            className="w-6 h-6 relative z-10"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 truncate leading-tight">
                                SysRank
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                {role}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Switcher - Only show if user has access to multiple roles */}
            {accessibleRoles.length > 1 && (
                <div className={cn(
                    "relative border-b border-border/40 transition-all duration-300",
                    isCollapsed ? "px-2 py-3" : "px-3 py-3"
                )}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-between h-auto transition-all duration-200 hover:bg-muted/60",
                                    isCollapsed ? "px-2 py-2" : "px-3 py-2.5"
                                )}
                            >
                                {isCollapsed ? (
                                    <div className="flex items-center justify-center w-full">
                                        {React.createElement(getRoleInfo(role).icon, {
                                            className: cn("w-5 h-5", getRoleInfo(role).color)
                                        })}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2.5">
                                            {React.createElement(getRoleInfo(role).icon, {
                                                className: cn("w-4 h-4", getRoleInfo(role).color)
                                            })}
                                            <div className="flex flex-col items-start">
                                                <span className="text-xs font-medium text-foreground">
                                                    {getRoleInfo(role).label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Switch Dashboard
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align={isCollapsed ? "start" : "center"}
                            side={isCollapsed ? "right" : "bottom"}
                            className="w-56"
                        >
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Switch Dashboard
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {accessibleRoles.map((roleType) => {
                                const roleInfo = getRoleInfo(roleType);
                                const RoleIcon = roleInfo.icon;
                                const isCurrentRole = roleType === role;

                                return (
                                    <DropdownMenuItem
                                        key={roleType}
                                        asChild
                                        className="cursor-pointer"
                                    >
                                        <Link
                                            href={`/${roleType}`}
                                            onClick={closeMobileSidebar}
                                            className={cn(
                                                "flex items-center gap-3 py-2.5",
                                                isCurrentRole && "bg-muted"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center w-8 h-8 rounded-lg",
                                                roleInfo.bgColor
                                            )}>
                                                <RoleIcon className={cn("w-4 h-4", roleInfo.color)} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-medium">
                                                    {roleInfo.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {roleInfo.description}
                                                </span>
                                            </div>
                                            {isCurrentRole && (
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Navigation */}
            <ScrollArea className="flex-1 py-6 relative">
                <nav className={cn("space-y-1.5 transition-all duration-300", isCollapsed ? "px-2" : "px-3")}>
                    {menuItems.map((item, index) => {
                        const isActive = currentPageId === item.id;
                        const isHovered = hoveredItem === item.id;
                        const Icon = item.icon;
                        const href = getHref(item);

                        return (
                            <div
                                key={item.id}
                                className="relative group"
                                onMouseEnter={() => setHoveredItem(item.id)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                    animationDelay: `${index * 30}ms`
                                }}
                            >
                                <Link
                                    href={href}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                        "relative flex items-center w-full h-11 font-medium transition-all duration-300 rounded-xl overflow-hidden",
                                        isCollapsed ? "px-0 justify-center" : "px-3.5",
                                        isActive
                                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-sm shadow-primary/10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-primary via-primary to-primary/50 rounded-r-full shadow-lg shadow-primary/30" />
                                    )}

                                    {/* Icon container with background effect */}
                                    <div className={cn(
                                        "relative flex items-center justify-center rounded-lg transition-all duration-300",
                                        isCollapsed ? "w-10 h-10" : "w-9 h-9",
                                        isActive && "bg-primary/10",
                                        !isActive && isHovered && "bg-muted"
                                    )}>
                                        <Icon className={cn(
                                            "w-5 h-5 shrink-0 transition-all duration-300",
                                            isActive && "text-primary scale-110",
                                            !isActive && "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
                                        )} />
                                    </div>

                                    {!isCollapsed && (
                                        <span className="flex-1 text-left text-[13px] font-medium truncate ml-3">
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Hover gradient effect */}
                                    {!isActive && isHovered && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 pointer-events-none" />
                                    )}
                                </Link>

                                {/* Enhanced tooltip for collapsed state */}
                                {isCollapsed && (
                                    <div className={cn(
                                        "absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium rounded-lg border border-border shadow-xl opacity-0 pointer-events-none z-50 whitespace-nowrap transition-all duration-200",
                                        isHovered && "opacity-100 translate-x-0",
                                        !isHovered && "-translate-x-1"
                                    )}>
                                        <div className="font-semibold">{item.label}</div>
                                        {item.description && (
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                {item.description}
                                            </div>
                                        )}
                                        {/* Tooltip arrow */}
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover/95" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* User Section */}
            <div className={cn(
                "relative border-t border-border/40 p-3 bg-card/30 backdrop-blur-sm transition-all duration-300",
                isCollapsed ? "px-2" : "px-3"
            )}>
                {status === 'loading' ? (
                    <div className={cn(
                        "flex items-center gap-3",
                        isCollapsed && "justify-center"
                    )}>
                        <Skeleton className="w-10 h-10 rounded-full" />
                        {!isCollapsed && (
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-3 w-36" />
                            </div>
                        )}
                    </div>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full h-auto p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 group",
                                    isCollapsed && "justify-center"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center gap-3 w-full",
                                    isCollapsed && "gap-0 justify-center"
                                )}>
                                    <div className="relative">
                                        <Avatar className="w-10 h-10 border-2 border-border/50 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-md">
                                            <AvatarImage src={userData.userImage || undefined} alt={userData.userName} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold">
                                                {userData.userInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Online status indicator */}
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                                    </div>
                                    {!isCollapsed && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                                {userData.userName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {userData.userEmail}
                                            </p>
                                        </div>
                                    )}
                                    {!isCollapsed && (
                                        <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? "start" : "end"} side={isCollapsed ? "right" : "top"} className="w-64">
                            <DropdownMenuLabel>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border-2 border-border">
                                        <AvatarImage src={userData.userImage || undefined} alt={userData.userName} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                                            {userData.userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-semibold">{userData.userName}</p>
                                        <p className="text-xs text-muted-foreground">{userData.userEmail}</p>
                                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary w-fit">
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer py-2.5">
                                <Settings className="w-4 h-4 mr-3" />
                                Settings & Preferences
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 py-2.5"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-3" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
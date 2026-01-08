import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
    ClipboardCheck, ClipboardList, Clock, FilePlus2, HelpCircle, KeyRound,
    Layers, LayoutDashboard, LineChart, ListChecks, LogOut, MonitorPlay,
    ScrollText, Settings, ShieldCheck, Target, Trophy, Users, UserCircle,
    Users2, ChevronDown, Command, Check, FileText
} from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMsal } from "@azure/msal-react";
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Register GSAP plugin
if (typeof window !== 'undefined') {
    gsap.registerPlugin(useGSAP);
}

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
        { id: 'overview', navigation: 'index', label: 'Overview', icon: LayoutDashboard, description: 'Dashboard overview' },
        { id: 'candidate-management', navigation: 'user-management', label: 'Candidates', icon: Users, description: 'Manage Candidates' },
        { id: 'system-user-management', navigation: 'system-user-management', label: 'System Users', icon: ShieldCheck, description: 'Manage System Users' },
        { id: 'questions', navigation: 'question-bank', label: 'Question Bank', icon: HelpCircle, description: 'Manage questions' },
        { id: 'batchManagement', navigation: 'batch-management', label: 'Batches', icon: Layers, description: 'Manage batch' },
        { id: 'assessmentManagement', navigation: 'assessment-management', label: 'Assessments', icon: ClipboardCheck, description: 'Create and Manage Assessment' },
        { id: 'credentialManagement', navigation: 'credential-management', label: 'Credentials', icon: KeyRound, description: 'Manage all Credentials' },
        { id: 'view-results', navigation: 'view-results', label: 'Results', icon: ScrollText, description: 'View Results' },
        { id: 'logs', navigation: 'logs', label: 'System Logs', icon: FileText, description: 'View System Logs' },
    ],
    organizer: [
        { id: 'Home', navigation: 'index', label: 'Home', icon: LayoutDashboard, description: 'Home' },
        { id: 'CreateExam', navigation: 'create-exam', label: 'Create Exam', icon: FilePlus2, description: 'Create a new exam' },
        { id: 'schedule', navigation: 'schedule', label: 'Schedule', icon: Clock, description: 'Schedule a new exam' },
        { id: 'ViewExams', navigation: 'view-exams', label: 'My Exams', icon: ClipboardList, description: 'View all exams' },
        { id: 'viewResults', navigation: 'organizer-submissions', label: 'Submissions', icon: ScrollText, description: 'View exam results' },
        { id: 'ExamAnalytics', navigation: 'ExamAnalytics', label: 'Analytics', icon: LineChart, description: 'Analyze exam results' }
    ],
    attender: [
        { id: 'Home', navigation: 'index', label: 'Home', icon: LayoutDashboard, description: '' },
        { id: 'ExamResults', navigation: 'exam-results', label: 'My Results', icon: Trophy, description: 'View all results' },
        { id: 'practice', navigation: 'practice', label: 'Practice', icon: Target, description: 'Practice your personalized questions' },
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
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const pathname = usePathname();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const navItemsRef = useRef<(HTMLDivElement | null)[]>([]); // Ref array for menu items

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [dbRole, setDbRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (session?.username) {
                try {
                    const res = await fetch('/api/users/get-or-create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: session.username,
                            name: session.name
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setDbRole(data.role as UserRole);
                    }
                } catch (error) {
                    console.error('Failed to fetch user role:', error);
                }
            }
        };

        fetchUserRole();
    }, [session]);

    const [avatarUrl, setAvatarUrl] = useState<string>('');

    useEffect(() => {
        const fetchProfilePhoto = async () => {
            if (!session || !instance) return;
            try {
                const request = {
                    scopes: ["User.Read"],
                    account: session
                };
                const tokenResponse = await instance.acquireTokenSilent(request);

                const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                    headers: { Authorization: `Bearer ${tokenResponse.accessToken}` }
                });

                if (graphResponse.ok) {
                    const blob = await graphResponse.blob();
                    const url = URL.createObjectURL(blob);
                    setAvatarUrl(url);
                }
            } catch (err) {
                console.debug("Could not fetch profile photo:", err);
            }
        };

        fetchProfilePhoto();
    }, [session, instance]);

    // Helper to determine active role based on URL
    const getCurrentRoleFromPath = useCallback(() => {
        if (!pathname) return null;
        const segments = pathname.split('/').filter(Boolean);
        const pathRole = segments[0] as UserRole;
        if (['admin', 'organizer', 'attender'].includes(pathRole)) {
            return pathRole;
        }
        return null;
    }, [pathname]);

    const activeRole = useMemo(() => {
        const sessionRole = dbRole || ((session?.username) ? (session as any).idTokenClaims?.roles?.[0] : 'attender');
        return (getCurrentRoleFromPath() || sessionRole || 'attender') as UserRole;
    }, [getCurrentRoleFromPath, session, dbRole]);



    const userSessionRole = useMemo(() => {
        // Prefer DB role if fetched, otherwise fallback to token claims or default
        if (dbRole) return dbRole;
        const role = (session?.username) ? (session as any).idTokenClaims?.roles?.[0] : 'attender';
        return (role || 'attender') as UserRole;
    }, [session, dbRole]);

    // Determine accessible roles based on hierarchy
    const accessibleRoles = useMemo(() => {
        const roleHierarchy: Record<UserRole, UserRole[]> = {
            admin: ['admin', 'organizer', 'attender'],
            organizer: ['organizer', 'attender'],
            attender: ['attender']
        };
        return roleHierarchy[userSessionRole] || ['attender'];
    }, [userSessionRole]);

    const menuItems = useMemo(() => ROLE_MENUS[activeRole] || [], [activeRole]);
    const defaultPageId = useMemo(() => ROLE_DEFAULT_PAGES[activeRole] || '', [activeRole]);

    // Active item logic
    const currentPageId = useMemo(() => {
        if (!pathname) return defaultPageId;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];
        if (lastSegment === activeRole || lastSegment === 'index' || lastSegment === '') return defaultPageId;
        const currentItem = menuItems.find(item => item.navigation === lastSegment);
        return currentItem ? currentItem.id : defaultPageId;
    }, [pathname, activeRole, menuItems, defaultPageId]);

    // Role Config for Styles
    const ROLE_CONFIG = {
        admin: { label: 'Admin', icon: ShieldCheck, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500/20' },
        organizer: { label: 'Organizer', icon: Users2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/20' },
        attender: { label: 'Candidate', icon: UserCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/20' }
    };

    // GSAP Animations
    useGSAP(() => {
        if (!mounted || !containerRef.current) return;

        // Animate Sidebar Container on mount
        gsap.fromTo(containerRef.current,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
        );

        // Stagger animate menu items
        if (navItemsRef.current.length > 0) {
            gsap.fromTo(navItemsRef.current.filter(Boolean),
                { opacity: 0, x: -10 },
                { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, delay: 0.2, ease: 'power2.out' }
            );
        }
    }, [mounted, activeRole]); // Re-run when role changes to animate new menu items

    const handleRoleSwitch = (newRole: UserRole) => {
        if (setSidebarOpen) setSidebarOpen(false);
        router.push(`/${newRole}`);
    };

    const handleSignOut = async () => {
        await instance.logoutRedirect();
    };

    const getHref = (item: MenuItem) => item.navigation === 'index' ? `/${activeRole}` : `/${activeRole}/${item.navigation}`;

    if (!mounted) return <Skeleton className="w-full h-full" />;

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border text-sidebar-foreground relative overflow-hidden"
        >
            {/* Logo & Role Switcher Area */}
            <div className="h-16 flex items-center px-4 border-b border-sidebar-border/50 bg-gradient-to-r from-sidebar-accent/50 to-transparent">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={accessibleRoles.length <= 1}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full flex items-center gap-3 hover:bg-sidebar-accent/50 transition-all duration-200 px-2",
                                isCollapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            {/* Logo */}
                            <div className="relative shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <Image src="/syslogo.png" alt="SysRank" width={30} height={30} className="w-6 h-6 drop-shadow-md" />
                            </div>

                            {/* Role Label / Switcher Indicator */}
                            {!isCollapsed && (
                                <div className="flex flex-col items-start overflow-hidden flex-1">
                                    <span className="font-bold text-sm tracking-tight">SysRank</span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                        <span>{ROLE_CONFIG[activeRole].label}</span>
                                        {accessibleRoles.length > 1 && <ChevronDown className="w-3 h-3 opacity-70" />}
                                    </div>
                                </div>
                            )}
                        </Button>
                    </DropdownMenuTrigger>

                    {/* HackerRank Style Role Switcher Content */}
                    {accessibleRoles.length > 1 && (
                        <DropdownMenuContent className="w-60 p-2" align="start" sideOffset={8}>
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">
                                Switch Context
                            </DropdownMenuLabel>

                            <DropdownMenuGroup className="space-y-1">
                                {accessibleRoles.map((role) => {
                                    const config = ROLE_CONFIG[role];
                                    const isActive = activeRole === role;
                                    return (
                                        <DropdownMenuItem
                                            key={role}
                                            onClick={() => handleRoleSwitch(role)}
                                            className={cn(
                                                "cursor-pointer p-2 rounded-lg flex items-center gap-3 transition-colors",
                                                isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                                            )}
                                        >
                                            <div className={cn("p-1.5 rounded-md transition-colors", isActive ? "bg-background shadow-sm" : "bg-muted/50", config.color)}>
                                                <config.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{config.label}</div>
                                                <div className="text-[10px] text-muted-foreground">Access {config.label} Dashboard</div>
                                            </div>
                                            {isActive && <Check className="w-4 h-4 text-primary ml-auto" />}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    )}
                </DropdownMenu>
            </div>

            {/* Navigation Menu */}
            <ScrollArea className="flex-1 py-4">
                <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
                    {menuItems.map((item, index) => {
                        const isActive = currentPageId === item.id;
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.id}
                                ref={el => { navItemsRef.current[index] = el }}
                                className="group relative"
                            >
                                <Link
                                    href={getHref(item)}
                                    onClick={() => setSidebarOpen?.(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group-hover:bg-sidebar-accent/50",
                                        isActive
                                            ? "bg-sidebar-accent text-primary shadow-sm ring-1 ring-border/50"
                                            : "text-muted-foreground hover:text-foreground",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                >
                                    {/* Icon */}
                                    <div className={cn(
                                        "relative shrink-0 transition-all duration-300",
                                        isActive ? "text-primary scale-110 drop-shadow-sm" : "group-hover:text-foreground group-hover:scale-105"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                        {isActive && <div className="absolute inset-0 bg-primary/20 blur-md rounded-full -z-10" />}
                                    </div>

                                    {/* Label */}
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "font-medium text-sm tracking-tight truncate transition-colors",
                                            isActive ? "font-semibold" : ""
                                        )}>
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Active Indicators */}
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-primary rounded-r-md shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    )}
                                </Link>

                                {/* Collapsed Tooltip */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                                        {item.label}
                                        {/* Little Arrow */}
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer / User Profile */}
            <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/5 mt-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full h-auto p-2 hover:bg-background/80 hover:shadow-sm border border-transparent hover:border-border transition-all duration-200",
                                isCollapsed ? "justify-center" : "justify-start gap-3"
                            )}
                        >
                            <Avatar className="w-9 h-9 border border-border bg-background shadow-sm shrink-0">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {session?.name?.slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>

                            {!isCollapsed && (
                                <div className="flex flex-col items-start overflow-hidden text-left flex-1">
                                    <span className="text-sm font-semibold truncate w-full">{session?.name}</span>
                                    <span className="text-[10px] text-muted-foreground truncate w-full">{session?.username}</span>
                                </div>
                            )}

                            {!isCollapsed && <Settings className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isCollapsed ? "start" : "center"} side="top" className="w-56 mb-2">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

export default Sidebar;
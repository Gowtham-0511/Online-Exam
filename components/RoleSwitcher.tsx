import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { canAccessRole, UserRole, ROLE_HIERARCHY } from '@/lib/authUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Shield, UserCog, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSwitcherProps {
    currentRole: 'admin' | 'examiner' | 'attender';
}

const ROLE_CONFIG = {
    admin: {
        label: 'Admin Dashboard',
        icon: Shield,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        path: '/dashboard/admin'
    },
    examiner: {
        label: 'Examiner Dashboard',
        icon: UserCog,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        path: '/dashboard/examiner'
    },
    attender: {
        label: 'Attender Dashboard',
        icon: GraduationCap,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        path: '/dashboard/attender'
    }
};

export default function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
    const router = useRouter();
    const { data: session } = useSession();

    if (!session?.user?.role) return null;

    const userRole = session.user.role as UserRole;

    console.log(userRole);

    // Get all roles the user can access
    const accessibleRoles = Object.keys(ROLE_HIERARCHY)
        .filter(role => {
            // Filter out super_admin from the switcher (it's not a dashboard)
            if (role === 'super_admin') return false;
            return canAccessRole(userRole, role as UserRole);
        }) as Array<'admin' | 'examiner' | 'attender'>;

    // If user can only access one role, don't show the switcher
    if (accessibleRoles.length <= 1) return null;

    const CurrentIcon = ROLE_CONFIG[currentRole].icon;

    const handleRoleSwitch = (role: 'admin' | 'examiner' | 'attender') => {
        if (role !== currentRole) {
            router.push(ROLE_CONFIG[role].path);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "gap-2 border-border/50 hover:bg-muted/50",
                        ROLE_CONFIG[currentRole].bgColor
                    )}
                >
                    <CurrentIcon className={cn("h-4 w-4", ROLE_CONFIG[currentRole].color)} />
                    <span className="hidden md:inline text-sm font-medium">
                        {ROLE_CONFIG[currentRole].label}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Switch Dashboard
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accessibleRoles.map((role) => {
                    const config = ROLE_CONFIG[role];
                    const Icon = config.icon;
                    const isActive = role === currentRole;

                    return (
                        <DropdownMenuItem
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className={cn(
                                "cursor-pointer gap-3",
                                isActive && "bg-muted"
                            )}
                            disabled={isActive}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-md",
                                config.bgColor
                            )}>
                                <Icon className={cn("h-4 w-4", config.color)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">{config.label}</span>
                                {isActive && (
                                    <span className="text-xs text-muted-foreground">Current</span>
                                )}
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

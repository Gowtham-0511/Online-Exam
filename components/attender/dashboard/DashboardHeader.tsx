import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';

interface DashboardHeaderProps {
    userName?: string | null;
    isLoading: boolean;
    showRefreshButton: boolean;
    isRefreshing: boolean;
    refreshMessage?: {
        type: 'success' | 'error';
        text: string;
    } | null;
    onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userName,
    isLoading,
    showRefreshButton,
    isRefreshing,
    refreshMessage,
    onRefresh
}) => {
    if (isLoading) {
        return (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <Skeleton className="h-10 w-64 mb-2" />
                    <Skeleton className="h-6 w-96" />
                </div>
                <Skeleton className="h-10 w-48" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Welcome, {userName?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-muted-foreground text-lg mt-1">
                    Track your progress and prepare for upcoming assessments
                </p>
            </div>

            {showRefreshButton && (
                <div className="flex items-center gap-3">
                    {refreshMessage && (
                        <div className={`text-sm px-3 py-1.5 rounded-lg ${refreshMessage.type === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}>
                            {refreshMessage.text}
                        </div>
                    )}
                    <Button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        variant="outline"
                        className="gap-2"
                    >
                        <Icons.RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Insights'}
                    </Button>
                </div>
            )}
        </div>
    );
};
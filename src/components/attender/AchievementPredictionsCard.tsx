import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Trophy,
    Target,
    TrendingUp,
    Zap,
    Star,
    Award,
    Crown,
    Medal,
    Sparkles,
    Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AchievementProps = {
    achievements: {
        hasData: boolean;
        nextMilestones: Array<{
            type: string;
            current: number;
            target: number;
            progress: number;
            label: string;
            icon: string;
        }>;
        predictions: {
            nextHighScore: number;
            daysToNextMilestone: number;
            improvementRate: string;
        };
    } | null;
    isLoading: boolean;
};

export const AchievementPredictionsCard: React.FC<AchievementProps> = ({ achievements, isLoading }) => {

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!achievements?.hasData) {
        return <EmptyState />;
    }

    const { nextMilestones, predictions } = achievements;
    const primaryMilestone = nextMilestones[0];

    const getIcon = (iconName: string) => {
        const iconProps = { className: "h-3.5 w-3.5" };
        switch (iconName) {
            case 'trophy': return <Trophy {...iconProps} />;
            case 'target': return <Target {...iconProps} />;
            case 'trending-up': return <TrendingUp {...iconProps} />;
            case 'crown': return <Crown {...iconProps} />;
            case 'medal': return <Medal {...iconProps} />;
            default: return <Star {...iconProps} />;
        }
    };

    return (
        <Card className="border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md overflow-hidden shadow-sm flex flex-col h-full">

            {/* Header */}
            <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                        <Trophy className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Next Milestones</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Level Up Soon</span>
                </div>
            </div>

            <CardContent className="p-4 flex flex-col gap-4 h-full">

                {/* Primary Goal Target */}
                {primaryMilestone && (
                    <div className="relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                                <span className="p-1 rounded-md bg-primary/10 text-primary">
                                    {getIcon(primaryMilestone.icon)}
                                </span>
                                {primaryMilestone.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-primary">
                                {primaryMilestone.current}/{primaryMilestone.target}
                            </span>
                        </div>
                        <Progress value={primaryMilestone.progress} className="h-2 mb-1" />
                        <p className="text-[10px] text-muted-foreground text-right">
                            {primaryMilestone.progress}% completed
                        </p>
                    </div>
                )}

                {/* Secondary Goals (Compact List) */}
                <div className="space-y-2 flex-1">
                    {nextMilestones.slice(1, 3).map((milestone, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-2">
                                <div className="text-muted-foreground opacity-70">
                                    {getIcon(milestone.icon)}
                                </div>
                                <span className="text-[11px] font-medium text-foreground">{milestone.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-foreground/30 rounded-full" style={{ width: `${milestone.progress}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Predictions Footer */}
                <div className="grid grid-cols-2 gap-3 pt-2 mt-auto border-t border-border/40">
                    <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Est. Time
                        </span>
                        <div className="font-semibold text-sm">~{predictions.daysToNextMilestone} Days</div>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Pace
                        </span>
                        <div className="font-semibold text-sm text-emerald-500">+{predictions.improvementRate}%</div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};

const LoadingSkeleton = () => (
    <Card className="border-border/50 shadow-sm">
        <div className="p-4 border-b border-border/40 flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
        </div>
        <CardContent className="p-4 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-1/2" />
            </div>
        </CardContent>
    </Card>
);

const EmptyState = () => (
    <Card className="border-dashed border-2 border-muted bg-muted/5 shadow-none h-full flex flex-col justify-center min-h-[180px]">
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                <Medal className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-medium text-foreground">No milestones yet</p>
            <p className="text-[10px] text-muted-foreground max-w-[150px]">
                Start your journey to unlock achievements.
            </p>
        </div>
    </Card>
);
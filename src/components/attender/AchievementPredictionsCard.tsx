import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'trophy': return <Trophy className="h-4 w-4" />;
            case 'target': return <Target className="h-4 w-4" />;
            case 'trending-up': return <TrendingUp className="h-4 w-4" />;
            case 'crown': return <Crown className="h-4 w-4" />;
            case 'medal': return <Medal className="h-4 w-4" />;
            default: return <Star className="h-4 w-4" />;
        }
    };

    if (isLoading) {
        return (
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                    <Skeleton className="h-24 w-full rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    if (!achievements?.hasData) {
        return null;
    }

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/50 backdrop-blur-sm overflow-hidden group h-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy className="w-32 h-32 text-amber-500 -rotate-12 translate-x-8 -translate-y-8" />
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl ring-1 ring-amber-500/20">
                            <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Achievement Tracker</CardTitle>
                            <CardDescription className="text-xs font-medium mt-0.5">
                                Progress towards next milestones
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                        Beta
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10 pt-4">
                {/* Milestones */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Target className="w-3 h-3" />
                        Next Goals
                    </h4>
                    <div className="space-y-3">
                        {achievements.nextMilestones.slice(0, 3).map((milestone, idx) => (
                            <div key={idx} className="group/milestone p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-all duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover/milestone:scale-110 transition-transform">
                                            {getIcon(milestone.icon)}
                                        </div>
                                        <div>
                                            <span className="text-sm font-semibold text-foreground block">
                                                {milestone.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {milestone.current.toFixed(0)} / {milestone.target.toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-bold">
                                        {milestone.progress.toFixed(0)}%
                                    </Badge>
                                </div>
                                <Progress
                                    value={milestone.progress}
                                    className="h-1.5 bg-muted"
                                    indicatorClassName="bg-gradient-to-r from-primary to-primary/80"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Predictions Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 relative overflow-hidden group/pred">
                        <div className="absolute top-2 right-2 opacity-20 group-hover/pred:opacity-40 transition-opacity">
                            <Crown className="w-8 h-8 text-amber-500 -rotate-12" />
                        </div>
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Next High Score</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-bold text-foreground">
                                {achievements.predictions.nextHighScore.toFixed(0)}%
                            </p>
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Estimated potential</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 relative overflow-hidden group/pred">
                        <div className="absolute top-2 right-2 opacity-20 group-hover/pred:opacity-40 transition-opacity">
                            <Zap className="w-8 h-8 text-blue-500 -rotate-12" />
                        </div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Days to Goal</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-bold text-foreground">
                                ~{achievements.predictions.daysToNextMilestone}
                            </p>
                            <span className="text-xs text-muted-foreground">days</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Based on current pace</p>
                    </div>
                </div>

                {/* Improvement Rate */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Improvement Rate</p>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            +{achievements.predictions.improvementRate}% per exam
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
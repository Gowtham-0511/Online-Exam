import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, TrendingUp, Zap, Star, Award } from 'lucide-react';

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
            default: return <Star className="h-4 w-4" />;
        }
    };

    if (isLoading) {
        return (
            <Card className="border-border">
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!achievements?.hasData) {
        return null;
    }

    return (
        <Card className="border-border">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Next Milestones
                </CardTitle>
                <CardDescription>Track your progress towards achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Milestones */}
                <div className="space-y-3">
                    {achievements.nextMilestones.slice(0, 3).map((milestone, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/10 rounded">
                                        {getIcon(milestone.icon)}
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        {milestone.label}
                                    </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    {milestone.current.toFixed(2)}/{milestone.target.toFixed(2)}
                                </Badge>
                            </div>
                            <Progress value={milestone.progress} className="h-1.5" />
                        </div>
                    ))}
                </div>

                {/* Predictions */}
                <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="text-sm font-medium text-foreground">Predictions</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Next High Score</p>
                            <p className="text-lg font-bold text-foreground">
                                {achievements.predictions.nextHighScore.toFixed(0)}%
                            </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Days to Milestone</p>
                            <p className="text-lg font-bold text-foreground">
                                ~{achievements.predictions.daysToNextMilestone}
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                        <p className="text-xs text-muted-foreground mb-1">Improvement Rate</p>
                        <p className="text-sm font-medium text-foreground">
                            +{achievements.predictions.improvementRate}% per exam
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
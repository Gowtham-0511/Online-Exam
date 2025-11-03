import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import * as Icons from 'lucide-react';

interface StatsCardsProps {
    stats: {
        totalQuestions: number;
        completed: number;
        avgScore: number;
        currentStreak: number;
    };
}

export const PracticeStatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    console.log(stats)
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Total Questions
                            </p>
                            <h3 className="text-3xl font-bold">
                                {stats.totalQuestions}
                            </h3>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10">
                            <Icons.BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Completed
                            </p>
                            <h3 className="text-3xl font-bold">
                                {stats.completed}
                            </h3>
                            {stats.totalQuestions > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {((stats.completed / stats.totalQuestions) * 100).toFixed(0)}% complete
                                </p>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10">
                            <Icons.CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Average Score
                            </p>
                            <h3 className="text-3xl font-bold">
                                {stats.avgScore ? `${stats.avgScore.toFixed(0)}%` : '0%'}
                            </h3>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10">
                            <Icons.Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Current Streak
                            </p>
                            <h3 className="text-3xl font-bold">
                                {stats.currentStreak}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                days
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-500/10">
                            <Icons.Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
import React from 'react';
import { StatsCard } from './StatsCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { useRouter } from 'next/router';

interface StatsGridProps {
    stats: {
        totalExams: number;
        averageScore: string | number;
        bestRank: string | number;
        currentStreak: string | number;
        completedExams: number;
        skillRating: number;
    };
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    const router = useRouter();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
                icon="Calendar"
                label="Upcoming Exams"
                value={stats.totalExams}
                iconColor="text-blue-600 dark:text-blue-400"
                iconBgColor="bg-blue-500/10"
            />
            <StatsCard
                icon="Target"
                label="Average Score"
                value={`${stats.averageScore}%`}
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBgColor="bg-emerald-500/10"
            />
            <StatsCard
                icon="Trophy"
                label="Best Rank"
                value={stats.bestRank}
                iconColor="text-amber-600 dark:text-amber-400"
                iconBgColor="bg-amber-500/10"
            />
            {/* <StatsCard
                icon="Flame"
                label="Current Streak"
                value={stats.currentStreak}
                iconColor="text-orange-600 dark:text-orange-400"
                iconBgColor="bg-orange-500/10"
            /> */}
            {/* Add this somewhere in your main dashboard */}
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                            <Icons.Code2 className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">Practice Zone</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Improve your skills with AI-generated practice questions based on your weak areas.
                            </p>
                            <Button onClick={() => router.push('/attender/practice')} className="gap-2">
                                <Icons.Sparkles className="h-4 w-4" />
                                Start Practicing
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <StatsCard
                icon="CheckCircle2"
                label="Completed Exams"
                value={stats.completedExams}
                iconColor="text-purple-600 dark:text-purple-400"
                iconBgColor="bg-purple-500/10"
            />
            <StatsCard
                icon="Zap"
                label="Skill Rating"
                value={stats.skillRating}
                iconColor="text-pink-600 dark:text-pink-400"
                iconBgColor="bg-pink-500/10"
            />
        </div>
    );
};
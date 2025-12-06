import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BookOpen,
    TrendingUp,
    Target,
    Brain,
    ArrowRight,
    Zap,
    ChevronRight,
    Sparkles,
    Calendar,
    Layers,
    PlayCircle
} from 'lucide-react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type AdaptiveLearningPathProps = {
    email: string;
};

export const AdaptiveLearningPath: React.FC<AdaptiveLearningPathProps> = ({ email }) => {
    const router = useRouter();

    // Fetch user's active learning plans (if any)
    const { data: existingPlans, isLoading: plansLoading } = useSWR(
        email ? `/api/attender/learning-plans?email=${encodeURIComponent(email)}` : null,
        fetcher
    );

    // Fetch AI Analysis (only serves as 'suggestions' now)
    const { data: learningPath, isLoading: pathLoading } = useSWR(
        email ? `/api/attender/adaptive-learning-path?email=${encodeURIComponent(email)}` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 300000 }
    );

    const isLoading = plansLoading || pathLoading;

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    const hasActivePlans = existingPlans?.plans && existingPlans.plans.length > 0;
    const hasAIAnalysis = learningPath?.hasData;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Active Learning Plans (Priority Display) */}
            {hasActivePlans ? (
                <div className="grid gap-4">
                    {existingPlans.plans.map((plan: any) => (
                        <Card
                            key={plan.id}
                            onClick={() => router.push(`/attender/learning-plans/${plan.planId}`)}
                            className="group relative cursor-pointer border-l-4 border-l-primary overflow-hidden hover:shadow-lg transition-all duration-300 bg-card"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center relative z-10">
                                {/* Icon Box */}
                                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                                    <BookOpen className="w-6 h-6 text-primary" />
                                </div>

                                <div className="flex-1 space-y-2 min-w-0 w-full">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                                {plan.planName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                {plan.planDescription}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="shrink-0 bg-background/50 backdrop-blur-sm">
                                            Week {plan.currentWeek}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                            <span>Progress</span>
                                            <span className="text-foreground">{plan.overallProgress}%</span>
                                        </div>
                                        <Progress value={plan.overallProgress} className="h-2" />
                                    </div>
                                </div>

                                <Button size="sm" className="hidden md:flex gap-2 shrink-0 shadow-sm group-hover:translate-x-1 transition-transform">
                                    Continue <ChevronRight className="w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Empty State / Call to Action */
                <Card className="border-dashed border-2 bg-muted/5">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="p-4 rounded-full bg-primary/10 mb-2">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">No Active Curriculum</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                                You haven't started any structured learning tracks yet.
                                {hasAIAnalysis ? " Check the recommendations below!" : " Complete more exams to get personalized plans."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 2. AI Recommendations / Weakness Analysis */}
            {hasAIAnalysis && (
                <Card className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-border/60">
                    <CardContent className="p-5 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <h3 className="font-semibold text-base">Recommended Focus Areas</h3>
                        </div>

                        {/* Weak Areas Tags */}
                        <div className="flex flex-wrap gap-2">
                            {learningPath.topicPerformance
                                .filter((t: any) => t.score < 60)
                                .slice(0, 4)
                                .map((topic: any, idx: number) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="bg-background/80 hover:bg-background border border-border/50 text-rose-600 dark:text-rose-400 gap-1.5 py-1.5"
                                    >
                                        <TrendingUp className="w-3 h-3" />
                                        Improve {topic.topic}
                                    </Badge>
                                ))
                            }
                            {learningPath.topicPerformance
                                .filter((t: any) => t.score >= 80)
                                .slice(0, 2)
                                .map((topic: any, idx: number) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="bg-background/80 hover:bg-background border border-border/50 text-emerald-600 dark:text-emerald-400 gap-1.5 py-1.5"
                                    >
                                        <Target className="w-3 h-3" />
                                        Mastered {topic.topic}
                                    </Badge>
                                ))
                            }
                        </div>

                        {/* Suggested Action */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Brain className="w-4 h-4 text-primary" />
                                </div>
                                <div className="grid gap-0.5">
                                    <span className="font-medium text-sm">Generate Custom Plan</span>
                                    <span className="text-xs text-muted-foreground">Based on your weak areas</span>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => router.push('/attender/practice')} className="text-xs">
                                Create <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
    </div>
);
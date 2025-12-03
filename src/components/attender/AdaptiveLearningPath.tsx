import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BookOpen,
    TrendingUp,
    TrendingDown,
    Target,
    Calendar,
    CheckCircle2,
    Clock,
    Brain,
    ArrowRight,
    Zap,
    Award,
    ChevronRight
} from 'lucide-react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
// import { useRouter } from 'next/router';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type AdaptiveLearningPathProps = {
    email: string;
};

export const AdaptiveLearningPath: React.FC<AdaptiveLearningPathProps> = ({ email }) => {
    const router = useRouter();
    const { data: learningPath, error, isLoading } = useSWR(
        email ? `/api/attender/adaptive-learning-path?email=${encodeURIComponent(email)}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000
        }
    );

    const { data: existingPlans } = useSWR(
        email ? `/api/attender/learning-plans?email=${encodeURIComponent(email)}` : null,
        fetcher
    );

    if (isLoading) {
        return (
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!learningPath?.hasData) {
        return (
            <Card className="border-border shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Brain className="h-5 w-5" />
                        </div>
                        Adaptive Learning Path
                    </CardTitle>
                    <CardDescription>Unlock your personalized curriculum</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-50 animate-pulse" />
                            <div className="p-4 bg-background rounded-full border border-border relative">
                                <Target className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <div className="max-w-sm space-y-2">
                            <h3 className="font-semibold text-foreground">Start Your Journey</h3>
                            <p className="text-sm text-muted-foreground">
                                Complete a few exams to let our AI analyze your skills and generate a tailored learning path just for you.
                            </p>
                        </div>
                        <Button onClick={() => router.push('/attender/view-exams')} className="mt-4">
                            Browse Exams <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Analysis Card */}
            <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Skill Analysis & Path
                            </CardTitle>
                            <CardDescription>AI-driven insights based on your recent performance</CardDescription>
                        </div>
                        {learningPath.overallStats.successRate >= 80 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                <Award className="h-3 w-3 mr-1" /> Top Performer
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Questions Analyzed</p>
                                <BookOpen className="h-4 w-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-foreground tracking-tight">
                                    {learningPath.overallStats.totalQuestions}
                                </span>
                                <span className="text-xs text-muted-foreground">questions</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                <Target className="h-4 w-4 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-foreground tracking-tight">
                                    {learningPath.overallStats.successRate}%
                                </span>
                                <span className="text-xs text-muted-foreground">accuracy</span>
                            </div>
                        </div>
                    </div>

                    {/* Topic Performance */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Topic Proficiency
                        </h3>
                        <div className="grid gap-3">
                            {learningPath.topicPerformance.slice(0, 5).map((topic: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="group flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-foreground">{topic.topic}</span>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground">{topic.questionsAttempted} qs</span>
                                                <span className={`font-bold ${topic.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                                                    topic.score >= 40 ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-rose-600 dark:text-rose-400'
                                                    }`}>
                                                    {topic.score}%
                                                </span>
                                            </div>
                                        </div>
                                        <Progress
                                            value={topic.score}
                                            className="h-1.5 bg-muted"
                                            indicatorClassName={
                                                topic.score >= 70 ? 'bg-emerald-500' :
                                                    topic.score >= 40 ? 'bg-amber-500' :
                                                        'bg-rose-500'
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Plan */}
                    {learningPath.studyPlan?.weeklyPlan && (
                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Recommended Plan
                                </h3>
                                <Badge variant="outline" className="font-normal text-xs">
                                    {learningPath.studyPlan.estimatedImprovementTime}
                                </Badge>
                            </div>

                            <div className="relative space-y-0 pl-4 border-l-2 border-border/50 ml-2">
                                {learningPath.studyPlan.weeklyPlan.slice(0, 3).map((day: any, idx: number) => (
                                    <div key={idx} className="relative pb-6 last:pb-0">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground">{day.day}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {day.duration}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                                                <p className="font-medium text-primary mb-1">{day.topic}</p>
                                                <div className="space-y-1">
                                                    {day.activities.slice(0, 2).map((activity: string, actIdx: number) => (
                                                        <div key={actIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground/70" />
                                                            <span>{activity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Priority Tags */}
                            {learningPath.studyPlan.priorityTopics && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4">
                                    {learningPath.studyPlan.priorityTopics.map((topic: string, idx: number) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 border-transparent"
                                        >
                                            Focus: {topic}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Plans Section */}
            {existingPlans?.plans && existingPlans.plans.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold px-1">Active Curriculums</h3>
                    {existingPlans.plans.map((plan: any) => (
                        <Card key={plan.id} className="border-border shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => router.push(`/attender/learning-plans/${plan.planId}`)}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {plan.planName}
                                            </h4>
                                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${plan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                                                'bg-muted text-muted-foreground'
                                                }`}>
                                                {plan.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{plan.planDescription}</p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover:text-primary">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{plan.overallProgress}%</span>
                                    </div>
                                    <Progress value={plan.overallProgress} className="h-1.5" />
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                        <span>Week {plan.currentWeek} of {plan.duration}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
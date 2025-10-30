import React, { useState } from 'react';
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
    Plus,
    ArrowRight
} from 'lucide-react';
import useSWR from 'swr';
import { useRouter } from 'next/router';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type AdaptiveLearningPathProps = {
    email: string;
};

export const AdaptiveLearningPath: React.FC<AdaptiveLearningPathProps> = ({ email }) => {
    const router = useRouter();
    const { data: learningPath, error, isLoading, mutate } = useSWR(
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
            <Card className="border-border">
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!learningPath?.hasData) {
        return (
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Adaptive Learning Path
                    </CardTitle>
                    <CardDescription>Complete exams to unlock personalized learning</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Take a few exams to generate your personalized learning path</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Topic Performance Overview */}
            <Card className="border-border">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Your Learning Analysis
                            </CardTitle>
                            <CardDescription>AI-powered insights from your performance</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Overall Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
                            <p className="text-2xl font-bold text-foreground">
                                {learningPath.overallStats.totalQuestions}
                            </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                            <p className="text-2xl font-bold text-foreground">
                                {learningPath.overallStats.successRate}%
                            </p>
                        </div>
                    </div>

                    {/* Topic Performance */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Topic Performance
                        </h3>
                        <div className="space-y-3">
                            {learningPath.topicPerformance.slice(0, 5).map((topic: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {topic.questionsAttempted} questions
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {topic.score >= 70 ? (
                                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-rose-600" />
                                            )}
                                            <span className="text-sm font-bold">{topic.score}%</span>
                                        </div>
                                    </div>
                                    <Progress value={topic.score} className="h-2" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Study Plan */}
                    {learningPath.studyPlan?.weeklyPlan && (
                        <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-purple-600" />
                                    Recommended Study Plan
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                    {learningPath.studyPlan.estimatedImprovementTime}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {learningPath.studyPlan.weeklyPlan.slice(0, 3).map((day: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm text-foreground">{day.day}</span>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {day.duration}
                                            </div>
                                        </div>
                                        <p className="text-sm text-foreground mb-2">{day.topic}</p>
                                        <div className="space-y-1">
                                            {day.activities.slice(0, 2).map((activity: string, actIdx: number) => (
                                                <div key={actIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-purple-600" />
                                                    <span>{activity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Priority Topics */}
                            {learningPath.studyPlan.priorityTopics && (
                                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                                    <p className="text-sm font-medium text-foreground mb-2">Priority Focus Areas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {learningPath.studyPlan.priorityTopics.map((topic: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/50">
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Existing Learning Plans */}
            {existingPlans?.plans && existingPlans.plans.length > 0 && (
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg">Active Learning Plans</CardTitle>
                        <CardDescription>Your ongoing learning journeys</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {existingPlans.plans.map((plan: any) => (
                                <div key={plan.id} className="p-4 border border-border rounded-lg hover:border-primary/50 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-foreground">{plan.planName}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{plan.planDescription}</p>
                                        </div>
                                        <Badge variant="outline" className={
                                            plan.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }>
                                            {plan.status}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium text-foreground">{plan.overallProgress}%</span>
                                        </div>
                                        <Progress value={plan.overallProgress} className="h-2" />
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                                            <span>Week {plan.currentWeek} of {plan.duration}</span>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/dashboard/attender/learning-plans/${plan.planId}`)}>
                                                Continue
                                                <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
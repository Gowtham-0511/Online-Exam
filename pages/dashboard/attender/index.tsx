import React from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import * as Icons from 'lucide-react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/router'
import { AIInsightsCard } from '@/components/attender/AIInsightsCard';
import { ExamReadinessCard } from '@/components/attender/ExamReadinessCard';
import { PerformancePredictionCard } from '@/components/attender/PerformancePredictionCard';
import { AchievementPredictionsCard } from '@/components/attender/AchievementPredictionsCard';
import { PostExamInsightsModal } from '@/components/attender/PostExamInsightsModal';
import { useState } from 'react';
import { AdaptiveLearningPath } from '@/components/attender/AdaptiveLearningPath';
import { ExamStrategyModal } from '@/components/attender/ExamStrategyModal';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout'

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Exam = {
    id: React.Key | null | undefined;
    title: string;
    language: string;
    date: string;
    time: string;
    duration: string;
    difficulty: string;
    participants: number;
    startTime: string;
    endTime: string;
};

type CompletedExam = {
    id: number;
    examId: string;
    title: string;
    language: string;
    submittedAt: string;
    disqualified: boolean;
    duration: number;
    totalMarksObtained?: number;
    totalPossibleMarks?: number;
    percentage?: number;
};

const index = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedExamForInsights, setSelectedExamForInsights] = useState<{
        examId: string;
        email: string;
    } | null>(null);
    const [selectedExamForStrategy, setSelectedExamForStrategy] = useState<{
        examId: string;
        email: string;
    } | null>(null);
    const { data: upcomingExams = [], error: upcomingError, isLoading: upcomingLoading } = useSWR(
        session?.user?.email
            ? `/api/attender/allowed-exam?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    const { data: completedExams = [], error: completedError, isLoading: completedLoading } = useSWR(
        session?.user?.email
            ? `/api/attender/completed-exams?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    const { data: aiInsights, error: aiError, isLoading: aiLoading } = useSWR(
        session?.user?.email && completedExams.length > 0
            ? `/api/attender/ai-insights?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    const { data: performancePrediction, error: predictionError, isLoading: predictionLoading } = useSWR(
        session?.user?.email && completedExams.length >= 2
            ? `/api/attender/predict-performance?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    const { data: achievementPredictions, error: achievementError, isLoading: achievementLoading } = useSWR(
        session?.user?.email && completedExams.length > 0
            ? `/api/attender/achievement-predictions?email=${encodeURIComponent(session.user.email)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    );

    const stats = {
        totalExams: upcomingExams.length || 0,
        averageScore: completedExams.length > 0
            ? (
                completedExams.reduce((sum: number, exam: CompletedExam) => {
                    const pct = Number(exam.percentage)
                    return sum + (isNaN(pct) ? 0 : pct)
                }, 0) / completedExams.length
            ).toFixed(1)
            : "-",
        bestRank: "-",
        currentStreak: "-",
        completedExams: completedExams.length,
        skillRating: 1200
    };

    // Loading state
    const isLoading = upcomingLoading || completedLoading;
    const hasError = upcomingError || completedError;

    if (status === 'loading' || (isLoading && !upcomingExams.length && !completedExams.length)) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="space-y-8">
                    {/* Header Skeleton */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <Skeleton className="h-10 w-64 mb-2" />
                            <Skeleton className="h-6 w-96" />
                        </div>
                        <Skeleton className="h-10 w-48" />
                    </div>

                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="border-border">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <Skeleton className="h-4 w-24 mb-2" />
                                            <Skeleton className="h-8 w-16" />
                                        </div>
                                        <Skeleton className="h-12 w-12 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-4 w-32 mt-4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Main Content Grid Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2].map((i) => (
                            <Card key={i} className="border-border">
                                <CardHeader>
                                    <Skeleton className="h-6 w-48 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((j) => (
                                            <Skeleton key={j} className="h-24 w-full" />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (hasError) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="space-y-8">
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Icons.AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">Failed to load data</h3>
                        <p className="text-muted-foreground text-sm mb-4">There was an error fetching your exams. Please try again.</p>
                        <Button
                            onClick={() => {
                                window.location.reload();
                            }}
                            variant="outline"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    return (
        <UnifiedDashboardLayout role="attender">
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Welcome, {session?.user?.name?.split(' ')[0] || 'Coder'}!
                        </h1>
                        <p className="text-muted-foreground">
                            Ready to ace your next challenge?
                        </p>
                    </div>
                    <Button
                        onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Icons.Code className="h-4 w-4 mr-2" />
                        Browse All Exams
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Available Exams</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stats.totalExams}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icons.BookOpen className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Icons.TrendingUp className="h-4 w-4 mr-1" />
                                Ready to start
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed Exams</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stats.completedExams}</p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Icons.CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Icons.Activity className="h-4 w-4 mr-1" />
                                Keep improving
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {typeof stats.averageScore === 'string' && stats.averageScore === '-'
                                            ? stats.averageScore
                                            : `${stats.averageScore}%`
                                        }
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Icons.Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                <Icons.TrendingUp className="h-4 w-4 mr-1" />
                                {completedExams.length > 0 ? 'Keep improving' : 'Start taking exams'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Exams */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Upcoming Exams</CardTitle>
                                    <CardDescription className="mt-1">
                                        {upcomingExams.length} exams scheduled
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.location.href = '/dashboard/attender/view-exams'}
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                    View All
                                    <Icons.ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {upcomingLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : upcomingExams && upcomingExams.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingExams.slice(0, 5).map((exam: Exam) => (
                                        <Card
                                            key={exam.id}
                                            className="p-4 border-border hover:border-primary/50 transition-all duration-200 hover:shadow-sm cursor-pointer group"
                                        // onClick={() => router.push('/dashboard/attender/view-exams')}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                                                            <Icons.Brain className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-xs border-border">
                                                                    <Icons.Code className="h-3 w-3 mr-1" />
                                                                    {exam.language}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 text-sm text-muted-foreground ml-11">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <Icons.Timer className="h-3.5 w-3.5" />
                                                                <span>{exam.duration} min</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/attender/view-exams`)}
                                                    className="bg-primary hover:bg-primary/90"
                                                >
                                                    Start Exam
                                                    <Icons.ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <Icons.AlertCircle className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground mb-2">No upcoming exams</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Check back later or browse available exams</p>
                                    <Button variant="outline" onClick={() => window.location.href = '/dashboard/attender/view-exams'}>
                                        Browse Exams
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Completed Exams */}
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Completed Exams</CardTitle>
                                    <CardDescription className="mt-1">
                                        {completedExams.length} exams completed
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {completedLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : completedExams && completedExams.length > 0 ? (
                                <div className="space-y-3">
                                    {completedExams.slice(0, 5).map((exam: CompletedExam) => (
                                        <Card
                                            key={exam.id}
                                            className="p-4 border-border hover:border-primary/50 transition-all cursor-pointer"
                                            onClick={() => setSelectedExamForInsights({
                                                examId: exam.examId,
                                                email: session?.user?.email || ''
                                            })}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className={`p-2 rounded-lg shrink-0 ${exam.disqualified ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                                                            {exam.disqualified ? (
                                                                <Icons.XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                                            ) : (
                                                                <Icons.CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-foreground truncate">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-xs border-border">
                                                                    <Icons.Code className="h-3 w-3 mr-1" />
                                                                    {exam.language}
                                                                </Badge>
                                                                {exam.percentage !== null && exam.percentage !== undefined && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs ${exam.percentage >= 80
                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200'
                                                                            : exam.percentage >= 60
                                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200'
                                                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200'
                                                                            }`}
                                                                    >
                                                                        {exam.percentage}%
                                                                    </Badge>
                                                                )}
                                                                {exam.disqualified && (
                                                                    <Badge variant="outline" className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                                                        Disqualified
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 text-sm text-muted-foreground ml-11">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <div className="flex items-center gap-2">
                                                                <Icons.Clock className="h-3.5 w-3.5" />
                                                                <span>
                                                                    {new Date(exam.submittedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {exam.totalMarksObtained !== null && exam.totalPossibleMarks !== null && (
                                                                <div className="flex items-center gap-2">
                                                                    <Icons.Target className="h-3.5 w-3.5" />
                                                                    <span>{exam.totalMarksObtained}/{exam.totalPossibleMarks} marks</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <Icons.Timer className="h-3.5 w-3.5" />
                                                                <span>{exam.duration} min</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-border">
                                                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                                                    <Icons.Brain className="h-3 w-3" />
                                                    View Detailed Analysis
                                                </button>
                                            </div>

                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <Icons.BookOpen className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground mb-2">No completed exams yet</h3>
                                    <p className="text-muted-foreground text-sm">Start taking exams to see your results here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {completedExams.length > 0 && (
                    <AIInsightsCard
                        insights={aiInsights}
                        isLoading={aiLoading}
                        error={aiError}
                    />
                )}

                {completedExams.length >= 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PerformancePredictionCard
                            prediction={performancePrediction}
                            isLoading={predictionLoading}
                        />
                        <AchievementPredictionsCard
                            achievements={achievementPredictions}
                            isLoading={achievementLoading}
                        />
                    </div>
                )}

                {completedExams.length > 0 && (
                    <AdaptiveLearningPath email={session?.user?.email || ''} />
                )}
            </div>

            {selectedExamForInsights && (
                <PostExamInsightsModal
                    isOpen={!!selectedExamForInsights}
                    onClose={() => setSelectedExamForInsights(null)}
                    examId={selectedExamForInsights.examId}
                    email={selectedExamForInsights.email}
                />
            )}

            {selectedExamForStrategy && (
                <ExamStrategyModal
                    isOpen={!!selectedExamForStrategy}
                    onClose={() => setSelectedExamForStrategy(null)}
                    examId={selectedExamForStrategy.examId}
                    email={selectedExamForStrategy.email}
                />
            )}
        </UnifiedDashboardLayout>
    )
}

export default index
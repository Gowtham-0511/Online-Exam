import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/router';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import { DashboardHeader } from '@/components/attender/dashboard/DashboardHeader';
import { UpcomingExamsSection } from '@/components/attender/dashboard/UpcomingExamsSection';
import { CompletedExamsSection } from '@/components/attender/dashboard/CompletedExamsSection';
import { AIInsightsCard } from '@/components/attender/AIInsightsCard';
import { PerformancePredictionCard } from '@/components/attender/PerformancePredictionCard';
import { AchievementPredictionsCard } from '@/components/attender/AchievementPredictionsCard';
import { PostExamInsightsModal } from '@/components/attender/PostExamInsightsModal';
import { AdaptiveLearningPath } from '@/components/attender/AdaptiveLearningPath';
import { ExamStrategyModal } from '@/components/attender/ExamStrategyModal';
import { Exam, CompletedExam } from '@/types/attender';
import Head from 'next/head';
import {
    ChevronRight,
    Ghost,
    Trophy,
    Target,
    Zap,
    Calendar,
    CheckCircle2,
    TrendingUp,
    Sparkles,
    Code2
} from 'lucide-react';
import GhostModeCard from '@/components/attender/dashboard/GhostModeCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const AttenderDashboard = () => {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Modal states
    const [selectedExamForInsights, setSelectedExamForInsights] = useState<{
        examId: string;
        email: string;
    } | null>(null);

    const [selectedExamForStrategy, setSelectedExamForStrategy] = useState<{
        examId: string;
        email: string;
    } | null>(null);

    // Refresh states
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Data fetching with SWR
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
            dedupingInterval: 300000,
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
            dedupingInterval: 300000,
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

    // Calculate stats
    const stats = {
        totalExams: upcomingExams.length || 0,
        averageScore: completedExams.length > 0
            ? (
                completedExams.reduce((sum: number, exam: CompletedExam) => {
                    const pct = Number(exam.percentage);
                    return sum + (isNaN(pct) ? 0 : pct);
                }, 0) / completedExams.length
            ).toFixed(1)
            : "-",
        bestRank: "-", // Placeholder as per original
        currentStreak: "-", // Placeholder
        completedExams: completedExams.length,
        skillRating: 1200 // Placeholder
    };

    // Handlers
    const handleRefreshInsights = async () => {
        if (!session?.user?.email) return;

        setIsRefreshing(true);
        setRefreshMessage(null);

        try {
            const response = await fetch(
                `/api/cache/user-insights?email=${encodeURIComponent(session.user.email)}&force=true`
            );

            if (!response.ok) {
                throw new Error('Failed to refresh insights');
            }

            window.location.reload();

            setRefreshMessage({
                type: 'success',
                text: 'Insights refreshed successfully!'
            });
        } catch (error) {
            console.error('Refresh error:', error);
            setRefreshMessage({
                type: 'error',
                text: 'Failed to refresh insights. Please try again.'
            });
        } finally {
            setIsRefreshing(false);
            setTimeout(() => setRefreshMessage(null), 3000);
        }
    };

    const handleStartExam = (examTitle: string) => {
        router.push(`/ dashboard / attender / view - exams`);
    };

    const handleViewStrategy = (exam: Exam) => {
        setSelectedExamForStrategy({
            examId: exam.title,
            email: session?.user?.email || ''
        });
    };

    const handleExamClick = (examId: string, email: string) => {
        setSelectedExamForInsights({ examId, email });
    };

    // Loading and error states
    const isLoading = upcomingLoading || completedLoading;
    const hasError = upcomingError || completedError;

    if (status === 'loading') {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="p-6 space-y-6 animate-pulse">
                    <div className="h-12 w-1/3 bg-muted rounded-md" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-6">
                            <div className="h-40 bg-muted rounded-xl" />
                            <div className="h-64 bg-muted rounded-xl" />
                        </div>
                        <div className="lg:col-span-4 space-y-6">
                            <div className="h-64 bg-muted rounded-xl" />
                        </div>
                    </div>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (hasError) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                    <div className="bg-destructive/10 p-4 rounded-full mb-4">
                        <Ghost className="w-12 h-12 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong</h2>
                    <p className="text-muted-foreground mb-6">We couldn't load your dashboard data.</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>Dashboard | SysRank</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in-up">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            You've got some exciting challenges waiting for you today.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleRefreshInsights}
                            disabled={isRefreshing}
                            className={isRefreshing ? "animate-spin" : ""}
                        >
                            <Icons.RefreshCw className={`w - 4 h - 4 mr - 2 ${isRefreshing ? "animate-spin" : ""} `} />
                            {isRefreshing ? "Refreshing..." : "Refresh Insights"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (Main Content) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Stats Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatsItem
                                icon={Calendar}
                                label="Upcoming"
                                value={stats.totalExams}
                                color="text-blue-500"
                                bg="bg-blue-500/10"
                            />
                            <StatsItem
                                icon={CheckCircle2}
                                label="Completed"
                                value={stats.completedExams}
                                color="text-emerald-500"
                                bg="bg-emerald-500/10"
                            />
                            <StatsItem
                                icon={Target}
                                label="Avg. Score"
                                value={`${stats.averageScore}% `}
                                color="text-amber-500"
                                bg="bg-amber-500/10"
                            />
                            <StatsItem
                                icon={Zap}
                                label="Skill Rating"
                                value={stats.skillRating}
                                color="text-purple-500"
                                bg="bg-purple-500/10"
                            />
                        </div>

                        {/* Upcoming Exams */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Upcoming Exams
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/attender/view-exams')} className="text-primary hover:text-primary/80">
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            {upcomingLoading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                                </div>
                            ) : (
                                <UpcomingExamsSection
                                    exams={upcomingExams.slice(0, 3)} // Show limited on dashboard
                                    isLoading={upcomingLoading}
                                    onStartExam={handleStartExam}
                                    onViewStrategy={handleViewStrategy}
                                    onViewAll={() => { }} // Handled by header button
                                />
                            )}
                        </section>

                        {/* Adaptive Learning Path */}
                        {completedExams.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Your Learning Path
                                </h2>
                                <AdaptiveLearningPath email={session?.user?.email || ''} />
                            </section>
                        )}

                        {/* Recent Activity / Completed */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    Recent Activity
                                </h2>
                            </div>
                            <CompletedExamsSection
                                exams={completedExams.slice(0, 5)}
                                isLoading={completedLoading}
                                onExamClick={handleExamClick}
                                onViewAll={() => router.push('/dashboard/attender/view-exams')}
                                userEmail={session?.user?.email || ''}
                            />
                        </section>
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Profile / Rank Card */}
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-primary/20 to-secondary/20" />
                            <CardContent className="pt-0 relative">
                                <div className="absolute -top-12 left-6">
                                    <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground shadow-md">
                                        {session?.user?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <div className="mt-14 space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold">{session?.user?.name}</h3>
                                        <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-medium">Rank</p>
                                            <p className="text-lg font-bold flex items-center gap-1">
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                {stats.bestRank}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-medium">Rating</p>
                                            <p className="text-lg font-bold flex items-center gap-1">
                                                <Zap className="w-4 h-4 text-purple-500" />
                                                {stats.skillRating}
                                            </p>
                                        </div>
                                    </div>

                                    <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/attender/profile')}>
                                        View Full Profile
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Practice Zone CTA */}
                        <Card className="bg-primary/5 border-primary/20 shadow-sm">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Code2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold">Practice Zone</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Sharpen your skills with AI-generated problems tailored to your weak areas.
                                </p>
                                <Button className="w-full gap-2" onClick={() => router.push('/dashboard/attender/practice')}>
                                    <Sparkles className="w-4 h-4" />
                                    Start Practicing
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Ghost Mode */}
                        <GhostModeCard />

                        {/* AI Insights (Compact) */}
                        {completedExams.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">AI Insights</h3>
                                <AIInsightsCard
                                    insights={aiInsights}
                                    isLoading={aiLoading}
                                    error={aiError}
                                />
                            </div>
                        )}

                        {/* Predictions */}
                        {completedExams.length >= 2 && (
                            <div className="space-y-4">
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

                    </div>
                </div>
            </div>

            {/* Modals */}
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
    );
};

// Helper Component for Stats
const StatsItem = ({ icon: Icon, label, value, color, bg }: any) => (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
            <div className={`p - 3 rounded - xl ${bg} ${color} `}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
                <p className="text-xl font-bold tracking-tight">{value}</p>
            </div>
        </CardContent>
    </Card>
);

// Helper for Icons namespace if needed, though we imported specific icons
import * as Icons from 'lucide-react';

export default AttenderDashboard;
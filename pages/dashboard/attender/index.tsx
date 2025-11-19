import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/router';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import { DashboardHeader } from '@/components/attender/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/attender/dashboard/StatsGrid';
import { UpcomingExamsSection } from '@/components/attender/dashboard/UpcomingExamsSection';
import { CompletedExamsSection } from '@/components/attender/dashboard/CompletedExamsSection';
import { AIInsightsCard } from '@/components/attender/AIInsightsCard';
import { ExamReadinessCard } from '@/components/attender/ExamReadinessCard';
import { PerformancePredictionCard } from '@/components/attender/PerformancePredictionCard';
import { AchievementPredictionsCard } from '@/components/attender/AchievementPredictionsCard';
import { PostExamInsightsModal } from '@/components/attender/PostExamInsightsModal';
import { AdaptiveLearningPath } from '@/components/attender/AdaptiveLearningPath';
import { ExamStrategyModal } from '@/components/attender/ExamStrategyModal';
import { Exam, CompletedExam } from '@/types/attender';
import Head from 'next/head';
import { ChevronRight, Ghost } from 'lucide-react';
import GhostModeCard from '@/components/attender/dashboard/GhostModeCard';

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
        bestRank: "-",
        currentStreak: "-",
        completedExams: completedExams.length,
        skillRating: 1200
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

            // Force page reload to get fresh data
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
        router.push(`/dashboard/attender/view-exams`);
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

    if (status === 'loading' || (isLoading && !upcomingExams.length && !completedExams.length)) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="space-y-8">
                    <DashboardHeader
                        isLoading={true}
                        showRefreshButton={false}
                        isRefreshing={false}
                        onRefresh={handleRefreshInsights}
                    />
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (hasError) {
        return (
            <UnifiedDashboardLayout role="attender">
                <div className="text-center py-16">
                    <p className="text-red-500">Error loading dashboard data</p>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>
            <div className="space-y-8">
                {/* Header */}
                <DashboardHeader
                    userName={session?.user?.name}
                    isLoading={false}
                    showRefreshButton={completedExams.length > 0}
                    isRefreshing={isRefreshing}
                    refreshMessage={refreshMessage}
                    onRefresh={handleRefreshInsights}
                />

                {/* Ghost Mode Card - Add this after DashboardHeader */}
                <GhostModeCard />

                {/* Stats Grid */}
                <StatsGrid stats={stats} />

                {/* Exam Readiness Card */}
                {/* {completedExams.length > 0 && (
                    <ExamReadinessCard
                        email={session?.user?.email || ''}
                    />
                )} */}

                {/* Exams Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UpcomingExamsSection
                        exams={upcomingExams}
                        isLoading={upcomingLoading}
                        onStartExam={handleStartExam}
                        onViewStrategy={handleViewStrategy}
                        onViewAll={() => router.push('/dashboard/attender/view-exams')}
                    />

                    <CompletedExamsSection
                        exams={completedExams}
                        isLoading={completedLoading}
                        onExamClick={handleExamClick}
                        onViewAll={() => router.push('/dashboard/attender/view-exams')}
                        userEmail={session?.user?.email || ''}
                    />
                </div>

                {/* AI Insights */}
                {completedExams.length > 0 && (
                    <AIInsightsCard
                        insights={aiInsights}
                        isLoading={aiLoading}
                        error={aiError}
                    />
                )}

                {/* Performance & Achievements */}
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

                {/* Adaptive Learning Path */}
                {completedExams.length > 0 && (
                    <AdaptiveLearningPath
                        email={session?.user?.email || ''}
                    />
                )}
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

export default AttenderDashboard;
"use client";

import React, { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/auth-config";
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { UpcomingExamsSection } from '@/components/attender/dashboard/UpcomingExamsSection';
import { CompletedExamsSection } from '@/components/attender/dashboard/CompletedExamsSection';
import { AIInsightsCard } from '@/components/attender/AIInsightsCard';
import { PerformancePredictionCard } from '@/components/attender/PerformancePredictionCard';
import { AchievementPredictionsCard } from '@/components/attender/AchievementPredictionsCard';
import { PostExamInsightsModal } from '@/components/attender/PostExamInsightsModal';
import { AdaptiveLearningPath } from '@/components/attender/AdaptiveLearningPath';
import { ExamStrategyModal } from '@/components/attender/ExamStrategyModal';
import { ExamRequirementsModal } from '@/components/attender/ExamRequirementsModal';
import { Exam, CompletedExam } from '@/types/attender';
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
    Code2,
    RefreshCw,
    Activity,
    BrainCircuit
} from 'lucide-react';
import GhostModeCard from '@/components/attender/dashboard/GhostModeCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const AttenderDashboard = () => {
    const { instance, accounts, inProgress } = useMsal();
    const session = accounts[0];
    const status = inProgress === "none" ? "authenticated" : "loading";
    const router = useRouter();
    const containerRef = useRef(null);
    const [avatarUrl, setAvatarUrl] = useState<string>('');

    const fetcher = useCallback(async (url: string) => {
        if (!session) return null;
        try {
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: session
            });
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${tokenResponse.accessToken}`
                }
            });
            return res.json();
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [instance, session]);

    useEffect(() => {
        const fetchProfilePhoto = async () => {
            if (!session || !instance) return;
            try {
                const request = {
                    scopes: ["User.Read"],
                    account: session
                };
                const tokenResponse = await instance.acquireTokenSilent(request);

                const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                    headers: { Authorization: `Bearer ${tokenResponse.accessToken}` }
                });

                if (graphResponse.ok) {
                    const blob = await graphResponse.blob();
                    const url = URL.createObjectURL(blob);
                    setAvatarUrl(url);
                }
            } catch (err) {
                console.debug("Could not fetch profile photo:", err);
            }
        };

        fetchProfilePhoto();
    }, [session, instance]);


    // Modal states
    const [selectedExamForInsights, setSelectedExamForInsights] = useState<{
        examId: string;
        email: string;
    } | null>(null);

    const [selectedExamForStrategy, setSelectedExamForStrategy] = useState<{
        examId: string;
        email: string;
    } | null>(null);

    const [selectedExamForRequirements, setSelectedExamForRequirements] = useState<Exam | null>(null);

    // Refresh states
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Data fetching with SWR
    const { data: upcomingExams = [], error: upcomingError, isLoading: upcomingLoading } = useSWR(
        session?.username
            ? `/api/attender/allowed-exam?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    const { data: completedExams = [], error: completedError, isLoading: completedLoading } = useSWR(
        session?.username
            ? `/api/attender/completed-exams?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    const { data: aiInsights, error: aiError, isLoading: aiLoading } = useSWR(
        session?.username && completedExams.length > 0
            ? `/api/attender/ai-insights?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    );

    const { data: performancePrediction, error: predictionError, isLoading: predictionLoading } = useSWR(
        session?.username && completedExams.length >= 2
            ? `/api/attender/predict-performance?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    );

    const { data: achievementPredictions, error: achievementError, isLoading: achievementLoading } = useSWR(
        session?.username && completedExams.length > 0
            ? `/api/attender/achievement-predictions?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    );

    const { data: userStats, error: statsError, isLoading: statsLoading } = useSWR(
        session?.username
            ? `/api/attender/stats?email=${encodeURIComponent(session.username)}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
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
        bestRank: userStats?.rank || "-",
        currentStreak: userStats?.streak || 0,
        completedExams: completedExams.length,
        skillRating: userStats?.skillRating || 1000
    };

    // GSAP Animation
    useGSAP(() => {
        if (status === 'loading') return;

        const tl = gsap.timeline();

        // Ensure starting state
        gsap.set(".animate-header", { autoAlpha: 0, y: -20 });
        gsap.set(".animate-stat-card", { autoAlpha: 0, y: 20 });
        gsap.set(".animate-main-section", { autoAlpha: 0, y: 30 });
        gsap.set(".animate-sidebar-item", { autoAlpha: 0, x: 20 });

        tl.to(".animate-header", {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            ease: "power2.out"
        })
            .to(".animate-stat-card", {
                y: 0,
                autoAlpha: 1,
                duration: 0.5,
                stagger: 0.1,
                ease: "back.out(1.5)"
            }, "-=0.3")
            .to(".animate-main-section", {
                y: 0,
                autoAlpha: 1,
                duration: 0.8,
                ease: "power2.out"
            }, "-=0.2")
            .to(".animate-sidebar-item", {
                x: 0,
                autoAlpha: 1,
                duration: 0.6,
                stagger: 0.15,
                ease: "power2.out"
            }, "-=0.6");

    }, { scope: containerRef, dependencies: [status] });

    // Handlers
    const handleRefreshInsights = async () => {
        if (!session?.username) return;

        setIsRefreshing(true);
        setRefreshMessage(null);

        try {
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: session
            });
            const response = await fetch(
                `/api/attender/cache/user-insights?email=${encodeURIComponent(session.username)}&force=true`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.accessToken}`
                    }
                }
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
        const exam = upcomingExams.find((e: Exam) => e.title === examTitle);
        if (exam) {
            setSelectedExamForRequirements(exam);
        }
    };

    const handleProceedToExam = () => {
        if (selectedExamForRequirements) {
            router.push(`/exam/${selectedExamForRequirements.title}`);
            setSelectedExamForRequirements(null);
        }
    };

    const handleViewStrategy = (exam: Exam) => {
        setSelectedExamForStrategy({
            examId: exam.title,
            email: session?.username || ''
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground animate-pulse">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="bg-destructive/10 p-6 rounded-full mb-6">
                    <Ghost className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Something went wrong</h2>
                <p className="text-muted-foreground mb-8 max-w-md">We encountered an issue while loading your personal dashboard. Please try refreshing the page.</p>
                <Button size="lg" onClick={() => window.location.reload()}>Reload Dashboard</Button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background">
            <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-10 pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-header">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Welcome back, <span className="text-primary font-semibold">{session?.name?.split(' ')[0]}</span>. Ready to code?
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Status: Online
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleRefreshInsights}
                            disabled={isRefreshing}
                            className={`${isRefreshing ? "opacity-80" : ""} border-zinc-200 dark:border-zinc-800`}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                            {isRefreshing ? "Syncing..." : "Sync Data"}
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <StatsItem
                        icon={Calendar}
                        label="Upcoming Exams"
                        value={stats.totalExams}
                        subValue="scheduled"
                        trend="Neutral"
                        color="text-blue-500"
                        bg="bg-blue-500/10"
                        delay={0}
                    />
                    <StatsItem
                        icon={CheckCircle2}
                        label="Completed"
                        value={stats.completedExams}
                        subValue="challenges solved"
                        trend="Up"
                        color="text-emerald-500"
                        bg="bg-emerald-500/10"
                        delay={0.1}
                    />
                    <StatsItem
                        icon={Target}
                        label="Average Score"
                        value={`${stats.averageScore}%`}
                        subValue="performance"
                        trend="Up"
                        color="text-amber-500"
                        bg="bg-amber-500/10"
                        delay={0.2}
                    />
                    <StatsItem
                        icon={Zap}
                        label="Skill Rating"
                        value={stats.skillRating}
                        subValue="global rank"
                        trend="Up"
                        color="text-purple-500"
                        bg="bg-purple-500/10"
                        delay={0.3}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Main Content Column */}
                    <div className="xl:col-span-8 space-y-10">
                        {/* Ghost Mode - Top Priority */}
                        <div className="animate-main-section">
                            <GhostModeCard />
                        </div>

                        {/* Practice Zone - Main Emphasis */}
                        <section className="animate-main-section">
                            <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-primary/10 transition-colors duration-500"></div>
                                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-4 max-w-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
                                                <Code2 className="w-6 h-6" />
                                            </div>
                                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Recommended</Badge>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to level up your skills?</h2>
                                            <p className="text-muted-foreground text-base leading-relaxed">
                                                Dive into the Practice Zone to solve AI-curated challenges tailored to your performance.
                                                Consistency is key to mastering system design and algorithms.
                                            </p>
                                        </div>
                                        <Button size="lg" className="mt-2 font-medium shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all" onClick={() => router.push('/attender/practice')}>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Start Practice Session
                                        </Button>
                                    </div>
                                    <div className="hidden md:flex flex-col items-center justify-center space-y-2 opacity-50">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-8 bg-primary/20 rounded-full"></div>
                                            <div className="w-2 h-12 bg-primary/40 rounded-full"></div>
                                            <div className="w-2 h-6 bg-primary/30 rounded-full"></div>
                                            <div className="w-2 h-10 bg-primary/60 rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">ACTIVITY</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Upcoming Exams Section */}
                        <section className="space-y-5 animate-main-section">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    Scheduled Exams
                                </h2>
                            </div>

                            {upcomingLoading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-40 w-full bg-muted/30 rounded-xl animate-pulse" />)}
                                </div>
                            ) : (
                                <UpcomingExamsSection
                                    exams={upcomingExams.slice(0, 3)}
                                    isLoading={upcomingLoading}
                                    onStartExam={handleStartExam}
                                    onViewStrategy={handleViewStrategy}
                                    onViewAll={() => { }}
                                />
                            )}
                        </section>

                        {/* Recent Activity */}
                        <section className="space-y-5 animate-main-section">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
                                </div>
                                {/* <Button variant="ghost" className="text-sm font-medium hover:text-primary" onClick={() => router.push('/attender/view-exams')}>
                                    View All History <ChevronRight className="w-4 h-4 ml-1" />
                                </Button> */}
                            </div>
                            <CompletedExamsSection
                                exams={completedExams.slice(0, 5)}
                                isLoading={completedLoading}
                                onExamClick={handleExamClick}
                                onViewAll={() => router.push('/attender/view-exams')}
                                userEmail={session?.username || ''}
                            />
                        </section>
                    </div>

                    {/* Sidebar Column */}
                    <div className="xl:col-span-4 space-y-6">

                        {/* User Profile Card */}
                        <Card className="animate-sidebar-item border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden group">
                            <div className="h-32 bg-gradient-to-br from-primary/80 via-primary to-emerald-600/80 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30"></div>
                            </div>
                            <CardContent className="pt-0 relative px-6 pb-6">
                                <div className="flex justify-between items-end -mt-12 mb-4">
                                    <div className="w-24 h-24 rounded-2xl border-4 border-background bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl font-bold text-foreground shadow-xl">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={session?.name || 'User Avatar'}
                                                className="w-full h-full object-cover rounded-2xl"
                                            />
                                        ) : (
                                            session?.name?.charAt(0) || 'U'
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1 mb-6">
                                    <h3 className="text-2xl font-bold tracking-tight">{session?.name}</h3>
                                    <p className="text-sm text-muted-foreground break-all">{session?.username}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-5 border-y border-border/50">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Global Rank</p>
                                        <p className="text-2xl font-mono font-bold flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-amber-500" />
                                            {stats.bestRank}
                                        </p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Rating</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <Zap className="w-4 h-4 text-purple-500 fill-purple-500" />
                                            <p className="text-2xl font-mono font-bold">{stats.skillRating}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                        {/* AI Insights & Predictions */}
                        <div className="animate-sidebar-item space-y-6">
                            {completedExams.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Analysis</h3>
                                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">AI POWERED</Badge>
                                    </div>
                                    <AIInsightsCard
                                        insights={aiInsights}
                                        isLoading={aiLoading}
                                        error={aiError}
                                    />
                                </div>
                            )}

                            {/* {completedExams.length >= 2 && (
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
                            )} */}
                        </div>
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

            {selectedExamForRequirements && (
                <ExamRequirementsModal
                    isOpen={!!selectedExamForRequirements}
                    onClose={() => setSelectedExamForRequirements(null)}
                    exam={selectedExamForRequirements}
                    onProceed={handleProceedToExam}
                />
            )}
        </div>
    );
};

// Modern Stats Component
const StatsItem = ({ icon: Icon, label, value, subValue, trend, color, bg, delay }: any) => (
    <Card className="animate-stat-card border-l-4 border-l-transparent hover:border-l-primary transition-all duration-300 shadow-sm hover:shadow-md bg-card dark:bg-zinc-900/50">
        <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-extrabold tracking-tight tabular-nums">{value}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{subValue}</p>
            </div>
            <div className={`p-3 rounded-xl ${bg} ${color} ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                <Icon className="w-5 h-5" />
            </div>
        </CardContent>
    </Card>
);

export default AttenderDashboard;
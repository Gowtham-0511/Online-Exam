"use client";

import { useState, useRef, useCallback } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/auth-config";
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    BookOpen, Target, CheckCircle, Check, ArrowLeft, FileText,
    Trophy, ExternalLink, Loader2, PlayCircle, Zap, ChevronRight,
    LayoutDashboard, CalendarRange
} from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Fetcher replaced inside component to access auth


export default function LearningPlanDetail() {
    const { instance, accounts } = useMsal();
    const session = accounts[0];
    const router = useRouter();
    const params = useParams<{ planId: string }>();
    const planId = params.planId;
    const containerRef = useRef(null);

    const [activeWeek, setActiveWeek] = useState(1);

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

    // Fetch data
    const { data, error, isLoading, mutate } = useSWR(
        planId && session ? `/api/attender/learning-plans/${planId}` : null,
        fetcher
    );

    // Animations
    useGSAP(() => {
        if (!isLoading && data?.plan) {
            const tl = gsap.timeline();

            // Set initial states
            gsap.set(".animate-sidebar", { x: -20, autoAlpha: 0 });
            gsap.set(".animate-header", { y: -20, autoAlpha: 0 });
            gsap.set(".animate-content", { y: 20, autoAlpha: 0 });
            gsap.set(".animate-card", { y: 20, autoAlpha: 0 });

            // Animate
            tl.to(".animate-sidebar", { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" })
                .to(".animate-header", { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" }, "-=0.3")
                .to(".animate-content", { y: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out" }, "-=0.2")
                .to(".animate-card", { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.5, ease: "back.out(1.2)" }, "-=0.4");
        }
    }, [isLoading, data]);

    const markProgress = async (weekNumber: number, type: 'topic' | 'resource' | 'goal', value: string) => {
        try {
            if (!session) return;
            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account: session
            });

            // Optimistic update could go here, but strict SWR mutate is safer for consistency
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenResponse.accessToken}`
                },
                body: JSON.stringify({ weekNumber, type, value })
            });
            mutate();
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} marked as complete!`);
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!data?.plan) {
        return <NotFoundState />;
    }

    const { plan, userProgress } = data;

    // -- Calculations --
    const totalPoints = plan.weeks.reduce((acc: number, week: any) => {
        return acc + (week.questions?.reduce((sum: number, q: any) => sum + (q.totalMarks || 0), 0) || 0);
    }, 0);

    const earnedPoints = plan.weeks.reduce((acc: number, week: any) => {
        const weekProg = userProgress.progress.find((p: any) => p.weekId === week.weekNumber);
        if (!weekProg) return acc;

        return acc + (week.questions?.reduce((sum: number, q: any) => {
            const isSolved = weekProg.completedAssessments?.some((a: any) =>
                typeof a === 'string' ? a.includes(q.questionText) : a.title?.includes(q.questionText)
            );
            return sum + (isSolved ? (q.totalMarks || 0) : 0);
        }, 0) || 0);
    }, 0);

    const currentWeek = plan.weeks.find((w: any) => w.weekNumber === activeWeek) || plan.weeks[0];
    const weekProgress = userProgress.progress.find((p: any) => p.weekId === activeWeek) || {
        completedTopics: [],
        completedGoals: [],
        completedResources: [],
        completedAssessments: []
    };

    const totalWeekItems = (currentWeek.topics?.length || 0) +
        (currentWeek.goals?.length || 0) +
        (currentWeek.resources?.length || 0) +
        (currentWeek.questions?.length || 0);

    const completedWeekItems = (weekProgress.completedTopics?.length || 0) +
        (weekProgress.completedGoals?.length || 0) +
        (weekProgress.completedResources?.length || 0) +
        (weekProgress.completedAssessments?.length || 0);

    const weekProgressPercent = totalWeekItems > 0 ? Math.round((completedWeekItems / totalWeekItems) * 100) : 0;

    return (
        <div ref={containerRef} className="min-h-screen bg-background p-6 lg:p-8">
            <div className="max-w-[1800px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-header">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.back()}
                                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                {userProgress.status === 'completed' ? 'Completed' : 'In Progress'}
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{plan.title}</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
                    </div>

                    <div className="flex items-center gap-4 bg-card/60 backdrop-blur-sm border border-border/50 p-2 rounded-xl">
                        <div className="px-4 py-2 border-r border-border/50">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Progress</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-foreground">{userProgress.overallProgress}%</span>
                            </div>
                        </div>
                        <div className="px-4 py-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">XP Earned</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-primary">{earnedPoints}</span>
                                <span className="text-xs text-muted-foreground">/ {totalPoints}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Sidebar: Week Navigation */}
                    <Card className="lg:col-span-3 border-border bg-card/50 backdrop-blur-sm lg:sticky lg:top-8 animate-sidebar overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarRange className="w-4 h-4 text-primary" />
                                Curriculum Map
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-2">
                                {plan.weeks.map((week: any) => {
                                    const wp = userProgress.progress.find((p: any) => p.weekId === week.weekNumber);
                                    const weekTotal = (week.topics?.length || 0) + (week.goals?.length || 0) + (week.resources?.length || 0) + (week.questions?.length || 0);
                                    const weekCompleted = (wp?.completedTopics?.length || 0) + (wp?.completedGoals?.length || 0) + (wp?.completedResources?.length || 0) + (wp?.completedAssessments?.length || 0);
                                    const isCompleted = weekTotal > 0 && weekCompleted >= weekTotal;
                                    const isActive = activeWeek === week.weekNumber;
                                    const isCurrent = week.weekNumber === userProgress.currentWeek;

                                    return (
                                        <button
                                            key={week.weekNumber}
                                            onClick={() => setActiveWeek(week.weekNumber)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all relative overflow-hidden group border",
                                                isActive
                                                    ? "bg-primary/10 border-primary/30 shadow-sm"
                                                    : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                            )}
                                        >
                                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                                                isCompleted ? "bg-emerald-500/10 text-emerald-500" :
                                                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                            )}>
                                                {isCompleted ? <Check className="w-4 h-4" /> : week.weekNumber}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-foreground")}>
                                                    Week {week.weekNumber}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate opacity-80">
                                                    {week.title}
                                                </div>
                                            </div>

                                            {isCurrent && !isCompleted && !isActive && (
                                                <div className="absolute right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </Card>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9 space-y-6 animate-content">

                        {/* Week Hero */}
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600/10 via-background to-background border border-border/50 p-6 sm:p-8">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <LayoutDashboard className="w-64 h-64 text-primary" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                                <div className="space-y-4 max-w-2xl">
                                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 text-primary">
                                        Week {currentWeek.weekNumber} Phase
                                    </Badge>
                                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                        {currentWeek.title}
                                    </h2>
                                    <p className="text-muted-foreground text-lg leading-relaxed">
                                        {currentWeek.description || "Master the core concepts and practical skills for this week's module."}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-card/50 backdrop-blur-md border border-border p-4 rounded-2xl shadow-lg min-w-[140px]">
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-muted/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path
                                                className="text-primary transition-all duration-1000 ease-out"
                                                strokeDasharray={`${weekProgressPercent}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-xl font-bold">{weekProgressPercent}%</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-wide">Done</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Topics Section */}
                            <div className="space-y-6 animate-card md:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-5 h-5 text-violet-500" />
                                    <h3 className="text-lg font-semibold">Core Concepts</h3>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {currentWeek.topics?.map((topic: string, idx: number) => {
                                        const isCompleted = weekProgress.completedTopics?.includes(topic);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => markProgress(currentWeek.weekNumber, 'topic', topic)}
                                                className={cn(
                                                    "group cursor-pointer relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
                                                    isCompleted
                                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                                        : "bg-card border-border hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className={cn(
                                                        "text-sm font-medium leading-snug",
                                                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                                    )}>
                                                        {topic}
                                                    </span>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                                        isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 group-hover:border-primary"
                                                    )}>
                                                        {isCompleted && <Check className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Resources Section */}
                            <div className="space-y-4 animate-card h-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    <h3 className="text-lg font-semibold">Learning Resources</h3>
                                </div>
                                <Card className="border-border bg-card/50 h-full">
                                    <CardContent className="p-4 space-y-3">
                                        {currentWeek.resources?.length > 0 ? currentWeek.resources.map((resource: any, idx: number) => {
                                            const isCompleted = weekProgress.completedResources?.includes(resource.title);
                                            return (
                                                <div key={idx} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markProgress(currentWeek.weekNumber, 'resource', resource.title);
                                                        }}
                                                        className={cn(
                                                            "mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                            isCompleted ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                                                        )}
                                                    >
                                                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <a
                                                            href={resource.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(
                                                                "text-sm font-medium hover:text-primary hover:underline block truncate mb-1",
                                                                isCompleted ? "text-muted-foreground decoration-slate-500/50" : "text-foreground"
                                                            )}
                                                        >
                                                            {resource.title}
                                                            <ExternalLink className="inline-block w-3 h-3 ml-1 opacity-50" />
                                                        </a>
                                                        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border capitalize">
                                                            {resource.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-sm text-muted-foreground italic p-2">No specific resources for this week.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Goals Section */}
                            <div className="space-y-4 animate-card h-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-5 h-5 text-rose-500" />
                                    <h3 className="text-lg font-semibold">Weekly Objectives</h3>
                                </div>
                                <Card className="border-border bg-card/50 h-full">
                                    <CardContent className="p-4 space-y-3">
                                        {currentWeek.goals?.length > 0 ? currentWeek.goals.map((goal: string, idx: number) => {
                                            const isCompleted = weekProgress.completedGoals?.includes(goal);
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => markProgress(currentWeek.weekNumber, 'goal', goal)}
                                                    className={cn(
                                                        "cursor-pointer flex items-start gap-3 p-3 rounded-lg border border-transparent transition-all",
                                                        isCompleted ? "bg-muted/30" : "hover:bg-muted/50 hover:border-border/50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                        isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                                                    )}>
                                                        {isCompleted && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm leading-snug",
                                                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                                    )}>
                                                        {goal}
                                                    </span>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-sm text-muted-foreground italic p-2">No specific goals for this week.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// -- Skeleton & States --
const LoadingSkeleton = () => (
    <div className="p-8 space-y-8">
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2">
                <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                <div className="h-4 w-96 bg-muted rounded animate-pulse" />
            </div>
        </div>
        <div className="grid grid-cols-12 gap-8">
            <div className="col-span-3 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 w-full bg-muted rounded-xl animate-pulse" />)}
            </div>
            <div className="col-span-9 space-y-6">
                <div className="h-64 w-full bg-muted rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
                    <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    </div>
);

const NotFoundState = () => (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-dashed border-2">
            <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Plan Not Found</h2>
                    <p className="text-muted-foreground mt-2">The learning plan you are looking for does not exist or you do not have permission to view it.</p>
                </div>
                <Button variant="outline" asChild className="mt-2">
                    <a href="/attender/dashboard">Return to Dashboard</a>
                </Button>
            </CardContent>
        </Card>
    </div>
);
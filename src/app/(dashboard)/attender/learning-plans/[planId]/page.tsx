"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    BookOpen, Target, CheckCircle, Check, ArrowLeft, FileText, Code, Play, Trophy, ExternalLink, Loader2, Lightbulb, X
} from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LearningPlanDetail() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams<{ planId: string }>();
    const planId = params.planId;

    const [activeWeek, setActiveWeek] = useState(1);
    const [showPlayground, setShowPlayground] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        topics: true,
        goals: true,
        resources: true,
        questions: true
    });

    const { data, error, isLoading, mutate } = useSWR(
        planId && session?.user?.email ? `/api/attender/learning-plans/${planId}` : null,
        fetcher
    );

    const markTopicComplete = async (weekNumber: number, topic: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'topic',
                    value: topic
                })
            });
            mutate();
            toast.success('Topic completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const markResourceComplete = async (weekNumber: number, resourceTitle: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'resource',
                    value: resourceTitle
                })
            });
            mutate();
            toast.success('Resource completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const markGoalComplete = async (weekNumber: number, goal: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'goal',
                    value: goal
                })
            });
            mutate();
            toast.success('Goal completed!');
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Loading your learning path...</p>
                </div>
            </div>
        );
    }

    if (!data?.plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="border-border">
                    <CardContent className="p-8 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-2">Learning plan not found</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            The plan you're looking for doesn't exist or you don't have access.
                        </p>
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { plan, userProgress } = data;

    // Calculate total and earned points
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

    // Calculate week-specific progress
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
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <div className="container mx-auto px-4 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.back()}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">{plan.title}</h1>
                                <p className="text-xs text-muted-foreground hidden md:block">{plan.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                                <Trophy className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">
                                    {earnedPoints}/{totalPoints}
                                </span>
                                <span className="text-xs text-muted-foreground">points</span>
                            </div>
                            <Badge variant="secondary" className="hidden sm:flex">
                                {userProgress.status === 'completed' && (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {userProgress.status === 'in-progress' ? 'In Progress' :
                                    userProgress.status === 'completed' ? 'Completed' : 'Not Started'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar - Week Navigation */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Overall Progress Card */}
                        <Card className="border-border bg-gradient-to-br from-card to-muted/20">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Overall Progress
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs bg-background">
                                        {userProgress.overallProgress}%
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={userProgress.overallProgress} className="h-2 mb-3" />
                                <div className="grid grid-cols-2 gap-4 text-center pt-3 border-t border-border">
                                    <div>
                                        <div className="text-2xl font-bold text-foreground">
                                            {userProgress.currentWeek}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Current Week</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-foreground">
                                            {plan.weeks.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Total Weeks</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Week Timeline */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground px-1">Curriculum</h3>
                            <ScrollArea className="h-[calc(100vh-350px)] pr-4">
                                <div className="space-y-2">
                                    {plan.weeks.map((week: any) => {
                                        const wp = userProgress.progress.find((p: any) => p.weekId === week.weekNumber);
                                        const weekTotal = (week.topics?.length || 0) + (week.goals?.length || 0) +
                                            (week.resources?.length || 0) + (week.questions?.length || 0);
                                        const weekCompleted = (wp?.completedTopics?.length || 0) +
                                            (wp?.completedGoals?.length || 0) +
                                            (wp?.completedResources?.length || 0) +
                                            (wp?.completedAssessments?.length || 0);
                                        const isCompleted = weekTotal > 0 && weekCompleted === weekTotal;
                                        const isCurrent = week.weekNumber === userProgress.currentWeek;
                                        const isActive = activeWeek === week.weekNumber;

                                        return (
                                            <button
                                                key={week.weekNumber}
                                                onClick={() => setActiveWeek(week.weekNumber)}
                                                className={`
                                                        w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                        ${isActive
                                                        ? 'bg-primary/5 border-primary/50 shadow-sm'
                                                        : 'bg-card border-transparent hover:bg-muted/50'
                                                    }
                                                    `}
                                            >
                                                <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                                        ${isCompleted
                                                        ? 'bg-emerald-500/10 text-emerald-600'
                                                        : isActive
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted text-muted-foreground'
                                                    }
                                                    `}>
                                                    {isCompleted ? <Check className="w-4 h-4" /> : week.weekNumber}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                        Week {week.weekNumber}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {week.title}
                                                    </div>
                                                </div>
                                                {isCurrent && (
                                                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Week Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="bg-background">Week {currentWeek.weekNumber}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {currentWeek.topics?.length || 0} Topics • {currentWeek.questions?.length || 0} Problems
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                                    {currentWeek.title}
                                </h2>
                                <p className="text-muted-foreground mt-1 max-w-2xl">
                                    {currentWeek.description || `Master the concepts for Week ${currentWeek.weekNumber}.`}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-card border border-border p-3 rounded-lg shadow-sm">
                                <div className="text-right">
                                    <div className="text-sm font-medium text-muted-foreground">Progress</div>
                                    <div className="text-2xl font-bold text-primary leading-none">{weekProgressPercent}%</div>
                                </div>
                                <div className="h-10 w-10">
                                    <div className="relative w-full h-full">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                className="text-muted/20"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="text-primary transition-all duration-500 ease-out"
                                                strokeDasharray={`${weekProgressPercent}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Content Sections */}
                        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            {/* Topics */}
                            {currentWeek.topics && currentWeek.topics.length > 0 && (
                                <Card className="border-border overflow-hidden">
                                    <CardHeader className="bg-muted/30 pb-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                            Key Concepts
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border">
                                            {currentWeek.topics.map((topic: string, idx: number) => {
                                                const isCompleted = weekProgress.completedTopics?.includes(topic);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => markTopicComplete(currentWeek.weekNumber, topic)}
                                                        className={`
                                                                w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50
                                                                ${isCompleted ? 'bg-muted/20' : ''}
                                                            `}
                                                    >
                                                        <div className={`
                                                                w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors
                                                                ${isCompleted
                                                                ? 'bg-primary border-primary text-primary-foreground'
                                                                : 'border-muted-foreground/40 hover:border-primary'
                                                            }
                                                            `}>
                                                            {isCompleted && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                            {topic}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Resources & Goals Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Resources */}
                                {currentWeek.resources && currentWeek.resources.length > 0 && (
                                    <Card className="border-border h-full">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Resources
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {currentWeek.resources.map((resource: any, idx: number) => {
                                                const isCompleted = weekProgress.completedResources?.includes(resource.title);
                                                return (
                                                    <div key={idx} className="flex items-start gap-3 group">
                                                        <button
                                                            onClick={() => markResourceComplete(currentWeek.weekNumber, resource.title)}
                                                            className={`
                                                                    mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                                                                    ${isCompleted
                                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                                    : 'border-muted-foreground/40 hover:border-primary'
                                                                }
                                                                `}
                                                        >
                                                            {isCompleted && <Check className="w-3 h-3" />}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <a
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`text-sm hover:underline hover:text-primary block truncate ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                                            >
                                                                {resource.title}
                                                            </a>
                                                            <span className="text-xs text-muted-foreground capitalize">{resource.type}</span>
                                                        </div>
                                                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Goals */}
                                {currentWeek.goals && currentWeek.goals.length > 0 && (
                                    <Card className="border-border h-full">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Target className="w-4 h-4 text-primary" />
                                                Goals
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {currentWeek.goals.map((goal: string, idx: number) => {
                                                const isCompleted = weekProgress.completedGoals?.includes(goal);
                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <button
                                                            onClick={() => markGoalComplete(currentWeek.weekNumber, goal)}
                                                            className={`
                                                                    mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                                                                    ${isCompleted
                                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                                    : 'border-muted-foreground/40 hover:border-primary'
                                                                }
                                                                `}
                                                        >
                                                            {isCompleted && <Check className="w-3 h-3" />}
                                                        </button>
                                                        <span className={`text-sm ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                            {goal}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
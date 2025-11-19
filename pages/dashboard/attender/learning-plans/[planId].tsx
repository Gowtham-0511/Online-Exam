import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BookOpen, Calendar, Target, Award, CheckCircle, Check,
    Circle, ArrowLeft, FileText, Code, Play, Lock,
    Clock, Trophy, Star, ChevronRight, ExternalLink, Loader2,
    BookMarked, Lightbulb, Timer, TrendingUp, BarChart3,
    ChevronDown, ChevronUp, Flame
} from 'lucide-react';
import useSWR from 'swr';
import CodePlayground from '@/components/CodePlayground';
import toast from 'react-hot-toast';
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LearningPlanDetail() {
    const { data: session } = useSession();
    const router = useRouter();
    const { planId } = router.query;

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

    const markAssessmentComplete = async (weekNumber: number, assessment: string) => {
        try {
            await fetch(`/api/attender/learning-plans/${planId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekNumber,
                    type: 'assessment',
                    value: assessment
                })
            });
            mutate();
            toast.success('Assessment completed!');
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
            <UnifiedDashboardLayout role="attender">
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Loading your learning path...</p>
                    </div>
                </div>
            </UnifiedDashboardLayout>
        );
    }

    if (!data?.plan) {
        return (
            <UnifiedDashboardLayout role="attender">
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
            </UnifiedDashboardLayout>
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
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>SysRank - Online Assessment Platform</title>
                <link rel="icon" href="/logo3.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Top Navigation Bar - HackerRank Style */}
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
                                    <p className="text-xs text-muted-foreground">{plan.description}</p>
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Sidebar - Week Navigation */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Overall Progress Card */}
                            <Card className="border-border">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Overall Progress
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs">
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

                            {/* Week Selector */}
                            <Card className="border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Weeks
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
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

                                        return (
                                            <button
                                                key={week.weekNumber}
                                                onClick={() => setActiveWeek(week.weekNumber)}
                                                className={`
                                                    w-full flex items-center justify-between p-3 rounded-lg
                                                    transition-all duration-200 text-left
                                                    ${activeWeek === week.weekNumber
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'hover:bg-muted/50 text-foreground'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold
                                                        ${activeWeek === week.weekNumber
                                                            ? 'bg-primary-foreground/20'
                                                            : isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted'
                                                        }
                                                    `}>
                                                        {isCompleted ? (
                                                            <Check className="w-4 h-4" />
                                                        ) : (
                                                            week.weekNumber
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-medium ${activeWeek === week.weekNumber ? '' : 'text-foreground'}`}>
                                                            Week {week.weekNumber}
                                                        </div>
                                                        <div className={`text-xs ${activeWeek === week.weekNumber ? 'opacity-90' : 'text-muted-foreground'}`}>
                                                            {weekCompleted}/{weekTotal} items
                                                        </div>
                                                    </div>
                                                </div>
                                                {isCurrent && activeWeek !== week.weekNumber && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Current
                                                    </Badge>
                                                )}
                                            </button>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Stats Card */}
                            <Card className="border-border hidden lg:block">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Your Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Streak</span>
                                        <div className="flex items-center gap-1">
                                            <Flame className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm font-semibold text-foreground">0 days</span>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Problems Solved</span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {userProgress.progress.reduce((acc: number, p: any) =>
                                                acc + (p.completedAssessments?.length || 0), 0
                                            )}
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Resources Read</span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {userProgress.progress.reduce((acc: number, p: any) =>
                                                acc + (p.completedResources?.length || 0), 0
                                            )}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content Area */}
                        <div className="lg:col-span-9">
                            {/* Week Header */}
                            <Card className="border-border mb-6">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-primary text-primary-foreground">
                                                    Week {currentWeek.weekNumber}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {currentWeek.title}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                                {currentWeek.description || `Week ${currentWeek.weekNumber} Overview`}
                                            </h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-primary">
                                                {weekProgressPercent}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                completed
                                            </div>
                                        </div>
                                    </div>
                                    <Progress value={weekProgressPercent} className="h-2" />
                                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <BookMarked className="w-4 h-4" />
                                            {currentWeek.topics?.length || 0} topics
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="w-4 h-4" />
                                            {currentWeek.goals?.length || 0} goals
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            {currentWeek.resources?.length || 0} resources
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Code className="w-4 h-4" />
                                            {currentWeek.questions?.length || 0} problems
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Topics Section */}
                            {currentWeek.topics && currentWeek.topics.length > 0 && (
                                <Card className="border-border mb-4">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleSection('topics')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-primary" />
                                                Topics to Learn
                                                <Badge variant="secondary" className="ml-2">
                                                    {weekProgress.completedTopics?.length || 0}/{currentWeek.topics.length}
                                                </Badge>
                                            </CardTitle>
                                            {expandedSections.topics ? (
                                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    {expandedSections.topics && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="space-y-2">
                                                {currentWeek.topics.map((topic: string, idx: number) => {
                                                    const isCompleted = weekProgress.completedTopics?.includes(topic);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => markTopicComplete(currentWeek.weekNumber, topic)}
                                                            className={`
                                                                w-full flex items-center gap-3 p-4 rounded-lg border
                                                                transition-all duration-200 text-left group
                                                                ${isCompleted
                                                                    ? 'border-primary/20 bg-primary/5 hover:bg-primary/10'
                                                                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                                                                ${isCompleted
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'border-2 border-muted-foreground/30 group-hover:border-primary'
                                                                }
                                                            `}>
                                                                {isCompleted && <Check className="w-4 h-4" />}
                                                            </div>
                                                            <span className={`
                                                                text-sm font-medium flex-1
                                                                ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}
                                                            `}>
                                                                {topic}
                                                            </span>
                                                            {isCompleted && (
                                                                <Badge variant="outline" className="text-xs border-primary/30">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Done
                                                                </Badge>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )}

                            {/* Goals Section */}
                            {currentWeek.goals && currentWeek.goals.length > 0 && (
                                <Card className="border-border mb-4">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleSection('goals')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Target className="w-5 h-5 text-primary" />
                                                Learning Goals
                                                <Badge variant="secondary" className="ml-2">
                                                    {weekProgress.completedGoals?.length || 0}/{currentWeek.goals.length}
                                                </Badge>
                                            </CardTitle>
                                            {expandedSections.goals ? (
                                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    {expandedSections.goals && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {currentWeek.goals.map((goal: string, idx: number) => {
                                                    const isCompleted = weekProgress.completedGoals?.includes(goal);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => markGoalComplete(currentWeek.weekNumber, goal)}
                                                            className={`
                                                                flex items-start gap-3 p-4 rounded-lg border text-left
                                                                transition-all duration-200 group
                                                                ${isCompleted
                                                                    ? 'border-primary/20 bg-primary/5'
                                                                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                                                                ${isCompleted
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'border-2 border-muted-foreground/30 group-hover:border-primary'
                                                                }
                                                            `}>
                                                                {isCompleted && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <span className={`
                                                                text-sm flex-1
                                                                ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}
                                                            `}>
                                                                {goal}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )}

                            {/* Resources Section */}
                            {currentWeek.resources && currentWeek.resources.length > 0 && (
                                <Card className="border-border mb-4">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleSection('resources')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-primary" />
                                                Learning Resources
                                                <Badge variant="secondary" className="ml-2">
                                                    {weekProgress.completedResources?.length || 0}/{currentWeek.resources.length}
                                                </Badge>
                                            </CardTitle>
                                            {expandedSections.resources ? (
                                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    {expandedSections.resources && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="space-y-2">
                                                {currentWeek.resources.map((resource: any, idx: number) => {
                                                    const isCompleted = weekProgress.completedResources?.includes(resource.title);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`
                                                                group flex items-center justify-between p-4 rounded-lg border
                                                                transition-all duration-200
                                                                ${isCompleted
                                                                    ? 'border-primary/20 bg-primary/5'
                                                                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                                }
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <button
                                                                    onClick={() => markResourceComplete(currentWeek.weekNumber, resource.title)}
                                                                    className={`
                                                                        w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                                                                        ${isCompleted
                                                                            ? 'bg-primary text-primary-foreground'
                                                                            : 'border-2 border-muted-foreground/30 hover:border-primary'
                                                                        }
                                                                    `}
                                                                >
                                                                    {isCompleted && <Check className="w-4 h-4" />}
                                                                </button>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`
                                                                        text-sm font-medium truncate
                                                                        ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}
                                                                    `}>
                                                                        {resource.title}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {resource.type}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(resource.url, '_blank')}
                                                                className="flex-shrink-0"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )}

                            {/* Practice Problems Section */}
                            {currentWeek.questions && currentWeek.questions.length > 0 && (
                                <Card className="border-border">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleSection('questions')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Code className="w-5 h-5 text-primary" />
                                                Practice Problems
                                                <Badge variant="secondary" className="ml-2">
                                                    {weekProgress.completedAssessments?.length || 0}/{currentWeek.questions.length}
                                                </Badge>
                                            </CardTitle>
                                            {expandedSections.questions ? (
                                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    {expandedSections.questions && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="space-y-3">
                                                {currentWeek.questions.map((question: any, idx: number) => {
                                                    const isSolved = weekProgress.completedAssessments?.some((a: any) =>
                                                        typeof a === 'string' ? a.includes(question.questionText) : a.title?.includes(question.questionText)
                                                    );

                                                    const getDifficultyColor = (difficulty: string) => {
                                                        switch (difficulty?.toLowerCase()) {
                                                            case 'easy': return 'text-green-600 dark:text-green-400';
                                                            case 'medium': return 'text-yellow-600 dark:text-yellow-400';
                                                            case 'hard': return 'text-red-600 dark:text-red-400';
                                                            default: return 'text-muted-foreground';
                                                        }
                                                    };

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`
                                                                group p-4 rounded-lg border transition-all duration-200
                                                                ${isSolved
                                                                    ? 'border-primary/20 bg-primary/5'
                                                                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                                }
                                                            `}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                    <div className={`
                                                                        w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1
                                                                        ${isSolved
                                                                            ? 'bg-primary text-primary-foreground'
                                                                            : 'border-2 border-muted-foreground/30'
                                                                        }
                                                                    `}>
                                                                        {isSolved ? (
                                                                            <Check className="w-4 h-4" />
                                                                        ) : (
                                                                            <span className="text-xs font-semibold">{idx + 1}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                                                                            {question.questionText}
                                                                        </h4>
                                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${getDifficultyColor(question.difficulty)}`}
                                                                            >
                                                                                {question.difficulty || 'Medium'}
                                                                            </Badge>
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {question.language}
                                                                            </Badge>
                                                                            {question.totalMarks && (
                                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                    <Trophy className="w-3 h-3" />
                                                                                    {question.totalMarks} pts
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {question.topic && (
                                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                <Lightbulb className="w-3 h-3" />
                                                                                {question.topic}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant={isSolved ? "outline" : "default"}
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedQuestion(question);
                                                                        setShowPlayground(true);
                                                                    }}
                                                                    className="flex-shrink-0"
                                                                >
                                                                    {isSolved ? (
                                                                        <>
                                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                                            Review
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play className="w-4 h-4 mr-2" />
                                                                            Solve
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Code Playground Modal */}
            {showPlayground && selectedQuestion && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col border-border shadow-2xl">
                        <CardHeader className="border-b border-border bg-card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Code className="w-5 h-5 text-primary" />
                                    <CardTitle className="text-foreground">Code Editor</CardTitle>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowPlayground(false);
                                        setSelectedQuestion(null);
                                    }}
                                    className="hover:bg-muted"
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-6 bg-background">
                            <CodePlayground
                                question={selectedQuestion}
                                onClose={() => {
                                    setShowPlayground(false);
                                    setSelectedQuestion(null);
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </UnifiedDashboardLayout>
    );
}
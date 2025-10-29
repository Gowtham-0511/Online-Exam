import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Calendar, Clock, Target, TrendingUp,
    CheckCircle, PlayCircle, Award, ArrowRight, Loader2,
    Trophy, Star, Flame, Code, ChevronRight, Filter
} from 'lucide-react';
import useSWR from 'swr';
import AttenderLayout from './AttenderLayout';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface LearningPlan {
    id: string;
    planId: string;
    planName: string;
    planDescription: string;
    language: string;
    difficulty: string;
    duration: number;
    currentWeek: number;
    status: string;
    overallProgress: number;
    startDate: string;
    assignedAt: string;
}

export default function StudentLearningPlans() {
    const { data: session } = useSession();
    const router = useRouter();
    const [filter, setFilter] = useState<string>('all');

    const { data, error, isLoading } = useSWR<{ plans: LearningPlan[] }>(
        session?.user?.email ? '/api/attender/learning-plans' : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const filteredPlans = data?.plans?.filter(plan => {
        if (filter === 'all') return true;
        return plan.status === filter;
    }) || [];

    const inProgressCount = data?.plans?.filter(p => p.status === 'in-progress').length || 0;
    const completedCount = data?.plans?.filter(p => p.status === 'completed').length || 0;
    const avgProgress = data?.plans?.length
        ? Math.round(data.plans.reduce((acc, p) => acc + p.overallProgress, 0) / data.plans.length)
        : 0;

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed':
                return {
                    color: 'bg-primary/10 text-primary border-primary/20',
                    icon: CheckCircle,
                    label: 'Completed'
                };
            case 'in-progress':
                return {
                    color: 'bg-accent/10 text-accent border-accent/20',
                    icon: PlayCircle,
                    label: 'In Progress'
                };
            case 'paused':
                return {
                    color: 'bg-muted text-muted-foreground border-border',
                    icon: Clock,
                    label: 'Paused'
                };
            default:
                return {
                    color: 'bg-muted text-muted-foreground border-border',
                    icon: BookOpen,
                    label: 'Not Started'
                };
        }
    };

    const getDifficultyConfig = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner':
            case 'easy':
                return 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10';
            case 'intermediate':
            case 'medium':
                return 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10';
            case 'advanced':
            case 'hard':
                return 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10';
            default:
                return 'border-border text-muted-foreground bg-muted';
        }
    };

    if (isLoading) {
        return (
            <AttenderLayout>
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AttenderLayout>
        );
    }

    return (
        <AttenderLayout>
            <Head>
                <title>My Learning Plans - SysRank</title>
                <link rel="icon" href="/logo.png" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <div className="border-b border-border">
                    <div className="container mx-auto px-4 py-12">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                                    <Trophy className="w-10 h-10 text-primary" />
                                    My Learning Journey
                                </h1>
                                <p className="text-muted-foreground text-lg">
                                    Master new skills and track your progress
                                </p>
                            </div>
                            {data?.plans && data.plans.length > 0 && (
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-primary">{avgProgress}%</div>
                                        <div className="text-sm text-muted-foreground">Average Progress</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Cards */}
                        {data?.plans && data.plans.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-card/50 backdrop-blur border-border/50">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Total Plans</p>
                                                <p className="text-3xl font-bold text-foreground">{data.plans.length}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/50 backdrop-blur border-border/50">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">In Progress</p>
                                                <p className="text-3xl font-bold text-foreground">{inProgressCount}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                                                <PlayCircle className="w-6 h-6 text-accent" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-card/50 backdrop-blur border-border/50">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                                                <p className="text-3xl font-bold text-foreground">{completedCount}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* <Card className="bg-card/50 backdrop-blur border-border/50">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                                                <p className="text-3xl font-bold text-foreground">7</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Flame className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card> */}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto px-4 py-8">
                    {/* Filter Tabs */}
                    {data?.plans && data.plans.length > 0 && (
                        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                            <Button
                                variant={filter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('all')}
                                className="flex-shrink-0"
                            >
                                All Plans
                                <Badge variant="secondary" className="ml-2 bg-background">
                                    {data.plans.length}
                                </Badge>
                            </Button>
                            <Button
                                variant={filter === 'in-progress' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('in-progress')}
                                className="flex-shrink-0"
                            >
                                In Progress
                                <Badge variant="secondary" className="ml-2 bg-background">
                                    {inProgressCount}
                                </Badge>
                            </Button>
                            <Button
                                variant={filter === 'completed' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('completed')}
                                className="flex-shrink-0"
                            >
                                Completed
                                <Badge variant="secondary" className="ml-2 bg-background">
                                    {completedCount}
                                </Badge>
                            </Button>
                        </div>
                    )}

                    {/* Learning Plans Grid */}
                    {!data?.plans || data.plans.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-foreground">No Learning Plans Yet</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    You haven't been assigned any learning plans yet. Check back later or contact your instructor.
                                </p>
                            </CardContent>
                        </Card>
                    ) : filteredPlans.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-12 text-center">
                                <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2 text-foreground">No Plans Found</h3>
                                <p className="text-muted-foreground">
                                    No learning plans match the current filter.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredPlans.map((plan) => {
                                const statusConfig = getStatusConfig(plan.status);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <Card
                                        key={plan.id}
                                        className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => router.push(`/dashboard/attender/learning-plans/${plan.planId}`)}
                                    >
                                        {/* Card Header with Gradient */}
                                        <div className="h-2 bg-gradient-to-r from-primary to-accent" />

                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Code className="w-5 h-5 text-primary flex-shrink-0" />
                                                        <CardTitle className="text-xl text-foreground line-clamp-1">
                                                            {plan.planName}
                                                        </CardTitle>
                                                    </div>
                                                    <CardDescription className="line-clamp-2">
                                                        {plan.planDescription}
                                                    </CardDescription>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`${statusConfig.color} flex items-center gap-1 flex-shrink-0`}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusConfig.label}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Progress Section */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground font-medium">Progress</span>
                                                    <span className="text-lg font-bold text-primary">
                                                        {plan.overallProgress}%
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <Progress value={plan.overallProgress} className="h-3" />
                                                    <div
                                                        className="absolute top-0 left-0 h-3 bg-primary rounded-full transition-all"
                                                        style={{ width: `${plan.overallProgress}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Week {plan.currentWeek} of {plan.duration}</span>
                                                    <span>
                                                        {plan.duration - plan.currentWeek} weeks remaining
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        <span>Language</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground capitalize pl-5">
                                                        {plan.language}
                                                    </p>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                        <Target className="w-3.5 h-3.5" />
                                                        <span>Difficulty</span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${getDifficultyConfig(plan.difficulty)} text-xs ml-5`}
                                                    >
                                                        {plan.difficulty}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Started</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground pl-5">
                                                        {new Date(plan.startDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>Duration</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground pl-5">
                                                        {plan.duration} weeks
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="pt-2">
                                                <Button
                                                    className="w-full group-hover:bg-primary transition-colors"
                                                    variant="outline"
                                                >
                                                    <span className="flex-1">
                                                        {plan.status === 'not-started' ? 'Start Learning' :
                                                            plan.status === 'completed' ? 'Review Plan' :
                                                                'Continue Learning'}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AttenderLayout>
    );
}